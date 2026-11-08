'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'drt-pp-'));
process.env.ADMIN_PASSWORD = 'senha-de-teste-123';
process.env.PORT = '0';
const { server } = require('../server');
const PP = require('../lib/proposal');
const base = () => 'http://127.0.0.1:' + server.address().port;
const wait = () => new Promise((r) => (server.listening ? r() : server.once('listening', r)));
const dbf = () => JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'db.json'), 'utf8'));

test('proposta: sugestão a partir do briefing', () => {
  const b = { id: 'b1', lang: 'pt', answers: { company: 'Barber X', contact: 'Rui Lima', need: ['site', 'booking'], goals: ['bookings', 'google'], langs: ['fr', 'pt', 'nl'], pages: ['home', 'about', 'menu', 'gallery', 'team', 'reviews', 'contact'], texts: 'drt', photos: 'have', identity: 'logo', gbp: 'no' } };
  const p = PP.suggest(b, {}, 'P2026-001');
  const ks = p.items.map((i) => i.k);
  assert.deepEqual(ks, ['site', 'page', 'lang', 'booking', 'copy', 'gbp']);
  assert.equal(p.items.find((i) => i.k === 'page').qty, 2); assert.equal(p.items.find((i) => i.k === 'lang').qty, 2);
  assert.equal(p.plan, 'systeme'); assert.equal(p.weeks, 5); assert.equal(p.monthly, 249);
  assert.match(p.intro, /receber mais reservas e aparecer no Google/);
  assert.equal(PP.totals(p).setup, 1200 + 300 + 500 + 600 + 250 + 200);
  const p2 = PP.suggest(b, { catalogPrices: { site: 1500 } }, 'x'); assert.equal(p2.items[0].price, 1500);
});

test('proposta: criar do briefing, editar, rascunho fechado, enviar, ver, aceitar', async (t) => {
  await wait(); t.after(() => server.close());
  const ck = (await fetch(base() + '/admin/login', { method: 'POST', redirect: 'manual', body: new URLSearchParams({ password: 'senha-de-teste-123' }) })).headers.get('set-cookie').split(';')[0];
  const H = { headers: { cookie: ck } };
  const post = (u, data, h = {}) => fetch(base() + u, { method: 'POST', redirect: 'manual', headers: { cookie: ck, ...h }, body: data instanceof URLSearchParams ? data : new URLSearchParams(data) });
  await post('/admin/prospects', { name: 'Café Bom', phone: '0470 00 00 09', lang: 'fr', type: 'resto' });
  await fetch(base() + '/briefing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ms: 20000, lang: 'fr', answers: { company: 'Café Bom', contact: 'Léa Martin', email: 'lea@example.com', phone: '0470 00 00 09', need: ['site'], features: ['order'], goals: ['sell'], consent: '1' } }) });
  let d = dbf(); const b = d.briefings[0];
  assert.match(await (await fetch(base() + '/admin/briefings/' + b.id, H)).text(), /Criar proposta/);
  const r = await post('/admin/briefings/' + b.id + '/proposal', {});
  const pid = r.headers.get('location').split('/')[3].split('?')[0];
  d = dbf(); const pp = d.proposals[0];
  assert.equal(pp.id, pid); assert.equal(pp.no, 'P' + new Date().getFullYear() + '-001'); assert.equal(pp.status, 'draft'); assert.equal(pp.prospectId, d.prospects[0].id);
  assert.match(await (await fetch(base() + '/admin/proposals/' + pid, H)).text(), /Commande en ligne/);
  // rascunho: cliente não vê
  assert.equal((await fetch(base() + '/p/' + pp.token)).status, 404);
  // editar: troca preços e itens
  const f = new URLSearchParams({ lang: 'fr', validUntil: '2099-01-01', company: 'Café Bom', contact: 'Léa Martin', email: 'lea@example.com', phone: '0470 00 00 09', vat: '', intro: 'Intro <b>x</b>', plan: 'site', monthly: '79', weeks: '6', payTerms: '50/50', aid: '1', notes: '' });
  for (const [l, q, pr] of [['Site vitrine', '1', '1100'], ['Commande en ligne', '1', '850,50']]) { f.append('il', l); f.append('id', 'desc'); f.append('iq', q); f.append('ip', pr); }
  await post('/admin/proposals/' + pid, f);
  d = dbf(); assert.equal(PP.totals(d.proposals[0]).setup, 1950.5); assert.equal(d.proposals[0].monthly, 79);
  // enviar por WhatsApp: abre wa.me e o prospect vira "proposta enviada"
  const s = await post('/admin/proposals/' + pid + '/send', { via: 'whatsapp' });
  assert.match(s.headers.get('location'), /^https:\/\/wa\.me\/32470000009\?text=Bonjour%20L%C3%A9a/);
  d = dbf(); assert.equal(d.proposals[0].status, 'sent'); assert.equal(d.prospects[0].status, 'proposal');
  // cliente abre
  const view = await (await fetch(base() + '/p/' + pp.token)).text();
  assert.match(view, /1\s?950,50\s?€/); assert.match(view, /Intro &lt;b&gt;x&lt;\/b&gt;/); assert.match(view, /790\s?€/); assert.match(view, /Accepter la proposition/); assert.match(view, /art\. 56bis/);
  d = dbf(); assert.equal(d.proposals[0].status, 'viewed'); assert.equal(d.proposals[0].views, 1);
  // aceitar
  const a = await fetch(base() + '/p/' + pp.token + '/accept', { method: 'POST', redirect: 'manual', body: new URLSearchParams({ name: 'Léa Martin', ok: '1' }) });
  assert.equal(a.status, 303);
  d = dbf(); assert.equal(d.proposals[0].status, 'accepted'); assert.equal(d.proposals[0].acceptedBy, 'Léa Martin'); assert.equal(d.prospects[0].status, 'won');
  assert.match(await (await fetch(base() + '/p/' + pp.token)).text(), /Proposition acceptée/);
  // catálogo
  await post('/admin/catalog', { c_site: '1400', c_logo: 'abc' });
  d = dbf(); assert.equal(d.settings.catalogPrices.site, 1400); assert.equal(d.settings.catalogPrices.logo, undefined);
});
