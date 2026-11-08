'use strict';
// Propostas comerciais: geradas a partir do briefing, editáveis no painel, abertas pelo cliente num link
// (/p/<token>) com impressão em PDF e aceite online.
const { esc, logo, PLAN } = require('./ui');

const LG = ['fr', 'pt', 'en', 'nl'];
const L = (a, lang) => a[LG.indexOf(lang)] || a[0];

// ---- catálogo (preços sugeridos, editáveis em Ajustes → Catálogo) ----
// [chave, preço €, [rótulo fr, pt, en, nl], [descrição fr, pt, en, nl]]
const CATALOG = [
  ['site', 1000, ['Site vitrine sur mesure', 'Site institucional sob medida', 'Custom showcase website', 'Website op maat'], ['Jusqu’à 5 pages, design sur mesure, adapté au mobile, référencement de base, formulaire de contact', 'Até 5 páginas, design sob medida, adaptado ao celular, SEO básico, formulário de contato', 'Up to 5 pages, custom design, mobile-friendly, basic SEO, contact form', 'Tot 5 pagina’s, ontwerp op maat, mobielvriendelijk, basis-SEO, contactformulier']],
  ['redesign', 600, ['Refonte du site existant', 'Reformulação do site atual', 'Redesign of the current site', 'Vernieuwing van de huidige site'], ['Nouveau design, contenu repris et amélioré, redirections pour garder le référencement', 'Novo design, conteúdo aproveitado e melhorado, redirecionamentos para manter o Google', 'New design, content reused and improved, redirects to keep search rankings', 'Nieuw ontwerp, inhoud hergebruikt en verbeterd, redirects om de SEO te behouden']],
  ['page', 30, ['Page supplémentaire', 'Página extra', 'Extra page', 'Extra pagina'], ['Au-delà des 5 pages incluses', 'Além das 5 páginas incluídas', 'Beyond the 5 included pages', 'Bovenop de 5 inbegrepen pagina’s']],
  ['lang', 50, ['Langue supplémentaire', 'Idioma extra', 'Extra language', 'Extra taal'], ['Traduction et mise en page de toutes les pages', 'Tradução e montagem de todas as páginas', 'Translation and layout of every page', 'Vertaling en opmaak van alle pagina’s']],
  ['booking', 500, ['Réservation / prise de rendez-vous en ligne', 'Reserva / agendamento online', 'Online booking / appointments', 'Online reservaties / afspraken'], ['Agenda en ligne, confirmations automatiques, gestion depuis le téléphone', 'Agenda online, confirmações automáticas, gestão pelo celular', 'Online calendar, automatic confirmations, managed from your phone', 'Online agenda, automatische bevestigingen, beheer via gsm']],
  ['order', 1000, ['Commande en ligne', 'Pedidos online', 'Online ordering', 'Online bestellen'], ['Menu interactif, panier, retrait ou livraison, notifications des commandes', 'Cardápio interativo, carrinho, retirada ou entrega, aviso de pedidos', 'Interactive menu, cart, pickup or delivery, order notifications', 'Interactief menu, winkelmand, afhalen of levering, meldingen']],
  ['shop', 1500, ['Boutique en ligne', 'Loja online', 'Online shop', 'Webshop'], ['Catalogue produits, paiement en ligne (Bancontact, carte), gestion des stocks et des commandes', 'Catálogo de produtos, pagamento online (Bancontact, cartão), estoque e pedidos', 'Product catalogue, online payment (Bancontact, card), stock and order management', 'Productcatalogus, online betalen (Bancontact, kaart), voorraad- en orderbeheer']],
  ['quote', 300, ['Formulaire de devis / événement', 'Formulário de orçamento / evento', 'Quote / event request form', 'Offerte- / eventformulier'], ['Demandes structurées reçues par e-mail et WhatsApp', 'Pedidos organizados recebidos por e-mail e WhatsApp', 'Structured requests delivered by e-mail and WhatsApp', 'Gestructureerde aanvragen via e-mail en WhatsApp']],
  ['app', 2000, ['Application / espace client sur mesure', 'Aplicativo / área do cliente sob medida', 'Custom app / client area', 'App / klantenzone op maat'], ['Comptes clients, tableau de bord, notifications ; périmètre précis défini ensemble', 'Contas de clientes, painel, notificações; escopo definido junto', 'Customer accounts, dashboard, notifications; exact scope defined together', 'Klantaccounts, dashboard, meldingen; precieze scope samen bepaald']],
  ['logo', 50, ['Logo et identité visuelle', 'Logo e identidade visual', 'Logo and visual identity', 'Logo en huisstijl'], ['Logo, couleurs et typographies, fichiers pour le web et l’impression', 'Logo, cores e fontes, arquivos para web e impressão', 'Logo, colours and fonts, files for web and print', 'Logo, kleuren en lettertypes, bestanden voor web en druk']],
  ['copy', 10, ['Rédaction des textes (par langue)', 'Redação dos textos (por idioma)', 'Copywriting (per language)', 'Teksten schrijven (per taal)'], ['Textes clairs et optimisés pour Google, à partir d’un échange avec vous', 'Textos claros e otimizados para o Google, a partir de uma conversa', 'Clear, search-optimised copy, based on a conversation with you', 'Duidelijke, SEO-vriendelijke teksten na een gesprek met u']],
  ['gbp', 50, ['Fiche Google et référencement local', 'Perfil no Google e SEO local', 'Google profile and local SEO', 'Google-profiel en lokale SEO'], ['Création ou optimisation de la fiche Google Business Profile, liens et avis', 'Criação ou otimização do Google Business Profile, links e avaliações', 'Create or optimise the Google Business Profile, links and reviews', 'Google-bedrijfsprofiel aanmaken of optimaliseren, links en reviews']],
  ['mail', 0, ['Adresse e-mail professionnelle', 'E-mail profissional', 'Business e-mail address', 'Zakelijk e-mailadres'], ['Configuration sur votre nom de domaine (abonnement de la boîte mail à part)', 'Configuração no seu domínio (assinatura da caixa de e-mail à parte)', 'Set-up on your domain (mailbox subscription billed separately)', 'Instelling op uw domein (mailbox-abonnement apart)']],
];
function catalog(settings) {
  const over = (settings && settings.catalogPrices) || {};
  return CATALOG.map(([k, price, label, desc]) => ({ k, price: Number.isFinite(over[k]) ? over[k] : price, label, desc }));
}

