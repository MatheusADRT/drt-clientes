'use strict';
// Espace client (área do cliente): painel completo depois do login.
// Seções: Aperçu · Mon site · Paiements · Contrat · Demandes · Aides · Compte. Sem dependências, SVG desenhado no servidor.
const store = require('./store');
const B = require('./billing');
const { esc, logo, eur, fdate, CSS: BASE, card, PLAN, STATUS, memberNo, initials } = require('./ui');
const ST = require('./stats');
const UP = require('./uptime');
const RV = require('./reviews');
const BC = require('./brandcard');

const E = {
  fr: {
    title: 'Espace client', out: 'Se déconnecter', morning: 'Bonjour', evening: 'Bonsoir',
    tabs: { apercu: 'Aperçu', site: 'Mon site', paiements: 'Paiements', contrat: 'Contrat', demandes: 'Demandes', aides: 'Aides', parrainage: 'Parrainage', compte: 'Compte' },
    lead: { ok: 'Tout est en ordre. Votre service est actif.', soon: 'Votre prochaine mensualité arrive à échéance.', grace: 'Votre mensualité est en retard. Le service sera mis en pause le', suspended: 'Votre service est en pause. Il revient automatiquement dès réception du paiement.', paused: 'Votre espace est prêt. La facturation démarre à la date de début du contrat.' },
    k: { status: 'Service', due: 'Prochaine échéance', in: 'dans', days: 'jours', day: 'jour', today: 'aujourd’hui', visitors: 'Visiteurs · 30 j', uptime: 'Disponibilité · 30 j', paidUntil: 'Payé jusqu’au', noData: 'en attente', monthly: 'Mensualité' },
    contract: 'Votre contrat', month: 'Mois', of: 'sur', renew: 'Renouvellement', firmEnd: 'Fin de la période ferme', renewSoon: 'Votre renouvellement approche : profitez de l’option A, −10 % sur la mensualité et 2 h de modifications par mois.', renewLater: 'Option A au renouvellement : −10 % sur la mensualité, 2 h de modifications par mois, un rafraîchissement par an offert.',
    hours: 'Modifications ce mois-ci', hoursOf: 'utilisées sur', hoursLeft: 'restantes', hoursNote: 'Le compteur repart à zéro le 1er de chaque mois.',
    activity: 'Activité récente', noActivity: 'Rien à signaler pour l’instant.',
    ev: { pay: 'Paiement reçu', down: 'Site hors ligne', up: 'Site de retour en ligne', req: 'Demande', done: 'Demande terminée', start: 'Ouverture de votre espace client' },
    site: { avail: 'Disponibilité', availSub: 'Testé toutes les 5 minutes, depuis l’Europe et les États-Unis', online: 'En ligne', offline: 'Hors ligne', resp: 'Réponse', noUp: 'La surveillance démarre à l’activation de votre contrat.', legendOk: '100 %', legendMid: 'incident', legendNone: 'pas de mesure',
      audience: 'Audience', audSub: '30 derniers jours · mesure anonyme, sans cookies, conforme RGPD', visitors: 'Visiteurs', pv: 'Pages vues', avg: 'Temps moyen', mobile: 'Sur mobile', vs: 'vs 30 jours précédents', sources: 'Sources', pages: 'Pages les plus vues', devices: 'Appareils', peak: 'Heure de pointe', noAud: 'Les statistiques apparaissent dès que le compteur est installé sur votre site (sans cookies, aucune bannière nécessaire).', direct: 'Direct',
      biz: 'Votre activité', orders: 'Commandes', revenue: 'Chiffre d’affaires', ticket: 'Panier moyen', bookings: 'Réservations', perDay: 'par jour',
      reviews: 'Avis Google', reviewsCount: 'avis', reviewsNew: 'nouveaux ce mois', ask: 'Demander un avis', askTxt: 'Envoyez ce lien à vos clients : il ouvre directement la fenêtre pour laisser un avis.', copy: 'Copier', copied: 'Copié' },
    pay: { next: 'Prochain paiement', amount: 'Montant', dueDate: 'Échéance', how: 'Comment payer', transfer: 'Virement bancaire', ben: 'Bénéficiaire', comm: 'Communication structurée', commTxt: 'Indiquez cette communication : le paiement est reconnu automatiquement et votre carte est mise à jour.', online: 'Payer en ligne', onlineTxt: 'Carte, Bancontact ou domiciliation SEPA (paiement sécurisé Stripe).', annual: 'Formule annuelle', annualTxt: 'Payez 10 mois d’un coup et recevez 12 mois de service : 2 mois offerts.', save: 'Économie', hist: 'Historique et factures', none: 'Aucun paiement enregistré pour l’instant.', date: 'Date', period: 'Période', invoice: 'Facture', method: { virement: 'Virement', especes: 'Espèces', stripe: 'En ligne', autre: 'Autre' }, paused: 'La facturation n’a pas encore commencé. Vous recevrez votre première facture à la date de début du contrat.' },
    ct: { h: 'Votre contrat', no: 'Contrat n°', plan: 'Formule', start: 'Début', firm: 'Durée ferme', firmV: '12 mois', end: 'Fin de la période ferme', notice: 'Proposition de renouvellement', grace: 'Délai de grâce', graceV: '3 jours après l’échéance', download: 'Télécharger le contrat (PDF)', included: 'Inclus dans votre formule', delays: 'Délais d’intervention', d1: 'Site hors ligne', d1v: 'prise en charge 2 h · résolu en 24 h', d2: 'Fonction essentielle en panne', d2v: '4 h ouvrées · 2 jours ouvrés', d3: 'Bug mineur, petite modification', d3v: '1 jour ouvré · 5 jours ouvrés', renewal: 'Au renouvellement', optA: 'Option A · renouveler', optAt: '−10 % sur la mensualité, 2 h de modifications par mois, 1 rafraîchissement par an offert, −10 % sur tout nouveau projet.', optB: 'Option B · ne pas renouveler', optBt: 'Copie complète de votre site et de vos données, hébergement maintenu 30 jours pour la migration.', owner: 'Votre site vous appartient, code source compris.' },
    rq: { h: 'Demandes', sub: 'Une modification, un bug, une nouvelle idée : écrivez-nous ici, nous suivons tout dans cet espace.', new: 'Nouvelle demande', subject: 'Sujet', subjectP: 'Ex. : changer les horaires de Noël', details: 'Détails', detailsP: 'Ce qui doit changer, sur quelle page, avec les textes ou liens nécessaires.', urgency: 'Priorité', normal: 'Normale', urgent: 'Urgente (site ou commande bloqués)', send: 'Envoyer la demande', list: 'Vos demandes', none: 'Aucune demande pour l’instant.', st: { new: 'Reçue', doing: 'En cours', done: 'Terminée' }, time: 'Temps passé', reply: 'Réponse', sent: 'Demande envoyée. Nous revenons vers vous rapidement.' },
    aides: { h: 'Aides et avantages fiscaux', sub: 'À Bruxelles, votre site est un investissement que la Région et le fisc soutiennent.', a1: 'Prime Digitalisation', a1n: '25 → 70 %', a1t: 'Région bruxelloise, des frais HTVA, plafond 10 000 €/an. Création ou refonte de site, e-commerce, digitalisation des processus. Demande sur MonBEE avant le début du projet.', a2: 'Déduction pour investissement', a2n: '+20 %', a2t: 'Un site ou une application neuf est amorti sur 3 ans ; les PME et indépendants déduisent 20 % en plus (formulaire 275U).', a3: 'Mensualité déductible', a3n: '100 %', a3t: 'Votre mensualité est une charge professionnelle courante, déduite intégralement l’année du paiement.', cta: 'Un nouveau projet ? Nous préparons le dossier de prime avec vous, sans frais.', ctaBtn: 'En parler sur WhatsApp', note: 'Montants et conditions fixés par les autorités, sous réserve d’éligibilité ; à vérifier avec votre comptable.' },
    acc: { h: 'Compte', login: 'Identifiant', pw: 'Changer le mot de passe', cur: 'Mot de passe actuel', nw: 'Nouveau mot de passe', nwP: 'au moins 8 caractères', save: 'Enregistrer', ok: 'Mot de passe modifié.', bad: 'Mot de passe actuel incorrect.', short: 'Le nouveau mot de passe doit faire au moins 8 caractères.', contact: 'Vos interlocuteurs', privacy: 'Vos données restent votre propriété. Mesure d’audience anonyme, sans cookies. Données hébergées dans l’Union européenne.' },
    help: 'Une question ?', wa: 'WhatsApp', mail: 'E-mail', resp: 'Réponse en moins de 24 h',
  },
  pt: {
    title: 'Área do cliente', out: 'Sair', morning: 'Bom dia', evening: 'Boa noite',
    tabs: { apercu: 'Visão geral', site: 'Meu site', paiements: 'Pagamentos', contrat: 'Contrato', demandes: 'Pedidos', aides: 'Apoios', parrainage: 'Indicações', compte: 'Conta' },
    lead: { ok: 'Tudo em ordem. Seu serviço está ativo.', soon: 'Sua próxima mensalidade está para vencer.', grace: 'Sua mensalidade está em atraso. O serviço entra em pausa em', suspended: 'Seu serviço está em pausa. Ele volta automaticamente assim que o pagamento for recebido.', paused: 'Sua área está pronta. A cobrança começa na data de início do contrato.' },
    k: { status: 'Serviço', due: 'Próximo vencimento', in: 'em', days: 'dias', day: 'dia', today: 'hoje', visitors: 'Visitantes · 30 d', uptime: 'Disponibilidade · 30 d', paidUntil: 'Pago até', noData: 'aguardando', monthly: 'Mensalidade' },
    contract: 'Seu contrato', month: 'Mês', of: 'de', renew: 'Renovação', firmEnd: 'Fim do período firme', renewSoon: 'Sua renovação está chegando: aproveite a opção A, −10 % na mensalidade e 2 h de alterações por mês.', renewLater: 'Opção A na renovação: −10 % na mensalidade, 2 h de alterações por mês e um refresh por ano grátis.',
    hours: 'Alterações este mês', hoursOf: 'usadas de', hoursLeft: 'restantes', hoursNote: 'O contador zera no dia 1º de cada mês.',
    activity: 'Atividade recente', noActivity: 'Nada a relatar por enquanto.',
    ev: { pay: 'Pagamento recebido', down: 'Site fora do ar', up: 'Site de volta ao ar', req: 'Pedido', done: 'Pedido concluído', start: 'Abertura da sua área do cliente' },
    site: { avail: 'Disponibilidade', availSub: 'Testado a cada 5 minutos, da Europa e dos Estados Unidos', online: 'No ar', offline: 'Fora do ar', resp: 'Resposta', noUp: 'O monitoramento começa com a ativação do seu contrato.', legendOk: '100 %', legendMid: 'incidente', legendNone: 'sem medição',
      audience: 'Audiência', audSub: 'Últimos 30 dias · medição anônima, sem cookies, conforme RGPD', visitors: 'Visitantes', pv: 'Páginas vistas', avg: 'Tempo médio', mobile: 'No celular', vs: 'vs 30 dias anteriores', sources: 'Origem', pages: 'Páginas mais vistas', devices: 'Aparelhos', peak: 'Horário de pico', noAud: 'As estatísticas aparecem assim que o contador estiver instalado no seu site (sem cookies, sem banner).', direct: 'Direto',
      biz: 'Seu negócio', orders: 'Pedidos', revenue: 'Faturamento', ticket: 'Ticket médio', bookings: 'Agendamentos', perDay: 'por dia',
      reviews: 'Avaliações no Google', reviewsCount: 'avaliações', reviewsNew: 'novas este mês', ask: 'Pedir uma avaliação', askTxt: 'Mande este link aos seus clientes: ele abre direto a janela para deixar a avaliação.', copy: 'Copiar', copied: 'Copiado' },
    pay: { next: 'Próximo pagamento', amount: 'Valor', dueDate: 'Vencimento', how: 'Como pagar', transfer: 'Transferência bancária', ben: 'Beneficiário', comm: 'Comunicação estruturada', commTxt: 'Use esta comunicação: o pagamento é reconhecido automaticamente e a sua carteirinha é atualizada.', online: 'Pagar online', onlineTxt: 'Cartão, Bancontact ou débito SEPA (pagamento seguro Stripe).', annual: 'Plano anual', annualTxt: 'Pague 10 meses de uma vez e receba 12 meses de serviço: 2 meses grátis.', save: 'Economia', hist: 'Histórico e faturas', none: 'Nenhum pagamento registrado ainda.', date: 'Data', period: 'Período', invoice: 'Fatura', method: { virement: 'Transferência', especes: 'Dinheiro', stripe: 'Online', autre: 'Outro' }, paused: 'A cobrança ainda não começou. A primeira fatura chega na data de início do contrato.' },
    ct: { h: 'Seu contrato', no: 'Contrato n°', plan: 'Plano', start: 'Início', firm: 'Duração firme', firmV: '12 meses', end: 'Fim do período firme', notice: 'Proposta de renovação', grace: 'Carência', graceV: '3 dias após o vencimento', download: 'Baixar o contrato (PDF)', included: 'Incluído no seu plano', delays: 'Prazos de atendimento', d1: 'Site fora do ar', d1v: 'atendimento em 2 h · resolvido em 24 h', d2: 'Função essencial com falha', d2v: '4 h úteis · 2 dias úteis', d3: 'Bug menor, pequena alteração', d3v: '1 dia útil · 5 dias úteis', renewal: 'Na renovação', optA: 'Opção A · renovar', optAt: '−10 % na mensalidade, 2 h de alterações por mês, 1 refresh por ano grátis, −10 % em qualquer projeto novo.', optB: 'Opção B · não renovar', optBt: 'Cópia completa do seu site e dos seus dados, hospedagem mantida 30 dias para a migração.', owner: 'O seu site é seu, incluindo o código-fonte.' },
    rq: { h: 'Pedidos', sub: 'Uma alteração, um bug, uma ideia nova: escreva aqui, acompanhamos tudo por esta área.', new: 'Novo pedido', subject: 'Assunto', subjectP: 'Ex.: mudar o horário de fim de ano', details: 'Detalhes', detailsP: 'O que deve mudar, em qual página, com os textos ou links necessários.', urgency: 'Prioridade', normal: 'Normal', urgent: 'Urgente (site ou pedidos travados)', send: 'Enviar o pedido', list: 'Seus pedidos', none: 'Nenhum pedido por enquanto.', st: { new: 'Recebido', doing: 'Em andamento', done: 'Concluído' }, time: 'Tempo gasto', reply: 'Resposta', sent: 'Pedido enviado. Respondemos rapidinho.' },
    aides: { h: 'Apoios e benefícios fiscais', sub: 'Em Bruxelas, o seu site é um investimento que a Região e o fisco apoiam.', a1: 'Prime Digitalisation', a1n: '25 → 70 %', a1t: 'Região de Bruxelas, dos custos sem TVA, teto 10 000 €/ano. Criação ou renovação de site, e-commerce, digitalização de processos. Pedido no MonBEE antes de começar o projeto.', a2: 'Dedução por investimento', a2n: '+20 %', a2t: 'Um site ou app novo é amortizado em 3 anos; PMEs e independentes deduzem 20 % a mais (formulário 275U).', a3: 'Mensalidade dedutível', a3n: '100 %', a3t: 'Sua mensalidade é despesa profissional corrente, deduzida integralmente no ano do pagamento.', cta: 'Um projeto novo? Montamos o dossiê da prime com você, sem custo.', ctaBtn: 'Falar no WhatsApp', note: 'Valores e condições fixados pelas autoridades, sujeitos à elegibilidade; confirme com o seu contador.' },
    acc: { h: 'Conta', login: 'Login', pw: 'Trocar a senha', cur: 'Senha atual', nw: 'Nova senha', nwP: 'pelo menos 8 caracteres', save: 'Salvar', ok: 'Senha alterada.', bad: 'Senha atual incorreta.', short: 'A nova senha deve ter pelo menos 8 caracteres.', contact: 'Seus contatos', privacy: 'Seus dados continuam seus. Medição de audiência anônima, sem cookies. Dados hospedados na União Europeia.' },
    help: 'Alguma dúvida?', wa: 'WhatsApp', mail: 'E-mail', resp: 'Resposta em menos de 24 h',
  },
};

