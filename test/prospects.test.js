'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'drt-pr-'));
process.env.ADMIN_PASSWORD = 'senha-de-teste-123';
process.env.PORT = '0';
const { server } = require('../server');
const PR = require('../lib/prospects');
const base = () => 'http://127.0.0.1:' + server.address().port;
const wait = () => new Promise((r) => (server.listening ? r() : server.once('listening', r)));
const dbf = () => JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'db.json'), 'utf8'));

test('prospects: números, mensagens e colagem', () => {
  assert.equal(PR.waNumber('0470 12 34 56'), '32470123456');
  assert.equal(PR.waNumber('+32 470 12 34 56'), '32470123456');
  assert.equal(PR.waNumber('0032 470 12 34 56'), '32470123456');
  const rows = PR.parseBulk('Sushi Bairro; Saint-Gilles; 0470 12 34 56; restaurante; @sb\nBarber King\tIxelles\t0485112233\tbarbearia\n\nx', { area: 'Forest', type: 'other', lang: 'fr' });
  assert.equal(rows.length, 2); assert.equal(rows[0].type, 'resto'); assert.equal(rows[1].type, 'beauty'); assert.equal(rows[1].area, 'Ixelles');
  const p = { name: 'Barber King', type: 'beauty', lang: 'pt', status: 'todo' };
  assert.match(PR.message(p, 'intro', 'https://x/briefing'), /marcolabarbershop\.com/);
  assert.match(PR.message({ ...p, lang: 'fr' }, 'briefing', 'https://x/briefing'), /https:\/\/x\/briefing\?lang=fr/);
});

test('prospects: painel, WhatsApp em um toque, follow-ups e ligação com o briefing', async (t) => {
  await wait(); t.after(() => server.close());
  assert.doesNotMatch(await (await fetch(base() + '/admin/prospects')).text(), /Prospects<\/h1>/); // sem login
  const ck = (await fetch(base() + '/admin/login', { method: 'POST', redirect: 'manual', body: new URLSearchParams({ password: 'senha-de-teste-123' }) })).headers.get('set-cookie').split(';')[0];
  const post = (u, data) => fetch(base() + u, { method: 'POST', redirect: 'manual', headers: { cookie: ck }, body: new URLSearchParams(data) });
  const b = new URLSearchParams({ name: 'Café Teste', type: 'resto', area: 'Saint-Gilles', phone: '0470 00 00 01', lang: 'pt', channel: 'whatsapp' }); b.append('signals', 'nosite'); b.append('signals', 'hack');
  await fetch(base() + '/admin/prospects', { method: 'POST', redirect: 'manual', headers: { cookie: ck }, body: b });
  const r = await post('/admin/prospects/bulk', { lines: 'Barber King; Ixelles; 0485 11 22 33; barbearia\nCafé Teste; ; 0470000001', lang: 'fr', type: 'other' });
  assert.match(decodeURIComponent(r.headers.get('location')), /1 adicionado\(s\) · 1 já estava/);
  let d = dbf(); assert.equal(d.prospects.length, 2);
  const cafe = d.prospects.find((x) => x.name === 'Café Teste'); assert.deepEqual(cafe.signals, ['nosite']);
  const page = await (await fetch(base() + '/admin/prospects?s=todo', { headers: { cookie: ck } })).text();
  assert.match(page, /Café Teste/); assert.match(page, /Mandar 1ª mensagem/);
  // 1ª mensagem: abre o WhatsApp com o texto e registra
  const s1 = await post('/admin/prospects/' + cafe.id + '/act', { a: 'sent', kind: 'intro' });
  assert.match(s1.headers.get('location'), /^https:\/\/wa\.me\/32470000001\?text=Oi/);
  d = dbf(); let c = d.prospects.find((x) => x.id === cafe.id);
  assert.equal(c.status, 'contacted'); assert.equal(c.nextAt, PR.addDays(PR.today(), 3));
  assert.match(await (await fetch(base() + '/admin/prospects', { headers: { cookie: ck } })).text(), /1<span class="muted" style="font-size:15px"> \/ 20/);
  await post('/admin/prospects/' + cafe.id + '/act', { a: 'replied' });
  assert.equal(PR.nextKind(dbf().prospects.find((x) => x.id === cafe.id)), 'briefing');
  const s2 = await post('/admin/prospects/' + cafe.id + '/act', { a: 'sent', kind: 'briefing' });
  assert.match(decodeURIComponent(s2.headers.get('location')), /\/briefing\?lang=pt/);
  // briefing chega com o mesmo telefone → prospect vira "briefing recebido"
  const bf = await fetch(base() + '/briefing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ms: 20000, lang: 'pt', answers: { company: 'Cafe Teste Lda', contact: 'Ana', email: 'ana@example.com', phone: '+32 470 00 00 01', need: ['site'], consent: '1' } }) });
  assert.equal(bf.status, 200);
  d = dbf(); c = d.prospects.find((x) => x.id === cafe.id);
  assert.equal(c.status, 'briefing'); assert.equal(c.briefingId, d.briefings[0].id); assert.equal(d.briefings[0].prospectId, c.id);
  // 3 lembretes sem resposta → arquivado
  const bk = d.prospects.find((x) => x.name === 'Barber King');
  await post('/admin/prospects/' + bk.id + '/act', { a: 'sent', kind: 'intro' });
  for (let i = 0; i < 3; i++) await post('/admin/prospects/' + bk.id + '/act', { a: 'sent', kind: 'reminder' });
  assert.equal(dbf().prospects.find((x) => x.id === bk.id).status, 'lost');
  // detalhe, edição e exclusão
  assert.match(await (await fetch(base() + '/admin/prospects/' + cafe.id, { headers: { cookie: ck } })).text(), /Mensagens prontas[\s\S]*Histórico[\s\S]*Briefing recebido/);
  await post('/admin/prospects/' + cafe.id, { name: 'Café Teste', type: 'resto', notes: 'ligar às 15h', nextAt: '2027-01-05' });
  assert.equal(dbf().prospects.find((x) => x.id === cafe.id).nextAt, '2027-01-05');
  await post('/admin/prospects/' + bk.id + '/delete', {});
  assert.equal(dbf().prospects.length, 1);
});