// ---- sugestão a partir do briefing ----
function suggest(b, settings, no) {
  const a = b.answers || {}; const lang = LG.includes(b.lang) ? b.lang : 'fr';
  const cat = Object.fromEntries(catalog(settings).map((x) => [x.k, x]));
  const has = (k, v) => (a[k] || []).includes(v);
  const items = []; const add = (k, qty = 1) => { const c = cat[k]; if (c) items.push({ k, label: L(c.label, lang), desc: L(c.desc, lang), qty, price: c.price }); };
  if (has('need', 'redesign') && !has('need', 'site')) add('redesign'); else add('site');
  const pages = (a.pages || []).length; if (pages > 5) add('page', pages - 5);
  const langs = (a.langs || []).filter((x) => x !== 'other').length + (has('langs', 'other') ? 1 : 0); if (langs > 1) add('lang', langs - 1);
  if (has('need', 'booking') || has('features', 'booking')) add('booking');
  if (has('features', 'order')) add('order');
  if (has('need', 'shop') || has('features', 'pay')) add('shop');
  if (has('features', 'quote') || has('goals', 'quotes')) add('quote');
  if (has('need', 'app') || has('features', 'clientarea')) add('app');
  if (['none', 'refresh'].includes(a.identity)) add('logo');
  if (a.texts === 'drt' || a.texts === 'mix') add('copy', Math.max(1, langs));
  if (a.gbp !== 'yes' || has('goals', 'google')) add('gbp');
  if (a.mailbox === 'want') add('mail');
  const plan = items.some((i) => ['app', 'booking', 'order'].includes(i.k)) ? 'systeme' : items.some((i) => i.k === 'shop') ? 'boutique' : 'site';
  const big = items.filter((i) => ['shop', 'app', 'booking', 'order'].includes(i.k)).length;
  const weeks = Math.min(12, 3 + big * 2 + (items.some((i) => i.k === 'logo') ? 1 : 0));
  const goalsTxt = summaryGoals(a, lang);
  const intro = {
    fr: `Merci pour votre briefing. Vous souhaitez ${goalsTxt}. Voici notre proposition pour ${a.company}, avec un prix fixe, un calendrier et l’accompagnement après la mise en ligne.`,
    pt: `Obrigado pelo briefing. Você quer ${goalsTxt}. Esta é a nossa proposta para a ${a.company}, com preço fechado, prazo e o acompanhamento depois do lançamento.`,
    en: `Thank you for your briefing. You want to ${goalsTxt}. Here is our proposal for ${a.company}: a fixed price, a timeline and support after launch.`,
    nl: `Bedankt voor uw briefing. U wilt ${goalsTxt}. Hier is ons voorstel voor ${a.company}: een vaste prijs, een planning en begeleiding na de lancering.`,
  }[lang];
  const valid = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  return {
    lang, no, briefingId: b.id, status: 'draft',
    client: { company: a.company || '', contact: a.contact || '', email: a.email || '', phone: a.phone || '', vat: a.vat || '', address: a.address || '' },
    intro, items, plan, monthly: PLAN[plan].price / 100, weeks,
    payTerms: L(['50 % à la signature, 50 % à la mise en ligne', '50 % na assinatura, 50 % no lançamento', '50% on signature, 50% at launch', '50 % bij ondertekening, 50 % bij lancering'], lang),
    aid: true, validUntil: valid, notes: '', financing: 'both', subMonths: 24, subMonthly: null,
  };
}
const GOALS = {
  bookings: ['recevoir plus de réservations', 'receber mais reservas', 'get more bookings', 'meer reservaties krijgen'],
  sell: ['vendre en ligne', 'vender online', 'sell online', 'online verkopen'],
  google: ['être trouvé sur Google', 'aparecer no Google', 'be found on Google', 'gevonden worden op Google'],
  menu: ['présenter votre carte et vos prix', 'mostrar seu cardápio e seus preços', 'show your menu and prices', 'uw menu en prijzen tonen'],
  image: ['donner une image plus professionnelle', 'ter uma imagem mais profissional', 'look more professional', 'professioneler overkomen'],
  quotes: ['recevoir des demandes de devis', 'receber pedidos de orçamento', 'receive quote requests', 'offerteaanvragen ontvangen'],
  time: ['gagner du temps', 'ganhar tempo', 'save time', 'tijd besparen'],
};
function summaryGoals(a, lang) {
  const g = (a.goals || []).map((k) => GOALS[k] && L(GOALS[k], lang)).filter(Boolean);
  if (!g.length) return L(['un site qui travaille pour vous', 'um site que trabalhe por você', 'a website that works for you', 'een website die voor u werkt'], lang);
  const and = L([' et ', ' e ', ' and ', ' en '], lang);
  return g.length === 1 ? g[0] : g.slice(0, -1).join(', ') + and + g.at(-1);
}

