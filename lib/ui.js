'use strict';
// HTML compartilhado: layout, estilos, logo e a carteirinha.

const LOGO_PATH = require('fs').readFileSync(require('path').join(__dirname, 'logo-path.txt'), 'utf8').trim();

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const logo = (fill = 'currentColor', cls = '') => `<svg class="${cls}" viewBox="0 0 663 423.8" aria-hidden="true"><path fill="${fill}" fill-rule="evenodd" d="${LOGO_PATH}"/></svg>`;
const eur = (cents, lang = 'fr') => (cents / 100).toLocaleString(lang === 'pt' ? 'pt-PT' : 'fr-BE', { style: 'currency', currency: 'EUR', minimumFractionDigits: cents % 100 ? 2 : 0 });
const fdate = (d, lang = 'fr', long) => {
  if (!d) return '—';
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString(lang === 'pt' ? 'pt-BR' : lang === 'en' ? 'en-GB' : 'fr-BE', { timeZone: 'UTC', day: 'numeric', month: long ? 'long' : 'short', year: 'numeric' });
};

const CSS = `
:root{--bg:#07141a;--panel:#0d1f28;--panel-2:#112833;--text:#e4e8ea;--text-2:#97a5ac;--line:rgba(228,232,234,.12);--line-2:rgba(228,232,234,.24);--accent:#7fa0ff;--accent-deep:#1d44d6;--ok:#3ddc84;--soon:#ffcf4a;--grace:#ff9142;--bad:#ff5468;--paused:#8a98a0;
--body:"Instrument Sans","Helvetica Neue",Helvetica,Arial,sans-serif;--mono:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;--disp:"Archivo","Arial Black",Arial,sans-serif;color-scheme:dark}
@font-face{font-family:"Archivo";src:url(/fonts/archivo.woff2) format("woff2");font-weight:100 900;font-stretch:62% 125%;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(/fonts/instrument-sans.woff2) format("woff2");font-weight:400 700;font-display:swap}
@font-face{font-family:"JetBrains Mono";src:url(/fonts/jetbrains-mono.woff2) format("woff2");font-weight:100 800;font-display:swap}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 var(--body);-webkit-font-smoothing:antialiased;min-height:100vh}
a{color:var(--accent)}:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.wrap{max-width:1180px;margin:0 auto;padding:0 max(16px,env(safe-area-inset-left)) 80px max(16px,env(safe-area-inset-right))}
.top{position:sticky;top:0;z-index:5;background:rgba(7,20,26,.88);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;height:58px;padding-bottom:0}
.brand{display:inline-flex;align-items:center;gap:10px;color:var(--text);text-decoration:none;font:700 12px/1 var(--mono);letter-spacing:.18em;text-transform:uppercase}
.brand i{width:26px;height:26px;background:var(--accent);display:grid;place-items:center}.brand svg{width:17px}
.nav{display:flex;gap:6px;flex-wrap:wrap}.nav a,.nav button{font:600 12px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--text-2);text-decoration:none;padding:9px 10px;border:1px solid transparent;background:none;cursor:pointer}
.nav a[aria-current]{color:var(--text);border-color:var(--line-2)}.nav a:hover,.nav button:hover{color:var(--text)}
h1{font:800 clamp(26px,4vw,40px)/1.05 var(--body);letter-spacing:-.03em;margin:32px 0 6px}
h2{font:700 20px/1.2 var(--body);letter-spacing:-.01em;margin:36px 0 14px}
.sub{color:var(--text-2);margin:0 0 22px}
.lab{font:600 11px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--text-2)}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:22px 0 8px}
.stat{background:var(--panel);border:1px solid var(--line);padding:16px}.stat b{display:block;font:800 26px/1.1 var(--body);letter-spacing:-.02em;margin-top:8px;font-variant-numeric:tabular-nums}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:16px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:700 12px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;padding:12px 14px;border:1px solid var(--line-2);background:transparent;color:var(--text);text-decoration:none;cursor:pointer;min-height:42px}
.btn:hover{border-color:var(--accent);color:var(--accent)}.btn.pri{background:var(--accent);border-color:var(--accent);color:#07141a}.btn.pri:hover{background:#9db6ff;color:#07141a}
.btn.danger:hover{border-color:var(--bad);color:var(--bad)}.btn.sm{padding:8px 10px;min-height:34px;font-size:11px}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.panel{background:var(--panel);border:1px solid var(--line);padding:clamp(16px,3vw,24px)}
form.f{display:grid;gap:14px}.f label{display:grid;gap:6px;font-weight:600;font-size:13px}.f label small{color:var(--text-2);font-weight:400}
.f input,.f select,.f textarea{width:100%;font:15px var(--body);padding:11px 12px;background:var(--bg);color:var(--text);border:1px solid var(--line-2);border-radius:0}
.f input:focus,.f select:focus,.f textarea:focus{border-color:var(--accent);outline:0}
.two{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top}th{font:600 11px/1.4 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--text-2)}
.tbl{overflow-x:auto}
.flash{padding:12px 14px;border:1px solid var(--accent);background:rgba(127,160,255,.08);margin:18px 0 0}
.flash.err{border-color:var(--bad);background:rgba(255,84,104,.08)}
code,.mono{font-family:var(--mono);font-size:12.5px}
.copy{display:flex;gap:6px}.copy input{flex:1;min-width:0;font:12.5px var(--mono);padding:10px;background:var(--bg);color:var(--text);border:1px solid var(--line-2)}
.chip{display:inline-flex;align-items:center;gap:7px;font:700 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;padding:7px 9px;border:1px solid currentColor;white-space:nowrap}
.chip::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}
.s-ok{color:var(--ok)}.s-soon{color:var(--soon)}.s-grace{color:var(--grace)}.s-suspended{color:var(--bad)}.s-paused{color:var(--paused)}
.muted{color:var(--text-2)}
/* carteirinha */
.card{position:relative;aspect-ratio:1.586;max-width:100%;border-radius:18px;overflow:hidden;color:#fff;padding:clamp(16px,4.5%,26px);display:flex;flex-direction:column;justify-content:space-between;
 background:radial-gradient(120% 90% at 100% 0%,color-mix(in srgb,var(--cc) 60%,transparent),transparent 60%),linear-gradient(135deg,#0b1d27 0%,#0f2a38 55%,#07141a 100%);
 box-shadow:0 24px 60px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.1);isolation:isolate;text-decoration:none}
.card::before{content:"";position:absolute;inset:0;background:radial-gradient(circle,rgba(255,255,255,.14) 1px,transparent 1.4px) 0 0/14px 14px;-webkit-mask:linear-gradient(120deg,transparent 30%,#000 75%);mask:linear-gradient(120deg,transparent 30%,#000 75%);z-index:-1}
.card::after{content:"";position:absolute;inset:-40% -60%;background:linear-gradient(110deg,transparent 40%,rgba(255,255,255,.12) 50%,transparent 60%);transform:translateX(-30%);transition:transform .9s;z-index:-1}
.card:hover::after{transform:translateX(30%)}
.card .ct{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.card .who{display:flex;align-items:center;gap:12px;min-width:0}
.card .av{width:44px;height:44px;flex:none;border-radius:10px;background:var(--cc);display:grid;place-items:center;font:800 16px/1 var(--body);color:#fff;overflow:hidden}
.card .av img{width:100%;height:100%;object-fit:contain;background:#fff}
.card .nm{font:800 clamp(16px,2.4vw,20px)/1.1 var(--body);letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.card .pl{font:600 10.5px/1.3 var(--mono);letter-spacing:.14em;text-transform:uppercase;opacity:.75;margin-top:4px}
.card .drt{display:flex;align-items:center;gap:7px;font:700 9px/1 var(--mono);letter-spacing:.2em;opacity:.85}.card .drt svg{width:26px}
.card .num{font:600 clamp(13px,2.2vw,16px)/1 var(--mono);letter-spacing:.18em;opacity:.9}
.card .cb{display:flex;justify-content:space-between;align-items:flex-end;gap:10px}
.card .cb .k{font:600 9.5px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;opacity:.6;margin-bottom:5px}
.card .cb .v{font:700 clamp(13px,2.2vw,16px)/1 var(--body)}
.card .chip{background:rgba(7,20,26,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.card.suspended{filter:saturate(.55)}
.card-meta{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px 2px 0;font-size:13px}
.card-actions{display:flex;flex-wrap:wrap;gap:6px;padding-top:10px}
@media (prefers-reduced-motion:reduce){.card::after{display:none}}
@media (max-width:640px){.top .wrap{gap:10px}.top .wrap:has(.nav) .brand{font-size:0;gap:0}.nav{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;min-width:0}.nav::-webkit-scrollbar{display:none}.nav a,.nav button{white-space:nowrap;padding:9px 8px}}
`;

