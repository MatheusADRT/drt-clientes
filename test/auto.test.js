'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'drt-auto-'));
process.env.ADMIN_PASSWORD = 'senha-de-teste-123';
process.env.PUBLIC_URL = 'https://clientes.test';
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
const { server } = require('../server');
const store = require('../lib/store');
const B = require('../lib/billing');
const ST = require('../lib/stats');
const UP = require('../lib/uptime');
const SCH = require('../lib/scheduler');
const base = () => 'http://127.0.0.1:' + server.address().port;
const wait = () => new Promise((r) => (server.listening ? r() : server.once('listening', r)));

test('lembretes, relatório, monitoramento e plano anual', async (t) => {
  await wait(); t.after(() => server.close());
  const ck = (await fetch(base() + '/admin/login', { method: 'POST', redirect: 'manual', body: new URLSearchParams({ password: 'senha-de-teste-123' }) })).headers.get('set-cookie').split(';')[0];
  const due = B.addDays(B.today(), 3); // vence em 3 dias → lembrete hoje
  const r = await fetch(base() + '/admin/clients', { method: 'POST', redirect: 'manual', headers: { cookie: ck }, body: new URLSearchParams({ name: 'Agito Sushi Brussels', plan: 'systeme', amount: '40', dueDay: due.slice(8), firstDue: due, lang: 'pt', phone: '+32 400 00 00 00', email: 'agito@example.test', sites: 'http://127.0.0.1:1/' }) });
  const id = r.headers.get('location').split('/')[3].split('?')[0];
  const c = store.db.clients.find((x) => x.id === id);
  // lembrete "3 dias antes": enviado uma vez só (sem canal configurado, fica registrado nos eventos)
  assert.equal(await SCH.reminders(), 1); assert.equal(await SCH.reminders(), 0);
  assert.ok(store.db.events.some((e) => /Lembrete \(soon\)/.test(e.text)));
  assert.equal(await SCH.reminders(due), 1); // no dia do vencimento
  assert.equal(await SCH.reminders(B.addDays(due, 3)), 1); // no dia da suspensão (carência 3)
  assert.equal(await SCH.reminders(B.addDays(due, 3)), 0);
  const msg = SCH.reminderMsg(c, B.status(c, store.db.settings), 'soon');
  assert.match(msg.text, /vence em/); assert.match(msg.text, /\/c\/[A-Za-z0-9_-]+/); assert.match(msg.text, /40\s€/);
  // relatório do mês anterior (só no dia 1)
  const prev = B.addMonths(B.today().slice(0, 8) + '01', -1, 1).slice(0, 7);
  ST.ingest(c.id, { [prev + '-10']: { pv: 100, visitors: 60, sessions: 70, engMs: 700000, ref: { Google: 40 } }, [prev + '-11']: { pv: 50, visitors: 30, sessions: 30, engMs: 300000 } });
  ST.ingestKpis(c.id, { [prev + '-10']: { orders: 12, revenue: 34050 } });
  const rep = SCH.reportMsg(c, prev);
  assert.match(rep.summary, /90 visitantes/); assert.match(rep.summary, /Google \(100 %\)/); assert.match(rep.summary, /12 pedidos · 340,50\s€/);
  assert.equal(await SCH.reports(B.addDays(B.today(), 5)), 0); // não é dia 1
  assert.equal(await SCH.reports(B.today().slice(0, 8) + '01'), 1);
  assert.equal(await SCH.reports(B.today().slice(0, 8) + '01'), 0);
  // monitoramento: porta fechada = falha; 2 falhas = fora do ar; servidor de teste no ar = volta
  const events = [];
  await UP.check(c, (ev) => events.push(ev)); await UP.check(c, (ev) => events.push(ev));
  assert.deepEqual(events, ['down']); assert.equal(UP.summary(c.id).down, true);
  const up = http.createServer((q, s2) => { s2.writeHead(200); s2.end('ok'); }); await new Promise((ok) => up.listen(0, '127.0.0.1', ok));
  c.sites = ['http://127.0.0.1:' + up.address().port + '/'];
  await UP.check(c, (ev) => events.push(ev)); up.close();
  assert.deepEqual(events, ['down', 'up']); const U = UP.summary(c.id); assert.equal(U.down, false); assert.equal(U.checks, 3); assert.equal(U.uptimePct, 33.33);
  // plano anual: 12 pagos = 14 meses, valor 12 × mensalidade
  const paidBefore = c.paidUntil;
  await fetch(base() + '/admin/c/' + id + '/pay', { method: 'POST', redirect: 'manual', headers: { cookie: ck }, body: new URLSearchParams({ months: '12', method: 'virement' }) });
  const pay = store.db.payments.find((p) => p.clientId === id);
  assert.equal(pay.months, 14); assert.equal(pay.amount, 4000 * 12); assert.equal(c.paidUntil, B.addDays(B.addMonths(B.addDays(paidBefore, 1), 14, c.dueDay), -1));
  // carteirinha mostra disponibilidade, negócio e plano anual
  const html = await (await fetch(base() + '/c/' + c.token)).text();
  assert.match(html, /Disponibilidade do site/); assert.match(html, /Plano anual/); assert.match(html, /480\s€/);
});

test('backup: o arquivo baixado contém clientes, pagamentos, visitas e monitoramento', async () => {
  const BK = require('../lib/backup'); require('../lib/stats').flush(); UP.flush();
  const snap = BK.snapshot();
  assert.ok(snap.db.clients.length >= 1); assert.ok(snap.db.payments.length >= 1);
  assert.ok(Object.keys(snap.stats).length >= 1); assert.ok(Object.keys(snap.uptime).length >= 1);
  assert.deepEqual(await BK.toGitHub(), { skipped: true }); assert.deepEqual(await BK.toEmail(), { skipped: true });
});