// ---- textos fixos da página do cliente ----
const T = {
  title: ['Proposition commerciale', 'Proposta comercial', 'Proposal', 'Commercieel voorstel'],
  for: ['Pour', 'Para', 'For', 'Voor'], date: ['Date', 'Data', 'Date', 'Datum'], valid: ['Valable jusqu’au', 'Válida até', 'Valid until', 'Geldig tot'],
  project: ['Votre projet', 'Seu projeto', 'Your project', 'Uw project'],
  scope: ['Ce que nous réalisons', 'O que vamos fazer', 'What we deliver', 'Wat we realiseren'],
  qty: ['Qté', 'Qtd.', 'Qty', 'Aantal'], price: ['Prix', 'Preço', 'Price', 'Prijs'], incl: ['inclus', 'incluído', 'included', 'inbegrepen'],
  total: ['Total création', 'Total da criação', 'Build total', 'Totaal ontwikkeling'],
  vat: ['TVA non applicable — régime de la franchise, art. 56bis CTVA', 'TVA não aplicável — regime de franquia, art. 56bis CTVA', 'VAT not applicable — small business exemption, art. 56bis Belgian VAT Code', 'Btw niet van toepassing — vrijstellingsregeling, art. 56bis W.btw'],
  pay: ['Paiement', 'Pagamento', 'Payment', 'Betaling'],
  maint: ['Après la mise en ligne', 'Depois do lançamento', 'After launch', 'Na de lancering'],
  month: ['/ mois', '/ mês', '/ month', '/ maand'],
  maintTxt: ['Votre site reste rapide, sûr et à jour. Contrat de 12 mois, avec accès à votre espace client (carte de membre, visites du site, paiements, factures et demandes).', 'Seu site continua rápido, seguro e atualizado. Contrato de 12 meses, com acesso à sua área do cliente (carteirinha, visitas do site, pagamentos, faturas e pedidos).', 'Your site stays fast, secure and up to date. 12-month contract, with access to your client area (member card, site visits, payments, invoices and requests).', 'Uw site blijft snel, veilig en up-to-date. Contract van 12 maanden, met toegang tot uw klantenzone (ledenkaart, bezoeken, betalingen, facturen en aanvragen).'],
  ways: ['Deux façons de payer', 'Duas formas de pagar', 'Two ways to pay', 'Twee manieren om te betalen'],
  optA: ['Avec acompte', 'Com entrada', 'With a deposit', 'Met voorschot'],
  optAtxt: ['Vous payez la création, puis la maintenance chaque mois.', 'Você paga a criação e depois a manutenção todo mês.', 'You pay for the build, then maintenance each month.', 'U betaalt de ontwikkeling, daarna maandelijks onderhoud.'],
  optAbest: ['Idéal pour demander la Prime Digitalisation', 'Ideal para pedir o Prime Digitalisation', 'Best if you apply for the Digitalisation Grant', 'Ideaal voor de Digitaliseringspremie'],
  optB: ['Sans apport', 'Sem entrada', 'No upfront payment', 'Zonder voorschot'],
  optBtxt: ['Rien à payer au départ : la création est répartie sur {m} mois, maintenance comprise.', 'Nada para pagar agora: a criação é dividida em {m} meses, com a manutenção incluída.', 'Nothing to pay upfront: the build is spread over {m} months, maintenance included.', 'Niets vooraf: de ontwikkeling wordt gespreid over {m} maanden, onderhoud inbegrepen.'],
  optBthen: ['puis {x} / mois (maintenance seule)', 'depois {x} / mês (só manutenção)', 'then {x} / month (maintenance only)', 'daarna {x} / maand (enkel onderhoud)'],
  optBterms: ['Engagement ferme de {m} mois. En cas d’arrêt anticipé, le solde de la part création reste dû. Le code vous appartient après la dernière mensualité.', 'Compromisso firme de {m} meses. Se encerrar antes, o saldo da parte da criação continua devido. O código passa a ser seu depois da última parcela.', 'Fixed {m}-month commitment. If you stop early, the remaining build share is still due. The code becomes yours after the last instalment.', 'Vaste verbintenis van {m} maanden. Bij vroegtijdige stopzetting blijft het saldo van het ontwikkelingsdeel verschuldigd. De code wordt van u na de laatste maandbetaling.'],
  optFor: ['pendant {m} mois', 'por {m} meses', 'for {m} months', 'gedurende {m} maanden'],
  total2: ['total sur la période', 'total no período', 'total over the term', 'totaal over de periode'],
  pick: ['Formule choisie', 'Forma escolhida', 'Chosen option', 'Gekozen formule'],
  annual: ['Paiement annuel : 10 mois payés, 12 mois couverts', 'Pagamento anual: paga 10 meses, leva 12', 'Yearly payment: pay 10 months, get 12', 'Jaarlijkse betaling: 10 maanden betalen, 12 gedekt'],
  timeline: ['Calendrier', 'Prazo', 'Timeline', 'Planning'],
  weeks: ['semaines', 'semanas', 'weeks', 'weken'],
  steps: [['Appel de lancement et accès', 'Ligação inicial e acessos', 'Kick-off call and access', 'Startgesprek en toegang'], ['Maquette à valider', 'Protótipo para aprovar', 'Design mock-up to approve', 'Ontwerp ter goedkeuring'], ['Développement et contenus', 'Desenvolvimento e conteúdo', 'Build and content', 'Ontwikkeling en inhoud'], ['Tests et mise en ligne', 'Testes e lançamento', 'Testing and launch', 'Testen en lancering']],
  aid: ['Aides possibles', 'Auxílios possíveis', 'Possible grants', 'Mogelijke steun'],
  aidTxt: ['La Prime Digitalisation de la Région bruxelloise peut rembourser de 25 % à 70 % de ce projet (plafond 10 000 € par an). La demande doit être déposée sur MonBEE avant le début du projet : nous préparons le dossier avec vous, sans frais. Les frais de maintenance sont des charges déductibles pour votre entreprise.', 'O Prime Digitalisation da Região de Bruxelas pode reembolsar de 25 % a 70 % deste projeto (teto de 10 000 € por ano). O pedido precisa ser feito no MonBEE antes do início do projeto: preparamos o dossiê com você, sem custo. A manutenção é despesa dedutível para a sua empresa.', 'The Brussels Region Digitalisation Grant can refund 25% to 70% of this project (cap €10,000 per year). The application must be filed on MonBEE before the project starts: we prepare it with you at no cost. Maintenance fees are deductible business expenses.', 'De Digitaliseringspremie van het Brussels Gewest kan 25 % tot 70 % van dit project terugbetalen (plafond € 10.000 per jaar). De aanvraag moet vóór de start via MonBEE ingediend worden: wij bereiden het dossier gratis met u voor. Onderhoudskosten zijn aftrekbare beroepskosten.'],
  aidNote: ['Éligibilité confirmée au cas par cas par la Région.', 'Elegibilidade confirmada caso a caso pela Região.', 'Eligibility is confirmed case by case by the Region.', 'Geschiktheid wordt geval per geval door het Gewest bevestigd.'],
  terms: ['Conditions', 'Condições', 'Terms', 'Voorwaarden'],
  termsTxt: ['Le code et les contenus du site vous appartiennent. Les modifications hors périmètre sont proposées sur devis ou facturées 45 € de l’heure, après votre accord.', 'O código e o conteúdo do site são seus. Alterações fora do escopo são orçadas antes ou cobradas a 45 € por hora, com o seu acordo.', 'The code and content of the site belong to you. Out-of-scope changes are quoted first or billed at €45 per hour, with your agreement.', 'De code en inhoud van de site zijn van u. Wijzigingen buiten de scope worden eerst geoffreerd of aan € 45 per uur gefactureerd, na uw akkoord.'],
  accept: ['Accepter la proposition', 'Aceitar a proposta', 'Accept the proposal', 'Voorstel aanvaarden'],
  acceptName: ['Votre nom', 'Seu nome', 'Your name', 'Uw naam'],
  acceptChk: ['J’accepte cette proposition et je souhaite recevoir le contrat.', 'Aceito esta proposta e quero receber o contrato.', 'I accept this proposal and would like to receive the contract.', 'Ik aanvaard dit voorstel en ontvang graag het contract.'],
  accepted: ['Proposition acceptée', 'Proposta aceita', 'Proposal accepted', 'Voorstel aanvaard'],
  toSign: ['Voir et signer le contrat', 'Ver e assinar o contrato', 'View and sign the contract', 'Contract bekijken en ondertekenen'],
  signedC: ['Voir le contrat signé', 'Ver o contrato assinado', 'View the signed contract', 'Ondertekend contract bekijken'],
  acceptedTxt: ['Merci ! Il reste à signer le contrat, en ligne, en une minute.', 'Obrigado! Falta só assinar o contrato, online, em um minuto.', 'Thank you! All that is left is to sign the contract online, in one minute.', 'Bedankt! U hoeft enkel nog het contract online te ondertekenen, in één minuut.'],
  by: ['par', 'por', 'by', 'door'], on: ['le', 'em', 'on', 'op'],
  print: ['Imprimer / PDF', 'Imprimir / PDF', 'Print / PDF', 'Afdrukken / PDF'],
  q: ['Une question ? WhatsApp', 'Dúvida? WhatsApp', 'A question? WhatsApp', 'Een vraag? WhatsApp'],
  expired: ['Cette proposition a expiré. Écrivez-nous pour la mettre à jour.', 'Esta proposta expirou. Fale com a gente para atualizar.', 'This proposal has expired. Message us to update it.', 'Dit voorstel is verlopen. Neem contact op om het bij te werken.'],
};
const INCL = {
  site: [['Hébergement et nom de domaine', 'Mises à jour et sauvegarde mensuelle', 'Surveillance du site', '30 min de modifications par mois'], ['Hospedagem e domínio', 'Atualizações e backup mensal', 'Monitoramento do site', '30 min de alterações por mês'], ['Hosting and domain name', 'Monthly updates and backup', 'Uptime monitoring', '30 min of changes per month'], ['Hosting en domeinnaam', 'Maandelijkse updates en back-up', 'Monitoring van de site', '30 min wijzigingen per maand']],
  boutique: [['Hébergement de la boutique', 'Mises à jour hebdomadaires', 'Sauvegarde quotidienne et sécurité', '1 h de modifications par mois'], ['Hospedagem da loja', 'Atualizações semanais', 'Backup diário e segurança', '1 h de alterações por mês'], ['Shop hosting', 'Weekly updates', 'Daily backup and security', '1 h of changes per month'], ['Hosting van de webshop', 'Wekelijkse updates', 'Dagelijkse back-up en beveiliging', '1 u wijzigingen per maand']],
  systeme: [['Serveur et base de données', 'Corrections et compatibilité', 'Sauvegarde quotidienne, surveillance 24/7', '1 h d’évolutions par mois'], ['Servidor e banco de dados', 'Correções e compatibilidade', 'Backup diário, monitoramento 24/7', '1 h de melhorias por mês'], ['Server and database', 'Fixes and compatibility', 'Daily backup, 24/7 monitoring', '1 h of improvements per month'], ['Server en database', 'Correcties en compatibiliteit', 'Dagelijkse back-up, 24/7 monitoring', '1 u verbeteringen per maand']],
};