const ALLOW = { site: 0.5, boutique: 1, systeme: 1 }; // horas de alteração por mês (ano 1)
const INCL = {
  site: { fr: ['Hébergement, domaine technique et HTTPS', 'Mises à jour de sécurité et sauvegardes', 'Surveillance 24 h/24', 'Correction des bugs', '30 min de modifications par mois', 'Espace client et rapport mensuel'], pt: ['Hospedagem, domínio técnico e HTTPS', 'Atualizações de segurança e backups', 'Monitoramento 24 h', 'Correção de bugs', '30 min de alterações por mês', 'Área do cliente e relatório mensal'] },
  boutique: { fr: ['Hébergement européen et HTTPS', 'Mises à jour WordPress et extensions, testées', 'Sauvegardes quotidiennes hors serveur', 'Surveillance 24 h/24, Europe et États-Unis', 'Correction des bugs', '1 h de modifications par mois', 'Performance et vérification Google Search', 'Espace client, chiffres de la boutique et rapport mensuel'], pt: ['Hospedagem europeia e HTTPS', 'Atualizações do WordPress e plugins, testadas', 'Backups diários fora do servidor', 'Monitoramento 24 h, Europa e EUA', 'Correção de bugs', '1 h de alterações por mês', 'Performance e Google Search', 'Área do cliente, números da loja e relatório mensal'] },
  systeme: { fr: ['Serveur, base de données et HTTPS', 'Mises à jour de sécurité testées', 'Sauvegardes quotidiennes hors serveur', 'Surveillance 24 h/24, Europe et États-Unis', 'Corrections et compatibilité (iOS, Android, navigateurs)', '1 h d’évolutions par mois', 'Intervention le jour même en cas d’urgence', 'Espace client, chiffres de l’activité et rapport mensuel'], pt: ['Servidor, banco de dados e HTTPS', 'Atualizações de segurança testadas', 'Backups diários fora do servidor', 'Monitoramento 24 h, Europa e EUA', 'Correções e compatibilidade (iOS, Android, navegadores)', '1 h de melhorias por mês', 'Atendimento no mesmo dia em urgência', 'Área do cliente, números do negócio e relatório mensal'] },
};

