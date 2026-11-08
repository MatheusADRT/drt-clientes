'use strict';
// Prospects: negócios a abordar antes do briefing. Lista, follow-ups, mensagens prontas e metas da semana.
const { esc, fdate } = require('./ui');

const TYPES = { resto: 'Restaurante / café', beauty: 'Barbearia / salão', events: 'Festas / eventos / loja', other: 'Outro' };
const SIGNALS = { nosite: 'Sem site', oldsite: 'Site antigo / ruim no celular', insta: 'Só Instagram / Facebook', nobooking: 'Sem reserva online', pdfmenu: 'Cardápio em PDF/foto', gbp: 'Ficha Google sem site' };
const CHANNELS = { whatsapp: 'WhatsApp', instagram: 'Instagram', visit: 'Visita', email: 'E-mail', phone: 'Telefone' };
const STATUS = {
  todo: { pt: 'A contatar', c: 's-paused' },
  contacted: { pt: 'Contatado', c: 's-soon' },
  replied: { pt: 'Respondeu', c: 's-ok' },
  briefing: { pt: 'Briefing recebido', c: 's-ok' },
  proposal: { pt: 'Proposta enviada', c: 's-ok' },
  won: { pt: 'Fechou', c: 's-ok' },
  lost: { pt: 'Não agora', c: 's-paused' },
};
const ORDER = ['todo', 'contacted', 'replied', 'briefing', 'proposal', 'won', 'lost'];
const LANGS = { fr: 'FR', pt: 'PT', en: 'EN', nl: 'NL' };

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' });
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
function weekStart(d = today()) { const x = new Date(d + 'T12:00:00Z'); const wd = (x.getUTCDay() + 6) % 7; return addDays(d, -wd); }
const digits = (s) => String(s || '').replace(/\D/g, '');
function waNumber(phone) { let d = digits(phone); if (!d) return ''; if (String(phone).trim().startsWith('00')) d = d.slice(2); else if (d.startsWith('0')) d = '32' + d.slice(1); return d; }
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// ---- mensagens (mesmas do documento de estratégia) ----
const EXAMPLE = { resto: ['l’Agito Sushi', 'do Agito Sushi', 'www.agitosushi.com'], beauty: ['le Marcola Barbershop à Saint-Gilles', 'do Marcola Barbershop', 'marcolabarbershop.com'], events: ['Big Festa', 'da Big Festa', 'bigfesta.be'], other: ['le Marcola Barbershop à Saint-Gilles', 'do Marcola Barbershop', 'marcolabarbershop.com'] };
const WANT = { resto: ['commander ou réserver', 'cardápio e pedidos online'], beauty: ['réserver', 'agendamento online'], events: ['demander un devis', 'catálogo e pedidos de orçamento'], other: ['vous contacter', 'mais clientes pelo Google'] };
function message(p, kind, briefingUrl) {
  const ex = EXAMPLE[p.type] || EXAMPLE.other; const w = WANT[p.type] || WANT.other;
  const first = String(p.contact || '').trim().split(/\s+/)[0];
  const pt = p.lang === 'pt';
  if (kind === 'intro') return pt
    ? `Oi${first ? ' ' + first : ''}, tudo bem? Sou o Matheus, da DRT Creation aqui em Bruxelas. Vi a ${p.name} no Google e achei que um site com ${w[1]} ia trazer mais clientes. Fiz o site ${ex[1]}, dá uma olhada: ${ex[2]}. Posso te mostrar em 5 minutos como ficaria o seu?`
    : `Bonjour${first ? ' ' + first : ''} ! Je suis Matheus, de DRT Creation à Bruxelles. J’ai vu ${p.name} sur Google : ${p.website || (p.signals || []).includes('oldsite') ? 'votre site ne permet pas encore de ' + w[0] + ' facilement depuis le téléphone' : 'il manque encore un site pour ' + w[0] + ' en ligne'}. J’ai fait celui de ${ex[0]} (${ex[2]}). Je peux vous montrer en 5 minutes ce que ça donnerait pour vous ?`;
  if (kind === 'briefing') return pt
    ? `Que bom${first ? ', ' + first : ''}! Aqui está o questionário: 10 minutos, pelo celular, quase tudo de marcar. Em até 48 h te mando uma proposta. ${briefingUrl}?lang=pt`
    : `Super${first ? ' ' + first : ''} ! Voici le questionnaire : 10 minutes, depuis le téléphone, surtout des cases à cocher. Je reviens avec une proposition sous 48 h. ${briefingUrl}?lang=${p.lang === 'en' || p.lang === 'nl' ? p.lang : 'fr'}`;
  if (kind === 'reminder') return p.status === 'replied'
    ? (pt ? `Oi${first ? ' ' + first : ''}! Só lembrando do questionário (10 min, as respostas ficam salvas se fizer em partes): ${briefingUrl}?lang=pt` : `Petit rappel${first ? ', ' + first : ''} : le questionnaire prend 10 minutes, et vos réponses sont gardées si vous le faites en plusieurs fois. ${briefingUrl}?lang=fr`)
    : (pt ? `Oi${first ? ' ' + first : ''}, conseguiu dar uma olhada no site ${ex[1]}? Se quiser, passo aí essa semana e te mostro em 5 minutos.` : `Bonjour${first ? ' ' + first : ''}, vous avez pu jeter un œil au site de ${ex[0].replace(/ à .*/, '')} ? Je peux passer cette semaine pour vous montrer en 5 minutes.`);
  if (kind === 'proposal') return pt ? `Oi${first ? ' ' + first : ''}! Conseguiu ver a proposta? Posso tirar qualquer dúvida por aqui ou numa ligação rápida.` : `Bonjour${first ? ' ' + first : ''} ! Vous avez pu regarder la proposition ? Je réponds volontiers à vos questions ici ou par un court appel.`;
  return '';
}
// qual mensagem cabe agora
function nextKind(p) {
  if (p.status === 'todo' || p.status === 'lost') return 'intro';
  if (p.status === 'contacted') return 'reminder';
  if (p.status === 'replied') return (p.log || []).some((l) => l.k === 'briefing-sent') ? 'reminder' : 'briefing';
  if (p.status === 'proposal') return 'proposal';
  return null;
}
const KIND_LABEL = { intro: 'Mandar 1ª mensagem', reminder: 'Mandar lembrete', briefing: 'Mandar o briefing', proposal: 'Cobrar retorno da proposta' };

