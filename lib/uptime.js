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
const fresh = () => ({ days: {}, incidents: [], down: false, fails: 0, since: null, lastMs: null, lastAt: null, lastCode: null, ext: {} });
function load(id) { if (cache.has(id)) return cache.get(id); let d; try { d = JSON.parse(fs.readFileSync(file(id), 'utf8')); } catch (e) { d = { sites: {} }; } if (!d.sites) d = { sites: {} }; cache.set(id, d); return d; }
function site(id, url) { const d = load(id); if (!d.sites[url]) d.sites[url] = fresh(); return d.sites[url]; }
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
  const out = [];
  for (const url of (client.sites || []).slice(0, 6)) out.push(await checkOne(client, url, onChange));
  return out;
}
async function checkOne(client, url, onChange) {
  const d = site(client.id, url); const r = await probe(url);
  const k = B.today(); const D = d.days[k] = d.days[k] || { n: 0, fail: 0, ms: 0 };
  D.n++; if (!r.ok) D.fail++; else D.ms += r.ms;
  d.lastMs = r.ok ? r.ms : null; d.lastAt = new Date().toISOString(); d.lastCode = r.code;
  const keys = Object.keys(d.days).sort(); while (keys.length > 400) delete d.days[keys.shift()];
  if (r.ok) {
    d.fails = 0; if (!d.since) d.since = d.lastAt;
    if (d.down) { d.down = false; const inc = d.incidents[d.incidents.length - 1]; if (inc && !inc.end) inc.end = d.lastAt; if (onChange) onChange('up', client, { ...inc, url }); }
  } else {
    d.fails++;
    if (!d.down && d.fails >= 2) { d.down = true; d.since = null; d.incidents.push({ start: d.lastAt, end: null, code: r.code }); if (d.incidents.length > 100) d.incidents.shift(); if (onChange) onChange('down', client, { code: r.code, url }); }
  }
  dirty.add(client.id); return r;
}

function external(id, url, loc, ok, ms) { const d = site(id, url); d.ext[loc] = { ok: !!ok, ms: Number(ms) || 0, at: new Date().toISOString() }; const k = B.today(); d.days[k] = d.days[k] || { n: 0, fail: 0, ms: 0 }; d.days[k].extN = (d.days[k].extN || 0) + 1; if (!ok) d.days[k].extFail = (d.days[k].extFail || 0) + 1; dirty.add(id); }
function summary(id, n = 30) {
  const d = load(id); const today = B.today(); const sites = [];
  let N = 0, F = 0, MS = 0, OK = 0, anyDown = false, inc30 = 0, upDays = null, extN = 0, extF = 0;
  for (const [url, x] of Object.entries(d.sites)) {
    let sn = 0, sf = 0, sms = 0, sok = 0;
    for (let i = 0; i < n; i++) { const y = x.days[B.addDays(today, -i)]; if (!y) continue; sn += y.n; sf += y.fail; sms += y.ms; sok += y.n - y.fail; extN += y.extN || 0; extF += y.extFail || 0; }
    N += sn; F += sf; MS += sms; OK += sok; if (x.down) anyDown = true;
    inc30 += x.incidents.filter((z) => Date.parse(z.start) > Date.now() - n * 86400000).length;
    const ud = x.since ? Math.floor((Date.now() - Date.parse(x.since)) / 86400000) : 0; upDays = upDays == null ? ud : Math.min(upDays, ud);
    sites.push({ url, down: x.down, uptimePct: sn ? Math.round((sn - sf) / sn * 10000) / 100 : null, avgMs: sok ? Math.round(sms / sok) : null, lastMs: x.lastMs, ext: x.ext || {} });
  }
  const last = Object.values(d.sites).flatMap((x) => x.incidents).sort((a, b) => b.start.localeCompare(a.start))[0] || null;
  return { hasData: N > 0, checks: N, uptimePct: N ? Math.round((N - F) / N * 10000) / 100 : null, avgMs: OK ? Math.round(MS / OK) : null, down: anyDown, upDays: upDays || 0, lastIncident: last, incidents30: inc30, sites, extPct: extN ? Math.round((extN - extF) / extN * 10000) / 100 : null, extLocs: [...new Set(Object.values(d.sites).flatMap((x) => Object.keys(x.ext || {})))] };
}

// por dia, por site: fração de testes OK (null = sem testes) — para as barrinhas de disponibilidade
function daily(id, n = 30) {
  const d = load(id); const today = B.today();
  return Object.entries(d.sites).map(([url, x]) => ({ url, down: x.down, lastMs: x.lastMs, days: Array.from({ length: n }, (_, i) => { const k = B.addDays(today, -(n - 1 - i)); const y = x.days[k]; return [k, y && y.n ? (y.n - y.fail) / y.n : null, y && (y.n - y.fail) ? Math.round(y.ms / (y.n - y.fail)) : null]; }), incidents: x.incidents.slice(-5).reverse() }));
}
module.exports = { check, checkOne, external, summary, daily, flush, probe };
