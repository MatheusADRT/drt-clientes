'use strict';
// Envio automático de mensagens: WhatsApp (API oficial da Meta, por modelos aprovados) e e-mail (API da Resend).
// Cada canal só é usado se as variáveis estiverem definidas; o resultado fica no histórico de eventos.
//   WA_TOKEN, WA_PHONE_ID            → WhatsApp Cloud API
//   WA_TPL_REMINDER, WA_TPL_REPORT, WA_TPL_ALERT (nomes dos modelos, idioma via WA_TPL_LANG, padrão fr)
//   RESEND_API_KEY, MAIL_FROM        → e-mail (ex.: "DRT Creation <clientes@drtcreation.com>")
//   ADMIN_PHONE, ADMIN_EMAIL         → onde você recebe os alertas
const https = require('https');

const env = (k, d = '') => process.env[k] || d;
function post(host, path, headers, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = https.request({ host, path, method: 'POST', timeout: 10000, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers } }, (res) => {
      let b = ''; res.on('data', (c) => { if (b.length < 20000) b += c; }); res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, code: res.statusCode, body: b.slice(0, 500) }));
    });
    req.on('timeout', () => req.destroy()); req.on('error', (e) => resolve({ ok: false, code: 0, body: e.message })); req.end(data);
  });
}

const waOn = () => !!(env('WA_TOKEN') && env('WA_PHONE_ID'));
const mailOn = () => !!(env('RESEND_API_KEY') && env('MAIL_FROM'));
const phoneE164 = (p) => String(p || '').replace(/\D/g, '');

// WhatsApp: mensagem de modelo (fora da janela de 24 h só modelos são aceitos); params = textos do corpo, na ordem
async function whatsapp(phone, template, params) {
  if (!waOn() || !template || !phoneE164(phone)) return { ok: false, skipped: true };
  return post('graph.facebook.com', `/v21.0/${env('WA_PHONE_ID')}/messages`, { Authorization: 'Bearer ' + env('WA_TOKEN') }, {
    messaging_product: 'whatsapp', to: phoneE164(phone), type: 'template',
    template: { name: template, language: { code: env('WA_TPL_LANG', 'fr') }, components: [{ type: 'body', parameters: params.map((t) => ({ type: 'text', text: String(t).replace(/\s+/g, ' ').slice(0, 1000) })) }] },
  });
}
async function email(to, subject, html, text) {
  if (!mailOn() || !to) return { ok: false, skipped: true };
  return post('api.resend.com', '/emails', { Authorization: 'Bearer ' + env('RESEND_API_KEY') }, { from: env('MAIL_FROM'), to: [to], subject, html, text });
}

/**
 * Manda uma mensagem a um cliente pelos canais disponíveis (WhatsApp primeiro, e-mail em seguida).
 * msg = { template, params, subject, html, text }
 */
async function toClient(client, msg) {
  const out = { wa: null, mail: null };
  if (client.phone) out.wa = await whatsapp(client.phone, msg.template, msg.params || []);
  if (client.email) out.mail = await email(client.email, msg.subject, msg.html, msg.text);
  return out;
}
async function toAdmin(msg) {
  const out = { wa: null, mail: null };
  if (env('ADMIN_PHONE')) out.wa = await whatsapp(env('ADMIN_PHONE'), env('WA_TPL_ALERT'), msg.params || [msg.text]);
  if (env('ADMIN_EMAIL')) out.mail = await email(env('ADMIN_EMAIL'), msg.subject, msg.html || '<p>' + msg.text + '</p>', msg.text);
  return out;
}
const sent = (r) => (r && r.wa && r.wa.ok ? 'WhatsApp' : '') + (r && r.mail && r.mail.ok ? (r.wa && r.wa.ok ? ' + ' : '') + 'e-mail' : '') || 'nenhum canal (configure WhatsApp/e-mail)';

async function emailRaw(payload) { if (!mailOn()) return { ok: false, skipped: true }; return post('api.resend.com', '/emails', { Authorization: 'Bearer ' + env('RESEND_API_KEY') }, payload); }
module.exports = { waOn, mailOn, whatsapp, email, emailRaw, toClient, toAdmin, sent };
