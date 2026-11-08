'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'drt-ct-'));
process.env.ADMIN_PASSWORD = 'senha-de-teste-123';
process.env.PORT = '0';
const { server } = require('../server');
const PP = require('../lib/proposal');
const base = () => 'http://127.0.0.1:' + server.address().port;
const wait = () => new Promise((r) => (server.listening ? r() : server.once('listening', r)));
const dbf = () => JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'db.json'), 'utf8'));

test('indicação → briefing → proposta → aceite sem entrada → contrato assinado → mês grátis → cliente cadastrado', async (t) => {
  await wait(); t.after(() => server.close());
  const ck = (await fetch(base() + '/admin/login', { method: 'POST', redirect: 'manual', body: new URLSearchParams({ password: 'senha-de-teste-123' }) })).headers.get('set-cookie').split(';')[0];
  const H = { headers: { cookie: ck } };
  const post = (u, data) => fetch(base() + u, { method: 'POST', redirect: 'manual', headers: { cookie: ck }, body: new URLSearchParams(data) });
  // cliente que indica
  const r0 = await post('/admin/clients', { name: 'Barbearia Mãe', plan: 'site', amount: '69', dueDay: '1', firstDue: '2026-12-01', lang: 'pt', email: 'mae@example.com' });
  const refId = r0.headers.get('location').split('/')[3].split('?')[0]; assert.equal(dbf().clients[0].no, 104); // 103 é o modelo
  const before = dbf().clients.find((c) => c.id === refId).paidUntil;
  const esp = await (await fetch(base() + '/admin/c/' + refId + '/espace', H)).text();
  assert.match(esp, /Indicações/); assert.match(esp, /1 mês grátis para cada negócio/);
  const code = dbf().clients.find((c) => c.id === refId).refCode; assert.match(code, /^[a-z0-9]{6}$/);
  assert.ok(esp.includes('/r/' + code));
  // link curto → briefing com o selo
  const r1 = await fetch(base() + '/r/' + code, { redirect: 'manual' });
  assert.equal(r1.headers.get('location'), '/briefing?ref=' + code + '&lang=pt');
  assert.match(await (await fetch(base() + r1.headers.get('location'))).text(), /Indicado por <b>Barbearia Mãe<\/b>/);
  assert.equal((await fetch(base() + '/r/zzzzzz', { redirect: 'manual' })).headers.get('location'), '/briefing');
  await fetch(base() + '/briefing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ms: 20000, lang: 'fr', ref: code, answers: { company: 'Snack Neuf', contact: 'Ali Ben', email: 'ali@example.com', phone: '0470 11 22 33', need: ['site'], consent: '1', vat: 'BE 0999.888.777', address: 'Rue X 1, 1060 Saint-Gilles' } }) });
  let d = dbf(); const b = d.briefings[0]; assert.equal(b.referrerId, refId); assert.equal(b.answers.ref, undefined);
  assert.match(await (await fetch(base() + '/admin/briefings/' + b.id, H)).text(), /Indicado por <b>Barbearia Mãe/);
  // proposta (com e sem entrada) → enviada → aceita "sem entrada"
  const rp = await post('/admin/briefings/' + b.id + '/proposal', {});
  const pid = rp.headers.get('location').split('/')[3].split('?')[0];
  await post('/admin/proposals/' + pid + '/status', { status: 'sent' });
  d = dbf(); const pp = d.proposals[0]; assert.equal(pp.referrerId, refId); assert.equal(pp.financing, 'both');
  assert.equal((await fetch(base() + '/p/' + pp.token + '/contrat', { redirect: 'manual' })).headers.get('location'), '/p/' + pp.token); // ainda não aceita
  const sem = await fetch(base() + '/p/' + pp.token + '/accept', { method: 'POST', redirect: 'manual', body: new URLSearchParams({ name: 'Ali Ben', ok: '1' }) }); // falta escolher a forma
  assert.equal(dbf().proposals[0].status, 'sent'); assert.equal(sem.status, 303);
  const ac = await fetch(base() + '/p/' + pp.token + '/accept', { method: 'POST', redirect: 'manual', body: new URLSearchParams({ name: 'Ali Ben', ok: '1', opt: 'monthly' }) });
  assert.equal(ac.headers.get('location'), '/p/' + pp.token + '/contrat');
  d = dbf(); const p2 = d.proposals[0]; assert.equal(p2.contractNo, 105); assert.equal(p2.acceptedOption, 'monthly');
  const tt = PP.totals(p2);
  const ct = await (await fetch(base() + '/p/' + pp.token + '/contrat')).text();
  assert.match(ct, /DRT-105/); assert.match(ct, /Snack Neuf/); assert.match(ct, /BE 0999\.888\.777/); assert.match(ct, new RegExp('<b>' + tt.sub + '</b> € / mois</span> pendant 24 mois'));
  assert.match(ct, /<b>Sans apport<\/b>/); assert.match(ct, /Assinar eletronicamente|Signer électroniquement/); assert.doesNotMatch(ct, /\{\{NO\}\}/);
  assert.match(await (await fetch(base() + '/p/' + pp.token)).text(), /Voir et signer le contrat/);
  // assinatura
  assert.equal((await fetch(base() + '/p/' + pp.token + '/sign', { method: 'POST', redirect: 'manual', body: new URLSearchParams({ name: 'Ali Ben' }) })).status, 303);
  assert.equal(dbf().proposals[0].contract, undefined); // sem "lu et approuvé" não assina
  await fetch(base() + '/p/' + pp.token + '/sign', { method: 'POST', redirect: 'manual', body: new URLSearchParams({ name: 'Ali Ben', ok: '1' }) });
  await fetch(base() + '/p/' + pp.token + '/sign', { method: 'POST', redirect: 'manual', body: new URLSearchParams({ name: 'Outro', ok: '1' }) }); // segunda vez não muda nada
  d = dbf(); const p3 = d.proposals[0]; assert.equal(p3.contract.signedBy, 'Ali Ben'); assert.ok(p3.referralRewarded);
  const mae = d.clients.find((c) => c.id === refId); assert.equal(mae.referrals.length, 1); assert.ok(mae.paidUntil > before);
  assert.match(await (await fetch(base() + '/p/' + pp.token + '/contrat')).text(), /Signé électroniquement par Ali Ben/);
  assert.match(await (await fetch(base() + '/admin/c/' + refId + '/espace', H)).text(), /Assinou · 1 mês grátis ✓/);
  // cadastro em um clique
  const cr = await post('/admin/proposals/' + pid + '/client', {});
  d = dbf(); const nc = d.clients.find((c) => c.no === 105);
  assert.ok(nc); assert.equal(cr.headers.get('location').split('?')[0], '/admin/c/' + nc.id);
  assert.equal(nc.override, 'paused'); assert.equal(nc.amount, tt.sub * 100); assert.equal(nc.referredBy, refId); assert.match(nc.notes, /SEM ENTRADA/);
  assert.equal((await post('/admin/proposals/' + pid + '/client', {})).headers.get('location'), '/admin/c/' + nc.id); // não duplica
  assert.equal(dbf().clients.length, 2);
  // painel do novo cliente aponta para o contrato online
  assert.ok((await (await fetch(base() + '/admin/c/' + nc.id + '/espace', H)).text()).includes('/p/' + pp.token + '/contrat'));
});
