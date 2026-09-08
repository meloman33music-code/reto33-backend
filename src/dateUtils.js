function pad(n) { return n < 10 ? '0' + n : '' + n; }

function keyFromDate(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

// Devuelve la fecha de "hoy" en la zona horaria indicada (ej. 'America/Bogota').
// Esto importa porque el servidor (Render) corre en UTC, y sin esto "hoy"
// podría cambiar varias horas antes o después de la medianoche real del usuario.
function todayKey(tz) {
  if (!tz) return keyFromDate(new Date());
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const map = {};
  parts.forEach(p => { map[p.type] = p.value; });
  return `${map.year}-${map.month}-${map.day}`;
}

function addDays(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return keyFromDate(dt);
}

module.exports = { pad, keyFromDate, todayKey, addDays };