const eur = (n, lang) => Number(n || 0).toLocaleString(lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-IE' : lang === 'nl' ? 'nl-BE' : 'fr-BE', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number(n) % 1 ? 2 : 0 });
const dl = (d, lang) => { if (!d) return ''; const [y, m, dd] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString({ fr: 'fr-BE', pt: 'pt-BR', en: 'en-GB', nl: 'nl-BE' }[lang] || 'fr-BE', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }); };
const SUB_PREMIUM = 1.10; // sem entrada: +10 % pelo parcelamento e pelo risco
const subAuto = (setup, monthly, months) => { const x = (monthly + setup / (months || 24)) * SUB_PREMIUM; return Math.max(monthly, Math.round(x / 10) * 10 - 1); };
const totals = (p) => { const setup = (p.items || []).reduce((t, i) => t + (Number(i.qty) || 0) * (Number(i.price) || 0), 0); const monthly = Number(p.monthly) || 0; const months = Number(p.subMonths) === 12 ? 12 : 24; const sub = Number(p.subMonthly) > 0 ? Number(p.subMonthly) : subAuto(setup, monthly, months); return { setup, monthly, year: monthly * 10, months, sub, subTotal: sub * months }; };

const CSS = `
:root{--bg:#07141a;--ink:#0b1a21;--muted:#5b6a72;--line:rgba(7,20,26,.12);--accent:#7fa0ff;--deep:#1d44d6;--paper:#fff;--soft:#f3f5f7}
@font-face{font-family:"Archivo";src:url(/fonts/archivo.woff2) format("woff2");font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:"Instrument Sans";src:url(/fonts/instrument-sans.woff2) format("woff2");font-weight:400 700}
@font-face{font-family:"JetBrains Mono";src:url(/fonts/jetbrains-mono.woff2) format("woff2");font-weight:100 800}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:#dfe3e5;color:var(--ink);font:15px/1.55 "Instrument Sans",Helvetica,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.doc{max-width:860px;margin:24px auto 90px;background:var(--paper);box-shadow:0 20px 60px rgba(7,20,26,.18)}
.band{background:var(--bg);color:#dfe3e5;padding:34px clamp(20px,6vw,56px) 30px;position:relative;overflow:hidden}
.band::after{content:"";position:absolute;right:-120px;top:-160px;width:460px;height:460px;border-radius:50%;background:radial-gradient(circle,rgba(29,68,214,.55),transparent 65%)}
.band .top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;position:relative;z-index:1;flex-wrap:wrap}
.lg{display:flex;align-items:center;gap:10px}.lg svg{width:40px}.lg b{font:800 17px/1 "Archivo",Arial,sans-serif;letter-spacing:.02em;display:block}.lg small{font:500 9px/1 "JetBrains Mono",monospace;letter-spacing:.22em;color:var(--accent);text-transform:uppercase}
.ref{font:500 12px/1.7 "JetBrains Mono",monospace;color:#9eb0b8;text-align:right}.ref b{color:#fff;font-weight:500}
.band h1{font:800 clamp(28px,5vw,44px)/1.02 "Archivo",Arial,sans-serif;font-stretch:108%;letter-spacing:-.02em;margin:34px 0 8px;position:relative;z-index:1}
.band h1 em{font-style:normal;color:var(--accent)}
.band .who{color:#9eb0b8;position:relative;z-index:1;margin:0}
.body{padding:12px clamp(20px,6vw,56px) 40px}
h2{font:800 12px/1 "Archivo",Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--deep);margin:34px 0 14px;display:flex;align-items:center;gap:10px}
h2 i{font:500 11px/1 "JetBrains Mono",monospace;font-style:normal;color:#fff;background:var(--bg);border-radius:3px;padding:4px 6px 3px;letter-spacing:0}
h2::after{content:"";flex:1;height:1px;background:var(--line)}
.lead{font-size:17px;line-height:1.6;margin:22px 0 0}
table{width:100%;border-collapse:collapse}th{font:600 10.5px/1.4 "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);text-align:left;padding:8px 10px;border-bottom:2px solid var(--ink)}
td{padding:13px 10px;border-bottom:1px solid var(--line);vertical-align:top}td.n,th.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
td b{display:block;font-weight:700}td small{color:var(--muted);font-size:13px;line-height:1.45;display:block;margin-top:2px}
tr.tot td{border-bottom:0;padding-top:16px;font:800 20px/1 "Archivo",Arial,sans-serif}tr.tot td.n{color:var(--deep)}
.vat{font-size:12px;color:var(--muted);text-align:right;margin:6px 10px 0}
.pay{margin:12px 0 0;font-size:14px}.pay b{font-weight:700}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:640px){.grid2{grid-template-columns:1fr}}
.box{background:var(--soft);border:1px solid var(--line);padding:18px 20px}
.price{font:800 30px/1 "Archivo",Arial,sans-serif;color:var(--ink)}.price span{font:500 14px/1 "Instrument Sans",sans-serif;color:var(--muted);margin-left:4px}
.box ul{margin:12px 0 0;padding:0;list-style:none;display:grid;gap:6px;font-size:14px}.box li::before{content:"✓";color:var(--deep);font-weight:700;margin-right:8px}
.chip{display:inline-block;margin-top:12px;font:600 11px/1 "JetBrains Mono",monospace;letter-spacing:.06em;padding:7px 9px;background:var(--bg);color:#fff}
.tl{display:grid;grid-template-columns:repeat(4,1fr);gap:0;counter-reset:s;margin-top:6px}@media(max-width:640px){.tl{grid-template-columns:1fr 1fr;row-gap:18px}}
.tl div{border-top:3px solid var(--deep);padding:12px 12px 0 0;counter-increment:s;font-size:14px}.tl div::before{content:counter(s,decimal-leading-zero);display:block;font:500 11px/1 "JetBrains Mono",monospace;color:var(--deep);margin-bottom:6px}
.tl div:nth-child(1){border-color:#9db6ff}.tl div:nth-child(2){border-color:#7fa0ff}.tl div:nth-child(3){border-color:#4f73e8}
.tl small{display:block;color:var(--muted);font:500 11.5px/1.4 "JetBrains Mono",monospace;margin-top:4px}
.opt{display:grid;align-content:start;gap:2px}.opt .lab2{font:600 11px/1 "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}.opt p.o{margin:8px 0 0;font-size:14px;color:#36474f}.opt p.small{font-size:12px;color:var(--muted)}.opt.best{border:2px solid var(--deep);background:#f4f7ff}.opt.best .lab2{color:var(--deep)}
.pickr{display:grid;gap:8px;padding:4px 0}.pickr>span{font:600 11px/1 "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:#9eb0b8}.acc input[type=radio]{width:20px;height:20px;flex:none;accent-color:var(--accent)}
.aid{background:linear-gradient(135deg,#eef2ff,#f7f9ff);border:1px solid #c9d5ff;padding:18px 20px;font-size:14.5px}.aid b{color:var(--deep)}
.terms{font-size:13.5px;color:#36474f}
.acc{margin:36px 0 0;background:var(--bg);color:#dfe3e5;padding:24px;display:grid;gap:12px}
.acc h3{margin:0;font:800 22px/1.1 "Archivo",Arial,sans-serif;color:#fff}
.acc input[type=text]{width:100%;font:16px "Instrument Sans",sans-serif;padding:12px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.06);color:#fff}
.acc label.c{display:flex;gap:10px;align-items:flex-start;font-size:14px;color:#c7d2d8}.acc label.c input{width:20px;height:20px;flex:none;accent-color:var(--accent)}
.acc button{font:700 13px/1 "JetBrains Mono",monospace;letter-spacing:.1em;text-transform:uppercase;padding:16px;background:var(--accent);color:#07141a;border:0;cursor:pointer}
.ok{margin:36px 0 0;border:2px solid #1f9d63;padding:20px;background:#effaf4}.ok b{color:#157a4b;font-size:18px;display:block;margin-bottom:4px}
.foot{border-top:1px solid var(--line);padding:18px clamp(20px,6vw,56px);font:500 11px/1.7 "JetBrains Mono",monospace;color:var(--muted);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.bar{position:fixed;left:0;right:0;bottom:0;z-index:5;display:flex;gap:8px;justify-content:center;padding:12px max(12px,env(safe-area-inset-left)) max(12px,env(safe-area-inset-bottom));background:rgba(7,20,26,.92);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.bar a,.bar button{font:700 12px/1 "JetBrains Mono",monospace;letter-spacing:.08em;text-transform:uppercase;padding:13px 16px;border:1px solid rgba(255,255,255,.3);color:#fff;background:none;text-decoration:none;cursor:pointer}.bar .p{background:var(--accent);border-color:var(--accent);color:#07141a}
@media(max-width:560px){.bar{gap:6px}.bar a,.bar button{flex:1;font-size:10.5px;padding:12px 6px;letter-spacing:.04em;text-align:center}}
.prev{position:sticky;top:0;z-index:6;background:#ffcf4a;color:#07141a;text-align:center;padding:8px;font:600 12px/1.4 "JetBrains Mono",monospace}
@media print{body{background:#fff;font-size:13px}.lead{font-size:14.5px;margin-top:14px}h2{margin:20px 0 10px}td{padding:8px 10px}td small{font-size:11.5px}.box{padding:14px 16px}.price{font-size:26px}.band h1{margin-top:22px}.body{padding-bottom:16px}.foot{break-inside:avoid;padding-top:10px;padding-bottom:0}.doc{margin:0;box-shadow:none;max-width:none}.bar,.acc,.prev{display:none}@page{size:A4;margin:12mm 0}.band{padding-top:22px}h2{break-after:avoid}tr,.box,.aid,.tl{break-inside:avoid}}
`;

