#!/usr/bin/env node
'use strict';
// Gera os slides de um carrossel do Instagram (1080×1350) no visual da DRT Creation.
// Uso: node tools/social.js <spec.json> <pasta-de-saída>
//   photo: { src (arquivo local .jpg/.png), title, text, position } — foto real em tela cheia com texto por cima
//   list.items: [[rótulo, valor, subtítulo opcional], ...]
// spec = { "slides": [ { "kind": "cover"|"point"|"list"|"price"|"cta", ... } ] }
//   cover: { kicker, title, em, sub }
//   point: { n, title, text, tag }
//   list:  { title, items: [[label, value], ...], note }
//   price: { title, a: {label, big, lines:[]}, b: {label, big, lines:[]}, note }
//   cta:   { title, text, button, foot }
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const LOGO = fs.readFileSync(path.join(ROOT, 'lib', 'logo-path.txt'), 'utf8').trim();
const font = (f) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(ROOT, 'public', 'fonts', f)).toString('base64');
let SPEC = '';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
const logo = (fill) => `<svg viewBox="0 0 663 423.8" aria-hidden="true"><path fill="${fill}" fill-rule="evenodd" d="${LOGO}"/></svg>`;

const CSS = () => `
@font-face{font-family:"Archivo";src:url(${font('archivo.woff2')}) format("woff2");font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:"Instrument Sans";src:url(${font('instrument-sans.woff2')}) format("woff2");font-weight:400 700}
@font-face{font-family:"JetBrains Mono";src:url(${font('jetbrains-mono.woff2')}) format("woff2");font-weight:100 800}
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1350px;overflow:hidden;background:#07141a;color:#e4e8ea;font:34px/1.4 "Instrument Sans",Arial,sans-serif;-webkit-font-smoothing:antialiased}
.s{position:relative;width:1080px;height:1350px;padding:96px 92px 0;display:flex;flex-direction:column;overflow:hidden}
.s::before{content:"";position:absolute;inset:0;background:radial-gradient(circle,rgba(228,232,234,.07) 1.5px,transparent 2px) 0 0/34px 34px;-webkit-mask:linear-gradient(180deg,#000,transparent 75%);mask:linear-gradient(180deg,#000,transparent 75%)}
.s::after{content:"";position:absolute;right:-260px;top:-300px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(29,68,214,.55),transparent 65%)}
.s>*{position:relative;z-index:1}
.top{display:flex;justify-content:space-between;align-items:center;font:600 22px/1 "JetBrains Mono",monospace;letter-spacing:.2em;text-transform:uppercase;color:#97a5ac}
.brand{display:flex;align-items:center;gap:16px;color:#e4e8ea}.brand i{width:56px;height:56px;background:#7fa0ff;display:grid;place-items:center}.brand svg{width:36px}
.kick{font:600 26px/1 "JetBrains Mono",monospace;letter-spacing:.18em;text-transform:uppercase;color:#7fa0ff;display:flex;align-items:center;gap:18px;margin-top:150px}.kick::before{content:"";width:56px;height:2px;background:currentColor}
h1{font:800 104px/.98 "Archivo",Arial,sans-serif;font-stretch:112%;letter-spacing:-.035em;margin:34px 0 0}h1 em{font-style:normal;color:#7fa0ff}
.sub{font-size:38px;color:#b4c0c6;margin-top:40px;max-width:820px}
.swipe{margin-top:auto;margin-bottom:84px;font:600 24px/1 "JetBrains Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:#97a5ac;display:flex;align-items:center;gap:14px}.swipe b{color:#7fa0ff;font-size:40px}
.n{font:800 260px/.8 "Archivo",Arial,sans-serif;font-stretch:112%;color:transparent;-webkit-text-stroke:3px #7fa0ff;margin-top:110px;letter-spacing:-.05em}
h2{font:800 70px/1.04 "Archivo",Arial,sans-serif;font-stretch:108%;letter-spacing:-.03em;margin-top:48px}
.p{font-size:38px;color:#c3ccd1;margin-top:34px;max-width:880px}.p b{color:#fff}
.tag{display:inline-flex;align-self:flex-start;margin-top:40px;padding:16px 22px;border:2px solid rgba(127,160,255,.55);background:rgba(127,160,255,.12);font:600 26px/1.2 "JetBrains Mono",monospace;color:#c9d6ff}
.c{margin:auto 0;padding:40px 0 20px;display:flex;flex-direction:column}.c .n{margin-top:0}.c h2:first-child{margin-top:0}.c .kick{margin-top:0}
.foot{margin-top:0;margin-bottom:64px;display:flex;justify-content:space-between;font:600 22px/1 "JetBrains Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:#6f7f87}
.list{margin-top:46px;display:grid;gap:0}.list small{display:block;color:#97a5ac;font-size:28px;margin-top:4px}.list div{display:flex;justify-content:space-between;align-items:center;gap:30px;padding:24px 0;border-bottom:2px solid rgba(228,232,234,.12);font-size:36px}.list div b{font:800 38px/1.2 "Archivo",Arial,sans-serif;white-space:nowrap;color:#fff}
.note{font-size:28px;color:#97a5ac;margin-top:30px}
.two{display:grid;gap:28px;margin-top:46px}
.box{border:2px solid rgba(228,232,234,.18);background:rgba(13,31,40,.8);padding:34px 38px}.box.b{border-color:#7fa0ff;background:rgba(127,160,255,.12)}
.box .l{font:600 24px/1 "JetBrains Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:#97a5ac}.box.b .l{color:#9db6ff}
.box .big{font:800 72px/1 "Archivo",Arial,sans-serif;letter-spacing:-.03em;margin-top:18px;color:#fff}.box .big span{font:500 32px/1 "Instrument Sans",sans-serif;color:#b4c0c6;margin-left:8px}
.box p{font-size:30px;color:#c3ccd1;margin-top:12px}
.ph{position:absolute;inset:0;z-index:0!important;background-size:cover;background-position:center}.ph::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,20,26,.55) 0%,rgba(7,20,26,0) 28%,rgba(7,20,26,0) 45%,rgba(7,20,26,.92) 82%)}.s.photo::before,.s.photo::after{display:none}
.pt{margin-top:auto;margin-bottom:70px}.pt h2{margin-top:0;font-size:64px}.pt p{font-size:34px;color:#e4e8ea;margin-top:18px}
.btn{align-self:flex-start;margin-top:54px;background:#7fa0ff;color:#07141a;font:700 34px/1 "JetBrains Mono",monospace;letter-spacing:.04em;padding:30px 38px}
`;

