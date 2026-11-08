'use strict';
// Carte membre exclusive par marque : logo du client, couleurs, motif, recto/verso (retourne au clic).
const { esc, logo, eur, fdate, PLAN, STATUS, initials } = require('./ui');

// thème par n° de contrat ; les autres clients reçoivent un thème généré à partir de leur couleur
const BRANDS = {
  100: { logo: '/brand/agito.png', logoH: 64, bg: 'linear-gradient(135deg,#1a0605 0%,#3b0c09 45%,#120303 100%)', glow: '#C8190F', ink: '#fff', accent: '#ff5a4a', pattern: 'seigaiha', tag: { fr: 'Sushi · Saint-Gilles', pt: 'Sushi · Saint-Gilles' }, tier: { fr: 'Membre fondateur', pt: 'Membro fundador' } },
  101: { logo: '/brand/marcola.png', logoH: 70, round: true, bg: 'linear-gradient(135deg,#050505 0%,#151515 50%,#0a0a0a 100%)', glow: '#D4FF3A', ink: '#fff', accent: '#D4FF3A', pattern: 'pinstripe', tag: { fr: 'Coiffeur · Barbier', pt: 'Barbearia · Saint-Gilles' }, tier: { fr: 'Membre fondateur', pt: 'Membro fundador' } },
  102: { logo: '/brand/bigfesta.png', logoH: 62, bg: 'linear-gradient(135deg,#2a1219 0%,#4a2230 48%,#1c0c12 100%)', glow: '#e8aab6', ink: '#fff', accent: '#f2b8c4', pattern: 'confetti', tag: { fr: 'Fêtes · Ballons · Boutique', pt: 'Festas · Balões · Loja' }, tier: { fr: 'Membre fondateur', pt: 'Membro fundador' } },
};
const enc = (x) => encodeURIComponent(x).replace(/'/g, '%27');
const PATTERNS = {
  seigaiha: (c) => `url('data:image/svg+xml,${enc(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='20'><g fill='none' stroke='${c}' stroke-opacity='.22' stroke-width='1'><circle cx='20' cy='20' r='18'/><circle cx='20' cy='20' r='13'/><circle cx='20' cy='20' r='8'/><circle cx='0' cy='10' r='18'/><circle cx='40' cy='10' r='18'/></g></svg>`)}')`,
  pinstripe: (c) => `repeating-linear-gradient(135deg,transparent 0 14px,color-mix(in srgb,${c} 16%,transparent) 14px 15px)`,
  confetti: (c) => `url('data:image/svg+xml,${enc(`<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90'><g fill='${c}' fill-opacity='.28'><circle cx='10' cy='12' r='2'/><rect x='40' y='8' width='6' height='2.5' rx='1' transform='rotate(30 43 9)'/><circle cx='72' cy='30' r='1.6'/><rect x='18' y='52' width='6' height='2.5' rx='1' transform='rotate(-40 21 53)'/><circle cx='55' cy='62' r='2.4'/><rect x='75' y='78' width='6' height='2.5' rx='1' transform='rotate(60 78 79)'/><circle cx='30' cy='82' r='1.4'/></g></svg>`)}')`,
  dots: (c) => `radial-gradient(circle,color-mix(in srgb,${c} 30%,transparent) 1px,transparent 1.5px) 0 0/14px 14px`,
};
function theme(c) {
  const b = BRANDS[c.no]; if (b) return b;
  const col = c.color || '#1d44d6';
  return { logo: c.logo || '', logoH: 56, bg: `linear-gradient(135deg,#07141a 0%,color-mix(in srgb,${col} 35%,#07141a) 55%,#07141a 100%)`, glow: col, ink: '#fff', accent: col, pattern: 'dots', tag: { fr: '', pt: '' }, tier: { fr: 'Membre', pt: 'Membro' } };
}
const mmyy = (d) => d ? d.slice(5, 7) + '/' + d.slice(2, 4) : '—';

