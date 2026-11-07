'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'drt-st-'));
process.env.ADMIN_PASSWORD = 'senha-de-teste-123';
process.env.PORT = '0';
const { server } = require('../server');
const ST = require('../lib/stats');
const B = require('../lib/billing');
const base = () => 'http://127.0.0.1:' + server.address().port;
const wait = () => new Promise((r) => (server.listening ? r() : server.once('listening', r)));
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';

test('audiência: script, dedup de visitantes, tempo, resumo do Agito e carteirinha', async (t) => {
  await wait(); t.after(() => server.close());
  const ck = (await fetch(base() + '/admin/login', { method: 'POST', redirect: 'manual', body: new URLSearchParams({ password: 'senha-de-teste-123' }) })).headers.get('set-cookie').split(';')[0];
  const r = await fetch(base() + '/admin/clients', { method: 'POST', redirect: 'manual', headers: { cookie: ck }, body: new URLSearchParams({ name: 'Big Festa & Co', plan: 'boutique', amount: '40', dueDay: '5', firstDue: '2027-01-05', lang: 'fr' }) });
  const id = r.headers.get('location').split('/')[3].split('?')[0];
  const c = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'db.json'), 'utf8')).clients[0];
  assert.match(await (await fetch(base() + '/a.js')).text(), /sendBeacon/);
  const DUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
  const hit = (body, ip) => fetch(base() + '/api/a/' + c.key, { method: 'POST', body: JSON.stringify(body), headers: { 'user-agent': ip === '2.2.2.2' ? DUA : UA, 'x-forwarded-for': ip } });
  // 2 visitantes, 3 aberturas de página (um deles abre duas), tempos de 10 s e 30 s
  assert.equal((await hit({ e: 'pv', s: 'abcdefgh1', p: '/fr/', r: 'https://www.google.com/', h: 'bigfesta.be', l: 'fr-BE', w: 390 }, '1.1.1.1')).status, 204);
  await hit({ e: 'pv', s: 'abcdefgh2', p: '/fr/boutique/', r: 'https://bigfesta.be/fr/', h: 'bigfesta.be', l: 'fr-BE', w: 390 }, '1.1.1.1');
  await hit({ e: 'pv', s: 'abcdefgh3', p: '/fr/', r: '', h: 'bigfesta.be', l: 'pt-BR', w: 1400 }, '2.2.2.2');
  await hit({ e: 'engage', s: 'abcdefgh1', ms: 10000 }, '1.1.1.1');
  await hit({ e: 'engage', s: 'abcdefgh3', ms: 20000 }, '2.2.2.2');
  await hit({ e: 'engage', s: 'abcdefgh3', ms: 30000 }, '2.2.2.2'); // atualização da mesma sessão: conta a diferença
  // robô ignorado
  assert.equal((await fetch(base() + '/api/a/' + c.key, { method: 'POST', body: JSON.stringify({ e: 'pv', s: 'botbotbot1', p: '/' }), headers: { 'user-agent': 'Googlebot/2.1' } })).status, 204);
  let S = ST.summary(c.id, 30);
  assert.equal(S.visitors, 2); assert.equal(S.pv, 3); assert.equal(S.avgMs, 20000); assert.equal(S.mobilePct, 67);
  assert.deepEqual(S.ref[0], ['Google', 1]); assert.deepEqual(S.pages[0], ['/fr/', 2]);
  // resumo diário vindo de um sistema (modelo do Agito), dias anteriores
  const y1 = B.addDays(B.today(), -1), y2 = B.addDays(B.today(), -2);
  const push = await fetch(base() + '/api/stats/' + c.key, { method: 'POST', body: JSON.stringify({ days: { [y1]: { pv: 40, visitors: 25, sessions: 30, engMs: 300000, bounces: 10, ref: { Instagram: 12 }, dev: { Celular: 20, Computador: 5 } }, [y2]: { pv: 10, visitors: 8, sessions: 9, engMs: 60000, bounces: 3 } } }), headers: { 'content-type': 'application/json' } });
  assert.equal((await push.json()).days, 2);
  S = ST.summary(c.id, 30);
  assert.equal(S.visitors, 35); assert.equal(S.pv, 53); assert.equal(S.series.length, 30);
  // carteirinha mostra os números; chave inválida não grava nada
  const html = await (await fetch(base() + '/c/' + c.token)).text();
  assert.match(html, /Votre site en chiffres/); assert.match(html, /<b>35<\/b>/); assert.match(html, /Instagram/);
  assert.equal((await fetch(base() + '/api/a/chave-inexistente-123', { method: 'POST', body: '{}' })).status, 204);
});