function slide(s, i, total) {
  const head = `<div class="top"><span class="brand"><i>${logo('#07141a')}</i>DRT Creation</span><span>${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span></div>`;
  const foot = `<div class="foot"><span>@drtcreation</span><span>drtcreation.com</span></div>`;
  if (s.kind === 'cover') return `${head}<div class="kick">${esc(s.kicker)}</div><h1>${esc(s.title)}${s.em ? `<br><em>${esc(s.em)}</em>` : ''}</h1>${s.sub ? `<p class="sub">${md(s.sub)}</p>` : ''}<div class="swipe">${esc(s.swipe || 'Glissez')} <b>→</b></div>`;
  if (s.kind === 'point') return `${head}<div class="c"><div class="n">${esc(s.n)}</div><h2>${esc(s.title)}</h2><p class="p">${md(s.text)}</p>${s.tag ? `<span class="tag">${esc(s.tag)}</span>` : ''}</div>${foot}`;
  if (s.kind === 'list') return `${head}<div class="c"><h2>${esc(s.title)}</h2><div class="list">${s.items.map(([a, b, sub]) => `<div><span>${md(a)}${sub ? `<small>${md(sub)}</small>` : ''}</span><b>${esc(b)}</b></div>`).join('')}</div>${s.note ? `<p class="note">${md(s.note)}</p>` : ''}</div>${foot}`;
  if (s.kind === 'price') return `${head}<div class="c"><h2>${esc(s.title)}</h2><div class="two">${['a', 'b'].map((k) => { const o = s[k]; return `<div class="box ${k}"><div class="l">${esc(o.label)}</div><div class="big">${esc(o.big)}${o.unit ? `<span>${esc(o.unit)}</span>` : ''}</div>${(o.lines || []).map((l) => `<p>${md(l)}</p>`).join('')}</div>`; }).join('')}</div>${s.note ? `<p class="note">${md(s.note)}</p>` : ''}</div>${foot}`;
  if (s.kind === 'photo') { const ext = path.extname(s.src).slice(1).toLowerCase().replace('jpg', 'jpeg'); const data = 'data:image/' + ext + ';base64,' + fs.readFileSync(path.resolve(path.dirname(SPEC), s.src)).toString('base64'); return `<div class="ph" style="background-image:url(${data});background-position:${esc(s.position || 'center')}"></div>${head}<div class="pt">${s.title ? `<h2>${esc(s.title)}</h2>` : ''}${s.text ? `<p>${md(s.text)}</p>` : ''}</div>`; }
  if (s.kind === 'cta') return `${head}<div class="c"><div class="kick">${esc(s.kicker || 'Et maintenant ?')}</div><h1 style="font-size:92px">${esc(s.title)}</h1><p class="sub">${md(s.text)}</p><span class="btn">${esc(s.button)}</span>${s.foot ? `<p class="note" style="margin-top:34px">${md(s.foot)}</p>` : ''}</div><div class="foot"><span>@drtcreation</span><span>drtcreation.com</span></div>`;
  throw new Error('tipo de slide desconhecido: ' + s.kind);
}

(async () => {
  const [specFile, outDir] = process.argv.slice(2); SPEC = path.resolve(specFile);
  if (!specFile || !outDir) { console.error('uso: node tools/social.js spec.json pasta'); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const css = CSS(); const out = [];
  for (const [i, s] of spec.slides.entries()) {
    await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><section class="s${s.kind === 'photo' ? ' photo' : ''}">${slide(s, i, spec.slides.length)}</section></body></html>`, { waitUntil: 'load' });
    await pg.evaluate(() => document.fonts.ready);
    const over = await pg.evaluate(() => { const s = document.querySelector('.s'); return [...s.children].some((e) => e.getBoundingClientRect().bottom > 1350 || e.getBoundingClientRect().right > 1080); });
    if (over) console.warn('⚠ slide ' + (i + 1) + ' passa da borda');
    const f = path.join(outDir, String(i + 1).padStart(2, '0') + '.jpg');
    await pg.screenshot({ path: f, type: 'jpeg', quality: 92 }); out.push(f);
  }
  await b.close();
  console.log(out.join('\n'));
})();