function render(p, { wa, preview, accepted } = {}) {
  const lang = LG.includes(p.lang) ? p.lang : 'fr'; const t = (k) => L(T[k], lang); const tt = totals(p); const fin = ['both', 'upfront', 'monthly'].includes(p.financing) ? p.financing : 'upfront';
  const expired = p.validUntil && p.validUntil < new Date().toISOString().slice(0, 10) && p.status !== 'accepted';
  const incl = (INCL[p.plan] || INCL.site)[LG.indexOf(lang)] || INCL.site[0];
  const w = Number(p.weeks) || 4; const split = [1, Math.max(1, Math.round(w * 0.25)), Math.max(1, w - 2 - Math.round(w * 0.25)), 1];
  let wk = 0; const range = split.map((n) => { const a = wk + 1; wk += n; return a === wk ? `S${a}` : `S${a}–${wk}`; });
  const sec = (n, title) => `<h2><i>${String(n).padStart(2, '0')}</i>${esc(title)}</h2>`;
  let n = 0;
  const body = `${preview ? `<div class="prev">Pré-visualização do dono · o cliente vê esta página sem esta faixa · ${esc(p.status)}</div>` : ''}
<div class="doc"><header class="band"><div class="top"><div class="lg">${logo('#7fa0ff')}<div><b>DRT CREATION</b><small>Bruxelles · drtcreation.com</small></div></div>
<div class="ref">${t('title')} <b>${esc(p.no)}</b><br>${t('date')} <b>${esc(dl((p.sentAt || p.at || '').slice(0, 10), lang))}</b><br>${t('valid')} <b>${esc(dl(p.validUntil, lang))}</b></div></div>
<h1>${esc(t('title'))}<br><em>${esc(p.client.company)}</em></h1><p class="who">${esc(t('for'))} ${esc([p.client.contact, p.client.company].filter(Boolean).join(' · '))}${p.client.vat ? ' · ' + esc(p.client.vat) : ''}</p></header>
<main class="body">
${p.intro ? `${sec(++n, t('project'))}<p class="lead">${esc(p.intro).replace(/\n/g, '<br>')}</p>` : ''}
${sec(++n, t('scope'))}<table><tr><th></th><th class="n">${esc(t('qty'))}</th><th class="n">${esc(t('price'))}</th></tr>
${(p.items || []).map((i) => `<tr><td><b>${esc(i.label)}</b>${i.desc ? `<small>${esc(i.desc)}</small>` : ''}</td><td class="n">${Number(i.qty) || 1}</td><td class="n">${Number(i.price) ? eur((Number(i.qty) || 1) * Number(i.price), lang) : esc(t('incl'))}</td></tr>`).join('')}
<tr class="tot"><td>${esc(t('total'))}</td><td></td><td class="n">${eur(tt.setup, lang)}</td></tr></table>
<p class="vat">${esc(t('vat'))}</p>${fin !== 'monthly' && p.payTerms && fin !== 'both' ? `<p class="pay"><b>${esc(t('pay'))} :</b> ${esc(p.payTerms)}</p>` : ''}
${fin === 'both' || fin === 'monthly' ? `${sec(++n, fin === 'both' ? t('ways') : t('pay'))}<div class="${fin === 'both' ? 'grid2' : ''}">${fin === 'both' ? `<div class="box opt"><span class="lab2">A · ${esc(t('optA'))}</span><div class="price">${eur(tt.setup, lang)}</div><p class="o">${tt.monthly ? '+ ' + eur(tt.monthly, lang) + ' ' + esc(t('month')) + ' · ' : ''}${esc(p.payTerms || '')}</p><p class="o">${esc(t('optAtxt'))}</p>${p.aid ? `<span class="chip">${esc(t('optAbest'))}</span>` : ''}</div>` : ''}
<div class="box opt best"><span class="lab2">${fin === 'both' ? 'B · ' : ''}${esc(t('optB'))}</span><div class="price">${eur(tt.sub, lang)}<span>${esc(t('month'))}</span></div><p class="o"><b>${esc(t('optFor').replace('{m}', tt.months))}</b>${tt.monthly ? ', ' + esc(t('optBthen').replace('{x}', eur(tt.monthly, lang))) : ''}</p><p class="o">${esc(t('optBtxt').replace('{m}', tt.months))}</p><p class="o small">${esc(t('optBterms').replace(/\{m\}/g, tt.months))} · ${esc(t('total2'))} ${eur(tt.subTotal, lang)}</p></div></div>` : ''}
${tt.monthly ? `${sec(++n, t('maint'))}<div class="grid2"><div class="box"><div class="price">${eur(tt.monthly, lang)}<span>${esc(t('month'))}</span></div><p style="margin:10px 0 0;font-size:14px;color:#36474f">${esc(t('maintTxt'))}</p><span class="chip">${esc(t('annual'))} · ${eur(tt.year, lang)}</span></div>
<div class="box"><b style="font-size:14px">${esc(PLAN[p.plan] ? PLAN[p.plan][lang === 'pt' ? 'pt' : 'fr'] : '')}</b><ul>${incl.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>` : ''}
${sec(++n, t('timeline'))}<p style="margin:0 0 10px;font:800 18px/1 Archivo,Arial,sans-serif">≈ ${w} ${esc(t('weeks'))}</p><div class="tl">${T.steps.map((s, i) => `<div>${esc(L(s, lang))}<small>${range[i]}</small></div>`).join('')}</div>
${p.aid ? `${sec(++n, t('aid'))}<div class="aid">${esc(t('aidTxt'))}<br><small style="color:#5b6a72">${esc(t('aidNote'))}</small></div>` : ''}
${sec(++n, t('terms'))}<p class="terms">${esc(t('termsTxt'))}${p.notes ? '<br><br>' + esc(p.notes).replace(/\n/g, '<br>') : ''}</p>
${p.status === 'accepted' || accepted ? `<div class="ok"><b>✓ ${esc(t('accepted'))}${p.acceptedOption ? ' · ' + esc(p.acceptedOption === 'monthly' ? t('optB') : t('optA')) : ''}</b>${esc(t('by'))} ${esc(p.acceptedBy || '')} ${esc(t('on'))} ${esc(dl((p.acceptedAt || '').slice(0, 10), lang))}. ${esc(t('acceptedTxt'))}<p style="margin:12px 0 0"><a href="/p/${esc(p.token)}/contrat" style="display:inline-block;background:#1d44d6;color:#fff;padding:12px 16px;text-decoration:none;font:700 12px/1 'JetBrains Mono',monospace;letter-spacing:.08em;text-transform:uppercase">${esc(p.contract && p.contract.signedAt ? t('signedC') : t('toSign'))} →</a></p></div>`
    : expired ? `<div class="ok" style="border-color:#c98a1b;background:#fff8ea"><b style="color:#9a6510">${esc(t('expired'))}</b></div>`
    : `<form class="acc" method="post" action="/p/${esc(p.token)}/accept"><h3>${esc(t('accept'))}</h3><input type="text" name="name" required placeholder="${esc(t('acceptName'))}" value="${esc(p.client.contact)}"${preview ? ' disabled' : ''}>${fin === 'both' ? `<div class="pickr"><span>${esc(t('pick'))}</span><label class="c"><input type="radio" name="opt" value="upfront" required${preview ? ' disabled' : ''}>A · ${esc(t('optA'))} (${eur(tt.setup, lang)}${tt.monthly ? ' + ' + eur(tt.monthly, lang) + ' ' + esc(t('month')) : ''})</label><label class="c"><input type="radio" name="opt" value="monthly" required${preview ? ' disabled' : ''}>B · ${esc(t('optB'))} (${eur(tt.sub, lang)} ${esc(t('month'))} × ${tt.months})</label></div>` : ''}<label class="c"><input type="checkbox" name="ok" value="1" required${preview ? ' disabled' : ''}>${esc(t('acceptChk'))}</label><button${preview ? ' disabled' : ''}>${esc(t('accept'))} →</button></form>`}
</main><footer class="foot"><span>DRT Creation · Matheus D. · TVA BE 1045.012.177</span><span>contact@drtcreation.com · +32 470 83 51 86</span></footer></div>
<div class="bar"><button type="button" onclick="print()">${esc(t('print'))}</button>${wa ? `<a href="${esc(wa)}" target="_blank" rel="noopener">${esc(t('q'))}</a>` : ''}${p.status !== 'accepted' && !expired && !preview ? `<a class="p" href="#" onclick="document.querySelector('.acc').scrollIntoView({behavior:'smooth'});return false">${esc(t('accept'))}</a>` : ''}</div>`;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(t('title'))} ${esc(p.no)} · ${esc(p.client.company)} · DRT Creation</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>${CSS}</style></head><body>${body}</body></html>`;
}

// mensagem para mandar o link
function shareText(p, url) {
  const first = String(p.client.contact || '').split(/\s+/)[0];
  return {
    fr: `Bonjour ${first} ! Voici notre proposition pour ${p.client.company} : ${url} — vous pouvez l’accepter directement en ligne ou l’imprimer en PDF. Je reste disponible pour en parler.`,
    pt: `Oi ${first}! Aqui está a nossa proposta para a ${p.client.company}: ${url} — dá para aceitar direto pelo link ou salvar em PDF. Qualquer dúvida, é só chamar.`,
    en: `Hi ${first}! Here is our proposal for ${p.client.company}: ${url} — you can accept it online or save it as a PDF. Happy to talk it through.`,
    nl: `Hallo ${first}! Hier is ons voorstel voor ${p.client.company}: ${url} — u kunt het online aanvaarden of als pdf bewaren. Ik bespreek het graag met u.`,
  }[LG.includes(p.lang) ? p.lang : 'fr'];
}

// formulário de edição (painel)
function editForm(p) {
  const v = (x) => esc(x == null ? '' : x);
  const row = (i, idx) => `<div class="irow"><input name="il" value="${v(i.label)}" placeholder="Item" aria-label="Item ${idx + 1}"><input name="id" value="${v(i.desc)}" placeholder="Descrição" aria-label="Descrição ${idx + 1}"><input name="iq" type="number" min="1" step="1" value="${v(i.qty || 1)}" aria-label="Quantidade"><input name="ip" inputmode="decimal" value="${v(i.price)}" aria-label="Preço €"><button type="button" class="btn sm danger" onclick="this.parentNode.remove();recalc()" aria-label="Remover">×</button></div>`;
  return `<style>.irow{display:grid;grid-template-columns:1.2fr 2fr 64px 90px 40px;gap:6px;align-items:center}.irow input{width:100%;font:14px var(--body);padding:9px 10px;background:var(--bg);color:var(--text);border:1px solid var(--line-2)}@media(max-width:760px){.irow{grid-template-columns:1fr 64px 90px 40px}.irow input[name=id]{grid-column:1/-1;order:5}}.ihead{display:grid;grid-template-columns:1.2fr 2fr 64px 90px 40px;gap:6px;font:600 10.5px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--text-2);margin-bottom:4px}@media(max-width:760px){.ihead{display:none}}</style>
