'use strict';
// Monitoramento: a cada 5 minutos testa o primeiro endereço de cada cliente. Guarda por dia: testes, falhas, tempo de resposta,
// e os incidentes (início/fim). Dois testes seguidos com falha = site fora do ar → alerta; volta → alerta de recuperação.
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const store = require('./store');
const B = require('./billing');

const DIR = path.join(store.DIR, 'uptime');
const cache = new Map();
let dirty = new Set();
function file(id) { return path.join(DIR, id.replace(/[^A-Za-z0-9_-]/g, '') + '.json'); }
function load(id) { if (cache.has(id)) return cache.get(id); let d; try { d = JSON.parse(fs.readFileSync(file(id), 'utf8')); } catch (e) { d = { days: {}, incidents: [], down: false, fails: 0, since: null, lastMs: null, lastAt: null, lastCode: null }; } cache.set(id, d); return d; }
function flush() { if (!dirty.size) return; try { fs.mkdirSync(DIR, { recursive: true }); } catch (e) { /* ok */ } for (const id of dirty) { try { const tmp = file(id) + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(cache.get(id))); fs.renameSync(tmp, file(id)); } catch (e) { console.error('[uptime]', e.message); } } dirty = new Set(); }

function probe(url) {
  return new Promise((resolve) => {
    const t0 = Date.now(); let u; try { u = new URL(url); } catch (e) { return resolve({ ok: false, code: 0, ms: 0 }); }
    const req = (u.protocol === 'http:' ? http : https).get(u, { timeout: 15000, headers: { 'User-Agent': 'DRT-Monitor/1.0 (+https://www.drtcreation.com)', Accept: 'text/html' } }, (res) => {
      res.resume(); const code = res.statusCode;
      // 503 da nossa própria página de pausa conta como "no ar" (o servidor responde; a pausa é nossa)
      res.on('end', () => resolve({ ok: (code >= 200 && code < 400) || code === 503, code, ms: Date.now() - t0 }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, code: 0, ms: Date.now() - t0 }); });
    req.on('error', () => resolve({ ok: false, code: 0, ms: Date.now() - t0 }));
  });
}

async function check(client, onChange) {
  const url = (client.sites || [])[0]; if (!url) return null;
  const d = load(client.id); const r = await probe(url);
  const k = B.today(); const D = d.days[k] = d.days[k] || { n: 0, fail: 0, ms: 0 };
  D.n++; if (!r.ok) D.fail++; else D.ms += r.ms;
  d.lastMs = r.ok ? r.ms : null; d.lastAt = new Date().toISOString(); d.lastCode = r.code;
  const keys = Object.keys(d.days).sort(); while (keys.length > 400) delete d.days[keys.shift()];
  if (r.ok) {
    d.fails = 0; if (!d.since) d.since = d.lastAt;
    if (d.down) { d.down = false; const inc = d.incidents[d.incidents.length - 1]; if (inc && !inc.end) inc.end = d.lastAt; if (onChange) onChange('up', client, inc); }
  } else {
    d.fails++;
    if (!d.down && d.fails >= 2) { d.down = true; d.since = null; d.incidents.push({ start: d.lastAt, end: null, code: r.code }); if (d.incidents.length > 100) d.incidents.shift(); if (onChange) onChange('down', client, { code: r.code }); }
  }
  dirty.add(client.id); return r;
}

function summary(id, n = 30) {
  const d = load(id); const today = B.today();
  let N = 0, F = 0, MS = 0, OK = 0;
  for (let i = 0; i < n; i++) { const x = d.days[B.addDays(today, -i)]; if (!x) continue; N += x.n; F += x.fail; MS += x.ms; OK += x.n - x.fail; }
  const last = d.incidents[d.incidents.length - 1] || null;
  const upDays = d.since ? Math.floor((Date.now() - Date.parse(d.since)) / 86400000) : 0;
  return { hasData: N > 0, checks: N, uptimePct: N ? Math.round((N - F) / N * 10000) / 100 : null, avgMs: OK ? Math.round(MS / OK) : null, down: d.down, upDays, lastMs: d.lastMs, lastAt: d.lastAt, lastIncident: last, incidents30: d.incidents.filter((x) => Date.parse(x.start) > Date.now() - n * 86400000).length };
}

module.exports = { check, summary, flush, probe };
