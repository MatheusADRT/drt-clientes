'use strict';
// Cópia de segurança fora do servidor. Três caminhos, independentes:
//   - botão "Baixar backup" no painel (sempre disponível): um arquivo .json com tudo
//   - GitHub: todo dia, grava o backup num repositório privado (GITHUB_BACKUP_REPO = "usuario/repo", GITHUB_TOKEN)
//   - E-mail: toda segunda, manda o backup em anexo para ADMIN_EMAIL (precisa do e-mail configurado)
const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');
const store = require('./store');
const B = require('./billing');
const NT = require('./notify');

function readDir(dir) { const out = {}; try { for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) out[f] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { /* vazio */ } return out; }
// tudo que a central sabe, num único objeto
function snapshot() {
  return { version: 1, at: new Date().toISOString(), db: store.db, stats: readDir(path.join(store.DIR, 'stats')), uptime: readDir(path.join(store.DIR, 'uptime')) };
}
function request(opts, body) {
  return new Promise((resolve) => {
    const req = https.request(opts, (res) => { let b = ''; res.on('data', (c) => { if (b.length < 100000) b += c; }); res.on('end', () => resolve({ code: res.statusCode, body: b })); });
    req.on('error', (e) => resolve({ code: 0, body: e.message })); req.setTimeout(20000, () => req.destroy()); if (body) req.write(body); req.end();
  });
}
async function toGitHub() {
  const repo = process.env.GITHUB_BACKUP_REPO, token = process.env.GITHUB_TOKEN; if (!repo || !token) return { skipped: true };
  const day = B.today(); const file = `backups/${day.slice(0, 7)}/drt-clientes-${day}.json.gz`;
  const content = zlib.gzipSync(Buffer.from(JSON.stringify(snapshot()))).toString('base64');
  const H = { 'User-Agent': 'drt-clientes', Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };
  const cur = await request({ host: 'api.github.com', path: `/repos/${repo}/contents/${file}`, method: 'GET', headers: H });
  let sha; try { sha = JSON.parse(cur.body).sha; } catch (e) { /* novo */ }
  const r = await request({ host: 'api.github.com', path: `/repos/${repo}/contents/${file}`, method: 'PUT', headers: H }, JSON.stringify({ message: 'backup ' + day, content, ...(sha ? { sha } : {}) }));
  return { ok: r.code === 200 || r.code === 201, code: r.code };
}
async function toEmail() {
  if (!NT.mailOn() || !process.env.ADMIN_EMAIL) return { skipped: true };
  const day = B.today(); const snap = snapshot();
  const n = (snap.db.clients || []).length;
  const r = await NT.email(process.env.ADMIN_EMAIL, `Backup da central de clientes · ${day}`, `<p>Cópia de segurança de ${day}: ${n} cliente(s), ${(snap.db.payments || []).length} pagamento(s). Guarde este e-mail.</p>`, `Backup ${day}`);
  // anexo: a API da Resend aceita "attachments" no mesmo pedido; mandamos num segundo pedido para manter o módulo de e-mail simples
  if (r.ok) await NT.emailRaw({ from: process.env.MAIL_FROM, to: [process.env.ADMIN_EMAIL], subject: `Backup (arquivo) · ${day}`, text: 'Arquivo em anexo.', attachments: [{ filename: `drt-clientes-${day}.json`, content: Buffer.from(JSON.stringify(snap)).toString('base64') }] });
  return r;
}
async function daily() {
  const g = await toGitHub(); if (!g.skipped) store.log('backup', null, g.ok ? 'Backup gravado no GitHub' : 'Falha no backup para o GitHub (' + g.code + ')');
  const wd = new Intl.DateTimeFormat('en-GB', { timeZone: B.TZ, weekday: 'short' }).format(new Date());
  if (wd === 'Mon') { const e = await toEmail(); if (!e.skipped) store.log('backup', null, e.ok ? 'Backup enviado por e-mail' : 'Falha no backup por e-mail'); }
  store.save();
}
module.exports = { snapshot, toGitHub, toEmail, daily };
