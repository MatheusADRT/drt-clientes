'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'drt-'));
process.env.ADMIN_PASSWORD = 'senha-de-teste-123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.PORT = '0';
const { server } = require('../server');
const base = () => 'http://127.0.0.1:' + server.address().port;
const wait = () => new Promise((r) => (server.listening ? r() : server.once('listening', r)));

async function login() {
  const r = await fetch(base() + '/admin/login', { method: 'POST', redirect: 'manual', body: new URLSearchParams({ password: 'senha-de-teste-123' }) });
  assert.equal(r.status, 303);
  return r.headers.get('set-cookie').split(';')[0];
}

test('fluxo completo: cadastro, carteirinha, status, pagamento, Stripe', async (t) => {
  await wait();
  t.after(() => server.close());
  // sem login: painel pede senha; senha errada recusada
  assert.match(await (await fetch(base() + '/admin')).text(), /Acesso restrito/);
  assert.equal((await fetch(base() + '/admin/login', { method: 'POST', body: new URLSearchParams({ password: 'x' }) })).status, 401);
  const ck = await login();
  // cadastra com vencimento já passado há 5 dias -> suspenso
  const due = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
  let r = await fetch(base() + '/admin/clients', { method: 'POST', redirect: 'manual', headers: { cookie: ck }, body: new URLSearchParams({ name: 'Agito Sushi Brussels', plan: 'systeme', amount: '249', dueDay: due.slice(8), firstDue: due, lang: 'pt', phone: '+32 400 00 00 00' }) });
  assert.equal(r.status, 303);
  const id = r.headers.get('location').split('/')[3].split('?')[0];
  const db = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'db.json'), 'utf8'));
  const c = db.clients[0];
  assert.equal(c.id, id);
  let s = await (await fetch(base() + '/api/status/' + c.key)).json();
  assert.equal(s.status, 'suspended');
  // carteirinha pública abre sem login e não expõe o painel
  const html = await (await fetch(base() + '/c/' + c.token)).text();
  assert.match(html, /Agito Sushi Brussels/); assert.match(html, /Seu serviço está suspenso/);
  assert.equal((await fetch(base() + '/c/' + 'x'.repeat(24))).status, 404);
  // pagamento manual de 1 mês -> volta ao ar
  r = await fetch(base() + '/admin/c/' + id + '/pay', { method: 'POST', redirect: 'manual', headers: { cookie: ck }, body: new URLSearchParams({ months: '1', method: 'virement' }) });
  assert.equal(r.status, 303);
  s = await (await fetch(base() + '/api/status/' + c.key)).json();
  assert.equal(s.status, 'active');
  // Stripe: assinatura inválida recusada; válida registra mais 1 mês, e repetição é ignorada
  const ev = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_1', mode: 'payment', payment_status: 'paid', client_reference_id: id, amount_total: 24900, customer: 'cus_1' } } });
  assert.equal((await fetch(base() + '/api/stripe/webhook', { method: 'POST', body: ev, headers: { 'stripe-signature': 't=1,v1=00' } })).status, 400);
  const ts = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', 'whsec_test').update(ts + '.' + ev).digest('hex');
  const send = () => fetch(base() + '/api/stripe/webhook', { method: 'POST', body: ev, headers: { 'stripe-signature': `t=${ts},v1=${sig}` } }).then((x) => x.json());
  assert.equal((await send()).result, 'ok');
  assert.equal((await send()).result, 'duplicado');
  const db2 = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'db.json'), 'utf8'));
  assert.equal(db2.payments.length, 2);
  // POST de outro site é recusado (proteção CSRF)
  assert.equal((await fetch(base() + '/admin/c/' + id + '/override', { method: 'POST', headers: { cookie: ck, origin: 'https://evil.example' }, body: 'override=suspended' })).status, 403);
});
