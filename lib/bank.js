'use strict';
// Leitura automática das transferências recebidas, pela API do Ponto (Isabel Group), que liga as contas dos bancos belgas.
// Uma vez por hora: busca as transações novas da conta e, quando a comunicação estruturada (+++000/1261/20006+++)
// bate com a de um cliente, registra o pagamento sozinho (o site volta ao ar na hora).
//   PONTO_CLIENT_ID, PONTO_CLIENT_SECRET, PONTO_ACCOUNT_ID
// Sem essas variáveis, nada acontece. Transações que não batem ficam na lista "a conferir" do painel.
const https = require('https');
const store = require('./store');

const env = (k) => process.env[k] || '';
const on = () => !!(env('PONTO_CLIENT_ID') && env('PONTO_CLIENT_SECRET') && env('PONTO_ACCOUNT_ID'));
function request(opts, body) {
  return new Promise((resolve) => {
    const req = https.request(opts, (res) => { let b = ''; res.on('data', (c) => { if (b.length < 2e6) b += c; }); res.on('end', () => { let j = null; try { j = JSON.parse(b); } catch (e) { /* texto */ } resolve({ code: res.statusCode, json: j, text: b.slice(0, 300) }); }); });
    req.on('error', (e) => resolve({ code: 0, text: e.message })); req.setTimeout(15000, () => req.destroy()); if (body) req.write(body); req.end();
  });
}
async function token() {
  const basic = Buffer.from(env('PONTO_CLIENT_ID') + ':' + env('PONTO_CLIENT_SECRET')).toString('base64');
  const r = await request({ host: 'api.myponto.com', path: '/oauth2/token', method: 'POST', headers: { Authorization: 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' } }, 'grant_type=client_credentials');
  return r.json && r.json.access_token;
}
async function transactions(tok, after) {
  const path = `/accounts/${env('PONTO_ACCOUNT_ID')}/transactions?page[limit]=100` + (after ? `&page[after]=${encodeURIComponent(after)}` : '');
  const r = await request({ host: 'api.myponto.com', path, method: 'GET', headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.api+json' } });
  return r.json && Array.isArray(r.json.data) ? r.json.data : [];
}

// normaliza "+++000/1261/20006+++" → "000126120006"
const digits = (s) => String(s || '').replace(/\D/g, '');
// casa uma transação com um cliente: pela comunicação estruturada; se não houver, pelo nome do cliente no texto e valor igual
function match(tx, clients, ogmFor) {
  const a = tx.attributes || {}; const amount = Math.round(Number(a.amount) * 100); if (!(amount > 0)) return null;
  const comm = digits(a.remittanceInformation);
  for (const c of clients) {
    if (comm && comm.length === 12 && ogmFor(c).some((o) => digits(o) === comm)) return { client: c, amount, by: 'communication' };
  }
  const text = (String(a.remittanceInformation || '') + ' ' + String(a.counterpartName || '')).toLowerCase();
  for (const c of clients) {
    const name = String(c.name || '').toLowerCase().replace(/&.*$/, '').trim();
    if (name.length >= 4 && text.includes(name) && (amount === c.amount || amount === c.amount * 12)) return { client: c, amount, by: 'nome + valor' };
  }
  return null;
}

async function sync({ clients, ogmFor, record }) {
  if (!on()) return { skipped: true };
  const d = store.db; d.bank = d.bank || { seen: [], unmatched: [], cursor: null };
  const tok = await token(); if (!tok) return { ok: false, error: 'token' };
  const txs = await transactions(tok, null);
  let matched = 0, newUnmatched = 0;
  for (const tx of txs) {
    if (d.bank.seen.includes(tx.id)) continue; d.bank.seen.push(tx.id);
    const a = tx.attributes || {}; if (!(Number(a.amount) > 0)) continue; // só entradas
    const m = match(tx, clients, ogmFor);
    if (m) { const months = m.amount >= m.client.amount * 12 ? 12 : Math.max(1, Math.round(m.amount / m.client.amount)); record(m.client, { months, amount: m.amount, method: 'virement', ref: String(a.remittanceInformation || '').slice(0, 60), date: String(a.valueDate || a.executionDate || '').slice(0, 10), note: 'banco (' + m.by + ')' }); matched++; }
    else { d.bank.unmatched.unshift({ id: tx.id, date: String(a.valueDate || a.executionDate || '').slice(0, 10), amount: Math.round(Number(a.amount) * 100), from: String(a.counterpartName || '').slice(0, 60), text: String(a.remittanceInformation || '').slice(0, 100) }); newUnmatched++; }
  }
  if (d.bank.seen.length > 3000) d.bank.seen.splice(0, d.bank.seen.length - 3000); if (d.bank.unmatched.length > 100) d.bank.unmatched.length = 100;
  store.save(); return { ok: true, matched, newUnmatched };
}

module.exports = { on, sync, match, digits };