const CSS = `
.bc{position:relative;perspective:1400px;width:100%;max-width:420px;aspect-ratio:1.586;cursor:pointer;-webkit-tap-highlight-color:transparent;justify-self:end}
.bc-in{position:relative;width:100%;height:100%;transition:transform .9s cubic-bezier(.2,.8,.2,1);transform-style:preserve-3d}
.bc.flip .bc-in{transform:rotateY(180deg)}
.bc-f,.bc-b{position:absolute;inset:0;border-radius:20px;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;color:var(--bink);background:var(--bbg);box-shadow:0 30px 70px -18px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.09) inset;isolation:isolate}
.bc-b{transform:rotateY(180deg)}
.bc-f::before,.bc-b::before{content:"";position:absolute;inset:0;background:var(--bpat);z-index:-1}
.bc-f::after{content:"";position:absolute;inset:-60% -30%;background:radial-gradient(closest-side,color-mix(in srgb,var(--bglow) 55%,transparent),transparent);transform:translate(38%,-30%);z-index:-1;opacity:.75}
.bc-shine{position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.16) 47%,transparent 58%);transform:translateX(-60%);animation:shine 6s ease-in-out infinite;pointer-events:none}
@keyframes shine{0%,62%{transform:translateX(-70%)}100%{transform:translateX(70%)}}
.bc-p{position:absolute;inset:0;padding:clamp(16px,5%,24px);display:flex;flex-direction:column;justify-content:space-between}
.bc-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.bc-logo{height:var(--blh);max-width:58%;object-fit:contain;object-position:left top;filter:drop-shadow(0 4px 14px rgba(0,0,0,.4))}
.bc-logo.round{border-radius:50%}
.bc-ini{width:56px;height:56px;border-radius:14px;background:var(--bglow);display:grid;place-items:center;font:800 20px/1 var(--body)}
.bc-drt{text-align:right;display:grid;gap:5px;justify-items:end}.bc-drt svg{width:30px;opacity:.9}
.bc-tier{font:700 8.5px/1 var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--bacc);border:1px solid color-mix(in srgb,var(--bacc) 55%,transparent);padding:5px 7px;border-radius:999px;white-space:nowrap}
.bc-mid{display:flex;align-items:center;gap:14px}
.bc-chip{width:42px;height:32px;border-radius:7px;background:linear-gradient(135deg,#e9d18c,#b8913f 45%,#f3e1a6 70%,#a27c32);position:relative;box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
.bc-chip::before{content:"";position:absolute;inset:6px 4px;border:1px solid rgba(70,50,10,.45);border-radius:4px}
.bc-chip::after{content:"";position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(70,50,10,.45)}
.bc-nfc{width:20px;height:20px;opacity:.75}
.bc-num{font:600 clamp(13px,3.4vw,17px)/1 var(--mono);letter-spacing:.2em;text-shadow:0 1px 0 rgba(0,0,0,.35)}
.bc-bot{display:flex;justify-content:space-between;align-items:flex-end;gap:10px}
.bc-k{font:600 8px/1 var(--mono);letter-spacing:.18em;text-transform:uppercase;opacity:.6;margin-bottom:5px}
.bc-v{font:700 clamp(12px,3vw,15px)/1.15 var(--body)}
.bc-name{font:800 clamp(14px,3.6vw,18px)/1.1 var(--body);letter-spacing:.02em;text-transform:uppercase}
.bc-tag{font:500 10px/1.3 var(--mono);letter-spacing:.08em;opacity:.65;margin-top:4px}
.bc-st{display:inline-flex;align-items:center;gap:6px;font:700 9px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;padding:6px 8px;border-radius:999px;background:rgba(0,0,0,.35);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);border:1px solid currentColor;white-space:nowrap}
.bc-st::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}
.bc-strip{height:38px;margin:0 calc(-1 * clamp(16px,5%,24px));background:rgba(0,0,0,.55)}
.bc-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px}
.bc-sig{display:flex;justify-content:space-between;align-items:center;gap:10px;font:500 10px/1.4 var(--mono);opacity:.75}
.bc-sig b{font:700 11px/1 var(--body);opacity:1}
.bc-hint{position:absolute;right:14px;bottom:-26px;font:500 10px/1 var(--mono);letter-spacing:.1em;color:var(--text-2);text-transform:uppercase}
@media (max-width:1020px){.bc{justify-self:start}}
@media (prefers-reduced-motion:reduce){.bc-shine{display:none}.bc-in{transition:none}}
`;

