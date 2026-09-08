require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dbMod = require('./db');
const { confirmToday, resetIfNeeded, computeGpEvent } = require('./logic');
const { sendWhatsApp } = require('./whatsapp');
const { buildGpMessage } = require('./messages');
const { startReminderCron } = require('./cron');

const TZ = process.env.APP_TIMEZONE || 'America/Bogota';

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.post('/api/users', (req, res) => {
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });
    const user = dbMod.createUser(name, phone);
    res.json(user);
  });

  app.post('/api/items', (req, res) => {
    const { userId, name, kind } = req.body;
    if (!userId || !name || !kind) return res.status(400).json({ error: 'userId, name, kind required' });
    const item = dbMod.createItem(userId, name, kind);
    res.json(item);
  });

  app.get('/api/items/:id', (req, res) => {
    const item = dbMod.getItem(req.params.id);
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json(item);
  });

  app.post('/api/items/:id/growth-partners', (req, res) => {
    const { partners, frequency, targetCount } = req.body; // partners: [{name, phone}]
    const itemId = req.params.id;
    (partners || []).forEach(p => dbMod.addGrowthPartner(itemId, p.name, p.phone));
    dbMod.setGpFrequency(itemId, frequency || null, targetCount || 3);
    res.json(dbMod.getItem(itemId));
  });

  app.post('/api/items/:id/confirm', async (req, res) => {
    const item = dbMod.getItem(req.params.id);
    if (!item) return res.status(404).json({ error: 'not found' });

    resetIfNeeded(item, TZ);

    const wasBroken = item.justBroken;
    const prevLastGpUpdateStreak = item.lastGpUpdateStreak;
    const prevGpNotifiedFailure = item.gpNotifiedFailure;

    const result = confirmToday(item, TZ);
    if (!result.ok) {
      dbMod.saveItem(item); // persiste el reinicio de racha si resetIfNeeded lo aplicó
      return res.status(409).json({ error: result.reason });
    }

    const user = dbMod.getUser(item.userId);
    const gpEvent = computeGpEvent(item);
    const notified = [];

    if (wasBroken && item.growthPartners.length > 0 && prevLastGpUpdateStreak > 0 && !prevGpNotifiedFailure) {
      item.gpNotifiedFailure = true;
      item.lastGpUpdateStreak = 0;
      await notifyPartners(user, item, 'failure');
      notified.push('failure');
    }
    if (gpEvent === 'progress') {
      item.lastGpUpdateStreak = item.streak;
      await notifyPartners(user, item, 'progress');
      notified.push('progress');
    }
    if (result.hit33 && item.growthPartners.length > 0) {
      await notifyPartners(user, item, 'success');
      notified.push('success');
    }

    dbMod.saveItem(item);
    res.json({ ok: true, streak: item.streak, hit33: result.hit33, notified });
  });

  return app;
}

async function notifyPartners(user, item, type) {
  const msg = buildGpMessage(user.name, item, type);
  for (const p of item.growthPartners) {
    try {
      await sendWhatsApp(p.phone, msg);
    } catch (e) {
      console.error('Error enviando a', p.phone, e.message);
    }
  }
}

if (require.main === module) {
  const app = createApp();
  startReminderCron();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Reto33 backend escuchando en puerto ${PORT}`));
}

module.exports = { createApp };