const ICON = {
  parrainage: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M12 8v13M5 13v8h14v-8M12 8C10.5 4.5 7 4 7 6.5S10 8 12 8zm0 0c1.5-3.5 5-4 5-1.5S14 8 12 8z"/>',
  apercu: '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>',
  site: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  paiements: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
  contrat: '<path d="M6 2.5h8l4 4V21.5H6z"/><path d="M14 2.5v4h4M9 12h6M9 16h6"/>',
  demandes: '<path d="M4 4h16v12H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
  aides: '<path d="M12 2.5l2.6 6 6.4.6-4.9 4.3 1.5 6.3L12 16.4 6.4 19.7l1.5-6.3L3 9.1l6.4-.6z"/>',
  compte: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.4-6 8-6s6.8 2 8 6"/>',
  wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8.5 19z"/><path d="M9 9.5c.3 2 1.8 3.8 4 4.5l1.2-1.2 2 .9c-.3 1.4-1.4 2-2.6 1.8-3-.6-5.6-3.2-6.2-6.2-.2-1.2.4-2.3 1.8-2.6l.9 2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6l8.5 7 8.5-7"/>',
  dl: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
};
const ico = (k, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k] || ''}</svg>`;
const n0 = (x, lang) => Number(x || 0).toLocaleString(lang === 'pt' ? 'pt-PT' : 'fr-BE');
const pctTag = (d, label) => d == null ? '' : `<span class="dl ${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)} %${label ? ` <i>${label}</i>` : ''}</span>`;
const hours = (h, lang) => { const m = Math.round(h * 60); return m < 60 ? m + ' min' : (Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + String(m % 60).padStart(2, '0') : '')); };
const monthKey = (d) => d.slice(0, 7);

// ---------- gráficos ----------
function areaChart(series, lang, color = 'var(--accent)') {
  const W = 720, H = 180, P = 6; const vals = series.map((x) => x[1]); const max = Math.max(4, ...vals); const step = (W - 2 * P) / Math.max(1, vals.length - 1);
  const pts = vals.map((v, i) => [P + i * step, H - 18 - (v / max) * (H - 36)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L${pts[pts.length - 1][0].toFixed(1)} ${H - 18} L${pts[0][0].toFixed(1)} ${H - 18} Z`;
  const grid = [0.25, 0.5, 0.75, 1].map((f) => { const y = H - 18 - f * (H - 36); return `<line x1="0" x2="${W}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="gl"/><text x="${W - 2}" y="${(y - 4).toFixed(1)}" class="gt" text-anchor="end">${Math.round(max * f)}</text>`; }).join('');
  const dots = pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i === pts.length - 1 ? 4 : 0}" fill="${color}"><title>${fdate(series[i][0], lang)} · ${series[i][1]}</title></circle><rect x="${(p[0] - step / 2).toFixed(1)}" y="0" width="${step.toFixed(1)}" height="${H}" fill="transparent"><title>${fdate(series[i][0], lang)} · ${series[i][1]}</title></rect>`).join('');
  const lab = (i) => `<text x="${pts[i][0].toFixed(1)}" y="${H - 2}" class="gt" text-anchor="${i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}">${fdate(series[i][0], lang).replace(/\s\d{4}$/, '')}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"><defs><linearGradient id="ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${area}" fill="url(#ga)"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>${dots}${lab(0)}${lab(Math.floor(pts.length / 2))}${lab(pts.length - 1)}</svg>`;
}
function barChart(vals, labels, lang) {
  const W = 720, H = 140; const max = Math.max(1, ...vals); const bw = W / vals.length;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">${vals.map((v, i) => `<rect x="${(i * bw + 2).toFixed(1)}" y="${(H - 16 - v / max * (H - 26)).toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${Math.max(v ? 2 : 0, v / max * (H - 26)).toFixed(1)}" rx="2" class="${i === vals.length - 1 ? 'b1' : 'b0'}"><title>${fdate(labels[i], lang)} · ${v}</title></rect>`).join('')}<text x="0" y="${H - 2}" class="gt">${fdate(labels[0], lang).replace(/\s\d{4}$/, '')}</text><text x="${W}" y="${H - 2}" class="gt" text-anchor="end">${fdate(labels[labels.length - 1], lang).replace(/\s\d{4}$/, '')}</text></svg>`;
}
function donut(parts) {
  const tot = parts.reduce((a, p) => a + p[1], 0) || 1; let a0 = -Math.PI / 2; const R = 42, r = 28, cx = 50, cy = 50;
  const cols = ['var(--accent)', '#3ddc84', '#ffcf4a', '#ff9142', '#97a5ac'];
  const segs = parts.map(([k, v], i) => { const a1 = a0 + v / tot * Math.PI * 2 - 0.0001; const big = a1 - a0 > Math.PI ? 1 : 0; const p = (a, rr) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)].map((x) => x.toFixed(2)).join(' ');
    const d = `M${p(a0, R)} A${R} ${R} 0 ${big} 1 ${p(a1, R)} L${p(a1, r)} A${r} ${r} 0 ${big} 0 ${p(a0, r)} Z`; a0 = a1 + 0.0001; return `<path d="${d}" fill="${cols[i % cols.length]}"><title>${esc(k)} · ${Math.round(v / tot * 100)} %</title></path>`; }).join('');
  return { svg: `<svg viewBox="0 0 100 100" class="donut" role="img">${segs}</svg>`, legend: parts.map(([k, v], i) => `<li><i style="background:${cols[i % cols.length]}"></i>${esc(k)}<b>${Math.round(v / tot * 100)} %</b></li>`).join('') };
}
const hbars = (rows, lang, map = (k) => k) => { const max = Math.max(1, ...rows.map((r) => r[1])); return `<ul class="hb">${rows.map(([k, v]) => `<li><span>${esc(map(k))}</span><b>${n0(v, lang)}</b><i style="width:${Math.max(3, v / max * 100).toFixed(1)}%"></i></li>`).join('')}</ul>`; };

// ---------- blocos ----------
function contractInfo(c) {
  const start = c.contractStart || B.addDays(c.paidUntil, 1);
  const end = B.addDays(B.addMonths(start, 12, Number(start.slice(8, 10))), -1);
  const today = B.today(); const total = B.diffDays(start, end) + 1; const done = Math.max(0, Math.min(total, B.diffDays(start, today) + 1));
  const month = Math.max(0, Math.min(12, Math.ceil(done / (total / 12))));
  return { start, end, notice: B.addDays(end, -60), month, pct: Math.round(done / total * 100), started: today >= start, daysLeft: B.diffDays(today, end) };
}
function hoursUsed(c) { const mk = monthKey(B.today()); return store.db.requests.filter((r) => r.clientId === c.id && r.hours && monthKey(r.doneAt || r.at.slice(0, 10)) === mk).reduce((a, r) => a + Number(r.hours || 0), 0); }

function activity(c, lang) {
  const t = E[lang]; const out = [];
  for (const p of store.db.payments.filter((x) => x.clientId === c.id)) out.push({ at: p.date, k: 'ok', txt: `${t.ev.pay} · ${eur(p.amount, lang)}` });
  for (const r of store.db.requests.filter((x) => x.clientId === c.id)) { out.push({ at: r.at.slice(0, 10), k: 'info', txt: `${t.ev.req} · ${r.title}` }); if (r.status === 'done') out.push({ at: r.doneAt || r.at.slice(0, 10), k: 'ok', txt: `${t.ev.done} · ${r.title}` }); }
  for (const s of UP.daily(c.id, 60)) for (const inc of s.incidents) { out.push({ at: inc.start.slice(0, 10), k: 'bad', txt: `${t.ev.down} · ${s.url.replace(/^https?:\/\//, '')}` }); if (inc.end) out.push({ at: inc.end.slice(0, 10), k: 'ok', txt: `${t.ev.up} · ${s.url.replace(/^https?:\/\//, '')}` }); }
  out.push({ at: c.since, k: 'info', txt: t.ev.start });
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 7);
}

function secApercu(c, s, lang, ctx) {
  const t = E[lang]; const U = UP.summary(c.id, 30); const S = ST.summary(c.id, 30); const K = contractInfo(c);
  const dueIn = B.diffDays(B.today(), s.due);
  const dueTxt = dueIn === 0 ? t.k.today : dueIn > 0 ? `${t.k.in} ${dueIn} ${dueIn > 1 ? t.k.days : t.k.day}` : '';
  const used = hoursUsed(c); const allow = ALLOW[c.plan] || 1; const left = Math.max(0, allow - used);
  const acts = activity(c, lang);
  return `<section id="apercu" class="sec">
<div class="kpis">
 <div class="kpi"><span class="lab">${t.k.status}</span><b class="st s-${s.status}"><i></i>${esc(STATUS[s.status][lang])}</b><small>${t.k.paidUntil} ${fdate(c.paidUntil, lang)}</small></div>
 <div class="kpi"><span class="lab">${t.k.due}</span><b>${fdate(s.due, lang)}</b><small>${s.status === 'paused' ? '—' : dueTxt} · ${eur(c.amount, lang)}</small></div>
 <div class="kpi"><span class="lab">${t.k.visitors}</span><b>${S.hasData ? n0(S.visitors, lang) : '—'}</b><small>${S.hasData ? pctTag(S.deltaVisitors) || '&nbsp;' : t.k.noData}</small></div>
 <div class="kpi"><span class="lab">${t.k.uptime}</span><b>${U.hasData ? String(U.uptimePct).replace('.', ',') + ' %' : '—'}</b><small>${U.hasData ? (U.down ? `<span class="s-suspended">● ${t.site.offline}</span>` : `<span class="s-ok">● ${t.site.online}</span>`) : t.k.noData}</small></div>
</div>
<div class="g2">
 <div class="box">
  <div class="bh"><h3>${t.contract}</h3><span class="mono muted">DRT-${c.no}</span></div>
  <div class="prog"><div style="width:${K.started ? K.pct : 0}%"></div></div>
  <div class="row3"><div><span class="lab">${t.month}</span><b>${K.started ? K.month : 0} <i>${t.of} 12</i></b></div><div><span class="lab">${t.firmEnd}</span><b>${fdate(K.end, lang)}</b></div><div><span class="lab">${t.renew}</span><b>${fdate(K.notice, lang)}</b></div></div>
  <p class="hint">${K.daysLeft <= 75 ? t.renewSoon : t.renewLater}</p>
 </div>
 <div class="box">
  <div class="bh"><h3>${t.hours}</h3><a class="mono" href="#demandes" data-tab="demandes">${t.tabs.demandes} →</a></div>
  <div class="ring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" class="r0"/><circle cx="18" cy="18" r="15.5" class="r1" stroke-dasharray="${(Math.min(1, used / allow) * 97.4).toFixed(1)} 97.4"/></svg><div><b>${hours(used, lang)}</b><span>${t.hoursOf} ${hours(allow, lang)} · ${hours(left, lang)} ${t.hoursLeft}</span></div></div>
  <p class="hint">${t.hoursNote}</p>
 </div>
</div>
<div class="box"><div class="bh"><h3>${t.activity}</h3></div>${acts.length ? `<ol class="tl">${acts.map((a) => `<li class="${a.k}"><time>${fdate(a.at, lang)}</time><span>${esc(a.txt)}</span></li>`).join('')}</ol>` : `<p class="muted">${t.noActivity}</p>`}</div>
</section>`;
}