// ---- mudanças de estado ----
function log(p, k, text) { (p.log = p.log || []).unshift({ at: new Date().toISOString(), k, text }); if (p.log.length > 60) p.log.length = 60; }
function act(p, a, extra = {}) {
  const t = today();
  if (a === 'sent') { // mensagem enviada pelo botão
    const k = extra.kind || nextKind(p);
    if (k === 'intro') { p.status = 'contacted'; p.contactedAt = p.contactedAt || t; p.nextAt = addDays(t, 3); log(p, 'contact', '1ª mensagem por ' + (CHANNELS[p.channel] || 'WhatsApp')); }
    else if (k === 'briefing') { p.nextAt = addDays(t, 3); log(p, 'briefing-sent', 'Link do briefing enviado'); }
    else if (k === 'reminder') { p.followups = (p.followups || 0) + 1; p.nextAt = p.followups >= 3 ? '' : addDays(t, 4); if (p.followups >= 3 && p.status === 'contacted') p.status = 'lost'; log(p, 'followup', 'Lembrete ' + p.followups + (p.followups >= 3 && p.status === 'lost' ? ' · sem resposta, arquivado' : '')); }
    else if (k === 'proposal') { p.nextAt = addDays(t, 4); log(p, 'followup', 'Retorno da proposta cobrado'); }
    return;
  }
  if (a === 'visit') { p.status = p.status === 'todo' ? 'contacted' : p.status; p.contactedAt = p.contactedAt || t; p.nextAt = addDays(t, 2); log(p, 'contact', 'Visita na loja'); return; }
  if (a === 'replied') { p.status = 'replied'; p.nextAt = t; log(p, 'replied', 'Respondeu'); return; }
  if (a === 'proposal') { p.status = 'proposal'; p.nextAt = addDays(t, 3); log(p, 'proposal', 'Proposta enviada'); return; }
  if (a === 'won') { p.status = 'won'; p.nextAt = ''; log(p, 'won', 'Fechou contrato'); return; }
  if (a === 'lost') { p.status = 'lost'; p.nextAt = addDays(t, 90); log(p, 'lost', 'Não agora · voltar a falar em 3 meses'); return; }
  if (a === 'todo') { p.status = 'todo'; p.nextAt = t; log(p, 'reset', 'Voltou para a contatar'); return; }
  if (a === 'snooze') { p.nextAt = addDays(t, Number(extra.days) || 7); log(p, 'snooze', 'Adiado para ' + p.nextAt); return; }
}

