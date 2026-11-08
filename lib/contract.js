'use strict';
// Contrato preenchido a partir da proposta aceita (modelo DRT-103 em contracts/template.html),
// aberto pelo cliente em /p/<token>/contrat, com assinatura eletrônica (nome + "lu et approuvé").
const fs = require('fs');
const path = require('path');
const { esc } = require('./ui');
const PP = require('./proposal');

const TPL = fs.readFileSync(path.join(__dirname, '..', 'contracts', 'template.html'), 'utf8');
const CHK = '<span class="box" style="background:var(--deep);border-color:var(--deep)"></span>';
const n0 = (x) => Number(x || 0).toLocaleString('fr-BE', { minimumFractionDigits: Number(x) % 1 ? 2 : 0, maximumFractionDigits: 2 });
const dfr = (iso) => { if (!iso) return ''; const [y, m, d] = iso.slice(0, 10).split('-'); return `${d} / ${m} / ${y}`; };
const dlong = (iso) => { if (!iso) return ''; const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('fr-BE', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }); };
const tz = (iso) => new Date(iso).toLocaleString('fr-BE', { timeZone: 'Europe/Brussels', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// opção escolhida pelo cliente: 'monthly' (sem entrada) ou 'upfront'
const option = (pp) => pp.acceptedOption || (pp.financing === 'monthly' ? 'monthly' : 'upfront');

function fill(pp) {
  let h = TPL; const tt = PP.totals(pp); const opt = option(pp); const sig = pp.contract && pp.contract.signedAt ? pp.contract : null;
  const R = (a, b, all) => { if (!h.includes(a)) throw new Error('modelo de contrato mudou: ' + a.slice(0, 40)); h = all ? h.split(a).join(b) : h.replace(a, b); };
  const dateDoc = (sig && sig.signedAt) || pp.acceptedAt || pp.sentAt || pp.at;
  R('{{NO}}', esc(String(pp.contractNo || '')), true);
  R('<div class="ref">Contrat n° <b>DRT-' + esc(String(pp.contractNo || '')) + '</b><br>Date <b>____ / ____ / 20____</b></div>', '<div class="ref">Contrat n° <b>DRT-' + esc(String(pp.contractNo || '')) + '</b><br>Date <b>' + dfr(dateDoc) + '</b><br>Proposition <b>' + esc(pp.no) + '</b></div>');
  const cl = pp.client || {};
  const parties = [
    `<b>${esc(cl.company)}</b>${cl.contact ? '<br><span class="note">représentée par ' + esc(cl.contact) + '</span>' : ''}`,
    cl.vat ? esc(cl.vat) : '<span class="field l"></span>',
    cl.address ? esc(cl.address) : '<span class="field l"></span>',
    [cl.phone, cl.email].filter(Boolean).map(esc).join(' · ') || '<span class="field l"></span>',
  ];
  for (const v of parties) R('<td><span class="field l"></span></td>', '<td>' + v + '</td>');
  const scope = (pp.items || []).map((i) => i.label).filter(Boolean).join(' · ');
  R('<span class="field" style="min-width:140mm"></span>', esc(scope.slice(0, 160)) + (cl.website ? ' · ' + esc(cl.website) : ''));
  if (pp.plan === 'boutique') R('<span class="box"></span>Boutique', CHK + 'Boutique'); else if (pp.plan === 'systeme') R('<span class="box"></span>Système', CHK + 'Système'); else R('<span class="box"></span>Site', CHK + 'Site');
  R('<span class="mono"><span class="field s"></span> € / mois</span>', opt === 'monthly'
    ? `<span class="mono"><b>${n0(tt.sub)}</b> € / mois</span> pendant ${tt.months} mois, puis <span class="mono"><b>${n0(tt.monthly)}</b> € / mois</span>`
    : `<span class="mono"><b>${n0(tt.monthly)}</b> € / mois</span> <span class="note">(formule annuelle : ${n0(tt.monthly * 10)} € pour 12 mois)</span>`);
  const creaOld = '<span class="box"></span><b>Avec acompte</b> : <span class="mono"><span class="field s"></span> €</span>, réglés selon le devis &nbsp; <span class="box"></span><b>Sans apport</b> : incluse dans la mensualité, engagement <span class="box"></span>12 <span class="box"></span>24 mois';
  R(creaOld, opt === 'monthly'
    ? `<span class="box"></span>Avec acompte &nbsp; ${CHK}<b>Sans apport</b> : incluse dans la mensualité, engagement ${tt.months === 12 ? CHK : '<span class="box"></span>'}12 ${tt.months === 24 ? CHK : '<span class="box"></span>'}24 mois`
    : `${CHK}<b>Avec acompte</b> : <span class="mono"><b>${n0(tt.setup)}</b> €</span>, ${esc(pp.payTerms || 'réglés selon la proposition')} (proposition ${esc(pp.no)}) &nbsp; <span class="box"></span>Sans apport`);
  R('<span class="field s" style="min-width:28mm"></span>', pp.startDate ? '<b>' + dfr(pp.startDate) + '</b>' : 'à la mise en ligne du site');
  const dateLn = '<div class="ln"><span>Date</span><span class="mono">____ / ____ / 20____</span></div>';
  R(dateLn, `<div class="ln"><span>Date</span><span class="mono">${sig ? dfr(sig.signedAt) : dfr(pp.acceptedAt || pp.at)}</span></div>`);
  R(dateLn, `<div class="ln"><span>Date</span><span class="mono">${sig ? dfr(sig.signedAt) : '____ / ____ / 20____'}</span></div>`);
  R('<div class="ln"><span>Nom</span><span class="field"></span></div>', `<div class="ln"><span>Nom</span>${sig ? '<span>' + esc(sig.signedBy) + '</span>' : '<span class="field"></span>'}</div>`);
  R('<div class="pad"></div>', sig ? `<div class="pad esig"><b>« Lu et approuvé »</b><span>Signé électroniquement par ${esc(sig.signedBy)}</span><span class="mono">${esc(tz(sig.signedAt))} · ${esc(sig.ip || '')}</span><span class="mono">Réf. ${esc(sig.ref || '')}</span></div>` : '<div class="pad"></div>');
  return h;
}

const SIGN_T = {
  fr: { title: 'Signer le contrat', name: 'Votre nom complet', ok: 'J’ai lu le contrat et je l’accepte (« lu et approuvé »). Ma signature électronique a la même valeur qu’une signature manuscrite.', btn: 'Signer électroniquement', print: 'Imprimer / PDF', signed: 'Contrat signé', by: 'par', back: '← Proposition', q: 'Une question ? WhatsApp' },
  pt: { title: 'Assinar o contrato', name: 'Seu nome completo', ok: 'Li o contrato e aceito («lu et approuvé»). Minha assinatura eletrônica vale como uma assinatura à mão.', btn: 'Assinar eletronicamente', print: 'Imprimir / PDF', signed: 'Contrato assinado', by: 'por', back: '← Proposta', q: 'Dúvida? WhatsApp' },
  en: { title: 'Sign the contract', name: 'Your full name', ok: 'I have read and accept the contract (“lu et approuvé”). My electronic signature has the same value as a handwritten one.', btn: 'Sign electronically', print: 'Print / PDF', signed: 'Contract signed', by: 'by', back: '← Proposal', q: 'A question? WhatsApp' },
  nl: { title: 'Contract ondertekenen', name: 'Uw volledige naam', ok: 'Ik heb het contract gelezen en aanvaard het („lu et approuvé”). Mijn elektronische handtekening heeft dezelfde waarde als een handgeschreven.', btn: 'Elektronisch ondertekenen', print: 'Afdrukken / PDF', signed: 'Contract ondertekend', by: 'door', back: '← Voorstel', q: 'Een vraag? WhatsApp' },
};
function page(pp, { wa, preview } = {}) {
  const t = SIGN_T[pp.lang] || SIGN_T.fr; const sig = pp.contract && pp.contract.signedAt ? pp.contract : null;
  const extra = `<style>
.esig{display:flex;flex-direction:column;justify-content:center;gap:1mm;padding:0 4mm;font-size:8.5pt;color:#0b1a21}.esig b{font:800 10pt/1.2 "Archivo",Arial,sans-serif;color:#1d44d6}.esig .mono{font:500 7pt/1.3 "JetBrains Mono",monospace;color:#5b6a72}
@media screen{html,body{background:#c9ced2}.page{background:#fff;margin:16px auto;box-shadow:0 10px 40px rgba(7,20,26,.2)}body{padding-bottom:150px}}
.sbar{position:fixed;left:0;right:0;bottom:0;z-index:9;background:#07141a;color:#dfe3e5;padding:14px max(14px,env(safe-area-inset-left)) max(14px,env(safe-area-inset-bottom));font:14px/1.45 "Instrument Sans",Arial,sans-serif;box-shadow:0 -10px 30px rgba(0,0,0,.25)}
.sbar .in{max-width:860px;margin:0 auto;display:grid;gap:10px}.sbar h3{margin:0;font:800 18px/1.1 "Archivo",Arial,sans-serif;color:#fff}
.sbar .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.sbar input[type=text]{flex:1;min-width:200px;font:16px "Instrument Sans",sans-serif;padding:11px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.06);color:#fff}
.sbar label.c{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:#c7d2d8}.sbar label.c input{width:20px;height:20px;flex:none;accent-color:#7fa0ff;margin-top:1px}
.sbar button,.sbar a{font:700 12px/1 "JetBrains Mono",monospace;letter-spacing:.08em;text-transform:uppercase;padding:13px 16px;border:1px solid rgba(255,255,255,.3);color:#fff;background:none;text-decoration:none;cursor:pointer}.sbar .p{background:#7fa0ff;border-color:#7fa0ff;color:#07141a}
.sbar .done{color:#7ce3a8;font-weight:700}
.pill{display:none}
@media screen and (max-width:760px){body{padding-bottom:0}.sbar{position:static;box-shadow:none;padding-bottom:max(90px,env(safe-area-inset-bottom))}.sbar h3{font-size:17px}.sbar button,.sbar a{font-size:11px;padding:11px 12px}.sbar .p{width:100%}.pill{display:block;position:fixed;right:14px;bottom:max(14px,env(safe-area-inset-bottom));z-index:10;background:#7fa0ff;color:#07141a;font:700 12px/1 "JetBrains Mono",monospace;letter-spacing:.06em;text-transform:uppercase;padding:14px 16px;border-radius:999px;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.35)}}
@media print{.sbar,.pill{display:none}.page{margin:0;box-shadow:none}body{padding:0}}
</style>`;
  const bar = `${sig ? '' : `<a class="pill" href="#sign">${esc(t.title)} ↓</a>`}<div class="sbar" id="sign"><div class="in">${sig
    ? `<div class="row" style="justify-content:space-between"><span class="done">✓ ${esc(t.signed)} ${esc(t.by)} ${esc(sig.signedBy)} · ${esc(tz(sig.signedAt))}</span><span class="row"><button type="button" onclick="print()">${esc(t.print)}</button><a href="/p/${esc(pp.token)}">${esc(t.back)}</a></span></div>`
    : `<h3>${esc(t.title)} · DRT-${esc(String(pp.contractNo))}</h3><form method="post" action="/p/${esc(pp.token)}/sign" class="in" style="gap:8px"><div class="row"><input type="text" name="name" required placeholder="${esc(t.name)}" value="${esc(pp.acceptedBy || pp.client.contact || '')}"${preview ? ' disabled' : ''}><button class="p"${preview ? ' disabled' : ''}>${esc(t.btn)} →</button></div><label class="c"><input type="checkbox" name="ok" value="1" required${preview ? ' disabled' : ''}>${esc(t.ok)}</label></form><div class="row"><button type="button" onclick="print()">${esc(t.print)}</button>${wa ? `<a href="${esc(wa)}" target="_blank" rel="noopener">${esc(t.q)}</a>` : ''}<a href="/p/${esc(pp.token)}">${esc(t.back)}</a></div>`}</div></div>`;
  // no celular, a página A4 é reduzida para caber na tela
  const fit = '<script>(function(){function f(){var w=document.documentElement.clientWidth,p=794;document.querySelectorAll(".page").forEach(function(e){e.style.zoom=w<p+24?((w-16)/p):""})}f();addEventListener("resize",f)})();</script>';
  const doc = fill(pp);
  return doc.replace('</head>', '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Contrat DRT-' + esc(String(pp.contractNo)) + ' · ' + esc(pp.client.company) + '</title>' + extra + '</head>').replace(/<\/body>\s*<\/html>\s*$/, bar + fit + '</body></html>');
}

module.exports = { fill, page, option };
