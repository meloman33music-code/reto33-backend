require('dotenv').config();
const cron = require('node-cron');
const dbMod = require('./db');
const { sendWhatsApp } = require('./whatsapp');
const { buildReminderMessage } = require('./messages');
const { todayKey } = require('./dateUtils');

const TZ = process.env.APP_TIMEZONE || 'America/Bogota';
const REMINDER_CRON = process.env.REMINDER_CRON || '0 20 * * *'; // 8:00pm por defecto

function startReminderCron() {
  return cron.schedule(REMINDER_CRON, async () => {
    console.log('[cron] Revisando retos sin confirmar hoy...');
    const items = dbMod.getActiveItems();
    const t = todayKey(TZ);
    for (const item of items) {
      if (item.lastDate !== t) {
        const user = dbMod.getUser(item.userId);
        if (!user) continue;
        try {
          await sendWhatsApp(user.phone, buildReminderMessage(item));
        } catch (e) {
          console.error('[cron] Error enviando recordatorio a', user.phone, e.message);
        }
      }
    }
  }, { timezone: TZ });
}

module.exports = { startReminderCron };
