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
    beneficiary: 'Matheus Duarte',
    whatsapp: '+32 470 83 51 86',
    email: 'contact@drtcreation.com',
  },
  clients: [],
  payments: [],
  events: [],
});

let db = null;

function load() {
  try { fs.mkdirSync(DIR, { recursive: true }); } catch (e) { /* ok */ }
  try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { db = DEFAULTS(); save(); }
  const d = DEFAULTS();
  db.settings = { ...d.settings, ...(db.settings || {}) };
  for (const k of ['clients', 'payments', 'events']) if (!Array.isArray(db[k])) db[k] = [];
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
