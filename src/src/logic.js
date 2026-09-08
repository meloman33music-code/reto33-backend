const { todayKey, addDays } = require('./dateUtils');

// Si pasó más de un día sin confirmar, la racha se reinicia.
function resetIfNeeded(item, tz) {
  if (!item.lastDate) return;
  const t = todayKey(tz);
  if (item.lastDate === t) return;
  const y = addDays(t, -1);
  if (item.lastDate === y) return;
  if (item.streak > 0) {
    item.streak = 0;
    item.justBroken = true;
  }
}

// ¿Hoy toca actualizar a los Growth Partners? (cada 3/6/9 días, antes del día 33)
function computeGpEvent(item) {
  if (!item.growthPartners || item.growthPartners.length === 0 || !item.gpFrequency) return null;
  if (item.streak > 0 && item.streak < 33 && item.streak % item.gpFrequency === 0 && item.lastGpUpdateStreak !== item.streak) {
    return 'progress';
  }
  return null;
}

// Confirma el día de hoy para un reto. Muta `item` y devuelve el resultado.
function confirmToday(item, tz) {
  const t = todayKey(tz);
  if (item.lastDate === t) return { ok: false, reason: 'already_confirmed_today' };

  const isFreshStart = item.streak === 0;
  item.streak += 1;
  item.lastDate = t;
  item.confirmedDates.push(t);
  item.best = Math.max(item.best || 0, item.streak);
  item.justBroken = false;
  if (isFreshStart) {
    item.gpNotifiedFailure = false;
    item.lastGpUpdateStreak = 0;
  }

  let hit33 = false;
  if (item.streak === 33 && !item.celebrated33) {
    item.celebrated33 = true;
    hit33 = true;
  }
  return { ok: true, hit33 };
}

module.exports = { resetIfNeeded, computeGpEvent, confirmToday };
