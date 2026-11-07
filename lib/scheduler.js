'use strict';
// Rotinas automáticas da central:
//  - a cada 5 min: monitoramento dos sites (avisa você quando um site cai e quando volta)
//  - todo dia às 09:00 (Bruxelas): lembretes de vencimento (X dias antes, no dia, e no dia da suspensão) e nota do Google
//  - todo dia 1 às 09:05: relatório do mês anterior para cada cliente
// Cada envio fica anotado no cliente (c.notified) para nunca ir em dobro, mesmo que o servidor reinicie.
const store = require('./store');
const B = require('./billing');
const ST = require('./stats');
const UP = require('./uptime');
const NT = require('./notify');
const RV = require('./reviews');
const BK = require('./backup');
const { eur, fdate, PLAN } = require('./ui');

const PUBLIC_URL = () => (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
const db = () => store.db;
const active = () => db().clients.filter((c) => !c.archived && c.override !== 'paused');
const fdur = (ms) => { const s = Math.round(ms / 1000); return s >= 60 ? Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0') + ' s' : s + ' s'; };

// ---------- textos ----------
function reminderMsg(c, s, kind) {
  const fr = c.lang === 'fr'; const link = PUBLIC_URL() + '/c/' + c.token; const plan = PLAN[c.plan] ? PLAN[c.plan][fr ? 'fr' : 'pt'] : c.plan; const amt = eur(c.amount, fr ? 'fr' : 'pt');
  const due = fdate(s.due, fr ? 'fr' : 'pt', 1);
  const body = fr ? {
    soon: `Petit rappel : la mensualité ${plan} (${amt}) pour ${c.name} arrive à échéance le ${due}.`,
    due: `La mensualité ${plan} (${amt}) pour ${c.name} est due aujourd’hui (${due}).`,
    suspended: `Sans paiement reçu, le site de ${c.name} est mis en pause à partir d’aujourd’hui. Il revient automatiquement dès réception du paiement.`,
  } : {
    soon: `Lembrete: a mensalidade do ${plan} (${amt}) da ${c.name} vence em ${due}.`,
    due: `A mensalidade do ${plan} (${amt}) da ${c.name} vence hoje (${due}).`,
    suspended: `Sem o pagamento, o site da ${c.name} entra em pausa a partir de hoje. Ele volta automaticamente assim que o pagamento for recebido.`,
  };
  const subject = fr ? { soon: `Échéance le ${due} · ${c.name}`, due: `Mensualité due aujourd’hui · ${c.name}`, suspended: `Site en pause · ${c.name}` }[kind] : { soon: `Vencimento em ${due} · ${c.name}`, due: `Mensalidade vence hoje · ${c.name}`, suspended: `Site em pausa · ${c.name}` }[kind];
  const text = `${fr ? 'Bonjour' : 'Olá'}${c.contactName ? ' ' + c.contactName : ''}${fr ? ' !' : '!'}\n\n${body[kind]}\n\n${fr ? 'Votre carte et les moyens de paiement : ' : 'Sua carteirinha e as formas de pagamento: '}${link}\n\nDRT Creation`;
  return { template: process.env.WA_TPL_REMINDER, params: [c.contactName || c.name, body[kind], link], subject, text, html: text.replace(/\n/g, '<br>').replace(link, `<a href="${link}">${link}</a>`) };
}
function reportMsg(c, month) {
  const fr = c.lang === 'fr'; const L = fr ? 'fr' : 'pt'; const link = PUBLIC_URL() + '/c/' + c.token;
  // mês anterior: do dia 1 ao último dia
  const [y, m] = month.split('-').map(Number); const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = `${month}-${String(days).padStart(2, '0')}`; const n = B.diffDays(`${month}-01`, B.today());
  const S = ST.summary(c.id, n); const cur = S.series.filter(([k]) => k.startsWith(month)); const prevMonth = B.addMonths(`${month}-01`, -1, 1).slice(0, 7);
  const v = cur.reduce((a, x) => a + x[1], 0), pv = cur.reduce((a, x) => a + x[2], 0);
  const Sp = ST.summary(c.id, n + 31); const pvm = Sp.series.filter(([k]) => k.startsWith(prevMonth)).reduce((a, x) => a + x[1], 0);
  const delta = pvm ? Math.round((v - pvm) / pvm * 100) : null;
  const U = UP.summary(c.id, days); const K = ST.kpiSummary(c.id, n); const R = RV.summary(c);
  const name = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(fr ? 'fr-BE' : 'pt-BR', { timeZone: 'UTC', month: 'long', year: 'numeric' });
  const lines = [];
  lines.push(fr ? `${v} visiteurs${delta != null ? ` (${delta >= 0 ? '+' : ''}${delta} % vs ${prevMonth.slice(5)})` : ''}, ${pv} pages vues` : `${v} visitantes${delta != null ? ` (${delta >= 0 ? '+' : ''}${delta} % vs ${prevMonth.slice(5)})` : ''}, ${pv} páginas vistas`);
  if (S.ref[0]) lines.push((fr ? 'Première source : ' : 'Principal origem: ') + S.ref[0][0] + ' (' + Math.round(S.ref[0][1] / Math.max(1, S.ref.reduce((a, x) => a + x[1], 0)) * 100) + ' %)');
  if (S.avgMs) lines.push((fr ? 'Temps moyen sur le site : ' : 'Tempo médio no site: ') + fdur(S.avgMs));
  if (U.hasData) lines.push((fr ? 'Site en ligne ' : 'Site no ar ') + U.uptimePct + ' % ' + (fr ? 'du temps' : 'do tempo'));
  if (K && (K.orders || K.bookings)) lines.push(K.orders ? `${K.orders} ${fr ? 'commandes' : 'pedidos'} · ${eur(K.revenue, L)}` : `${K.bookings} ${fr ? 'réservations' : 'agendamentos'}`);
  if (R) lines.push(`Google : ${R.rating.toFixed(1).replace('.', ',')} ★ · ${R.count} ${fr ? 'avis' : 'avaliações'}`);
  const summary = lines.join('\n');
  const text = `${fr ? 'Bonjour' : 'Olá'}${c.contactName ? ' ' + c.contactName : ''}${fr ? ' !' : '!'}\n\n${fr ? `Votre site en ${name} :` : `Seu site em ${name}:`}\n${summary}\n\n${fr ? 'Tous les détails : ' : 'Todos os detalhes: '}${link}\n\nDRT Creation`;
  return { template: process.env.WA_TPL_REPORT, params: [c.contactName || c.name, name, summary.replace(/\n/g, ' · '), link], subject: (fr ? 'Votre site en ' : 'Seu site em ') + name + ' · ' + c.name, text, html: text.replace(/\n/g, '<br>').replace(link, `<a href="${link}">${link}</a>`), summary };
}

// ---------- rotinas ----------
async function reminders(on = B.today()) {
  const set = db().settings; let n = 0;
  for (const c of active()) {
    const s = B.status(c, set, on); c.notified = c.notified || {};
    let kind = null;
    if (s.status === 'soon' && s.daysToDue === set.reminderDays) kind = 'soon';
    else if (s.daysToDue === 0) kind = 'due';
    else if (s.status === 'suspended' && on === s.suspendOn) kind = 'suspended';
    if (!kind) continue;
    const key = kind + ':' + s.due; if (c.notified[key]) continue;
    const r = await NT.toClient(c, reminderMsg(c, s, kind));
    c.notified[key] = on; store.log('notice', c.id, `Lembrete (${kind}) enviado por ${NT.sent(r)}`); n++;
  }
  if (n) store.save(); return n;
}
async function reports(on = B.today()) {
  if (!on.endsWith('-01')) return 0;
  const month = B.addMonths(on, -1, 1).slice(0, 7); let n = 0;
  for (const c of active()) {
    c.notified = c.notified || {}; if (c.notified['report:' + month]) continue;
    const r = await NT.toClient(c, reportMsg(c, month));
    c.notified['report:' + month] = on; store.log('notice', c.id, `Relatório de ${month} enviado por ${NT.sent(r)}`); n++;
  }
  if (n) store.save(); return n;
}
async function monitor() {
  for (const c of active()) {
    await UP.check(c, async (ev, cl, inc) => {
      const url = (inc && inc.url) || (cl.sites || [])[0];
      const text = ev === 'down' ? `⚠️ ${cl.name}: o site ${url} está FORA DO AR (resposta ${inc && inc.code ? inc.code : 'nenhuma'}). Testando de novo a cada 5 min.` : `✅ ${cl.name}: o site ${url} voltou ao ar${inc && inc.start ? ' (fora desde ' + inc.start.slice(11, 16) + ' UTC)' : ''}.`;
      store.log('uptime', cl.id, text); store.save();
      await NT.toAdmin({ subject: (ev === 'down' ? 'Site fora do ar · ' : 'Site voltou · ') + cl.name, text });
    });
  }
  UP.flush();
}
async function reviews() { for (const c of active()) { try { await RV.refresh(c); } catch (e) { /* ok */ } } }

let lastDaily = null;
let bankHook = null;
function setBankHook(fn) { bankHook = fn; }
function start() {
  setTimeout(monitor, 5000).unref(); setInterval(monitor, 5 * 60000).unref();
  setInterval(() => { if (bankHook) bankHook().catch((e) => console.error('[banco]', e.message)); }, 3600000).unref();
  setInterval(async () => {
    const now = new Date(); const hhmm = new Intl.DateTimeFormat('en-GB', { timeZone: B.TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
    const today = B.today(now);
    if (hhmm >= '09:00' && lastDaily !== today) { lastDaily = today; try { await reminders(today); await reports(today); await reviews(); await BK.daily(); } catch (e) { console.error('[rotina]', e); } }
  }, 60000).unref();
}

module.exports = { start, setBankHook, reminders, reports, monitor, reviews, reminderMsg, reportMsg };
