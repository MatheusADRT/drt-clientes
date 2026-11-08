'use strict';
// Banco de dados em um arquivo JSON no disco permanente (/data). Gravação atômica + cópia diária.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DIR, 'db.json');

const DEFAULTS = () => ({
  settings: {
    graceDays: 3,
    reminderDays: 3,
    company: 'DRT Creation',
    iban: 'BE65 3632 8700 9296',
    bic: '',
    beneficiary: 'DRT Creation',
    whatsapp: '+32 470 83 51 86',
    email: 'contact@drtcreation.com',
  },
  clients: [],
  payments: [],
  events: [],
  requests: [],
  briefings: [],
  prospects: [],
  proposals: [],
  invoiceSeq: {},
});

let db = null;

function load() {
  try { fs.mkdirSync(DIR, { recursive: true }); } catch (e) { /* ok */ }
  try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { db = DEFAULTS(); save(); }
  const d = DEFAULTS();
  db.settings = { ...d.settings, ...(db.settings || {}) };
  if (!db.invoiceSeq || typeof db.invoiceSeq !== 'object') db.invoiceSeq = {};
  for (const k of ['clients', 'payments', 'events', 'requests', 'briefings', 'prospects', 'proposals']) if (!Array.isArray(db[k])) db[k] = [];
  // primeiro arranque: importa os clientes iniciais de seed.json (só se a base estiver vazia)
  if (!db.clients.length && !db.seeded && process.env.NODE_ENV !== 'test') {
    try {
      const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'seed.json'), 'utf8'));
      if (Array.isArray(seed) && seed.length) { db.clients = seed; db.seeded = new Date().toISOString(); log('client', null, seed.length + ' cliente(s) importado(s) do seed'); save(); }
    } catch (e) { /* sem seed */ }
  }
  // senhas iniciais da área do cliente (só hashes; aplicadas a quem ainda não tem senha)
  try {
    const ph = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'seed-passwords.json'), 'utf8'));
    let n = 0; for (const c of db.clients) if (!c.passHash && ph[c.id]) { c.passHash = ph[c.id]; n++; }
    if (n) save();
  } catch (e) { /* sem arquivo */ }
  // prospects encontrados automaticamente (prospects-import.json): entram uma vez só, pela chave
  if (process.env.NODE_ENV !== 'test') try {
    const PR = require('./prospects');
    const imp = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'prospects-import.json'), 'utf8'));
    if (!Array.isArray(db.prospects)) db.prospects = [];
    db.importedKeys = Array.isArray(db.importedKeys) ? db.importedKeys : [];
    const done = new Set(db.importedKeys); let n = 0;
    for (const r of Array.isArray(imp) ? imp : []) {
      if (!r || !r.key || done.has(r.key)) continue;
      const x = PR.create(r, id(6)); x.key = r.key; x.score = Number(r.score) || 0; x.source = r.source || 'google';
      if (r.rating) x.rating = r.rating; if (r.reviews) x.reviews = r.reviews;
      x.log[0].text = 'Encontrado automaticamente (' + (r.batch || 'Google Maps') + ')';
      db.prospects.push(x); db.importedKeys.push(r.key); done.add(r.key); n++;
    }
    if (n) { log('prospect', null, n + ' prospect(s) importado(s) automaticamente'); save(); }
  } catch (e) { if (e.code !== 'ENOENT') console.error('[prospects-import]', e.message); }
  return db;
}

function save() {
  const tmp = FILE + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, FILE);
}

function backup() {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const dir = path.join(DIR, 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const f = path.join(dir, 'db-' + day + '.json');
    if (!fs.existsSync(f)) fs.copyFileSync(FILE, f);
    // guarda os últimos 60 dias
    const files = fs.readdirSync(dir).filter((x) => /^db-\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort();
    for (const x of files.slice(0, Math.max(0, files.length - 60))) fs.unlinkSync(path.join(dir, x));
  } catch (e) { console.error('[backup]', e.message); }
}

const id = (n = 9) => crypto.randomBytes(n).toString('base64url');
function log(type, clientId, text) {
  db.events.unshift({ id: id(6), at: new Date().toISOString(), type, clientId: clientId || null, text });
  if (db.events.length > 500) db.events.length = 500;
}

module.exports = { load, save, backup, id, log, get db() { return db; }, DIR };
