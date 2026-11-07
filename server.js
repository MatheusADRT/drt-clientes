'use strict';
// DRT Creation · Central de clientes e mensalidades. Node 22, sem dependências.
//   /admin           painel (senha ADMIN_PASSWORD)
//   /c/<token>       carteirinha privada do cliente
//   /api/status/<k>  status consultado pelos sites dos clientes (o "interruptor")
//   /api/stripe/webhook  pagamentos automáticos (quando STRIPE_WEBHOOK_SECRET existir)
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const store = require('./lib/store');
const B = require('./lib/billing');
const { esc, logo, eur, fdate, page, card, PLAN, STATUS, memberNo } = require('./lib/ui');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_URL = (process.env.PUBLIC_URL || 'http://localhost:' + PORT).replace(/\/+$/, '');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const STRIPE_WH = process.env.STRIPE_WEBHOOK_SECRET || '';
store.load();
let SECRET = process.env.APP_SECRET;
if (!SECRET) {
  const f = path.join(store.DIR, 'secret.key');
  try { SECRET = fs.readFileSync(f, 'utf8').trim(); } catch (e) { SECRET = crypto.randomBytes(32).toString('hex'); fs.writeFileSync(f, SECRET, { mode: 0o600 }); }
}
if (!ADMIN_PASSWORD) console.warn('[ATENÇÃO] ADMIN_PASSWORD não definida: o painel fica fechado até você definir essa variável.');
const db = () => store.db;