function page({ title, body, nav = '', lang = 'pt', robots = 'noindex, nofollow', head = '' }) {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="${robots}"><title>${esc(title)}</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><meta name="theme-color" content="#07141a">
<style>${CSS}</style>${head}</head><body>
<header class="top"><div class="wrap"><a class="brand" href="${nav ? '/admin' : 'https://www.drtcreation.com/'}"><i>${logo('#07141a')}</i>DRT Creation</a>${nav}</div></header>
<main class="wrap">${body}</main></body></html>`;
}

const PLAN = {
  site: { pt: 'Plano Site', fr: 'Formule Site', price: 6900 },
  boutique: { pt: 'Plano Loja online', fr: 'Formule Boutique en ligne', price: 17900 },
  systeme: { pt: 'Plano Sistema', fr: 'Formule Système', price: 24900 },
};
const STATUS = {
  ok: { pt: 'Em dia', fr: 'À jour' },
  soon: { pt: 'Vence em breve', fr: 'Échéance proche' },
  grace: { pt: 'Em atraso', fr: 'En retard' },
  suspended: { pt: 'Suspenso', fr: 'Suspendu' },
  paused: { pt: 'Pausado', fr: 'En pause' },
};
const initials = (n) => String(n || '?').replace(/&.*$/, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const memberNo = (c) => 'DRT ' + String(c.no).padStart(4, '0') + ' ' + c.since.slice(2, 4) + c.since.slice(5, 7);

function card(c, st, lang, href) {
  const tag = href ? 'a' : 'div';
  return `<${tag} class="card ${st.status}"${href ? ` href="${esc(href)}"` : ''} style="--cc:${esc(c.color || '#1d44d6')}">
  <div class="ct"><div class="who"><span class="av">${c.logo ? `<img src="${esc(c.logo)}" alt="">` : esc(initials(c.name))}</span><div style="min-width:0"><div class="nm">${esc(c.name)}</div><div class="pl">${esc(PLAN[c.plan] ? PLAN[c.plan][lang] : c.plan)}</div></div></div>
  <span class="drt">${logo('#fff')}</span></div>
  <div class="num">${esc(memberNo(c))}</div>
  <div class="cb"><div><div class="k">${lang === 'pt' ? 'Próximo vencimento' : 'Prochaine échéance'}</div><div class="v">${fdate(st.due, lang)}</div></div>
  <div><div class="k">${lang === 'pt' ? 'Mensalidade' : 'Mensualité'}</div><div class="v">${eur(c.amount, lang)}</div></div>
  <span class="chip s-${st.status}">${STATUS[st.status][lang]}</span></div></${tag}>`;
}

module.exports = { esc, logo, eur, fdate, page, card, PLAN, STATUS, memberNo, LOGO_PATH, CSS, initials };