function clean(f, p = {}) {
  const s = (k, n = 200) => String(f[k] == null ? '' : f[k]).trim().slice(0, n);
  p.name = s('name', 120) || p.name;
  p.type = TYPES[f.type] ? f.type : (p.type || 'other');
  p.area = s('area', 80);
  p.contact = s('contact', 80);
  p.phone = s('phone', 40);
  p.instagram = s('instagram', 120).replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, '');
  p.website = s('website', 200);
  p.maps = /^https:\/\//.test(s('maps', 500)) ? s('maps', 500) : '';
  p.email = s('email', 120);
  p.channel = CHANNELS[f.channel] ? f.channel : (p.channel || 'whatsapp');
  p.lang = LANGS[f.lang] ? f.lang : (p.lang || 'fr');
  const sig = [].concat(f.signals || []).filter((x) => SIGNALS[x]);
  p.signals = sig;
  p.notes = s('notes', 3000);
  if (f.nextAt !== undefined) p.nextAt = /^\d{4}-\d{2}-\d{2}$/.test(f.nextAt) ? f.nextAt : '';
  return p;
}
function create(f, id) {
  const p = clean(f, { id, at: new Date().toISOString(), status: 'todo', nextAt: today(), log: [], followups: 0 });
  log(p, 'new', 'Adicionado');
  return p;
}
// colar em massa: uma linha por negócio — "Nome; bairro; telefone; tipo; instagram"
function parseBulk(text, defaults) {
  const out = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const parts = line.split(/\s*[;\t|]\s*/).map((x) => x.trim());
    if (!parts[0] || parts[0].length < 2) continue;
    const t = norm(parts[3] || defaults.type || '');
    const type = /resto|restaur|sushi|snack|cafe|pizza|food|bar\b/.test(t) ? 'resto' : /barb|salao|salon|coiff|beaut|estet|nail|unha/.test(t) ? 'beauty' : /fest|event|loja|shop|boutique|decor|ballon/.test(t) ? 'events' : (TYPES[defaults.type] ? defaults.type : 'other');
    out.push({ name: parts[0], area: parts[1] || defaults.area || '', phone: parts[2] || '', type, instagram: parts[4] || '', lang: defaults.lang, channel: defaults.channel, signals: defaults.signals });
    if (out.length >= 200) break;
  }
  return out;
}
// briefing recebido: liga ao prospect pelo telefone, e-mail ou nome
function matchBriefing(list, b) {
  const a = b.answers || {}; const ph = digits(waNumber(a.phone)); const em = String(a.email || '').toLowerCase(); const nm = norm(a.company);
  return list.find((p) => (ph && ph.length >= 8 && digits(waNumber(p.phone)) === ph) || (em && p.email && p.email.toLowerCase() === em) || (nm && norm(p.name) === nm)) || null;
}