// ---------- utilidades HTTP ----------
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY', 'Strict-Transport-Security': 'max-age=31536000' };
function html(res, code, body, extra) { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...SEC, ...(extra || {}) }); res.end(body); }
function json(res, code, obj, extra) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', ...SEC, ...(extra || {}) }); res.end(JSON.stringify(obj)); }
function redirect(res, to, extra) { res.writeHead(303, { Location: to, 'Cache-Control': 'no-store', ...(extra || {}) }); res.end(); }
function readBody(req, max = 200000) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', (c) => { n += c.length; if (n > max) { reject(new Error('too big')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const form = (buf) => Object.fromEntries(new URLSearchParams(buf.toString('utf8')));
const cookies = (req) => Object.fromEntries(String(req.headers.cookie || '').split(';').map((x) => x.trim().split('=')).filter((x) => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
const hmac = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

// ---------- sessão do admin ----------
const SKEY = () => hmac('pw|' + ADMIN_PASSWORD); // trocar a senha desconecta todos
function mkSession() { const body = 'a.' + (Date.now() + 30 * 86400000); return body + '.' + hmac(SKEY() + body); }
function isAdmin(req) {
  if (!ADMIN_PASSWORD) return false;
  const v = cookies(req).drt_s; if (!v) return false;
  const i = v.lastIndexOf('.'); const body = v.slice(0, i), sig = v.slice(i + 1);
  return same(sig, hmac(SKEY() + body)) && Number(body.split('.')[1]) > Date.now();
}
const COOKIE = (v, age) => `drt_s=${v}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${PUBLIC_URL.startsWith('https') ? '; Secure' : ''}`;
// pedidos POST do painel só valem vindos do próprio site
function sameOrigin(req) { const o = req.headers.origin; if (!o) return true; try { return new URL(o).host === req.headers.host; } catch (e) { return false; } }
const tries = new Map(); // limite de tentativas de senha por IP
function ip(req) { return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }

// ---------- regras ----------
const S = () => db().settings;
const st = (c) => B.status(c, S());
const byId = (id) => db().clients.find((c) => c.id === id);
const clientPayments = (c) => db().payments.filter((p) => p.clientId === c.id).sort((a, b) => (b.date + b.at).localeCompare(a.date + a.at));
// comunicação estruturada belga (+++123/4567/89012+++), única por cliente e mês de vencimento
function ogm(c, due) {
  const base = String(c.no).padStart(4, '0') + due.slice(2, 4) + due.slice(5, 7) + '00';
  let chk = Number(BigInt(base) % 97n); if (chk === 0) chk = 97;
  const d = base + String(chk).padStart(2, '0');
  return `+++${d.slice(0, 3)}/${d.slice(3, 7)}/${d.slice(7)}+++`;
}
function recordPayment(c, { months, amount, method, ref, date, note }) {
  months = Math.max(1, Math.min(24, Math.round(Number(months) || 1)));
  const per = B.applyPayment(c, months, c.dueDay);
  const p = { id: store.id(6), clientId: c.id, at: new Date().toISOString(), date: date || B.today(), amount: Math.round(amount != null ? amount : c.amount * months), months, method, ref: ref || '', note: note || '', from: per.from, to: per.to, prevPaidUntil: c.paidUntil };
  c.paidUntil = per.to;
  db().payments.push(p);
  store.log('payment', c.id, `${eur(p.amount, 'pt')} · ${months} ${months > 1 ? 'meses' : 'mês'} · ${method} → pago até ${fdate(c.paidUntil, 'pt')}`);
  store.save();
  return p;
}
function slug(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'cliente'; }
function cleanClient(f, c) {
  const amount = Math.round(parseFloat(String(f.amount || '0').replace(',', '.')) * 100);
  const dueDay = Math.min(31, Math.max(1, parseInt(f.dueDay, 10) || 1));
  c.name = String(f.name || '').trim().slice(0, 80);
  c.plan = PLAN[f.plan] ? f.plan : 'site';
  c.amount = Number.isFinite(amount) && amount >= 0 ? amount : PLAN[c.plan].price;
  c.dueDay = dueDay;
  c.lang = f.lang === 'fr' ? 'fr' : 'pt';
  c.color = /^#[0-9a-f]{6}$/i.test(f.color || '') ? f.color : '#1d44d6';
  c.logo = /^https:\/\/[^\s"'<>]+$/.test(f.logo || '') ? f.logo : '';
  c.contactName = String(f.contactName || '').slice(0, 80);
  c.phone = String(f.phone || '').replace(/[^\d+ ]/g, '').slice(0, 20);
  c.email = String(f.email || '').slice(0, 120);
  c.sites = String(f.sites || '').split(/[\s,]+/).filter((x) => /^https?:\/\//.test(x)).slice(0, 12);
  c.stripeLink = /^https:\/\/(buy|checkout)\.stripe\.com\/[^\s"'<>]+$/.test(f.stripeLink || '') ? f.stripeLink : '';
  c.graceDays = f.graceDays === '' || f.graceDays == null ? null : Math.max(0, Math.min(30, parseInt(f.graceDays, 10) || 0));
  if (c.graceDays === null) delete c.graceDays;
  c.notes = String(f.notes || '').slice(0, 2000);
  return c;
}

// ---------- telas do painel ----------
const NAV = (cur) => `<nav class="nav"><a href="/admin"${cur === 'home' ? ' aria-current="page"' : ''}>Clientes</a><a href="/admin/new"${cur === 'new' ? ' aria-current="page"' : ''}>+ Novo</a><a href="/admin/settings"${cur === 'set' ? ' aria-current="page"' : ''}>Ajustes</a><form method="post" action="/admin/logout" style="margin:0"><button>Sair</button></form></nav>`;
const STXT = (s) => ({
  ok: `Vence em ${s.daysToDue} dias`,
  soon: s.daysToDue === 0 ? 'Vence hoje' : `Vence em ${s.daysToDue} ${s.daysToDue > 1 ? 'dias' : 'dia'}`,
  grace: `Atrasado · o site cai em ${s.daysToSuspend} ${s.daysToSuspend > 1 ? 'dias' : 'dia'} (${fdate(s.suspendOn, 'pt')})`,
  suspended: `Site fora do ar desde ${fdate(s.suspendOn, 'pt')}`,
  paused: 'Sem cobrança',
}[s.status] + (s.forced ? ' · manual' : ''));
const waLink = (c, s) => {
  if (!c.phone) return '';
  const fr = c.lang === 'fr';
  const msg = fr
    ? `Bonjour ${c.contactName || ''} ! Petit rappel : la mensualité ${PLAN[c.plan].fr} de ${eur(c.amount, 'fr')} pour ${c.name} ${s.status === 'grace' || s.status === 'suspended' ? 'était due le' : 'arrive à échéance le'} ${fdate(s.due, 'fr', 1)}. Votre carte et les moyens de paiement : ${PUBLIC_URL}/c/${c.token}\nMerci ! DRT Creation`
    : `Olá ${c.contactName || ''}! Lembrete: a mensalidade do ${PLAN[c.plan].pt} de ${eur(c.amount, 'pt')} da ${c.name} ${s.status === 'grace' || s.status === 'suspended' ? 'venceu em' : 'vence em'} ${fdate(s.due, 'pt', 1)}. Sua carteirinha e as formas de pagamento: ${PUBLIC_URL}/c/${c.token}\nObrigado! DRT Creation`;
  return `https://wa.me/${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg.replace(/  +/g, ' '))}`;
};

function dashboard(flash) {
  const cs = db().clients.filter((c) => !c.archived);
  const rows = cs.map((c) => ({ c, s: st(c) }));
  const order = { suspended: 0, grace: 1, soon: 2, ok: 3, paused: 4 };
  rows.sort((a, b) => order[a.s.status] - order[b.s.status] || a.s.due.localeCompare(b.s.due));
  const active = rows.filter((r) => r.s.status !== 'paused');
  const mrr = active.reduce((t, r) => t + r.c.amount, 0);
  const late = rows.filter((r) => r.s.status === 'grace' || r.s.status === 'suspended');
  const month = B.today().slice(0, 7);
  const cashed = db().payments.filter((p) => p.date.slice(0, 7) === month).reduce((t, p) => t + p.amount, 0);
  const body = `${flash ? `<div class="flash">${esc(flash)}</div>` : ''}
<h1>Clientes</h1><p class="sub">${cs.length} ${cs.length === 1 ? 'cliente' : 'clientes'} · hoje ${fdate(B.today(), 'pt', 1)}</p>
<div class="stats"><div class="stat"><span class="lab">Receita mensal</span><b>${eur(mrr, 'pt')}</b></div>
<div class="stat"><span class="lab">Recebido em ${fdate(month + '-01', 'pt', 1).replace(/^1 de /, '')}</span><b>${eur(cashed, 'pt')}</b></div>
<div class="stat"><span class="lab">Em atraso</span><b class="${late.length ? 's-grace' : ''}">${late.length}</b></div>
<div class="stat"><span class="lab">Sites fora do ar</span><b class="${rows.some((r) => r.s.status === 'suspended') ? 's-suspended' : ''}">${rows.filter((r) => r.s.status === 'suspended').length}</b></div></div>
<h2>Carteirinhas</h2>
${rows.length ? `<div class="grid">${rows.map(({ c, s }) => `<div>${card(c, s, 'pt', '/admin/c/' + c.id)}
<div class="card-meta"><span class="s-${s.status}">${esc(STXT(s))}</span></div>
<div class="card-actions"><form method="post" action="/admin/c/${c.id}/pay" style="margin:0"><input type="hidden" name="months" value="1"><input type="hidden" name="method" value="virement"><button class="btn sm pri" title="Registra 1 mês pago por transferência">✓ Pago 1 mês</button></form>
<a class="btn sm" href="/admin/c/${c.id}">Abrir</a>${c.phone ? `<a class="btn sm" href="${esc(waLink(c, s))}" target="_blank" rel="noopener">Lembrete WhatsApp</a>` : ''}</div></div>`).join('')}</div>`
    : `<div class="panel"><p>Nenhum cliente ainda.</p><a class="btn pri" href="/admin/new">Cadastrar o primeiro</a></div>`}`;
  return page({ title: 'Clientes · DRT Creation', body, nav: NAV('home') });
}

function clientForm(c, isNew) {
  const v = (k, d = '') => esc(c[k] != null ? c[k] : d);
  return `<form class="f" method="post" action="${isNew ? '/admin/clients' : '/admin/c/' + c.id}">
<div class="two"><label>Nome da empresa<input name="name" required value="${v('name')}" placeholder="Agito Sushi Brussels"></label>
<label>Plano<select name="plan">${Object.entries(PLAN).map(([k, p]) => `<option value="${k}"${c.plan === k ? ' selected' : ''}>${p.pt} (sugerido ${eur(p.price, 'pt')})</option>`).join('')}</select></label></div>
<div class="two"><label>Mensalidade (€)<input name="amount" inputmode="decimal" required value="${c.amount != null ? (c.amount / 100).toFixed(2).replace(/\.00$/, '') : ''}" placeholder="249"></label>
<label>Dia do vencimento<input name="dueDay" type="number" min="1" max="31" required value="${v('dueDay', 1)}"></label>
${isNew ? `<label>Primeiro vencimento<input name="firstDue" type="date" required value="${esc(c.firstDue || '')}"><small>A data em que a primeira mensalidade deve ser paga.</small></label>` : ''}
<label>Carência (dias)<input name="graceDays" type="number" min="0" max="30" value="${c.graceDays != null ? c.graceDays : ''}" placeholder="padrão: ${S().graceDays}"><small>Depois do vencimento, antes do site cair.</small></label></div>
<div class="two"><label>Pessoa de contato<input name="contactName" value="${v('contactName')}"></label>
<label>WhatsApp<input name="phone" inputmode="tel" value="${v('phone')}" placeholder="+32 4.."></label>
<label>E-mail<input name="email" type="email" value="${v('email')}"></label>
<label>Idioma da carteirinha<select name="lang"><option value="fr"${c.lang === 'fr' ? ' selected' : ''}>Français</option><option value="pt"${c.lang !== 'fr' ? ' selected' : ''}>Português</option></select></label></div>
<label>Sites do cliente<textarea name="sites" rows="3" placeholder="https://www.agitosushi.com">${esc((c.sites || []).join('\n'))}</textarea><small>Um por linha. Só para referência; o bloqueio é feito pela chave de status.</small></label>
<div class="two"><label>Cor da carteirinha<input name="color" type="color" value="${v('color', '#1d44d6')}" style="height:46px;padding:4px"></label>
<label>Logo (URL https, opcional)<input name="logo" value="${v('logo')}" placeholder="https://.../logo.png"></label>
<label>Link de pagamento Stripe (opcional)<input name="stripeLink" value="${v('stripeLink')}" placeholder="https://buy.stripe.com/..."><small>Aparece como botão "Pagar" na carteirinha.</small></label></div>
<label>Notas internas<textarea name="notes" rows="3">${esc(c.notes || '')}</textarea></label>
<div class="row"><button class="btn pri">${isNew ? 'Cadastrar cliente' : 'Salvar alterações'}</button><a class="btn" href="${isNew ? '/admin' : '/admin/c/' + c.id}">Cancelar</a></div></form>`;
}

function clientPage(c, flash) {
  const s = st(c);
  const pays = clientPayments(c);
  const statusUrl = `${PUBLIC_URL}/api/status/${c.key}`;
  const body = `${flash ? `<div class="flash">${esc(flash)}</div>` : ''}
<p style="margin:26px 0 0"><a href="/admin" class="mono">← Clientes</a></p>
<h1>${esc(c.name)}</h1><p class="sub">${esc(PLAN[c.plan].pt)} · ${eur(c.amount, 'pt')}/mês · vence todo dia ${c.dueDay} · cliente desde ${fdate(c.since, 'pt', 1)}</p>
<div style="display:grid;gap:22px;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));align-items:start">
<div>${card(c, s, 'pt')}<div class="card-meta"><span class="s-${s.status}">${esc(STXT(s))}</span><span class="muted mono">pago até ${fdate(c.paidUntil, 'pt')}</span></div></div>
<div class="panel"><span class="lab">Registrar pagamento</span>
<form class="f" method="post" action="/admin/c/${c.id}/pay" style="margin-top:12px"><div class="two">
<label>Meses<select name="months">${[1, 2, 3, 6, 12].map((m) => `<option value="${m}">${m} ${m > 1 ? 'meses' : 'mês'} · ${eur(c.amount * m, 'pt')}</option>`).join('')}</select></label>
<label>Forma<select name="method"><option value="virement">Transferência</option><option value="especes">Dinheiro</option><option value="stripe">Stripe (manual)</option><option value="autre">Outra</option></select></label>
<label>Valor recebido (€)<input name="amount" inputmode="decimal" placeholder="automático"></label>
<label>Data<input name="date" type="date" value="${B.today()}"></label></div>
<label>Referência / nota<input name="ref" placeholder="${esc(ogm(c, s.due))}"></label>
<button class="btn pri">✓ Registrar e liberar</button></form></div></div>

<h2>Link da carteirinha (enviar ao cliente)</h2>
<div class="copy"><input readonly value="${esc(PUBLIC_URL + '/c/' + c.token)}" onclick="this.select()"><a class="btn sm" href="/c/${c.token}" target="_blank">Abrir</a>${c.phone ? `<a class="btn sm" href="${esc(waLink(c, s))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</div>

<h2>Status do site</h2>
<div class="panel"><p style="margin:0 0 12px">Hoje: <span class="chip s-${s.status}">${STATUS[s.status].pt}</span> ${s.forced ? '<span class="muted">(definido manualmente)</span>' : '<span class="muted">(automático pelos pagamentos)</span>'}</p>
<form method="post" action="/admin/c/${c.id}/override" class="row" style="margin:0">
<button class="btn sm" name="override" value="auto"${!c.override || c.override === 'auto' ? ' disabled' : ''}>Automático</button>
<button class="btn sm" name="override" value="active">Forçar no ar</button>
<button class="btn sm danger" name="override" value="suspended" onclick="return confirm('Tirar o site do ar agora?')">Suspender agora</button>
<button class="btn sm" name="override" value="paused">Pausar cobrança</button></form>
<p class="muted" style="margin:14px 0 6px;font-size:13px">Endereço que o site do cliente consulta:</p>
<div class="copy"><input readonly value="${esc(statusUrl)}" onclick="this.select()"><a class="btn sm" href="/api/status/${c.key}" target="_blank">Testar</a></div></div>

<h2>Pagamentos</h2>
${pays.length ? `<div class="tbl"><table><tr><th>Data</th><th>Valor</th><th>Período</th><th>Forma</th><th>Ref.</th><th></th></tr>${pays.map((p) => `<tr><td>${fdate(p.date, 'pt')}</td><td>${eur(p.amount, 'pt')}</td><td>${fdate(p.from, 'pt')} → ${fdate(p.to, 'pt')}</td><td>${esc(p.method)}</td><td class="mono">${esc(p.ref)}</td>
<td>${p.id === (pays[0] && pays[0].id) ? `<form method="post" action="/admin/c/${c.id}/undo/${p.id}" style="margin:0" onsubmit="return confirm('Desfazer este pagamento?')"><button class="btn sm danger">Desfazer</button></form>` : ''}</td></tr>`).join('')}</table></div>` : '<p class="muted">Nenhum pagamento registrado.</p>'}

<h2>Dados do cliente</h2><div class="panel">${clientForm(c)}</div>
<h2>Zona de perigo</h2><div class="row"><form method="post" action="/admin/c/${c.id}/token" style="margin:0" onsubmit="return confirm('O link antigo da carteirinha deixa de funcionar. Continuar?')"><button class="btn sm danger">Gerar novo link da carteirinha</button></form>
<form method="post" action="/admin/c/${c.id}/archive" style="margin:0" onsubmit="return confirm('Arquivar o cliente? O site dele fica sempre no ar (sem controle).')"><button class="btn sm danger">Arquivar cliente</button></form></div>`;
  return page({ title: c.name + ' · DRT Creation', body, nav: NAV('') });
}

function settingsPage(flash) {
  const s = S();
  const body = `${flash ? `<div class="flash">${esc(flash)}</div>` : ''}<h1>Ajustes</h1><p class="sub">Valem para todos os clientes (cada cliente pode ter a sua própria carência).</p>
<div class="panel"><form class="f" method="post" action="/admin/settings"><div class="two">
<label>Carência padrão (dias)<input name="graceDays" type="number" min="0" max="30" value="${s.graceDays}"></label>
<label>Avisar quantos dias antes<input name="reminderDays" type="number" min="0" max="15" value="${s.reminderDays}"></label></div>
<span class="lab" style="margin-top:8px">Dados para transferência (aparecem na carteirinha)</span><div class="two">
<label>Beneficiário<input name="beneficiary" value="${esc(s.beneficiary)}" placeholder="Nome do titular da conta"></label>
<label>IBAN<input name="iban" value="${esc(s.iban)}" placeholder="BE.."></label>
<label>BIC<input name="bic" value="${esc(s.bic)}"></label></div>
<div class="two"><label>WhatsApp de contato<input name="whatsapp" value="${esc(s.whatsapp)}"></label><label>E-mail de contato<input name="email" type="email" value="${esc(s.email)}"></label></div>
<button class="btn pri">Salvar</button></form></div>
<h2>Integração Stripe</h2><div class="panel"><p style="margin:0">Webhook: <code>${esc(PUBLIC_URL)}/api/stripe/webhook</code> · ${STRIPE_WH ? '<span class="s-ok">ativo</span>' : '<span class="muted">desligado (defina STRIPE_WEBHOOK_SECRET no Render quando tiver a conta Stripe profissional)</span>'}</p>
<p class="muted" style="font-size:13px;margin:10px 0 0">Eventos: <code>checkout.session.completed</code> e <code>invoice.paid</code>. Em cada cliente, cole o link de pagamento do Stripe; o pagamento é ligado ao cliente automaticamente.</p></div>
<h2>Últimos eventos</h2><div class="tbl"><table>${db().events.slice(0, 30).map((e) => { const c = byId(e.clientId); return `<tr><td class="mono muted">${esc(e.at.slice(0, 16).replace('T', ' '))}</td><td>${c ? esc(c.name) : ''}</td><td>${esc(e.text)}</td></tr>`; }).join('') || '<tr><td class="muted">Nada ainda.</td></tr>'}</table></div>`;
  return page({ title: 'Ajustes · DRT Creation', body, nav: NAV('set') });
}

function loginPage(err) {
  return page({ title: 'Entrar · DRT Creation', body: `<div style="max-width:380px;margin:12vh auto 0"><h1>Central de clientes</h1><p class="sub">Acesso restrito.</p>
${err ? `<div class="flash err" style="margin:0 0 14px">${esc(err)}</div>` : ''}${ADMIN_PASSWORD ? `<form class="f" method="post" action="/admin/login"><label>Senha<input type="password" name="password" required autofocus autocomplete="current-password"></label><button class="btn pri">Entrar</button></form>` : '<div class="flash err">Defina ADMIN_PASSWORD no Render para abrir o painel.</div>'}</div>` });
}

// ---------- carteirinha do cliente ----------
const T = {
  fr: { title: 'Votre carte client', hello: 'Bonjour', intro: 'Voici votre carte DRT Creation. Elle indique votre formule, votre prochaine échéance et l’état de votre service.', due: 'Prochaine échéance', paid: 'Payé jusqu’au', amount: 'Mensualité', pay: 'Comment payer', stripe: 'Payer en ligne', stripeTxt: 'Carte, Bancontact ou domiciliation SEPA, via Stripe (paiement sécurisé).', transfer: 'Virement bancaire', ben: 'Bénéficiaire', comm: 'Communication', commTxt: 'Indiquez cette communication structurée pour que le paiement soit reconnu.', hist: 'Historique des paiements', none: 'Aucun paiement enregistré pour l’instant.', period: 'Période', help: 'Une question ?', write: 'Écrire sur WhatsApp', included: 'Inclus dans votre formule',
    st: { ok: 'Votre service est actif.', soon: 'Votre prochaine mensualité arrive bientôt à échéance.', grace: 'Votre mensualité est en retard. Pour éviter la suspension du service, merci de régler avant le', suspended: 'Votre service est suspendu. Il sera réactivé automatiquement dès réception du paiement.', paused: 'Votre service est actif.' } },
  pt: { title: 'Sua carteirinha', hello: 'Olá', intro: 'Esta é a sua carteirinha DRT Creation. Ela mostra o seu plano, o próximo vencimento e a situação do seu serviço.', due: 'Próximo vencimento', paid: 'Pago até', amount: 'Mensalidade', pay: 'Como pagar', stripe: 'Pagar online', stripeTxt: 'Cartão, Bancontact ou débito SEPA, pelo Stripe (pagamento seguro).', transfer: 'Transferência bancária', ben: 'Beneficiário', comm: 'Comunicação', commTxt: 'Use esta comunicação estruturada para o pagamento ser reconhecido.', hist: 'Histórico de pagamentos', none: 'Nenhum pagamento registrado ainda.', period: 'Período', help: 'Alguma dúvida?', write: 'Falar no WhatsApp', included: 'Incluído no seu plano',
    st: { ok: 'Seu serviço está ativo.', soon: 'Sua próxima mensalidade vence em breve.', grace: 'Sua mensalidade está em atraso. Para evitar a suspensão do serviço, pague até', suspended: 'Seu serviço está suspenso. Ele volta automaticamente assim que o pagamento for recebido.', paused: 'Seu serviço está ativo.' } },
};
const INCLUDED = {
  site: { fr: ['Hébergement et nom de domaine', 'Mises à jour et sauvegarde mensuelle', 'Surveillance du site', '30 min de modifications par mois', 'Réponse sous 48 h'], pt: ['Hospedagem e domínio', 'Atualizações e backup mensal', 'Monitoramento do site', '30 min de alterações por mês', 'Resposta em até 48 h'] },
  boutique: { fr: ['Hébergement des boutiques', 'Mises à jour hebdomadaires (WordPress, extensions)', 'Sauvegarde quotidienne et sécurité', '2 h de modifications par mois', 'Réponse sous 24 h'], pt: ['Hospedagem das lojas', 'Atualizações semanais (WordPress, plugins)', 'Backup diário e segurança', '2 h de alterações por mês', 'Resposta em até 24 h'] },
  systeme: { fr: ['Serveur et base de données', 'Corrections et compatibilité (iOS, Android, navigateurs)', 'Sauvegarde quotidienne et surveillance 24/7', '2 h d’évolutions par mois', 'Intervention le jour même en cas d’urgence'], pt: ['Servidor e banco de dados', 'Correções e compatibilidade (iOS, Android, navegadores)', 'Backup diário e monitoramento 24/7', '2 h de melhorias por mês', 'Atendimento no mesmo dia em urgência'] },
};
function cardPage(c, lang) {
  const t = T[lang]; const s = st(c); const set = S();
  const pays = clientPayments(c).slice(0, 12);
  const other = lang === 'fr' ? 'pt' : 'fr';
  const wa = set.whatsapp ? `https://wa.me/${set.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent((lang === 'fr' ? 'Bonjour DRT Creation, une question au sujet de ma carte client ' : 'Olá DRT Creation, uma dúvida sobre a minha carteirinha ') + '(' + c.name + ')')}` : '';
  const body = `<div style="max-width:620px;margin:0 auto">
<p class="row" style="justify-content:flex-end;margin:16px 0 0"><a class="mono" href="?lang=${other}">${other.toUpperCase()}</a></p>
<h1 style="margin-top:6px">${t.title}</h1><p class="sub">${t.hello}${c.contactName ? ' ' + esc(c.contactName) : ''}${lang === 'fr' ? ' !' : '!'} ${t.intro}</p>
${card(c, s, lang)}
<div class="panel" style="margin-top:18px;border-color:var(--line-2)"><p style="margin:0" class="s-${s.status}"><b>${t.st[s.status]}${s.status === 'grace' ? ' ' + fdate(B.addDays(s.suspendOn, -1), lang, 1) + '.' : ''}</b></p>
<div class="two" style="margin-top:14px"><div><span class="lab">${t.due}</span><div style="font-weight:700;margin-top:6px">${fdate(s.due, lang, 1)}</div></div><div><span class="lab">${t.paid}</span><div style="font-weight:700;margin-top:6px">${fdate(c.paidUntil, lang, 1)}</div></div><div><span class="lab">${t.amount}</span><div style="font-weight:700;margin-top:6px">${eur(c.amount, lang)}</div></div></div></div>
${s.status !== 'paused' ? `<h2>${t.pay}</h2>
${c.stripeLink ? `<div class="panel" style="margin-bottom:12px"><b>${t.stripe}</b><p class="muted" style="margin:6px 0 14px;font-size:14px">${t.stripeTxt}</p><a class="btn pri" href="${esc(c.stripeLink + (c.stripeLink.includes('?') ? '&' : '?') + 'client_reference_id=' + c.id + (c.email ? '&prefilled_email=' + encodeURIComponent(c.email) : ''))}" rel="noopener">${t.stripe} · ${eur(c.amount, lang)}</a></div>` : ''}
${set.iban ? `<div class="panel"><b>${t.transfer}</b><table style="margin-top:10px"><tr><th>${t.ben}</th><td>${esc(set.beneficiary)}</td></tr><tr><th>IBAN</th><td class="mono">${esc(set.iban)}</td></tr>${set.bic ? `<tr><th>BIC</th><td class="mono">${esc(set.bic)}</td></tr>` : ''}<tr><th>${t.amount}</th><td>${eur(c.amount, lang)}</td></tr><tr><th>${t.comm}</th><td class="mono" style="font-size:15px">${esc(ogm(c, s.due))}</td></tr></table><p class="muted" style="font-size:13px;margin:10px 0 0">${t.commTxt}</p></div>` : ''}` : ''}
<h2>${t.included}</h2><ul style="margin:0;padding-left:20px;color:var(--text-2)">${(INCLUDED[c.plan] || INCLUDED.site)[lang].map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
<h2>${t.hist}</h2>${pays.length ? `<div class="tbl"><table><tr><th>Date</th><th>${t.amount}</th><th>${t.period}</th></tr>${pays.map((p) => `<tr><td>${fdate(p.date, lang)}</td><td>${eur(p.amount, lang)}</td><td>${fdate(p.from, lang)} → ${fdate(p.to, lang)}</td></tr>`).join('')}</table></div>` : `<p class="muted">${t.none}</p>`}
${wa ? `<h2>${t.help}</h2><a class="btn" href="${esc(wa)}" target="_blank" rel="noopener">${t.write}</a>` : ''}
<p class="muted mono" style="margin-top:40px;font-size:11px">${esc(memberNo(c))} · DRT Creation · Bruxelles</p></div>`;
  return page({ title: t.title + ' · ' + c.name, body, lang });
}

// ---------- Stripe ----------
function stripeVerify(raw, header) {
  if (!STRIPE_WH || !header) return false;
  const parts = Object.fromEntries(String(header).split(',').map((x) => x.split('=')));
  const t = Number(parts.t); if (!t || Math.abs(Date.now() / 1000 - t) > 600) return false;
  const sig = crypto.createHmac('sha256', STRIPE_WH).update(t + '.' + raw.toString('utf8')).digest('hex');
  return String(header).split(',').filter((x) => x.startsWith('v1=')).some((x) => same(x.slice(3), sig));
}
function stripeEvent(ev) {
  const d = db(); d.stripeSeen = d.stripeSeen || [];
  if (d.stripeSeen.includes(ev.id)) return 'duplicado';
  const o = ev.data && ev.data.object || {};
  let c = null, amount = 0;
  if (ev.type === 'checkout.session.completed' && o.payment_status === 'paid') {
    c = byId(o.client_reference_id);
    if (c && o.customer) c.stripeCustomer = o.customer;
    // assinatura: o 1º mês é registrado aqui (a fatura inicial pode chegar antes e ainda sem cliente ligado); os meses seguintes vêm pelo invoice.paid
    amount = o.amount_total;
  } else if (ev.type === 'invoice.paid') {
    if (o.billing_reason === 'subscription_create') { d.stripeSeen.push(ev.id); store.save(); return 'primeira fatura (já contada no checkout)'; }
    c = d.clients.find((x) => x.stripeCustomer && x.stripeCustomer === o.customer) || byId(o.subscription_details && o.subscription_details.metadata && o.subscription_details.metadata.client_id);
    amount = o.amount_paid;
  } else return 'ignorado';
  if (!c || !amount) return 'sem cliente';
  const months = Math.max(1, Math.round(amount / (c.amount || amount)));
  recordPayment(c, { months, amount, method: 'stripe', ref: o.id || ev.id });
  d.stripeSeen.push(ev.id); if (d.stripeSeen.length > 1000) d.stripeSeen.splice(0, d.stripeSeen.length - 1000);
  store.save();
  return 'ok';
}

// ---------- roteador ----------
const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#7fa0ff"/><g transform="translate(9 17) scale(.0694)">${logo('#07141a').replace(/<\/?svg[^>]*>/g, '')}</g></svg>`;
const server = http.createServer(async (req, res) => {
  let u; try { u = new URL(req.url, 'http://x'); } catch (e) { res.writeHead(400); res.end(); return; }
  const p = u.pathname.replace(/\/+$/, '') || '/'; const m = req.method;
  try {
    if (p === '/api/health') return json(res, 200, { ok: true });
    if (p === '/favicon.svg') { res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' }); return res.end(FAVICON); }
    if (p === '/robots.txt') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('User-agent: *\nDisallow: /\n'); }

    // status consultado pelos sites dos clientes: público, só o necessário
    let mm;
    if ((mm = p.match(/^\/api\/status\/([A-Za-z0-9_-]{6,64})$/))) {
      const cors = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' };
      if (m === 'OPTIONS') { res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'GET' }); return res.end(); }
      const c = db().clients.find((x) => x.key === mm[1] && !x.archived);
      if (!c) return json(res, 404, { status: 'unknown' }, cors);
      const s = st(c);
      // "active" = no ar; "warning" = atrasado mas no ar (aviso só para o dono); "suspended" = fora do ar
      const out = s.status === 'suspended' ? 'suspended' : s.status === 'grace' ? 'warning' : 'active';
      return json(res, 200, { status: out, due: s.due, suspendOn: s.suspendOn, checkedAt: new Date().toISOString() }, cors);
    }
    if (p === '/api/stripe/webhook' && m === 'POST') {
      const raw = await readBody(req, 1e6);
      if (!stripeVerify(raw, req.headers['stripe-signature'])) return json(res, 400, { error: 'assinatura inválida' });
      let ev; try { ev = JSON.parse(raw.toString('utf8')); } catch (e) { return json(res, 400, { error: 'json' }); }
      return json(res, 200, { result: stripeEvent(ev) });
    }

    if ((mm = p.match(/^\/c\/([A-Za-z0-9_-]{16,64})$/)) && (m === 'GET' || m === 'HEAD')) {
      const c = db().clients.find((x) => x.token === mm[1] && !x.archived);
      if (!c) return html(res, 404, page({ title: 'DRT Creation', body: '<h1>Lien invalide</h1><p class="sub">Ce lien n’existe plus. Contactez DRT Creation.</p>', lang: 'fr' }));
      const lang = u.searchParams.get('lang') === 'pt' ? 'pt' : u.searchParams.get('lang') === 'fr' ? 'fr' : c.lang;
      return html(res, 200, cardPage(c, lang));
    }

    if (p === '/' ) return redirect(res, '/admin');
    if (!p.startsWith('/admin')) return html(res, 404, page({ title: 'DRT Creation', body: '<h1>Page introuvable</h1>', lang: 'fr' }));

    // ----- painel -----
    if (m === 'POST' && !sameOrigin(req)) return html(res, 403, 'Origem inválida');
    if (p === '/admin/login' && m === 'POST') {
      const k = ip(req); const t = tries.get(k) || { n: 0, at: Date.now() };
      if (Date.now() - t.at > 15 * 60000) { t.n = 0; t.at = Date.now(); }
      if (t.n >= 8) return html(res, 429, loginPage('Muitas tentativas. Espere 15 minutos.'));
      const f = form(await readBody(req));
      if (ADMIN_PASSWORD && same(f.password || '', ADMIN_PASSWORD)) { tries.delete(k); return redirect(res, '/admin', { 'Set-Cookie': COOKIE(mkSession(), 30 * 86400) }); }
      t.n++; tries.set(k, t); return html(res, 401, loginPage('Senha incorreta.'));
    }
    if (p === '/admin/logout' && m === 'POST') return redirect(res, '/admin', { 'Set-Cookie': COOKIE('', 0) });
    if (!isAdmin(req)) return html(res, 200, loginPage());

    const flash = u.searchParams.get('ok') || '';
    if (p === '/admin' && m === 'GET') return html(res, 200, dashboard(flash));
    if (p === '/admin/new' && m === 'GET') {
      const nx = B.addMonths(B.today().slice(0, 8) + '01', 1);
      return html(res, 200, page({ title: 'Novo cliente · DRT Creation', nav: NAV('new'), body: `<h1>Novo cliente</h1><p class="sub">Cadastre a empresa e gere a carteirinha.</p><div class="panel">${clientForm({ plan: 'site', amount: PLAN.site.price, dueDay: 1, firstDue: nx, lang: 'fr' }, true)}</div>` }));
    }
    if (p === '/admin/clients' && m === 'POST') {
      const f = form(await readBody(req));
      const firstDue = /^\d{4}-\d{2}-\d{2}$/.test(f.firstDue || '') ? f.firstDue : B.today();
      const no = db().clients.reduce((x, c) => Math.max(x, c.no || 0), 0) + 1;
      const c = cleanClient(f, { id: store.id(6), no, token: store.id(18), key: slug(f.name) + '-' + store.id(5), since: B.today(), override: 'auto', paidUntil: B.initialPaidUntil(firstDue) });
      if (!c.name) return html(res, 400, 'Nome obrigatório');
      db().clients.push(c); store.log('client', c.id, 'Cliente cadastrado'); store.save();
      return redirect(res, '/admin/c/' + c.id + '?ok=' + encodeURIComponent('Cliente cadastrado. Envie o link da carteirinha para ele.'));
    }
    if (p === '/admin/settings' && m === 'GET') return html(res, 200, settingsPage(flash));
    if (p === '/admin/settings' && m === 'POST') {
      const f = form(await readBody(req)); const s = S();
      s.graceDays = Math.max(0, Math.min(30, parseInt(f.graceDays, 10) || 0));
      s.reminderDays = Math.max(0, Math.min(15, parseInt(f.reminderDays, 10) || 0));
      s.iban = String(f.iban || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 40);
      s.bic = String(f.bic || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
      s.beneficiary = String(f.beneficiary || '').slice(0, 80);
      s.whatsapp = String(f.whatsapp || '').replace(/[^\d+ ]/g, '').slice(0, 20);
      s.email = String(f.email || '').slice(0, 120);
      store.save(); return redirect(res, '/admin/settings?ok=Salvo');
    }
    if ((mm = p.match(/^\/admin\/c\/([A-Za-z0-9_-]+)(?:\/([a-z]+)(?:\/([A-Za-z0-9_-]+))?)?$/))) {
      const c = byId(mm[1]); if (!c) return html(res, 404, page({ title: 'Não encontrado', nav: NAV(''), body: '<h1>Cliente não encontrado</h1>' }));
      const act = mm[2];
      if (!act && m === 'GET') return html(res, 200, clientPage(c, flash));
      if (m !== 'POST') return html(res, 405, '');
      const f = form(await readBody(req));
      if (!act) { cleanClient(f, c); store.log('client', c.id, 'Dados atualizados'); store.save(); return redirect(res, '/admin/c/' + c.id + '?ok=Salvo'); }
      if (act === 'pay') {
        const amount = f.amount ? Math.round(parseFloat(String(f.amount).replace(',', '.')) * 100) : null;
        const p2 = recordPayment(c, { months: f.months, amount: Number.isFinite(amount) ? amount : null, method: f.method || 'virement', ref: f.ref, date: /^\d{4}-\d{2}-\d{2}$/.test(f.date || '') ? f.date : undefined });
        const back = (req.headers.referer || '').includes('/admin/c/') ? '/admin/c/' + c.id : '/admin';
        return redirect(res, back + '?ok=' + encodeURIComponent(`${c.name}: pago até ${fdate(p2.to, 'pt', 1)}.`));
      }
      if (act === 'undo') {
        const pays = clientPayments(c); const last = pays[0];
        if (last && last.id === mm[3]) { c.paidUntil = last.prevPaidUntil || B.addDays(last.from, -1); db().payments = db().payments.filter((x) => x.id !== last.id); store.log('payment', c.id, 'Pagamento desfeito (' + eur(last.amount, 'pt') + ')'); store.save(); }
        return redirect(res, '/admin/c/' + c.id + '?ok=' + encodeURIComponent('Pagamento desfeito.'));
      }
      if (act === 'override') { c.override = ['auto', 'active', 'suspended', 'paused'].includes(f.override) ? f.override : 'auto'; store.log('status', c.id, 'Status: ' + c.override); store.save(); return redirect(res, '/admin/c/' + c.id + '?ok=' + encodeURIComponent('Status atualizado (os sites refletem em até 5 minutos).')); }
      if (act === 'token') { c.token = store.id(18); store.log('client', c.id, 'Novo link da carteirinha'); store.save(); return redirect(res, '/admin/c/' + c.id + '?ok=' + encodeURIComponent('Novo link gerado.')); }
      if (act === 'archive') { c.archived = true; store.log('client', c.id, 'Cliente arquivado'); store.save(); return redirect(res, '/admin?ok=' + encodeURIComponent(c.name + ' arquivado.')); }
    }
    return html(res, 404, page({ title: 'Não encontrado', nav: NAV(''), body: '<h1>Página não encontrada</h1>' }));
  } catch (e) {
    console.error('[erro]', e);
    if (!res.headersSent) html(res, 500, 'Erro interno');
  }
});

setInterval(() => store.backup(), 6 * 3600000).unref(); setTimeout(() => store.backup(), 10000).unref();
server.listen(PORT, () => console.log('[drt-clientes] no ar na porta ' + PORT + ' · ' + PUBLIC_URL));
process.on('SIGTERM', () => { try { store.save(); } catch (e) { /* ok */ } process.exit(0); });
module.exports = { server, stripeEvent, recordPayment };
