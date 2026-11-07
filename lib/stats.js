'use strict';
// Audiência dos sites dos clientes, sem cookies e sem guardar IP.
// O visitante só é reconhecido dentro do dia, por um código (hash) com "sal" diário que é descartado no dia seguinte.
// Dois caminhos de entrada:
//   - /a.js + POST /api/a/<chave>      : script leve nos sites (WordPress, sites estáticos)
//   - POST /api/stats/<chave>          : sistemas que já medem sozinhos (Agito) mandam o resumo diário
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('./store');
const B = require('./billing');

const DIR = path.join(store.DIR, 'stats');
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|whatsapp|telegram|discord|skype|headless|lighthouse|pagespeed|gtmetrix|preview|python|curl|wget|axios|node-fetch|go-http|java|okhttp|phantom|puppeteer|playwright/i;
const cache = new Map(); // clientId → dados
const live = new Map();  // clientId → Map(sessão → {day, ms})
const rate = new Map();

const blank = () => ({ pv: 0, visitors: 0, sessions: 0, engMs: 0, engN: 0, ref: {}, dev: {}, lang: {}, pages: {}, hours: Array(24).fill(0) });
function file(id) { return path.join(DIR, id.replace(/[^A-Za-z0-9_-]/g, '') + '.json'); }
function load(id) {
  if (cache.has(id)) return cache.get(id);
  let d; try { d = JSON.parse(fs.readFileSync(file(id), 'utf8')); } catch (e) { d = { days: {}, today: null }; }
  cache.set(id, d); return d;
}
let dirty = new Set();
function save(id) { dirty.add(id); }
function flush() {
  if (!dirty.size) return;
  try { fs.mkdirSync(DIR, { recursive: true }); } catch (e) { /* ok */ }
  for (const id of dirty) { try { const tmp = file(id) + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(cache.get(id))); fs.renameSync(tmp, file(id)); } catch (e) { console.error('[stats]', e.message); } }
  dirty = new Set();
}
setInterval(flush, 15000).unref();

function day(d) {
  const k = B.today();
  if (!d.days[k]) d.days[k] = blank();
  if (!d.today || d.today.day !== k) d.today = { day: k, salt: crypto.randomBytes(16).toString('hex'), seen: [] };
  const keys = Object.keys(d.days).sort(); while (keys.length > 400) delete d.days[keys.shift()];
  return d.days[k];
}
const inc = (o, k, n = 1, max = 300) => { k = String(k).slice(0, 80); if (k === '__proto__' || !k) return; if (typeof o[k] !== 'number') { if (Object.keys(o).length >= max) return; o[k] = 0; } o[k] += n; };
function source(ref, host) {
  let h = ''; try { h = new URL(ref).hostname.replace(/^www\./, ''); } catch (e) { return 'Direct'; }
  if (!h || (host && h === String(host).replace(/^www\./, ''))) return null;
  if (/(^|\.)google\./.test(h)) return 'Google';
  if (/instagram\.com$/.test(h)) return 'Instagram';
  if (/facebook\.com$|fb\.me$/.test(h)) return 'Facebook';
  if (/tiktok\.com$/.test(h)) return 'TikTok';
  if (/whatsapp|wa\.me$/.test(h)) return 'WhatsApp';
  if (/bing\.com$/.test(h)) return 'Bing';
  if (/duckduckgo|yahoo|ecosia|qwant|brave/.test(h)) return 'Autres moteurs';
  if (/chatgpt|openai|perplexity|claude\.ai|gemini|copilot/.test(h)) return 'Assistants IA';
  return h.slice(0, 40);
}
function device(ua, w) {
  if (/iPad|Tablet|Nexus 7|SM-T/i.test(ua) || (w >= 700 && w < 1100 && /Mobile|Android/i.test(ua))) return 'Tablet';
  if (/Mobi|iPhone|Android/i.test(ua) || (w && w < 700)) return 'Mobile';
  return 'Desktop';
}

