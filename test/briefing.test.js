'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'drt-bf-'));
process.env.ADMIN_PASSWORD = 'senha-de-teste-123';
process.env.PORT = '0';
const { server } = require('../server');
const base = () => 'http://127.0.0.1:' + server.address().port;
const wait = () => new Promise((r) => (server.listening ? r() : server.once('listening', r)));
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('briefing: formulário nas 4 línguas, envio, validação, painel, arquivo, cadastro e exclusão', async (t) => {
  await wait(); t.after(() => server.close());
  for (const l of ['fr', 'pt', 'en', 'nl']) {
    const h = await (await fetch(base() + '/briefing?lang=' + l)).text();
    assert.match(h, /<form id="bf"/); assert.match(h, new RegExp('lang="' + l + '"'));
  }
  const post = (body) => fetch(base() + '/briefing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  // robô (campo escondido) e envio rápido demais: respondem ok mas não gravam
  assert.equal((await post({ website: 'x', ms: 99999, answers: {} })).status, 200);
  assert.equal((await post({ ms: 500, answers: {} })).status, 200);
  // faltando obrigatórios
  const bad = await post({ ms: 20000, lang: 'fr', answers: { company: 'X' } });
  assert.equal(bad.status, 400); assert.ok((await bad.json()).fields.includes('email'));
  const ok = await post({ ms: 30000, lang: 'pt', answers: { company: 'Café Teste', contact: 'Ana Silva', email: 'ana@example.com', phone: '+32 470 00 00 00', need: ['site', 'booking', 'hack'], need_other: '', goals: ['google', 'sell', 'image', 'time'], budget: 'unknown', consent: '1', vat: 'BE 0123.456.789', currentSite: 'cafe-teste.be' }, files: [{ name: 'logo.png', type: 'image/png', data: PNG }, { name: '../../evil.sh', type: 'text/x-sh', data: Buffer.from('rm -rf').toString('base64') }] });
  assert.equal(ok.status, 200);
  const db = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'db.json'), 'utf8'));
  assert.equal(db.briefings.length, 1);
  const b = db.briefings[0];
  assert.deepEqual(b.answers.need, ['site', 'booking']); // opção desconhecida descartada
  assert.equal(b.answers.goals.length, 3); // no máximo 3
  assert.equal(b.files.length, 2); assert.equal(b.files[1].type, 'application/octet-stream'); assert.ok(!b.files[1].file.includes('/'));
  assert.ok(fs.existsSync(path.join(process.env.DATA_DIR, 'briefings', b.id, b.files[0].file)));
  // painel
  assert.equal((await fetch(base() + '/admin/briefings', { redirect: 'manual' })).status, 200); // tela de login, sem dados
  assert.doesNotMatch(await (await fetch(base() + '/admin/briefings')).text(), /Café Teste/);
  const ck = (await fetch(base() + '/admin/login', { method: 'POST', redirect: 'manual', body: new URLSearchParams({ password: 'senha-de-teste-123' }) })).headers.get('set-cookie').split(';')[0];
  const H = { headers: { cookie: ck } };
  assert.match(await (await fetch(base() + '/admin', H)).text(), /Briefings novos \(1\)/);
  assert.match(await (await fetch(base() + '/admin/briefings', H)).text(), /Café Teste/);
  const det = await (await fetch(base() + '/admin/briefings/' + b.id, H)).text();
  assert.match(det, /Um site novo · Reservas \/ agendamentos/); assert.match(det, /Ainda não sei/);
  const f0 = await fetch(base() + '/admin/briefings/' + b.id + '/f/0', H);
  assert.equal(f0.headers.get('content-type'), 'image/png');
  assert.equal((await fetch(base() + '/admin/briefings/' + b.id + '/f/1', H)).headers.get('content-disposition').startsWith('attachment'), true);
  assert.match(await (await fetch(base() + '/admin/new?from=' + b.id, H)).text(), /value="Café Teste"[\s\S]*value="ana@example.com"[\s\S]*https:\/\/cafe-teste\.be/);
  await fetch(base() + '/admin/briefings/' + b.id + '/status', { method: 'POST', redirect: 'manual', headers: { cookie: ck }, body: new URLSearchParams({ status: 'contacted', note: 'ligar terça' }) });
  assert.match(await (await fetch(base() + '/admin/briefings/' + b.id, H)).text(), /selected>Contatado[\s\S]*ligar terça/);
  await fetch(base() + '/admin/briefings/' + b.id + '/delete', { method: 'POST', redirect: 'manual', headers: { cookie: ck } });
  assert.equal(JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'db.json'), 'utf8')).briefings.length, 0);
  assert.ok(!fs.existsSync(path.join(process.env.DATA_DIR, 'briefings', b.id)));
});