// ---- números ----
function stats(list) {
  const ws = weekStart(); const m = today().slice(0, 7);
  const ev = list.flatMap((p) => (p.log || []).map((l) => ({ ...l, d: new Date(l.at).toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' }) })));
  const contactsWeek = ev.filter((l) => l.d >= ws && (l.k === 'contact')).length;
  const repliesWeek = ev.filter((l) => l.d >= ws && l.k === 'replied').length;
  const briefMonth = ev.filter((l) => l.d.slice(0, 7) === m && l.k === 'briefing').length;
  const propMonth = ev.filter((l) => l.d.slice(0, 7) === m && l.k === 'proposal').length;
  const wonMonth = ev.filter((l) => l.d.slice(0, 7) === m && l.k === 'won').length;
  const due = list.filter((p) => p.nextAt && p.nextAt <= today() && !['won', 'todo'].includes(p.status));
  const contacted = list.filter((p) => p.status !== 'todo').length; const replied = list.filter((p) => ['replied', 'briefing', 'proposal', 'won'].includes(p.status)).length;
  return { contactsWeek, repliesWeek, briefMonth, propMonth, wonMonth, due, rate: contacted ? Math.round(replied / contacted * 100) : null };
}

// ---- telas ----
const CSS = `
.pgoal{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:18px 0 6px}
.pgoal .stat .bar{height:4px;background:var(--line);margin-top:10px}.pgoal .stat .bar i{display:block;height:100%;background:var(--accent)}
.ptabs{display:flex;gap:6px;flex-wrap:wrap;margin:22px 0 10px}.ptabs a{font:600 11.5px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;padding:9px 11px;border:1px solid var(--line);color:var(--text-2);text-decoration:none}.ptabs a[aria-current]{border-color:var(--accent);color:var(--text)}
.plist{display:grid;gap:10px}
.pr{background:var(--panel);border:1px solid var(--line);padding:14px 16px;display:grid;gap:10px}
.pr.due{border-left:3px solid var(--accent)}
.pr .h{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
.pr .nm{font:700 16px/1.25 var(--body);color:var(--text);text-decoration:none}.pr .nm:hover{color:var(--accent)}
.pr .meta{font-size:13px;color:var(--text-2);display:flex;gap:6px 12px;flex-wrap:wrap}
.tag{display:inline-block;font:600 10.5px/1 var(--mono);letter-spacing:.06em;padding:5px 7px;border:1px solid var(--line-2);color:var(--text-2);margin:0 4px 4px 0}
.pr .acts{display:flex;gap:6px;flex-wrap:wrap}.pr .acts form{margin:0}
.btn.wa{background:#1f7a4d;border-color:#1f7a4d;color:#fff}.btn.wa:hover{background:#25935c;color:#fff;border-color:#25935c}
.qadd summary{cursor:pointer;font:700 12px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;padding:12px 14px;border:1px solid var(--line-2);display:inline-block;list-style:none}.qadd summary::-webkit-details-marker{display:none}
.qadd[open] summary{border-color:var(--accent);color:var(--accent)}
.sigs{display:flex;flex-wrap:wrap;gap:6px}.sigs label{display:inline-flex !important;grid-template-columns:none;align-items:center;gap:8px;font-weight:500 !important;padding:8px 10px;border:1px solid var(--line-2);cursor:pointer}.sigs input{width:auto !important}
.plog{list-style:none;margin:0;padding:0;display:grid;gap:8px}.plog li{display:flex;gap:12px;font-size:14px}.plog .mono{color:var(--text-2);min-width:96px}
@media(max-width:640px){.pgoal{grid-auto-flow:column;grid-auto-columns:minmax(132px,1fr);grid-template-columns:none;overflow-x:auto;scrollbar-width:none}.pgoal .stat{padding:12px}.pgoal .stat b{font-size:22px}.ptabs{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}.ptabs a{white-space:nowrap}}
.msgprev{white-space:pre-wrap;background:var(--bg);border:1px solid var(--line);padding:12px;font-size:14px;margin:0}
`;
function waUrl(p, kind, briefingUrl) { const n = waNumber(p.phone); const txt = message(p, kind, briefingUrl); return n ? 'https://wa.me/' + n + '?text=' + encodeURIComponent(txt) : 'https://wa.me/?text=' + encodeURIComponent(txt); }

function row(p, briefingUrl) {
  const st = STATUS[p.status] || STATUS.todo; const k = nextKind(p); const isDue = p.nextAt && p.nextAt <= today() && !['won', 'todo'].includes(p.status);
  const sendForm = k ? `<form method="post" action="/admin/prospects/${p.id}/act" target="_blank" onsubmit="setTimeout(function(){location.reload()},1500)"><input type="hidden" name="a" value="sent"><input type="hidden" name="kind" value="${k}"><button class="btn sm wa">${esc(KIND_LABEL[k])}</button></form>` : '';
  const quick = (a, label, cls = '') => `<form method="post" action="/admin/prospects/${p.id}/act"><input type="hidden" name="a" value="${a}"><button class="btn sm ${cls}">${label}</button></form>`;
  return `<div class="pr${isDue ? ' due' : ''}"><div class="h"><div><a class="nm" href="/admin/prospects/${p.id}">${esc(p.name)}</a>
<div class="meta"><span>${esc(TYPES[p.type])}</span>${p.area ? `<span>${esc(p.area)}</span>` : ''}${p.phone ? `<span class="mono">${esc(p.phone)}</span>` : ''}${p.instagram ? `<span>${esc(p.instagram)}</span>` : ''}<span class="mono">${esc(LANGS[p.lang])}</span>${p.rating ? `<span>★ ${esc(String(p.rating).replace('.', ','))} (${esc(p.reviews || 0)})</span>` : ''}${p.score ? `<span class="s-ok mono" title="Prioridade">${'●'.repeat(Math.min(3, p.score))}${'○'.repeat(Math.max(0, 3 - p.score))}</span>` : ''}</div></div>
<div style="text-align:right"><span class="${st.c}" style="font:600 12px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase">${esc(st.pt)}</span>${p.nextAt && !['won', 'todo'].includes(p.status) ? `<div class="muted mono" style="font-size:11.5px;margin-top:6px">${isDue ? (p.nextAt < today() ? 'atrasado · ' : 'hoje · ') : 'próximo: '}${esc(fdate(p.nextAt, 'pt'))}</div>` : ''}</div></div>
${(p.signals || []).length || p.notes ? `<div>${(p.signals || []).map((s) => `<span class="tag">${esc(SIGNALS[s])}</span>`).join('')}${p.notes ? `<span class="muted" style="font-size:13px">${esc(p.notes.split('\n')[0].slice(0, 140))}</span>` : ''}</div>` : ''}
<div class="acts">${sendForm}${p.status === 'todo' ? quick('visit', 'Visitei') : ''}${['contacted'].includes(p.status) ? quick('replied', 'Respondeu') : ''}${['replied', 'briefing'].includes(p.status) ? quick('proposal', 'Proposta enviada') : ''}${p.status === 'proposal' ? quick('won', 'Fechou ✓', 'pri') : ''}${!['won', 'lost'].includes(p.status) ? quick('snooze', '+7 dias') + quick('lost', 'Não agora', 'danger') : ''}${p.briefingId ? `<a class="btn sm" href="/admin/briefings/${p.briefingId}">Ver briefing</a>` : ''}</div></div>`;
}

function formFields(p = {}) {
  const v = (k) => esc(p[k] || '');
  const sel = (name, obj, cur) => `<select name="${name}">${Object.entries(obj).map(([k, l]) => `<option value="${k}"${cur === k ? ' selected' : ''}>${esc(typeof l === 'string' ? l : l.pt)}</option>`).join('')}</select>`;
  return `<div class="two"><label>Nome do negócio<input name="name" required value="${v('name')}" placeholder="Sushi do Bairro"></label><label>Tipo${sel('type', TYPES, p.type || 'resto')}</label></div>
<div class="two"><label>Bairro<input name="area" value="${v('area')}" placeholder="Saint-Gilles"></label><label>Pessoa de contato<input name="contact" value="${v('contact')}" placeholder="opcional"></label></div>
<div class="two"><label>Telefone / WhatsApp<input name="phone" inputmode="tel" value="${v('phone')}" placeholder="0470 12 34 56"></label><label>Instagram<input name="instagram" value="${v('instagram')}" placeholder="@negocio"></label></div>
<div class="two"><label>Site atual<input name="website" value="${v('website')}" placeholder="opcional"></label><label>Link do Google Maps<input name="maps" value="${v('maps')}" placeholder="https://maps.app.goo.gl/…"></label></div>
<div class="two"><label>Canal<select name="channel">${Object.entries(CHANNELS).map(([k, l]) => `<option value="${k}"${(p.channel || 'whatsapp') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label><label>Idioma das mensagens<select name="lang">${Object.entries({ fr: 'Français', pt: 'Português', en: 'English', nl: 'Nederlands' }).map(([k, l]) => `<option value="${k}"${(p.lang || 'fr') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
<div><span class="lab" style="display:block;margin:4px 0 8px">Sinais</span><div class="sigs">${Object.entries(SIGNALS).map(([k, l]) => `<label><input type="checkbox" name="signals" value="${k}"${(p.signals || []).includes(k) ? ' checked' : ''}>${esc(l)}</label>`).join('')}</div></div>`;
}

module.exports = { TYPES, SIGNALS, CHANNELS, STATUS, ORDER, LANGS, today, addDays, weekStart, waNumber, message, nextKind, KIND_LABEL, act, clean, create, parseBulk, matchBriefing, stats, CSS, row, formFields, waUrl, log };