// evento vindo do script a.js
function record(clientId, ip, ua, body) {
  if (!body || typeof body !== 'object' || !ua || BOT.test(ua)) return false;
  const t = Date.now(); const r = (rate.get(ip) || []).filter((x) => t - x < 600000);
  if (r.length >= 300) return false; r.push(t); rate.set(ip, r);
  const s = String(body.s || ''); if (!/^[a-z0-9]{8,24}$/i.test(s)) return false;
  const d = load(clientId); const D = day(d);
  if (!live.has(clientId)) live.set(clientId, new Map());
  const L = live.get(clientId); let ses = L.get(s);
  if (body.e === 'pv') {
    if (ses) return true;
    const vh = crypto.createHash('sha256').update(d.today.salt + '|' + ip + '|' + ua).digest('hex').slice(0, 16);
    if (!d.today.seen.includes(vh)) { d.today.seen.push(vh); D.visitors++; }
    D.pv++; D.sessions++;
    const hr = Number(new Intl.DateTimeFormat('en-GB', { timeZone: B.TZ, hour: '2-digit', hourCycle: 'h23' }).format(new Date())); if (hr >= 0 && hr < 24) D.hours[hr]++;
    const src = source(String(body.r || ''), String(body.h || '')); if (src) inc(D.ref, src);
    inc(D.dev, device(ua, Number(body.w) || 0));
    inc(D.lang, String(body.l || '').slice(0, 2).toLowerCase() || '?', 1, 30);
    inc(D.pages, String(body.p || '/').split('?')[0].slice(0, 80), 1, 200);
    L.set(s, { day: D === d.days[d.today.day] ? d.today.day : B.today(), ms: 0, at: t });
    if (L.size > 5000) { const first = L.keys().next().value; L.delete(first); }
  } else if (body.e === 'engage') {
    if (!ses) return false;
    const ms = Math.max(0, Math.min(1800000, Number(body.ms) || 0)); const add = ms - ses.ms; if (add <= 0) return true;
    const DD = d.days[ses.day] || D; DD.engMs += add; if (ses.ms === 0) DD.engN++; ses.ms = ms;
  } else return false;
  save(clientId); return true;
}

// resumo diário enviado por um sistema que mede sozinho (ex.: Agito): substitui os dias informados
function ingestKpis(clientId, kpis) {
  if (!kpis || typeof kpis !== 'object') return 0;
  const d = load(clientId); d.kpis = d.kpis || {}; let n = 0;
  for (const [k, v] of Object.entries(kpis)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v || typeof v !== 'object') continue;
    d.kpis[k] = { orders: Math.max(0, Math.round(Number(v.orders) || 0)), revenue: Math.max(0, Math.round(Number(v.revenue) || 0)), bookings: Math.max(0, Math.round(Number(v.bookings) || 0)) }; n++;
  }
  const keys = Object.keys(d.kpis).sort(); while (keys.length > 400) delete d.kpis[keys.shift()];
  if (n) save(clientId); return n;
}
function kpiSummary(clientId, n = 30) {
  const d = load(clientId); if (!d.kpis) return null; const today = B.today();
  const sum = (from, to) => { const o = { orders: 0, revenue: 0, bookings: 0 }; for (let i = from; i < to; i++) { const x = d.kpis[B.addDays(today, -i)]; if (x) { o.orders += x.orders; o.revenue += x.revenue; o.bookings += x.bookings; } } return o; };
  const T = sum(0, n), P = sum(n, 2 * n), Y = sum(365, 365 + n);
  if (!T.orders && !T.revenue && !T.bookings && !P.orders && !P.bookings) return null;
  const series = []; for (let i = n - 1; i >= 0; i--) { const k = B.addDays(today, -i); const x = d.kpis[k]; series.push([k, x ? x.orders : 0, x ? x.revenue : 0, x ? x.bookings : 0]); }
  return { ...T, series, yoyOrders: Y.orders ? Math.round((T.orders - Y.orders) / Y.orders * 100) : null, yoyRevenue: Y.revenue ? Math.round((T.revenue - Y.revenue) / Y.revenue * 100) : null, avgTicket: T.orders ? Math.round(T.revenue / T.orders) : 0, deltaOrders: P.orders ? Math.round((T.orders - P.orders) / P.orders * 100) : null, deltaRevenue: P.revenue ? Math.round((T.revenue - P.revenue) / P.revenue * 100) : null, deltaBookings: P.bookings ? Math.round((T.bookings - P.bookings) / P.bookings * 100) : null };
}
function ingest(clientId, days) {
  if (!days || typeof days !== 'object') return 0;
  const d = load(clientId); let n = 0;
  for (const [k, v] of Object.entries(days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v || typeof v !== 'object') continue;
    const o = blank();
    for (const f of ['pv', 'visitors', 'sessions', 'engMs', 'engN']) o[f] = Math.max(0, Math.min(1e9, Number(v[f]) || 0));
    if (!v.engN && v.sessions) o.engN = Math.max(0, Number(v.sessions) - (Number(v.bounces) || 0));
    const DEV = { Celular: 'Mobile', Computador: 'Desktop', Direto: 'Direct' };
    for (const f of ['ref', 'dev', 'lang', 'pages']) if (v[f] && typeof v[f] === 'object') for (const [kk, vv] of Object.entries(v[f]).slice(0, 300)) inc(o[f], DEV[kk] || kk, Math.max(0, Number(vv) || 0));
    if (Array.isArray(v.hours)) o.hours = v.hours.slice(0, 24).map((x) => Math.max(0, Number(x) || 0));
    d.days[k] = o; n++;
  }
  if (n) save(clientId);
  return n;
}