<form class="f panel" method="post" action="/admin/proposals/${p.id}" id="pf">
<div class="two"><label>Idioma da proposta<select name="lang">${['fr', 'pt', 'en', 'nl'].map((l) => `<option value="${l}"${p.lang === l ? ' selected' : ''}>${{ fr: 'Français', pt: 'Português', en: 'English', nl: 'Nederlands' }[l]}</option>`).join('')}</select><small>Mudar o idioma só troca os textos fixos; os itens ficam como estão.</small></label><label>Válida até<input type="date" name="validUntil" value="${v(p.validUntil)}"></label></div>
<div class="two"><label>Empresa<input name="company" value="${v(p.client.company)}" required></label><label>Contato<input name="contact" value="${v(p.client.contact)}"></label><label>E-mail<input name="email" value="${v(p.client.email)}"></label><label>Telefone<input name="phone" value="${v(p.client.phone)}"></label><label>Nº de empresa / TVA<input name="vat" value="${v(p.client.vat)}"></label></div>
<label>Introdução<textarea name="intro" rows="3">${v(p.intro)}</textarea></label>
<div><span class="lab" style="display:block;margin:6px 0 10px">Itens da criação (preço por unidade, em €)</span><div class="ihead"><span>Item</span><span>Descrição</span><span>Qtd</span><span>Preço</span><span></span></div><div id="items" style="display:grid;gap:6px">${(p.items || []).map(row).join('')}</div>
<div class="row" style="margin-top:10px"><button type="button" class="btn sm" onclick="addRow()">+ Linha</button><span class="muted">Total da criação: <b id="tot" style="color:var(--text)"></b></span></div></div>
<div class="two"><label>Plano de manutenção<select name="plan">${Object.entries(PLAN).map(([k, x]) => `<option value="${k}"${p.plan === k ? ' selected' : ''}>${x.pt} (sugerido ${x.price / 100} €)</option>`).join('')}</select></label><label>Mensalidade (€ / mês)<input name="monthly" inputmode="decimal" value="${v(p.monthly)}"><small>0 = sem manutenção na proposta. Anual = 10 × mensalidade.</small></label><label>Prazo (semanas)<input name="weeks" type="number" min="1" max="52" value="${v(p.weeks)}"></label></div>
<div class="two"><label>Formas de pagamento na proposta<select name="financing">${[['both', 'As duas: com entrada e sem entrada (o cliente escolhe)'], ['upfront', 'Só com entrada'], ['monthly', 'Só sem entrada (mensal)']].map(([k, l]) => `<option value="${k}"${(p.financing || 'upfront') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
<label>Prazo sem entrada<select name="subMonths">${[24, 12].map((m) => `<option value="${m}"${(Number(p.subMonths) || 24) === m ? ' selected' : ''}>${m} meses</option>`).join('')}</select></label>
<label>Mensalidade sem entrada (€)<input name="subMonthly" inputmode="decimal" value="${v(p.subMonthly || '')}" placeholder="automático: ${totals(p).sub}"><small>Vazio = automático: (manutenção + criação ÷ prazo) + 10 %, arredondado. Hoje: ${totals(p).sub} €/mês × ${totals(p).months} = ${totals(p).subTotal} €.</small></label></div>
<label>Condições de pagamento (com entrada)<input name="payTerms" value="${v(p.payTerms)}"></label>
<label style="display:flex;gap:10px;align-items:center;font-weight:600"><input type="checkbox" name="aid" value="1"${p.aid ? ' checked' : ''} style="width:auto"> Mostrar a seção de auxílios (Prime Digitalisation)</label>
<label>Observações para o cliente (opcional)<textarea name="notes" rows="2">${v(p.notes)}</textarea></label>
<div class="row"><button class="btn pri">Salvar</button></div></form>
<script>function recalc(){var t=0;document.querySelectorAll('#items .irow').forEach(function(r){t+=(parseFloat(r.querySelector('[name=iq]').value)||0)*(parseFloat(String(r.querySelector('[name=ip]').value).replace(',','.'))||0)});document.getElementById('tot').textContent=t.toLocaleString('fr-BE',{style:'currency',currency:'EUR'})}
function addRow(){var d=document.createElement('div');d.innerHTML=${JSON.stringify(row({ qty: 1, price: '' }, 99))};document.getElementById('items').appendChild(d.firstChild);recalc()}
document.getElementById('items').addEventListener('input',recalc);recalc();</script>`;
}
function fromForm(raw, p) {
  const q = new URLSearchParams(raw); const g = (k, n = 300) => String(q.get(k) || '').trim().slice(0, n);
  p.lang = LG.includes(g('lang')) ? g('lang') : p.lang;
  p.validUntil = /^\d{4}-\d{2}-\d{2}$/.test(g('validUntil')) ? g('validUntil') : p.validUntil;
  p.client = { company: g('company', 120) || p.client.company, contact: g('contact', 80), email: g('email', 120), phone: g('phone', 40), vat: g('vat', 40), address: p.client.address || '' };
  p.intro = g('intro', 2000);
  const il = q.getAll('il'), id = q.getAll('id'), iq = q.getAll('iq'), ip = q.getAll('ip');
  p.items = il.map((l, i) => ({ label: String(l).trim().slice(0, 120), desc: String(id[i] || '').trim().slice(0, 300), qty: Math.max(1, Math.min(999, parseInt(iq[i], 10) || 1)), price: Math.max(0, Math.round((parseFloat(String(ip[i] || '0').replace(',', '.')) || 0) * 100) / 100) })).filter((x) => x.label).slice(0, 40);
  p.plan = PLAN[g('plan')] ? g('plan') : p.plan;
  p.monthly = Math.max(0, Math.round((parseFloat(g('monthly').replace(',', '.')) || 0) * 100) / 100);
  p.weeks = Math.max(1, Math.min(52, parseInt(g('weeks'), 10) || p.weeks || 4));
  p.payTerms = g('payTerms', 200); p.aid = q.get('aid') === '1'; p.notes = g('notes', 2000);
  p.financing = ['both', 'upfront', 'monthly'].includes(g('financing')) ? g('financing') : 'upfront'; p.subMonths = g('subMonths') === '12' ? 12 : 24;
  const sm = parseFloat(g('subMonthly').replace(',', '.')); p.subMonthly = Number.isFinite(sm) && sm > 0 ? Math.round(sm * 100) / 100 : null;
  return p;
}
const STATUS = { draft: ['Rascunho', 's-paused'], sent: ['Enviada', 's-soon'], viewed: ['Vista pelo cliente', 's-soon'], accepted: ['Aceita', 's-ok'], declined: ['Recusada', 's-paused'] };

module.exports = { CATALOG, catalog, suggest, render, totals, shareText, editForm, fromForm, STATUS, eur, LG };
