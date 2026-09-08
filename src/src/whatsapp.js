require('dotenv').config();

let client = null;
const mockSentMessages = []; // solo se llena en modo de prueba (ver abajo)

function getClient() {
  if (client) return client;

  // Modo de prueba: si TWILIO_ACCOUNT_SID es exactamente "test", no llamamos a
  // Twilio de verdad. Sirve para probar toda la lógica de la app sin tener
  // credenciales reales todavía.
  if (process.env.TWILIO_ACCOUNT_SID === 'test') {
    client = {
      messages: {
        create: async (opts) => {
          mockSentMessages.push(opts);
          console.log('[MODO PRUEBA] Se habría enviado:', opts.to, '->', opts.body);
          return { sid: 'mock-sid' };
        }
      }
    };
    return client;
  }

  const twilio = require('twilio');
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return client;
}

function normalizePhone(phone) {
  const digits = String(phone).replace(/[^0-9]/g, '');
  return '+' + digits;
}

async function sendWhatsApp(toPhone, body) {
  const c = getClient();
  const from = 'whatsapp:' + process.env.TWILIO_WHATSAPP_FROM;
  const to = 'whatsapp:' + normalizePhone(toPhone);
  return c.messages.create({ from, to, body });
}

module.exports = { sendWhatsApp, normalizePhone, mockSentMessages };
