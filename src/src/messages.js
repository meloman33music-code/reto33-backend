// El mensaje llega desde un número que el Growth Partner no conoce (el número de
// Twilio), así que siempre incluimos quién lo envía en nombre de quién.
function buildGpMessage(userName, item, type) {
  const subj = item.kind === 'vicio' ? `dejar ${item.name}` : `construir el hábito de ${item.name}`;
  const prefix = `Aviso automático de Reto33 en nombre de ${userName}: `;

  if (type === 'progress') {
    return prefix + `voy en el Día ${item.streak} de mi reto de ${subj}. Gracias por estar pendiente 💪`;
  }
  if (type === 'success') {
    return prefix + `cumplí mi reto de ${subj} por 33 días 🎉 Gracias por acompañarme de cerca.`;
  }
  return prefix + `no logré mi reto de ${subj} por 33 días. Hoy vuelvo a empezar desde el Día 1, sigue pendiente de mí por favor.`;
}

// Recordatorio que llega directo al usuario (no a los Growth Partners) si no
// ha confirmado su día a la hora programada.
function buildReminderMessage(item) {
  const subj = item.kind === 'vicio' ? `dejar ${item.name}` : `construir el hábito de ${item.name}`;
  return `¿Qué pasó hoy con tu reto de ${subj}? Vas en el Día ${item.streak}. No le bajes campeón, entra a la app y confirma tu día. 🔥`;
}

module.exports = { buildGpMessage, buildReminderMessage };