function brandCard(c, s, lang, extra = {}) {
  const t = theme(c); const fr = lang !== 'pt';
  const L = fr ? { since: 'Membre depuis', valid: 'Valable jusqu’au', due: 'Prochaine échéance', fee: 'Mensualité', contract: 'Contrat', plan: 'Formule', holder: 'Titulaire', support: 'Support', flip: 'Toucher pour retourner', back: 'Carte personnelle · DRT Creation, Bruxelles' }
    : { since: 'Membro desde', valid: 'Válido até', due: 'Próximo vencimento', fee: 'Mensalidade', contract: 'Contrato', plan: 'Plano', holder: 'Titular', support: 'Suporte', flip: 'Toque para virar', back: 'Cartão pessoal · DRT Creation, Bruxelas' };
  const num = 'DRT ' + String(c.no).padStart(4, '0') + ' ' + (c.since || '').slice(2, 4) + (c.since || '').slice(5, 7) + ' ' + String(c.no * 37 % 10000).padStart(4, '0');
  const style = `--bbg:${t.bg};--bpat:${PATTERNS[t.pattern](t.accent)};--bglow:${t.glow};--bink:${t.ink};--bacc:${t.accent};--blh:${t.logoH}px`;
  const lg = t.logo ? `<img class="bc-logo${t.round ? ' round' : ''}" src="${esc(t.logo)}" alt="${esc(c.name)}">` : `<span class="bc-ini">${esc(initials(c.name))}</span>`;
  const nfc = '<svg class="bc-nfc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 7c2.5 2.8 2.5 7.2 0 10M12 4.5c4 4.2 4 10.8 0 15M16 2c5.5 5.6 5.5 14.4 0 20"/></svg>';
  return `<div class="bc" style="${style}" role="button" tabindex="0" aria-label="${L.flip}" onclick="this.classList.toggle('flip')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.classList.toggle('flip')}"><div class="bc-in">
<div class="bc-f"><div class="bc-shine"></div><div class="bc-p">
 <div class="bc-top">${lg}<div class="bc-drt">${logo('#fff')}<span class="bc-tier">${esc(t.tier[lang] || t.tier.fr)} · N°${String(c.no).padStart(3, '0')}</span></div></div>
 <div class="bc-mid"><span class="bc-chip"></span>${nfc}<span class="bc-num">${esc(num)}</span></div>
 <div class="bc-bot"><div><div class="bc-name">${esc(c.name)}</div><div class="bc-tag">${esc(t.tag[lang] || t.tag.fr || (PLAN[c.plan] ? PLAN[c.plan][lang] : ''))}</div></div>
 <div style="text-align:right"><div class="bc-k">${L.valid}</div><div class="bc-v">${mmyy(extra.validUntil)}</div><div style="margin-top:8px"><span class="bc-st s-${s.status}">${esc(STATUS[s.status][lang])}</span></div></div></div>
</div></div>
<div class="bc-b"><div class="bc-p">
 <div class="bc-strip"></div>
 <div class="bc-grid"><div><div class="bc-k">${L.contract}</div><div class="bc-v">DRT-${c.no}</div></div><div><div class="bc-k">${L.plan}</div><div class="bc-v">${esc(PLAN[c.plan] ? PLAN[c.plan][lang] : c.plan)}</div></div>
 <div><div class="bc-k">${L.fee}</div><div class="bc-v">${eur(c.amount, lang)}</div></div><div><div class="bc-k">${L.due}</div><div class="bc-v">${fdate(s.due, lang)}</div></div>
 <div><div class="bc-k">${L.since}</div><div class="bc-v">${fdate(c.since, lang)}</div></div><div><div class="bc-k">${L.holder}</div><div class="bc-v">${esc(c.contactName || c.name)}</div></div></div>
 <div class="bc-sig"><span>${L.back}</span><b>${esc(extra.support || '')}</b></div>
</div></div>
</div><span class="bc-hint">↻ ${L.flip}</span></div>`;
}

module.exports = { brandCard, CSS, BRANDS, theme };