function secSite(c, lang) {
  const t = E[lang].site; const U = UP.summary(c.id, 30); const D = UP.daily(c.id, 30); const S = ST.summary(c.id, 30); const KP = ST.kpiSummary(c.id, 30); const R = RV.summary(c);
  const avail = U.hasData ? `<div class="sites">${D.map((x) => { const okDays = x.days.filter((d) => d[1] != null); const pct = okDays.length ? (okDays.reduce((a, d) => a + d[1], 0) / okDays.length * 100) : null;
    return `<div class="site"><div class="sh"><span class="dot ${x.down ? 'bad' : 'ok'}"></span><b>${esc(x.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</b><span class="muted mono">${pct != null ? pct.toFixed(2).replace('.', ',') + ' %' : '—'}${x.lastMs != null ? ' · ' + (x.lastMs / 1000).toFixed(2).replace('.', ',') + ' s' : ''}</span></div>
<div class="ub">${x.days.map(([k, v]) => `<i class="${v == null ? 'n' : v >= 0.999 ? 'g' : v >= 0.97 ? 'y' : 'r'}" title="${fdate(k, lang)} · ${v == null ? t.legendNone : (v * 100).toFixed(1) + ' %'}"></i>`).join('')}</div></div>`; }).join('')}</div>
<div class="leg"><span><i class="g"></i>${t.legendOk}</span><span><i class="y"></i>${t.legendMid}</span><span><i class="n"></i>${t.legendNone}</span></div>` : `<p class="empty">${t.noUp}</p>`;
  let aud;
  if (!S.hasData) aud = `<p class="empty">${t.noAud}</p>`;
  else {
    const DEV = { Mobile: lang === 'pt' ? 'Celular' : 'Mobile', Desktop: lang === 'pt' ? 'Computador' : 'Ordinateur', Tablet: 'Tablet' };
    const dn = donut(S.dev.slice(0, 4).map(([k, v]) => [DEV[k] || k, v]));
    aud = `<div class="kpis k3"><div class="kpi"><span class="lab">${t.visitors}</span><b>${n0(S.visitors, lang)}</b><small>${pctTag(S.deltaVisitors, t.vs) || '&nbsp;'}</small></div><div class="kpi"><span class="lab">${t.pv}</span><b>${n0(S.pv, lang)}</b><small>${t.peak} ${String(S.peakHour).padStart(2, '0')}h</small></div><div class="kpi"><span class="lab">${t.avg}</span><b>${Math.round(S.avgMs / 1000) >= 60 ? Math.floor(S.avgMs / 60000) + ' min ' + String(Math.round(S.avgMs / 1000) % 60).padStart(2, '0') : Math.round(S.avgMs / 1000) + ' s'}</b><small>${S.mobilePct} % ${t.mobile.toLowerCase()}</small></div></div>
<div class="box"><span class="lab">${t.visitors}</span>${areaChart(S.series.map((x) => [x[0], x[1]]), lang)}</div>
<div class="g3"><div class="box"><span class="lab">${t.sources}</span>${hbars(S.ref, lang, (k) => k === 'Direct' ? t.direct : k)}</div><div class="box"><span class="lab">${t.pages}</span>${hbars(S.pages, lang)}</div><div class="box"><span class="lab">${t.devices}</span><div class="dn">${dn.svg}<ul class="lg">${dn.legend}</ul></div></div></div>`;
  }
  let biz = '';
  if (KP) {
    const useOrders = !!(KP.orders || KP.revenue);
    biz = `<h2>${t.biz}</h2><div class="kpis ${useOrders && KP.bookings ? '' : 'k3'}">${useOrders ? `<div class="kpi"><span class="lab">${t.orders}</span><b>${n0(KP.orders, lang)}</b><small>${pctTag(KP.deltaOrders) || '&nbsp;'}</small></div><div class="kpi"><span class="lab">${t.revenue}</span><b>${eur(KP.revenue, lang)}</b><small>${pctTag(KP.deltaRevenue) || '&nbsp;'}</small></div><div class="kpi"><span class="lab">${t.ticket}</span><b>${eur(KP.avgTicket, lang)}</b><small>&nbsp;</small></div>` : ''}${KP.bookings ? `<div class="kpi"><span class="lab">${t.bookings}</span><b>${n0(KP.bookings, lang)}</b><small>${pctTag(KP.deltaBookings) || '&nbsp;'}</small></div>` : ''}</div>
<div class="box"><span class="lab">${useOrders ? t.orders : t.bookings} ${t.perDay}</span>${barChart(KP.series.map((x) => useOrders ? x[1] : x[3]), KP.series.map((x) => x[0]), lang)}</div>`;
  }
  const rv = R ? `<h2>${t.reviews}</h2><div class="box rv"><div class="rvh"><b class="big">${R.rating.toFixed(1).replace('.', ',')}</b><span class="stars" style="--p:${(R.rating / 5 * 100).toFixed(0)}%">★★★★★</span><span class="muted">${n0(R.count, lang)} ${t.reviewsCount}${R.newCount ? ` · <span class="s-ok">+${R.newCount} ${t.reviewsNew}</span>` : ''}</span></div>
<p class="muted">${t.askTxt}</p><div class="cp"><input readonly value="${esc(R.writeUrl)}"><button type="button" class="btn sm" data-copy="${esc(R.writeUrl)}" data-done="${t.copied}">${t.copy}</button><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent((lang === 'fr' ? 'Merci pour votre visite ! Un petit avis nous aide beaucoup : ' : 'Obrigado pela visita! Uma avaliação nos ajuda muito: ') + R.writeUrl)}">${t.ask}</a></div></div>` : '';
  return `<section id="site" class="sec"><h2>${t.avail}</h2><p class="sub">${t.availSub}</p><div class="box">${avail}</div><h2>${t.audience}</h2><p class="sub">${t.audSub}</p>${aud}${biz}${rv}</section>`;
}

function secPaiements(c, s, lang, ctx) {
  const t = E[lang].pay; const set = store.db.settings; const pays = store.db.payments.filter((p) => p.clientId === c.id).sort((a, b) => (b.date + b.at).localeCompare(a.date + a.at));
  const comm = ctx.ogm(c, s.due); const paused = s.status === 'paused';
  const cpy = (v) => `<button type="button" class="cpy" data-copy="${esc(v)}" data-done="✓" aria-label="copy">⧉</button>`;
  return `<section id="paiements" class="sec">
${paused ? `<div class="note">${t.paused}</div>` : ''}
<div class="g2">
 <div class="box hl"><span class="lab">${t.next}</span><b class="huge">${eur(c.amount, lang)}</b><p class="muted" style="margin:4px 0 0">${t.dueDate} · <b style="color:var(--text)">${fdate(s.due, lang, 1)}</b></p>
 ${c.stripeLink && !paused ? `<a class="btn pri" style="margin-top:18px" href="${esc(c.stripeLink + (c.stripeLink.includes('?') ? '&' : '?') + 'client_reference_id=' + c.id + (c.email ? '&prefilled_email=' + encodeURIComponent(c.email) : ''))}" rel="noopener">${t.online}</a><p class="muted sm">${t.onlineTxt}</p>` : ''}</div>
 <div class="box"><span class="lab">${t.transfer}</span><dl class="bank"><dt>${t.ben}</dt><dd>${esc(set.beneficiary)}</dd><dt>IBAN</dt><dd class="mono">${esc(set.iban)} ${cpy(set.iban.replace(/\s/g, ''))}</dd>${set.bic ? `<dt>BIC</dt><dd class="mono">${esc(set.bic)}</dd>` : ''}<dt>${t.amount}</dt><dd>${eur(c.amount, lang)}</dd><dt>${t.comm}</dt><dd class="mono strong">${esc(comm)} ${cpy(comm)}</dd></dl><p class="muted sm">${t.commTxt}</p></div>
</div>
<div class="box offer"><div><span class="lab">${t.annual}</span><p style="margin:6px 0 0">${t.annualTxt}</p></div><div class="ofr"><b>${eur(c.amount * 10, lang)}</b><span>${t.save} ${eur(c.amount * 2, lang)}</span>${c.stripeLinkYear ? `<a class="btn sm pri" href="${esc(c.stripeLinkYear + (c.stripeLinkYear.includes('?') ? '&' : '?') + 'client_reference_id=' + c.id)}" rel="noopener">→</a>` : ''}</div></div>
<h2>${t.hist}</h2>${pays.length ? `<div class="box tight"><table class="tb"><thead><tr><th>${t.date}</th><th>${t.period}</th><th>${t.amount}</th><th></th></tr></thead><tbody>${pays.map((p) => `<tr><td>${fdate(p.date, lang)}<small>${esc((t.method[p.method] || p.method || ''))}</small></td><td>${fdate(p.from, lang)} → ${fdate(p.to, lang)}</td><td class="num">${eur(p.amount, lang)}</td><td class="r"><a class="btn sm" href="/espace/facture/${p.id}?lang=${lang}" target="_blank">${ico('dl', 'i sm')} ${t.invoice}</a></td></tr>`).join('')}</tbody></table></div>` : `<p class="empty">${t.none}</p>`}
</section>`;
}

function secContrat(c, lang, ctx) {
  const t = E[lang].ct; const K = contractInfo(c);
  return `<section id="contrat" class="sec">
<div class="box"><div class="facts">
<div><span class="lab">${t.no}</span><b class="mono">DRT-${c.no}</b></div><div><span class="lab">${t.plan}</span><b>${esc(PLAN[c.plan] ? PLAN[c.plan][lang] : c.plan)} · ${eur(c.amount, lang)}</b></div><div><span class="lab">${t.start}</span><b>${fdate(K.start, lang)}</b></div><div><span class="lab">${t.firm}</span><b>${t.firmV}</b></div><div><span class="lab">${t.end}</span><b>${fdate(K.end, lang)}</b></div><div><span class="lab">${t.grace}</span><b>${t.graceV}</b></div>
</div>${ctx.hasPdf ? `<a class="btn" style="margin-top:18px" href="/espace/contrat.pdf" target="_blank">${ico('dl', 'i sm')} ${t.download}</a>` : ctx.contractUrl ? `<a class="btn" style="margin-top:18px" href="${esc(ctx.contractUrl)}" target="_blank" rel="noopener">${ico('dl', 'i sm')} ${t.download}</a>` : ''}</div>
<div class="g2"><div class="box"><span class="lab">${t.included}</span><ul class="chk">${(INCL[c.plan] || INCL.site)[lang].map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p class="hint">${t.owner}</p></div>
<div class="box"><span class="lab">${t.delays}</span><dl class="dly"><dt>${t.d1}</dt><dd>${t.d1v}</dd><dt>${t.d2}</dt><dd>${t.d2v}</dd><dt>${t.d3}</dt><dd>${t.d3v}</dd></dl></div></div>
<h2>${t.renewal} · ${fdate(K.end, lang)}</h2><div class="g2"><div class="box opt a"><span class="lab">${t.optA}</span><p>${t.optAt}</p></div><div class="box opt"><span class="lab">${t.optB}</span><p>${t.optBt}</p></div></div>
</section>`;
}

function secDemandes(c, lang, ctx) {
  const t = E[lang].rq; const rq = store.db.requests.filter((r) => r.clientId === c.id).sort((a, b) => b.at.localeCompare(a.at));
  return `<section id="demandes" class="sec"><p class="sub">${t.sub}</p>
${ctx.flash === 'rq' ? `<div class="note ok">${t.sent}</div>` : ''}
<div class="g2 rq"><form class="box f" method="post" action="/espace/demande?lang=${lang}"><span class="lab">${t.new}</span>
<label>${t.subject}<input name="title" required maxlength="120" placeholder="${t.subjectP}"></label>
<label>${t.details}<textarea name="text" rows="5" maxlength="4000" placeholder="${t.detailsP}"></textarea></label>
<label>${t.urgency}<select name="urgency"><option value="normal">${t.normal}</option><option value="urgent">${t.urgent}</option></select></label>
<button class="btn pri">${t.send}</button></form>
<div class="box"><span class="lab">${t.list}</span>${rq.length ? `<ul class="rql">${rq.map((r) => `<li><div class="rqh"><b>${esc(r.title)}</b><span class="pill ${r.status}">${t.st[r.status] || r.status}</span></div><small class="muted">${fdate(r.at.slice(0, 10), lang)}${r.urgency === 'urgent' ? ' · <span class="s-grace">' + t.urgent.split(' (')[0] + '</span>' : ''}${r.hours ? ' · ' + t.time + ' ' + hours(r.hours, lang) : ''}</small>${r.reply ? `<p class="rep"><span class="lab">${t.reply}</span>${esc(r.reply)}</p>` : ''}</li>`).join('')}</ul>` : `<p class="empty">${t.none}</p>`}</div></div></section>`;
}

const RF = {
  fr: { h: '1 mois offert pour chaque commerce que vous recommandez', p: 'Vous connaissez un commerce qui a besoin d’un site, d’une boutique ou d’un système de réservation ? Envoyez-lui votre lien. Dès qu’il signe son contrat avec DRT Creation, votre prochain mois est offert, automatiquement.', link: 'Votre lien personnel', copy: 'Copier', copied: 'Copié ✓', share: 'Envoyer par WhatsApp', s1: 'Vous partagez votre lien', s1t: 'Par WhatsApp, Instagram ou de vive voix.', s2: 'Il remplit le briefing', s2t: '10 minutes, depuis son téléphone. Nous voyons qu’il vient de votre part.', s3: 'Il signe : 1 mois offert', s3t: 'Votre échéance avance d’un mois, sans rien faire.', list: 'Vos recommandations', none: 'Pas encore de recommandation. Le premier mois offert est à un message de distance.', earned: 'mois offert(s) jusqu’ici', st: { briefing: 'Briefing reçu', proposal: 'Proposition envoyée', accepted: 'Proposition acceptée', signed: 'Signé · 1 mois offert ✓' }, msg: 'Salut ! Je travaille avec DRT Creation pour mon site et je suis très content. Si tu veux un site ou une réservation en ligne pour ton commerce, voici le lien (questionnaire de 10 minutes) : ' },
  pt: { h: '1 mês grátis para cada negócio que você indicar', p: 'Conhece um negócio que precisa de site, loja online ou sistema de reservas? Mande o seu link. Assim que ele assinar o contrato com a DRT Creation, o seu próximo mês fica grátis, automaticamente.', link: 'Seu link pessoal', copy: 'Copiar', copied: 'Copiado ✓', share: 'Mandar por WhatsApp', s1: 'Você compartilha o link', s1t: 'Pelo WhatsApp, Instagram ou pessoalmente.', s2: 'Ele preenche o briefing', s2t: '10 minutos, pelo celular. A gente vê que ele veio por você.', s3: 'Ele assina: 1 mês grátis', s3t: 'O seu vencimento avança um mês, sem você fazer nada.', list: 'Suas indicações', none: 'Nenhuma indicação ainda. O primeiro mês grátis está a uma mensagem de distância.', earned: 'mês(es) grátis até agora', st: { briefing: 'Briefing recebido', proposal: 'Proposta enviada', accepted: 'Proposta aceita', signed: 'Assinou · 1 mês grátis ✓' }, msg: 'Oi! Eu trabalho com a DRT Creation no meu site e estou muito satisfeito. Se você quiser um site ou agendamento online para o seu negócio, aqui está o link (questionário de 10 minutos): ' },
};
function secParrainage(c, lang, ctx) {
  const t = RF[lang] || RF.fr; const r = ctx.referral || { url: '', list: [], months: 0 };
  return `<section id="parrainage" class="sec"><div class="box" style="border-color:color-mix(in srgb,var(--cc) 55%,transparent)"><span class="lab">${esc(t.link)}</span><h3 style="margin:8px 0 6px;font-size:20px">${esc(t.h)}</h3><p class="muted">${esc(t.p)}</p>
<div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><input readonly value="${esc(r.url)}" onclick="this.select()" style="flex:1;min-width:220px;font:13px var(--mono);padding:11px;background:var(--bg);color:var(--text);border:1px solid var(--line-2)"><button type="button" class="btn sm" onclick="navigator.clipboard.writeText(${esc(JSON.stringify(r.url))});this.textContent=${esc(JSON.stringify(t.copied))}">${esc(t.copy)}</button><a class="btn sm pri" href="https://wa.me/?text=${encodeURIComponent(t.msg + r.url)}" target="_blank" rel="noopener">${ico('wa', 'i sm')} ${esc(t.share)}</a></div></div>
<div class="g3" style="margin-top:14px">${[[t.s1, t.s1t], [t.s2, t.s2t], [t.s3, t.s3t]].map(([h, p], i) => `<div class="box aid"><b class="n">0${i + 1}</b><h3>${esc(h)}</h3><p class="muted">${esc(p)}</p></div>`).join('')}</div>
<h2>${esc(t.list)}${r.months ? ` · <span style="color:var(--ok)">${r.months} ${esc(t.earned)}</span>` : ''}</h2>
${r.list.length ? `<div class="box"><table><tbody>${r.list.map((x) => `<tr><td><b>${esc(x.company)}</b></td><td class="mono muted">${esc(fdate(x.at.slice(0, 10), lang))}</td><td style="text-align:right"><span class="${x.status === 'signed' ? 's-ok' : 's-soon'}">${esc(t.st[x.status])}</span></td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${esc(t.none)}</p>`}</section>`;
}

function secAides(c, lang, ctx) {
  const t = E[lang].aides; const wa = ctx.waUrl ? ctx.waUrl(lang === 'fr' ? 'Bonjour, j’ai un nouveau projet et je voudrais en savoir plus sur la prime digitalisation.' : 'Olá, tenho um projeto novo e queria saber mais sobre a prime digitalisation.') : '';
  return `<section id="aides" class="sec"><p class="sub">${t.sub}</p><div class="g3">${[[t.a1, t.a1n, t.a1t], [t.a2, t.a2n, t.a2t], [t.a3, t.a3n, t.a3t]].map(([h, n, p]) => `<div class="box aid"><b class="n">${n}</b><h3>${h}</h3><p class="muted">${p}</p></div>`).join('')}</div>
<div class="cta"><p>${t.cta}</p>${wa ? `<a class="btn" href="${esc(wa)}" target="_blank" rel="noopener">${ico('wa', 'i sm')} ${t.ctaBtn}</a>` : ''}</div><p class="muted sm">${t.note}</p></section>`;
}

function secCompte(c, lang, ctx) {
  const t = E[lang].acc; const set = store.db.settings;
  return `<section id="compte" class="sec">
${ctx.flash === 'pw' ? `<div class="note ok">${t.ok}</div>` : ctx.flash === 'pwbad' ? `<div class="note bad">${t.bad}</div>` : ctx.flash === 'pwshort' ? `<div class="note bad">${t.short}</div>` : ''}
<div class="g2"><form class="box f" method="post" action="/espace/password?lang=${lang}"><span class="lab">${t.pw}</span><p class="muted sm" style="margin:0">${t.login} · <b class="mono" style="color:var(--text)">DRT-${c.no}</b>${c.email ? ' · ' + esc(c.email) : ''}</p>
<label>${t.cur}<input type="password" name="current" required autocomplete="current-password"></label><label>${t.nw}<input type="password" name="next" required minlength="8" autocomplete="new-password" placeholder="${t.nwP}"></label><button class="btn">${t.save}</button></form>
<div class="box"><span class="lab">${t.contact}</span><div class="who2"><span class="av2">${logo('#07141a')}</span><div><b>DRT Creation</b><small class="muted">Matheus Duarte · BCE 1045.012.177</small></div></div>
<ul class="ct">${set.whatsapp ? `<li>${ico('wa', 'i sm')}<a href="https://wa.me/${set.whatsapp.replace(/\D/g, '')}" target="_blank" rel="noopener">${esc(set.whatsapp)}</a></li>` : ''}${set.email ? `<li>${ico('mail', 'i sm')}<a href="mailto:${esc(set.email)}">${esc(set.email)}</a></li>` : ''}</ul><p class="hint">${t.privacy}</p></div></div></section>`;
}

// ---------- página ----------
const CSS = `
:root{--cc:#1d44d6;--r:14px}
body{background:radial-gradient(1200px 500px at 85% -10%,color-mix(in srgb,var(--cc) 22%,transparent),transparent 60%),var(--bg)}
.wrap{max-width:1240px}
.top .wrap{height:62px}.top .who{display:flex;align-items:center;gap:14px}.top .lang a,.top .lang b{font:600 11px/1 var(--mono);letter-spacing:.1em;padding:6px;text-decoration:none;color:var(--text-2)}.top .lang b{color:var(--text)}
.top .out{font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--text-2);text-decoration:none;border:1px solid var(--line-2);padding:9px 11px;border-radius:999px}.top .out:hover{color:var(--text);border-color:var(--text)}
.shell{display:grid;grid-template-columns:230px minmax(0,1fr);gap:36px;margin-top:28px}
.side{position:sticky;top:86px;align-self:start;display:grid;gap:4px}
.side a{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;color:var(--text-2);text-decoration:none;font-weight:600;font-size:14px;transition:background .2s,color .2s}
.side a:hover{background:rgba(228,232,234,.05);color:var(--text)}.side a[aria-current]{background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--text)}
.side a[aria-current] .i{color:var(--accent)}.side .badge{margin-left:auto;font:700 10px/1 var(--mono);background:var(--accent);color:#07141a;padding:4px 6px;border-radius:999px}
.side .help{margin-top:22px;padding:16px;border:1px solid var(--line);border-radius:var(--r);background:var(--panel)}.side .help b{display:block;margin-bottom:4px}.side .help small{display:block;color:var(--text-2);margin-bottom:12px}
.i{width:18px;height:18px;flex:none}.i.sm{width:15px;height:15px}
.hero{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:32px;align-items:center;padding:28px 0 8px}
.hero h1{font:800 clamp(28px,4.2vw,46px)/1.02 var(--disp);letter-spacing:-.035em;margin:10px 0 12px}
.hero .lead{font-size:17px;color:var(--text-2);max-width:36rem;margin:0}.hero .lead b{color:var(--text)}
.eyebrow{display:inline-flex;align-items:center;gap:10px;font:600 11px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--text-2)}
.eyebrow .st{display:inline-flex;align-items:center;gap:7px;padding:6px 9px;border-radius:999px;border:1px solid currentColor}.eyebrow .st i{width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 10px currentColor}
.alert{margin:18px 0 0;padding:14px 16px;border-radius:var(--r);border:1px solid;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}.alert.grace{border-color:rgba(255,145,66,.5);background:rgba(255,145,66,.08)}.alert.suspended{border-color:rgba(255,84,104,.5);background:rgba(255,84,104,.08)}
.tabs{display:none}
.sec{display:block;animation:fade .35s ease}.js .sec{display:none}.js .sec.on{display:block}
@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.sec>h2:first-child{margin-top:0}.sec h2{font:700 20px/1.2 var(--body);margin:34px 0 6px}.sec .sub{margin:0 0 16px}
.sectitle{font:800 26px/1.1 var(--disp);letter-spacing:-.025em;margin:0 0 18px;display:flex;align-items:center;gap:12px}.sectitle[hidden]{display:none}.sectitle .i{width:24px;height:24px;color:var(--accent)}
.box{background:linear-gradient(180deg,rgba(228,232,234,.025),transparent),var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:20px}.box.tight{padding:6px 14px}
.box+.box,.g2+.box,.box+.g2,.g3+.box,.box+.g3,.kpis+.box,.kpis+.g2,.g2+.g2{margin-top:16px}
.box h3{font:700 16px/1.2 var(--body);margin:0}.bh{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:14px}.bh a{font-size:11px;text-decoration:none}
.g2{display:grid;gap:16px;grid-template-columns:repeat(2,minmax(0,1fr))}.g3{display:grid;gap:16px;grid-template-columns:repeat(3,minmax(0,1fr))}
.kpis{display:grid;gap:14px;grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:16px}.kpis.k3{grid-template-columns:repeat(3,minmax(0,1fr))}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:16px 18px;display:grid;gap:8px;align-content:start;min-width:0}
.kpi b{font:800 clamp(22px,2.4vw,30px)/1.05 var(--disp);letter-spacing:-.03em;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kpi small{font-size:12.5px;color:var(--text-2);min-height:1.2em}
.kpi .st{display:inline-flex;align-items:center;gap:9px;font-size:clamp(18px,1.8vw,22px)}.kpi .st i{width:9px;height:9px;border-radius:50%;background:currentColor;box-shadow:0 0 12px currentColor}
.dl{font:600 11.5px/1 var(--mono)}.dl.up{color:var(--ok)}.dl.dn{color:var(--grace)}.dl i{font-style:normal;color:var(--text-2);font-family:var(--body)}
.prog{height:8px;border-radius:999px;background:rgba(228,232,234,.08);overflow:hidden}.prog div{height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--accent-deep),var(--accent))}
.row3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px}.row3 b{display:block;margin-top:6px;font-size:15px}.row3 i{font-style:normal;color:var(--text-2);font-weight:500}
.hint{margin:14px 0 0;font-size:13px;color:var(--text-2);padding-top:12px;border-top:1px dashed var(--line)}
.ring{display:flex;align-items:center;gap:18px}.ring svg{width:92px;height:92px;transform:rotate(-90deg)}.ring circle{fill:none;stroke-width:3.4}.ring .r0{stroke:rgba(228,232,234,.1)}.ring .r1{stroke:var(--accent);stroke-linecap:round}
.ring b{display:block;font:800 26px/1 var(--disp);letter-spacing:-.02em}.ring span{display:block;color:var(--text-2);font-size:13px;margin-top:6px}
.tl{list-style:none;margin:0;padding:0;display:grid}.tl li{display:grid;grid-template-columns:110px 1fr;gap:14px;padding:10px 0 10px 18px;border-left:1px solid var(--line);position:relative;font-size:14px}
.tl li::before{content:"";position:absolute;left:-5px;top:15px;width:9px;height:9px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 3px var(--panel)}.tl li.ok::before{background:var(--ok)}.tl li.bad::before{background:var(--bad)}
.tl time{font:500 12px/1.6 var(--mono);color:var(--text-2)}
.sites{display:grid;gap:18px}.sh{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}.sh b{font-size:14px}.sh .muted{margin-left:auto;font-size:12px}
.dot{width:9px;height:9px;border-radius:50%}.dot.ok{background:var(--ok);box-shadow:0 0 10px var(--ok)}.dot.bad{background:var(--bad);box-shadow:0 0 10px var(--bad)}
.ub{display:grid;grid-template-columns:repeat(30,1fr);gap:3px}.ub i,.leg i{display:block;height:30px;border-radius:3px;background:rgba(228,232,234,.1)}.ub i.g,.leg i.g{background:#3ddc84}.ub i.y,.leg i.y{background:#ffcf4a}.ub i.r{background:#ff5468}
.leg{display:flex;gap:18px;margin-top:14px;font-size:12px;color:var(--text-2)}.leg span{display:inline-flex;align-items:center;gap:7px}.leg i{width:10px;height:10px}
.chart{display:block;width:100%;height:180px;margin-top:12px;overflow:visible}.chart .gl{stroke:rgba(228,232,234,.08)}.chart .gt{fill:var(--text-2);font:500 10.5px var(--mono)}.chart .b0{fill:color-mix(in srgb,var(--accent) 45%,transparent)}.chart .b1{fill:var(--accent)}
.hb{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:9px}.hb li{position:relative;display:flex;justify-content:space-between;gap:10px;padding:7px 10px;font-size:13.5px;z-index:0;overflow:hidden;border-radius:6px}.hb li i{position:absolute;inset:0 auto 0 0;background:color-mix(in srgb,var(--accent) 16%,transparent);z-index:-1;border-radius:6px}.hb span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hb b{font-variant-numeric:tabular-nums}
.dn{display:flex;align-items:center;gap:18px;margin-top:12px}.donut{width:110px;height:110px;flex:none}.lg{list-style:none;margin:0;padding:0;display:grid;gap:8px;font-size:13.5px;flex:1}.lg li{display:flex;align-items:center;gap:8px}.lg i{width:9px;height:9px;border-radius:2px}.lg b{margin-left:auto}
.rvh{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:10px}.rvh .big{font:800 46px/1 var(--disp);letter-spacing:-.03em}
.stars{font-size:22px;letter-spacing:3px;background:linear-gradient(90deg,#ffcf4a var(--p),rgba(228,232,234,.2) var(--p));-webkit-background-clip:text;background-clip:text;color:transparent}
.cp{display:flex;gap:8px;flex-wrap:wrap}.cp input{flex:1;min-width:200px;font:12.5px var(--mono);padding:10px;background:var(--bg);color:var(--text);border:1px solid var(--line-2);border-radius:8px}
.btn{border-radius:10px}.btn.sm{border-radius:8px}
.hl{background:radial-gradient(120% 120% at 100% 0%,color-mix(in srgb,var(--cc) 28%,transparent),transparent 60%),var(--panel)}.huge{display:block;font:800 clamp(36px,5vw,54px)/1 var(--disp);letter-spacing:-.04em;margin:12px 0 6px}
.bank{display:grid;grid-template-columns:auto 1fr;gap:10px 18px;margin:14px 0 0;font-size:14px}.bank dt{color:var(--text-2)}.bank dd{margin:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.bank .strong{font-size:15px;color:var(--text)}
.cpy{border:1px solid var(--line-2);background:transparent;color:var(--text-2);border-radius:6px;font-size:13px;line-height:1;padding:5px 7px;cursor:pointer}.cpy:hover{color:var(--accent);border-color:var(--accent)}
.sm{font-size:12.5px}.muted.sm{margin:12px 0 0}
.offer{display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap;border-color:rgba(127,160,255,.35)}.ofr{display:flex;align-items:center;gap:14px}.ofr b{font:800 26px/1 var(--disp)}.ofr span{font:600 11px/1 var(--mono);color:var(--ok);border:1px solid rgba(61,220,132,.4);padding:6px 8px;border-radius:999px}
.tb{width:100%}.tb th,.tb td{padding:13px 8px}.tb td small{display:block;color:var(--text-2);font-size:12px}.tb .num{font-variant-numeric:tabular-nums;font-weight:700}.tb .r{text-align:right}
.facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.facts b{display:block;margin-top:7px;font-size:15px}
.chk{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:9px;font-size:14px}.chk li{display:flex;gap:10px}.chk li::before{content:"✓";color:var(--ok);font-weight:700}
.dly{margin:12px 0 0;display:grid;gap:4px}.dly dt{font-weight:600;font-size:14px;margin-top:10px}.dly dd{margin:0;color:var(--text-2);font:500 12.5px/1.5 var(--mono)}
.opt p{margin:8px 0 0;color:var(--text-2);font-size:14px}.opt.a{border-color:rgba(127,160,255,.45);background:radial-gradient(120% 120% at 0% 0%,rgba(29,68,214,.25),transparent 60%),var(--panel)}
.f{display:grid;gap:12px}.f label{display:grid;gap:6px;font-weight:600;font-size:13px}.f input,.f textarea,.f select{width:100%;font:15px var(--body);padding:11px 12px;background:var(--bg);color:var(--text);border:1px solid var(--line-2);border-radius:10px}.f input:focus,.f textarea:focus,.f select:focus{border-color:var(--accent);outline:0}
.rql{list-style:none;margin:12px 0 0;padding:0;display:grid}.rql li{padding:12px 0;border-top:1px solid var(--line)}.rql li:first-child{border-top:0}.rqh{display:flex;justify-content:space-between;gap:10px;align-items:center}.rep{margin:8px 0 0;padding:10px 12px;border-radius:8px;background:rgba(127,160,255,.07);font-size:14px}.rep .lab{display:block;margin-bottom:5px}
.pill{font:700 10px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;padding:6px 8px;border-radius:999px;border:1px solid currentColor;white-space:nowrap}.pill.new{color:var(--accent)}.pill.doing{color:var(--soon)}.pill.done{color:var(--ok)}
.aid .n{display:block;font:800 40px/1 var(--disp);letter-spacing:-.04em;color:var(--accent);margin-bottom:12px}.aid h3{margin-bottom:8px}.aid p{margin:0;font-size:14px}
.cta{margin-top:16px;padding:20px;border-radius:var(--r);background:var(--accent);color:#07141a;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}.cta p{margin:0;font-weight:600;max-width:38rem}.cta .btn{background:#07141a;color:var(--text);border-color:#07141a}
.who2{display:flex;align-items:center;gap:12px;margin-top:14px}.who2 small{display:block}.av2{width:42px;height:42px;border-radius:10px;background:var(--accent);display:grid;place-items:center}.av2 svg{width:26px}
.ct{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:10px}.ct li{display:flex;align-items:center;gap:10px}
.note{padding:12px 14px;border-radius:10px;border:1px solid var(--line-2);margin-bottom:16px;font-size:14px}.note.ok{border-color:rgba(61,220,132,.5);background:rgba(61,220,132,.07)}.note.bad{border-color:rgba(255,84,104,.5);background:rgba(255,84,104,.07)}
.empty{margin:0;color:var(--text-2);font-size:14px;padding:18px;border:1px dashed var(--line-2);border-radius:10px;text-align:center}
.foot{margin-top:56px;padding-top:18px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font:500 11px/1.6 var(--mono);color:var(--text-2)}
@media (max-width:1020px){.shell{grid-template-columns:1fr;gap:0}.side{display:none}.tabs{display:flex;gap:6px;overflow-x:auto;position:sticky;top:62px;z-index:4;background:rgba(7,20,26,.92);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);margin:0 calc(-1 * max(16px,env(safe-area-inset-left)));padding:10px max(16px,env(safe-area-inset-left));border-bottom:1px solid var(--line);scrollbar-width:none}.tabs::-webkit-scrollbar{display:none}
.tabs a{flex:none;display:inline-flex;align-items:center;gap:7px;padding:9px 12px;border-radius:999px;border:1px solid var(--line);color:var(--text-2);text-decoration:none;font-weight:600;font-size:13px}.tabs a[aria-current]{background:var(--accent);border-color:var(--accent);color:#07141a}
.hero{grid-template-columns:1fr;gap:22px;padding-bottom:30px}.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.content{margin-top:20px}}
@media (max-width:720px){.g2,.g3,.kpis.k3,.facts,.row3{grid-template-columns:1fr}.tl li{grid-template-columns:1fr;gap:2px}.bank{grid-template-columns:1fr;gap:4px}.bank dd{margin-bottom:8px}.tb thead{display:none}.tb tr{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:10px 0;border-bottom:1px solid var(--line)}.tb td{border:0;padding:2px 0}.tb .r{grid-column:2;grid-row:1 / span 2;align-self:center}}
@media (max-width:420px){.kpis{grid-template-columns:1fr}}
`;

const SCRIPT = `(function(){var d=document;d.documentElement.classList.add('js');var ids=['apercu','site','paiements','contrat','demandes','aides','parrainage','compte'];
function show(id,push){if(ids.indexOf(id)<0)id='apercu';ids.forEach(function(x){var s=d.getElementById(x);if(s)s.classList.toggle('on',x===id)});
d.querySelectorAll('[data-tab]').forEach(function(a){if(a.closest('.side,.tabs')){if(a.dataset.tab===id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')}});
var h=d.getElementById('st-'+id);d.querySelectorAll('.sectitle').forEach(function(x){x.hidden=x!==h});if(push)history.replaceState(null,'','#'+id);var t=d.querySelector('.tabs [aria-current]');if(t&&t.scrollIntoView)t.scrollIntoView({inline:'center',block:'nearest'})}
d.addEventListener('click',function(e){var a=e.target.closest('[data-tab]');if(a){e.preventDefault();show(a.dataset.tab,true);var c=d.querySelector('.content');if(c&&window.scrollY>c.offsetTop)window.scrollTo({top:c.offsetTop-90,behavior:'smooth'})}
var b=e.target.closest('[data-copy]');if(b&&navigator.clipboard){navigator.clipboard.writeText(b.dataset.copy).then(function(){var o=b.textContent;b.textContent=b.dataset.done||'✓';setTimeout(function(){b.textContent=o},1400)})}});
show((location.hash||'#apercu').slice(1),false);window.addEventListener('hashchange',function(){show(location.hash.slice(1),false)})})();`;

function render(c, lang, ctx) {
  const t = E[lang] || E.fr; lang = E[lang] ? lang : 'fr';
  const s = ctx.status; const hour = Number(new Date().toLocaleString('en-GB', { timeZone: B.TZ, hour: '2-digit', hour12: false }));
  const greet = (hour >= 18 || hour < 5 ? t.evening : t.morning) + (c.contactName ? ', ' + esc(c.contactName) : '') + (lang === 'fr' ? ' !' : '!');
  const openRq = store.db.requests.filter((r) => r.clientId === c.id && r.status !== 'done').length;
  const nav = Object.entries(t.tabs).map(([k, v]) => `<a href="#${k}" data-tab="${k}">${ico(k)}<span>${v}</span>${k === 'demandes' && openRq ? `<em class="badge">${openRq}</em>` : ''}</a>`).join('');
  const other = lang === 'fr' ? 'pt' : 'fr';
  const lead = s.status === 'grace' ? `${t.lead.grace} <b>${fdate(s.suspendOn, lang, 1)}</b>.` : t.lead[s.status];
  const alert = s.status === 'grace' || s.status === 'suspended' ? `<div class="alert ${s.status}"><span>${lead}</span><a class="btn sm pri" href="#paiements" data-tab="paiements">${t.tabs.paiements} →</a></div>` : '';
  const titles = Object.entries(t.tabs).map(([k, v]) => `<h2 class="sectitle" id="st-${k}"${k === 'apercu' ? '' : ' hidden'}>${ico(k)}${v}</h2>`).join('');
  const body = `<header class="top"><div class="wrap"><a class="brand" href="https://www.drtcreation.com/"><i>${logo('#07141a')}</i>DRT Creation</a><div class="who"><span class="lang"><b>${lang.toUpperCase()}</b><a href="?lang=${other}${ctx.hash || ''}">${other.toUpperCase()}</a></span><a class="out" href="/logout?lang=${lang}">${t.out}</a></div></div></header>
<main class="wrap" style="--cc:${esc(BC.theme(c).glow || c.color || '#1d44d6')}">
<div class="hero"><div><span class="eyebrow">${t.title} · DRT-${c.no} <span class="st s-${s.status}"><i></i>${esc(STATUS[s.status][lang])}</span></span><h1>${greet}</h1><p class="lead">${lead}</p>${alert}</div>${BC.brandCard(c, s, lang, { validUntil: contractInfo(c).end, support: store.db.settings.whatsapp })}</div>
<nav class="tabs" aria-label="${t.title}">${nav}</nav>
<div class="shell"><aside class="side" aria-label="${t.title}">${nav}<div class="help"><b>${t.help}</b><small>${t.resp}</small>${ctx.waUrl ? `<a class="btn sm pri" style="width:100%" href="${esc(ctx.waUrl(lang === 'fr' ? 'Bonjour DRT Creation, ' : 'Olá DRT Creation, '))}" target="_blank" rel="noopener">${ico('wa', 'i sm')} ${t.wa}</a>` : ''}</div></aside>
<div class="content">${titles}
${secApercu(c, s, lang, ctx)}${secSite(c, lang)}${secPaiements(c, s, lang, ctx)}${secContrat(c, lang, ctx)}${secDemandes(c, lang, ctx)}${secAides(c, lang, ctx)}${secParrainage(c, lang, ctx)}${secCompte(c, lang, ctx)}
<footer class="foot"><span>${esc(memberNo(c))} · ${esc(c.name)}</span><span>DRT Creation · Rue de la Filature 25, 1070 Anderlecht · BCE 1045.012.177</span></footer></div></div></main>
<script>${SCRIPT}</script>`;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex, nofollow"><title>${t.title} · ${esc(c.name)}</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><meta name="theme-color" content="#07141a"><style>${BASE}${CSS}${BC.CSS}</style></head><body>${body}</body></html>`;
}

// ---------- fatura (página imprimível) ----------
function invoiceNo(p) {
  if (p.invoice) return p.invoice;
  const y = (p.date || B.today()).slice(0, 4); const seq = (store.db.invoiceSeq[y] || 0) + 1; store.db.invoiceSeq[y] = seq;
  p.invoice = 'F' + y + '-' + String(seq).padStart(4, '0'); store.save(); return p.invoice;
}
function invoice(c, p, lang) {
  lang = lang === 'pt' ? 'pt' : 'fr'; const fr = lang === 'fr'; const set = store.db.settings; const no = invoiceNo(p);
  const L = fr ? { inv: 'Facture', date: 'Date', client: 'Client', desc: 'Description', period: 'Période', qty: 'Mois', total: 'Total', vat: 'TVA non applicable — régime de la franchise, art. 56bis CTVA', paid: 'Payée le', ref: 'Référence', line: 'Maintenance et hébergement', contract: 'Contrat', print: 'Imprimer / PDF' }
    : { inv: 'Fatura', date: 'Data', client: 'Cliente', desc: 'Descrição', period: 'Período', qty: 'Meses', total: 'Total', vat: 'TVA non applicable — régime de la franchise, art. 56bis CTVA', paid: 'Paga em', ref: 'Referência', line: 'Manutenção e hospedagem', contract: 'Contrato', print: 'Imprimir / PDF' };
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${L.inv} ${no} · DRT Creation</title>
<style>@font-face{font-family:"Archivo";src:url(/fonts/archivo.woff2) format("woff2");font-weight:100 900}@font-face{font-family:"Instrument Sans";src:url(/fonts/instrument-sans.woff2) format("woff2");font-weight:400 700}@font-face{font-family:"JetBrains Mono";src:url(/fonts/jetbrains-mono.woff2) format("woff2");font-weight:100 800}
@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;background:#e9ecee;color:#07141a;font:14px/1.5 "Instrument Sans",Arial,sans-serif}
.pg{max-width:210mm;margin:24px auto;background:#fff;padding:18mm 16mm;box-shadow:0 10px 40px rgba(0,0,0,.12)}
.hd{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding-bottom:18px;border-bottom:2px solid #07141a}.lg{display:flex;align-items:center;gap:10px}.lg i{width:40px;height:40px;background:#07141a;display:grid;place-items:center;border-radius:8px}.lg svg{width:26px}.lg b{font:800 18px/1 "Archivo",sans-serif}.lg small{display:block;font:600 9px/1.4 "JetBrains Mono",monospace;letter-spacing:.18em;color:#1d44d6;text-transform:uppercase}
h1{font:800 34px/1 "Archivo",sans-serif;margin:0;text-align:right;letter-spacing:-.02em}h1 span{display:block;font:600 13px/1.6 "JetBrains Mono",monospace;color:#5b6a72;letter-spacing:.06em}
.pt{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:22px 0}.pt h4{margin:0 0 6px;font:700 10px/1 "JetBrains Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:#1d44d6}.pt p{margin:0;color:#33414a}
table{width:100%;border-collapse:collapse;margin-top:8px}th{font:700 10px/1.4 "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:#5b6a72;text-align:left;border-bottom:1.5px solid #07141a;padding:8px 6px}td{padding:12px 6px;border-bottom:1px solid #dfe3e5;vertical-align:top}td.r,th.r{text-align:right}
.tot{display:flex;justify-content:flex-end;margin-top:14px}.tot div{min-width:260px;display:grid;grid-template-columns:1fr auto;gap:6px 18px;font-size:14px}.tot b.big{font:800 22px/1 "Archivo",sans-serif}
.paid{display:inline-block;margin-top:18px;font:700 11px/1 "JetBrains Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:#14804a;border:1.5px solid #14804a;padding:8px 10px;border-radius:6px}
.ft{margin-top:34px;padding-top:12px;border-top:1px solid #dfe3e5;font:500 10.5px/1.6 "JetBrains Mono",monospace;color:#5b6a72}.bar{max-width:210mm;margin:16px auto 0;text-align:right}.bar button{font:700 12px/1 "JetBrains Mono",monospace;letter-spacing:.1em;text-transform:uppercase;padding:12px 16px;border:0;background:#07141a;color:#fff;border-radius:8px;cursor:pointer}
@media print{body{background:#fff}.pg{box-shadow:none;margin:0;padding:0}.bar{display:none}}</style></head><body>
<div class="bar"><button onclick="window.print()">${L.print}</button></div>
<div class="pg"><div class="hd"><div class="lg"><i>${logo('#7fa0ff')}</i><div><b>DRT Creation</b><small>Bruxelles · Studio</small></div></div><h1>${L.inv}<span>${no} · ${fdate(p.date, lang)}</span></h1></div>
<div class="pt"><div><h4>DRT Creation</h4><p>Matheus Duarte<br>Rue de la Filature 25<br>1070 Anderlecht, Belgique<br>BCE / TVA BE 1045.012.177<br>${esc(set.email || '')}</p></div><div><h4>${L.client}</h4><p><b>${esc(c.name)}</b>${c.notes ? '<br>' + esc(String(c.notes).split('·').slice(1).join('·').trim()) : ''}${c.email ? '<br>' + esc(c.email) : ''}<br>${L.contract} DRT-${c.no}</p></div></div>
<table><thead><tr><th>${L.desc}</th><th>${L.period}</th><th class="r">${L.qty}</th><th class="r">${L.total}</th></tr></thead><tbody><tr><td>${L.line} · ${esc(PLAN[c.plan] ? PLAN[c.plan][lang] : c.plan)}</td><td>${fdate(p.from, lang)} → ${fdate(p.to, lang)}</td><td class="r">${p.months}</td><td class="r">${eur(p.amount, lang)}</td></tr></tbody></table>
<div class="tot"><div><span>${L.total} HTVA</span><b>${eur(p.amount, lang)}</b><span>TVA</span><b>0 €</b><span style="align-self:end">${L.total}</span><b class="big">${eur(p.amount, lang)}</b></div></div>
<p style="font-size:12.5px;color:#33414a;margin:18px 0 0">${L.vat}</p>
<span class="paid">✓ ${L.paid} ${fdate(p.date, lang)}${p.ref ? ' · ' + esc(p.ref) : ''}</span>
<div class="ft">IBAN ${esc(set.iban)} · ${esc(set.beneficiary)} · DRT Creation · BCE 1045.012.177</div></div></body></html>`;
}

module.exports = { render, invoice, invoiceNo, contractInfo, E };