// resumo para a carteirinha / painel
function summary(clientId, n = 30) {
  const d = load(clientId); const today = B.today();
  const range = (from, to) => { const out = []; for (let i = from; i < to; i++) { const k = B.addDays(today, -i); out.push([k, d.days[k] || blank()]); } return out.reverse(); };
  const cur = range(0, n), prev = range(n, 2 * n), year = range(365, 365 + n);
  const tot = (rows) => rows.reduce((a, [, x]) => { a.pv += x.pv; a.visitors += x.visitors; a.sessions += x.sessions; a.engMs += x.engMs; a.engN += x.engN; return a; }, { pv: 0, visitors: 0, sessions: 0, engMs: 0, engN: 0 });
  const merge = (rows, f) => { const o = {}; rows.forEach(([, x]) => Object.entries(x[f] || {}).forEach(([k, v]) => inc(o, k, v, 1000))); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
  const T = tot(cur), P = tot(prev), YY = tot(year);
  const dev = merge(cur, 'dev'); const devTot = dev.reduce((a, [, v]) => a + v, 0) || 1;
  const mobile = dev.filter(([k]) => k !== 'Desktop').reduce((a, [, v]) => a + v, 0);
  const hours = Array(24).fill(0); cur.forEach(([, x]) => (x.hours || []).forEach((v, i) => { hours[i] += v; }));
  const hasData = Object.keys(d.days).length > 0;
  return {
    days: n, hasData, firstDay: Object.keys(d.days).sort()[0] || null,
    visitors: T.visitors, pv: T.pv, sessions: T.sessions,
    avgMs: T.engN ? Math.round(T.engMs / T.engN) : 0,
    mobilePct: Math.round(mobile / devTot * 100),
    deltaVisitors: P.visitors ? Math.round((T.visitors - P.visitors) / P.visitors * 100) : null,
    yoyVisitors: YY.visitors ? Math.round((T.visitors - YY.visitors) / YY.visitors * 100) : null,
    series: cur.map(([k, x]) => [k, x.visitors, x.pv]),
    ref: merge(cur, 'ref').slice(0, 6), pages: merge(cur, 'pages').slice(0, 6), lang: merge(cur, 'lang').slice(0, 5), dev,
    peakHour: hours.indexOf(Math.max(...hours)),
  };
}

// script para os sites (sem cookies; uma sessão = uma abertura de página)
const SCRIPT = `(function(){if(navigator.webdriver||/bot|crawl|spider|headless|lighthouse/i.test(navigator.userAgent))return;var k=document.currentScript&&document.currentScript.dataset.key,u=document.currentScript&&document.currentScript.src.replace(/\\/a\\.js.*$/,'')+'/api/a/'+k;if(!k)return;var s=Math.random().toString(36).slice(2,14)+Date.now().toString(36);function send(o){o.s=s;try{var b=JSON.stringify(o);if(navigator.sendBeacon)navigator.sendBeacon(u,new Blob([b],{type:'application/json'}));else fetch(u,{method:'POST',body:b,keepalive:true,headers:{'Content-Type':'application/json'}})}catch(e){}}send({e:'pv',p:location.pathname,r:document.referrer,h:location.hostname,l:navigator.language,w:innerWidth});var ms=0,t0=document.hidden?0:Date.now(),last=0;function tick(){if(t0){ms+=Date.now()-t0;t0=0}if(!document.hidden)t0=Date.now()}document.addEventListener('visibilitychange',function(){tick();if(document.hidden&&ms-last>=2000){last=ms;send({e:'engage',ms:ms})}});addEventListener('pagehide',function(){tick();if(ms-last>=2000){last=ms;send({e:'engage',ms:ms})}});setInterval(function(){tick();if(!document.hidden&&ms-last>=15000){last=ms;send({e:'engage',ms:ms})}},15000)})();`;

module.exports = { record, ingest, ingestKpis, kpiSummary, summary, flush, SCRIPT, blank };
