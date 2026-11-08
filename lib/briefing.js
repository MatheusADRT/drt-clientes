'use strict';
// Briefing de projeto: formulário público em etapas (FR/PT/EN/NL), feito para o celular.
// As respostas e os arquivos chegam na central (db.briefings + /data/briefings/<id>/).
const fs = require('fs');
const path = require('path');
const { esc, page, fdate } = require('./ui');

const LANGS = ['fr', 'pt', 'en', 'nl'];
const L = (a, lang) => a[LANGS.indexOf(lang)] || a[0];

// ---- textos da interface ----
const UI = {
  title: ['Briefing projet', 'Briefing do projeto', 'Project briefing', 'Projectbriefing'],
  intro: ['Environ 10 minutes, surtout des cases à cocher. Vous ne savez pas ? Passez : on en parlera ensemble. Vos réponses sont gardées sur cet appareil si vous revenez plus tard.',
    'Cerca de 10 minutos, quase tudo de marcar. Não sabe alguma resposta? Pule, a gente conversa depois. Suas respostas ficam salvas neste aparelho se você voltar mais tarde.',
    'About 10 minutes, mostly tick boxes. Not sure? Skip it, we will talk it through. Your answers are kept on this device if you come back later.',
    'Ongeveer 10 minuten, vooral aankruisen. Weet u het niet? Sla over, we bespreken het samen. Uw antwoorden blijven op dit toestel bewaard als u later terugkomt.'],
  step: ['Étape', 'Etapa', 'Step', 'Stap'],
  of: ['sur', 'de', 'of', 'van'],
  next: ['Continuer', 'Continuar', 'Continue', 'Verder'],
  prev: ['Retour', 'Voltar', 'Back', 'Terug'],
  send: ['Envoyer le briefing', 'Enviar o briefing', 'Send the briefing', 'Briefing versturen'],
  sending: ['Envoi…', 'Enviando…', 'Sending…', 'Versturen…'],
  req: ['obligatoire', 'obrigatório', 'required', 'verplicht'],
  max3: ['3 maximum', 'no máximo 3', '3 at most', 'maximum 3'],
  files: ['Logo, photos, menu ou documents', 'Logo, fotos, cardápio ou documentos', 'Logo, photos, menu or documents', 'Logo, foto’s, menukaart of documenten'],
  filesHint: ['Jusqu’à 10 fichiers (images, PDF). Les photos sont réduites automatiquement. Vous pouvez aussi les envoyer plus tard par WhatsApp.',
    'Até 10 arquivos (imagens, PDF). As fotos são reduzidas automaticamente. Você também pode mandar depois pelo WhatsApp.',
    'Up to 10 files (images, PDF). Photos are resized automatically. You can also send them later on WhatsApp.',
    'Tot 10 bestanden (afbeeldingen, pdf). Foto’s worden automatisch verkleind. U kunt ze ook later via WhatsApp sturen.'],
  pick: ['Choisir des fichiers', 'Escolher arquivos', 'Choose files', 'Bestanden kiezen'],
  remove: ['Retirer', 'Remover', 'Remove', 'Verwijderen'],
  tooBig: ['Fichier trop lourd (max. 8 Mo) :', 'Arquivo pesado demais (máx. 8 MB):', 'File too large (max 8 MB):', 'Bestand te groot (max. 8 MB):'],
  consent: ['J’accepte que DRT Creation utilise ces informations pour préparer une proposition. Elles ne sont jamais revendues.',
    'Aceito que a DRT Creation use estas informações para preparar uma proposta. Elas nunca são repassadas.',
    'I agree that DRT Creation may use this information to prepare a proposal. It is never sold.',
    'Ik ga ermee akkoord dat DRT Creation deze gegevens gebruikt om een voorstel op te maken. Ze worden nooit doorverkocht.'],
  thanks: ['Merci, c’est reçu !', 'Obrigado, recebemos!', 'Thank you, we got it!', 'Bedankt, goed ontvangen!'],
  thanksTxt: ['Nous revenons vers vous sous 48 h avec une proposition. Une confirmation vient d’être envoyée à votre e-mail.',
    'Voltamos a falar com você em até 48 h com uma proposta. Uma confirmação acabou de ser enviada para o seu e-mail.',
    'We will get back to you within 48 hours with a proposal. A confirmation has just been sent to your e-mail.',
    'We nemen binnen 48 uur contact met u op met een voorstel. Er is net een bevestiging naar uw e-mail gestuurd.'],
  wa: ['Une question ? WhatsApp', 'Dúvida? WhatsApp', 'A question? WhatsApp', 'Een vraag? WhatsApp'],
  err: ['L’envoi a échoué. Vérifiez votre connexion et réessayez, ou écrivez-nous sur WhatsApp.',
    'O envio falhou. Confira sua conexão e tente de novo, ou fale com a gente no WhatsApp.',
    'Sending failed. Check your connection and try again, or message us on WhatsApp.',
    'Versturen mislukt. Controleer uw verbinding en probeer opnieuw, of stuur ons een WhatsApp.'],
  other: ['Précisez', 'Especifique', 'Please specify', 'Licht toe'],
  noscript: ['Ce formulaire a besoin de JavaScript. Écrivez-nous sur WhatsApp au +32 470 83 51 86.', 'Este formulário precisa de JavaScript. Fale com a gente no WhatsApp: +32 470 83 51 86.', 'This form needs JavaScript. Message us on WhatsApp: +32 470 83 51 86.', 'Dit formulier heeft JavaScript nodig. Stuur ons een WhatsApp: +32 470 83 51 86.'],
};

// ---- perguntas ----
// t: text|email|tel|url|date|area|one|many|files|check ; o: [[id, [fr,pt,en,nl]], ...]
const o = (id, fr, pt, en, nl) => [id, [fr, pt, en, nl]];
const STEPS = [
  { h: ['Vous et votre entreprise', 'Você e sua empresa', 'You and your business', 'U en uw zaak'], q: [
    { k: 'company', t: 'text', r: 1, l: ['Nom de l’entreprise', 'Nome da empresa', 'Business name', 'Naam van de zaak'], p: ['tel qu’il doit apparaître sur le site', 'como deve aparecer no site', 'as it should appear on the site', 'zoals het op de site moet staan'] },
    { k: 'contact', t: 'text', r: 1, l: ['Votre nom', 'Seu nome', 'Your name', 'Uw naam'], ac: 'name' },
    { k: 'email', t: 'email', r: 1, l: ['E-mail', 'E-mail', 'E-mail', 'E-mail'], ac: 'email' },
    { k: 'phone', t: 'tel', r: 1, l: ['Téléphone / WhatsApp', 'Telefone / WhatsApp', 'Phone / WhatsApp', 'Telefoon / WhatsApp'], ac: 'tel' },
    { k: 'address', t: 'text', l: ['Adresse de l’établissement', 'Endereço do estabelecimento', 'Business address', 'Adres van de zaak'], ac: 'street-address' },
    { k: 'vat', t: 'text', l: ['Numéro d’entreprise / TVA', 'Número da empresa / TVA', 'Company / VAT number', 'Ondernemings- / btw-nummer'], p: ['BE 0…', 'BE 0…', 'BE 0…', 'BE 0…'] },
    { k: 'activity', t: 'area', l: ['Votre activité en une phrase', 'Sua atividade em uma frase', 'Your business in one sentence', 'Uw activiteit in één zin'] },
    { k: 'unique', t: 'area', l: ['Ce qui vous rend différent de vos concurrents', 'O que diferencia você dos concorrentes', 'What sets you apart from competitors', 'Wat u onderscheidt van uw concurrenten'] },
    { k: 'hours', t: 'area', l: ['Horaires d’ouverture', 'Horário de funcionamento', 'Opening hours', 'Openingsuren'] },
  ] },
  { h: ['Le projet', 'O projeto', 'The project', 'Het project'], q: [
    { k: 'need', t: 'many', r: 1, other: 1, l: ['De quoi avez-vous besoin ?', 'Do que você precisa?', 'What do you need?', 'Wat heeft u nodig?'], o: [
      o('site', 'Un nouveau site', 'Um site novo', 'A new website', 'Een nieuwe website'),
      o('redesign', 'Refaire mon site actuel', 'Refazer meu site atual', 'Redesign my current site', 'Mijn huidige site vernieuwen'),
      o('shop', 'Une boutique en ligne', 'Uma loja online', 'An online shop', 'Een webshop'),
      o('booking', 'Réservations / rendez-vous', 'Reservas / agendamentos', 'Bookings / appointments', 'Reservaties / afspraken'),
      o('app', 'Une application', 'Um aplicativo', 'An app', 'Een app'),
      o('other', 'Autre', 'Outro', 'Other', 'Andere')] },
    { k: 'goals', t: 'many', max: 3, l: ['Vos objectifs principaux', 'Seus objetivos principais', 'Your main goals', 'Uw belangrijkste doelen'], o: [
      o('bookings', 'Plus de réservations', 'Mais reservas', 'More bookings', 'Meer reservaties'),
      o('sell', 'Vendre en ligne', 'Vender online', 'Sell online', 'Online verkopen'),
      o('google', 'Être trouvé sur Google', 'Aparecer no Google', 'Be found on Google', 'Gevonden worden op Google'),
      o('menu', 'Montrer carte, services et prix', 'Mostrar cardápio, serviços e preços', 'Show menu, services and prices', 'Menu, diensten en prijzen tonen'),
      o('image', 'Une image plus pro', 'Uma imagem mais profissional', 'A more professional image', 'Een professioneler imago'),
      o('quotes', 'Recevoir des demandes de devis', 'Receber pedidos de orçamento', 'Get quote requests', 'Offerteaanvragen ontvangen'),
      o('time', 'Gagner du temps', 'Ganhar tempo', 'Save time', 'Tijd besparen')] },
    { k: 'currentSite', t: 'url', l: ['Votre site actuel (s’il existe)', 'Seu site atual (se existir)', 'Your current site (if any)', 'Uw huidige site (indien aanwezig)'], p: ['www.…', 'www.…', 'www.…', 'www.…'] },
    { k: 'dislike', t: 'area', l: ['Ce qui ne vous plaît pas aujourd’hui', 'O que não te agrada hoje', 'What you dislike today', 'Wat u vandaag niet bevalt'] },
    { k: 'deadline', t: 'date', l: ['Date souhaitée de mise en ligne', 'Data desejada para o lançamento', 'Preferred launch date', 'Gewenste lanceringsdatum'] },
    { k: 'event', t: 'text', l: ['Un événement lié à cette date ?', 'Algum evento ligado a essa data?', 'An event tied to that date?', 'Een gebeurtenis rond die datum?'], p: ['ouverture, saison, salon…', 'inauguração, temporada, feira…', 'opening, season, fair…', 'opening, seizoen, beurs…'] },
    { k: 'budget', t: 'one', l: ['Budget prévu', 'Orçamento previsto', 'Planned budget', 'Voorzien budget'], o: [
      o('lt1000', 'Moins de 1 000 €', 'Menos de 1 000 €', 'Under €1,000', 'Minder dan € 1.000'),
      o('1000-2500', '1 000 – 2 500 €', '1 000 – 2 500 €', '€1,000 – 2,500', '€ 1.000 – 2.500'),
      o('2500-5000', '2 500 – 5 000 €', '2 500 – 5 000 €', '€2,500 – 5,000', '€ 2.500 – 5.000'),
      o('gt5000', 'Plus de 5 000 €', 'Mais de 5 000 €', 'Over €5,000', 'Meer dan € 5.000'),
      o('unknown', 'Je ne sais pas encore', 'Ainda não sei', 'Not sure yet', 'Weet ik nog niet')] },
    { k: 'decider', t: 'text', l: ['Qui décide et valide de votre côté ?', 'Quem decide e aprova do seu lado?', 'Who decides and approves on your side?', 'Wie beslist en keurt goed bij u?'] },
  ] },
  { h: ['Vos clients', 'Seus clientes', 'Your customers', 'Uw klanten'], q: [
    { k: 'audience', t: 'area', l: ['Qui sont vos clients ?', 'Quem são seus clientes?', 'Who are your customers?', 'Wie zijn uw klanten?'], p: ['âge, quartier, familles, entreprises, touristes…', 'idade, bairro, famílias, empresas, turistas…', 'age, area, families, companies, tourists…', 'leeftijd, buurt, gezinnen, bedrijven, toeristen…'] },
    { k: 'found', t: 'many', other: 1, l: ['Comment vous trouvent-ils aujourd’hui ?', 'Como eles te encontram hoje?', 'How do they find you today?', 'Hoe vinden ze u vandaag?'], o: [
      o('google', 'Google / Maps', 'Google / Maps', 'Google / Maps', 'Google / Maps'),
      o('instagram', 'Instagram', 'Instagram', 'Instagram', 'Instagram'),
      o('facebook', 'Facebook', 'Facebook', 'Facebook', 'Facebook'),
      o('tiktok', 'TikTok', 'TikTok', 'TikTok', 'TikTok'),
      o('word', 'Bouche-à-oreille', 'Boca a boca', 'Word of mouth', 'Mond-tot-mondreclame'),
      o('street', 'En passant devant', 'Passando na frente', 'Walking past', 'Voorbijgangers'),
      o('apps', 'Uber Eats, Deliveroo, Treatwell…', 'Uber Eats, Deliveroo, Treatwell…', 'Uber Eats, Deliveroo, Treatwell…', 'Uber Eats, Deliveroo, Treatwell…'),
      o('other', 'Autre', 'Outro', 'Other', 'Andere')] },
    { k: 'faq', t: 'area', l: ['Les questions qu’on vous pose le plus souvent', 'As perguntas que mais te fazem', 'The questions you are asked most', 'De vragen die u het vaakst krijgt'] },
    { k: 'langs', t: 'many', other: 1, l: ['Langues du site', 'Idiomas do site', 'Site languages', 'Talen van de site'], o: [
      o('fr', 'Français', 'Francês', 'French', 'Frans'), o('nl', 'Néerlandais', 'Holandês', 'Dutch', 'Nederlands'), o('en', 'Anglais', 'Inglês', 'English', 'Engels'),
      o('es', 'Espagnol', 'Espanhol', 'Spanish', 'Spaans'), o('pt', 'Portugais', 'Português', 'Portuguese', 'Portugees'), o('other', 'Autre', 'Outro', 'Other', 'Andere')] },
  ] },
  { h: ['Contenu et fonctions', 'Conteúdo e funções', 'Content and features', 'Inhoud en functies'], q: [
    { k: 'pages', t: 'many', l: ['Pages souhaitées', 'Páginas desejadas', 'Pages you want', 'Gewenste pagina’s'], o: [
      o('home', 'Accueil', 'Início', 'Home', 'Home'), o('about', 'À propos / histoire', 'Sobre / história', 'About / story', 'Over ons / verhaal'),
      o('menu', 'Carte, menu ou services + prix', 'Cardápio ou serviços + preços', 'Menu or services + prices', 'Menu of diensten + prijzen'), o('gallery', 'Galerie photos', 'Galeria de fotos', 'Photo gallery', 'Fotogalerij'),
      o('team', 'Équipe', 'Equipe', 'Team', 'Team'), o('reviews', 'Avis clients', 'Avaliações', 'Reviews', 'Reviews'), o('blog', 'Blog / actualités', 'Blog / novidades', 'Blog / news', 'Blog / nieuws'),
      o('contact', 'Contact et plan', 'Contato e mapa', 'Contact and map', 'Contact en kaart'), o('faq', 'FAQ', 'Perguntas frequentes', 'FAQ', 'FAQ')] },
    { k: 'features', t: 'many', l: ['Fonctionnalités', 'Funcionalidades', 'Features', 'Functies'], o: [
      o('booking', 'Réservation / rendez-vous en ligne', 'Reserva / agendamento online', 'Online booking / appointments', 'Online reserveren / afspraken'),
      o('order', 'Commande en ligne (emporter, livraison)', 'Pedido online (retirada, entrega)', 'Online ordering (takeaway, delivery)', 'Online bestellen (afhalen, levering)'),
      o('pay', 'Paiement en ligne', 'Pagamento online', 'Online payment', 'Online betalen'),
      o('quote', 'Formulaire de devis / événement', 'Formulário de orçamento / evento', 'Quote / event form', 'Offerte- / eventformulier'),
      o('whatsapp', 'Bouton WhatsApp', 'Botão de WhatsApp', 'WhatsApp button', 'WhatsApp-knop'),
      o('social', 'Liens réseaux sociaux', 'Links das redes sociais', 'Social media links', 'Links naar sociale media'),
      o('newsletter', 'Newsletter', 'Newsletter', 'Newsletter', 'Nieuwsbrief'),
      o('clientarea', 'Espace client / application', 'Área do cliente / app', 'Client area / app', 'Klantenzone / app')] },
    { k: 'tools', t: 'area', l: ['Outils que vous utilisez déjà', 'Ferramentas que você já usa', 'Tools you already use', 'Tools die u al gebruikt'], p: ['caisse, système de réservation, Uber Eats, Shopify…', 'caixa, sistema de reservas, Uber Eats, Shopify…', 'POS, booking system, Uber Eats, Shopify…', 'kassa, reservatiesysteem, Uber Eats, Shopify…'] },
    { k: 'items', t: 'one', l: ['Nombre de produits ou de services à afficher', 'Quantos produtos ou serviços mostrar', 'How many products or services to show', 'Aantal producten of diensten'], o: [
      o('lt20', 'Moins de 20', 'Menos de 20', 'Under 20', 'Minder dan 20'), o('20-100', '20 à 100', '20 a 100', '20 to 100', '20 tot 100'), o('gt100', 'Plus de 100', 'Mais de 100', 'Over 100', 'Meer dan 100'), o('unknown', 'Je ne sais pas', 'Não sei', 'Not sure', 'Weet ik niet')] },
    { k: 'texts', t: 'one', l: ['Les textes', 'Os textos', 'The texts', 'De teksten'], o: [
      o('me', 'Je les écris', 'Eu escrevo', 'I write them', 'Ik schrijf ze'), o('drt', 'DRT Creation les rédige', 'A DRT Creation escreve', 'DRT Creation writes them', 'DRT Creation schrijft ze'), o('mix', 'Un peu des deux', 'Um pouco dos dois', 'A bit of both', 'Een beetje van beide')] },
    { k: 'photos', t: 'one', l: ['Les photos', 'As fotos', 'The photos', 'De foto’s'], o: [
      o('have', 'J’ai de bonnes photos', 'Tenho boas fotos', 'I have good photos', 'Ik heb goede foto’s'), o('shoot', 'Il faut un shooting', 'Precisa de uma sessão de fotos', 'A photo shoot is needed', 'Er is een fotoshoot nodig'), o('mix', 'Un peu des deux', 'Um pouco dos dois', 'A bit of both', 'Een beetje van beide')] },
  ] },
  { h: ['Style et identité', 'Estilo e identidade', 'Style and identity', 'Stijl en identiteit'], q: [
    { k: 'identity', t: 'one', l: ['Votre identité visuelle', 'Sua identidade visual', 'Your visual identity', 'Uw huisstijl'], o: [
      o('full', 'Logo + couleurs + typo définis', 'Logo + cores + fontes definidos', 'Logo + colours + fonts defined', 'Logo + kleuren + lettertype'),
      o('logo', 'Seulement un logo', 'Só um logo', 'Only a logo', 'Enkel een logo'),
      o('refresh', 'À rafraîchir', 'Precisa renovar', 'Needs a refresh', 'Moet vernieuwd worden'),
      o('none', 'Rien : tout est à créer', 'Nada, tudo a criar', 'Nothing, all to create', 'Niets, alles te maken')] },
    { k: 'mood', t: 'many', max: 3, l: ['L’ambiance recherchée', 'O clima desejado', 'The feel you want', 'De gewenste sfeer'], o: [
      o('warm', 'Chaleureux', 'Acolhedor', 'Warm', 'Warm'), o('premium', 'Élégant / haut de gamme', 'Elegante / sofisticado', 'Elegant / premium', 'Elegant / exclusief'),
      o('clean', 'Moderne et épuré', 'Moderno e limpo', 'Modern and clean', 'Modern en strak'), o('fun', 'Festif et coloré', 'Festivo e colorido', 'Festive and colourful', 'Feestelijk en kleurrijk'),
      o('authentic', 'Authentique', 'Autêntico', 'Authentic', 'Authentiek'), o('urban', 'Urbain', 'Urbano', 'Urban', 'Urban')] },
    { k: 'likes', t: 'area', l: ['2 ou 3 sites que vous aimez (et pourquoi)', '2 ou 3 sites de que você gosta (e por quê)', '2 or 3 sites you like (and why)', '2 of 3 sites die u mooi vindt (en waarom)'] },
    { k: 'avoid', t: 'area', l: ['Ce que vous ne voulez surtout pas', 'O que você não quer de jeito nenhum', 'What you definitely do not want', 'Wat u zeker niet wilt'] },
    { k: 'competitors', t: 'area', l: ['Vos concurrents directs', 'Seus concorrentes diretos', 'Your direct competitors', 'Uw directe concurrenten'] },
    { k: 'files', t: 'files' },
  ] },
  { h: ['Technique', 'Parte técnica', 'Technical', 'Technisch'], q: [
    { k: 'domain', t: 'text', l: ['Nom de domaine (et chez qui)', 'Domínio (e onde está registrado)', 'Domain name (and where)', 'Domeinnaam (en bij wie)'], p: ['monentreprise.be — OVH, Combell, HostGator…', 'minhaempresa.be — OVH, Combell, HostGator…', 'mybusiness.be — OVH, Combell, HostGator…', 'mijnzaak.be — OVH, Combell, HostGator…'] },
    { k: 'mailbox', t: 'one', l: ['Adresse e-mail professionnelle', 'E-mail profissional', 'Business e-mail address', 'Zakelijk e-mailadres'], o: [
      o('yes', 'J’en ai une', 'Já tenho', 'I have one', 'Heb ik al'), o('want', 'J’en voudrais une', 'Quero uma', 'I would like one', 'Wil ik graag'), o('no', 'Pas besoin', 'Não preciso', 'Not needed', 'Niet nodig')] },
    { k: 'gbp', t: 'one', l: ['Fiche Google (Google Business Profile)', 'Perfil no Google (Google Business Profile)', 'Google Business Profile', 'Google Bedrijfsprofiel'], o: [
      o('yes', 'Oui', 'Sim', 'Yes', 'Ja'), o('no', 'Non', 'Não', 'No', 'Nee'), o('unknown', 'Je ne sais pas', 'Não sei', 'Not sure', 'Weet ik niet')] },
    { k: 'socials', t: 'area', l: ['Vos réseaux sociaux', 'Suas redes sociais', 'Your social media', 'Uw sociale media'], p: ['@instagram, page Facebook, TikTok…', '@instagram, página do Facebook, TikTok…', '@instagram, Facebook page, TikTok…', '@instagram, Facebookpagina, TikTok…'] },
    { k: 'editor', t: 'one', l: ['Qui modifiera le contenu ensuite ?', 'Quem vai atualizar o conteúdo depois?', 'Who will update the content later?', 'Wie past de inhoud later aan?'], o: [
      o('me', 'Moi-même', 'Eu mesmo', 'Me', 'Ikzelf'), o('drt', 'DRT Creation', 'A DRT Creation', 'DRT Creation', 'DRT Creation'), o('both', 'Les deux', 'Os dois', 'Both', 'Allebei')] },
  ] },
  { h: ['Pour finir', 'Para terminar', 'To finish', 'Tot slot'], q: [
    { k: 'after', t: 'many', l: ['Ce qui vous intéresse', 'O que te interessa', 'What interests you', 'Wat u interesseert'], o: [
      o('maint', 'Maintenance mensuelle (sécurité, sauvegardes, petites modifications)', 'Manutenção mensal (segurança, backups, pequenas alterações)', 'Monthly maintenance (security, backups, small changes)', 'Maandelijks onderhoud (beveiliging, back-ups, kleine aanpassingen)'),
      o('annual', 'Paiement annuel (10 mois payés, 12 couverts)', 'Pagamento anual (paga 10 meses, leva 12)', 'Yearly payment (pay 10 months, get 12)', 'Jaarlijkse betaling (10 maanden betalen, 12 gedekt)'),
      o('aid', 'Les aides et primes à la digitalisation', 'Os auxílios e prêmios de digitalização', 'Digitalisation grants and subsidies', 'Digitaliseringspremies en steun'),
      o('invoice', 'Facture avec TVA au nom de l’entreprise', 'Fatura com TVA no nome da empresa', 'VAT invoice in the company name', 'Factuur met btw op naam van de zaak')] },
    { k: 'notes', t: 'area', l: ['Autre chose à nous dire ?', 'Mais alguma coisa?', 'Anything else?', 'Nog iets?'] },
    { k: 'call', t: 'text', l: ['Le meilleur moment pour un appel de 20 min', 'Melhor horário para uma ligação de 20 min', 'Best time for a 20-min call', 'Beste moment voor een gesprek van 20 min'], p: ['ex. mardi matin', 'ex.: terça de manhã', 'e.g. Tuesday morning', 'bv. dinsdagochtend'] },
    { k: 'consent', t: 'check', r: 1 },
  ] },
];
const QS = STEPS.flatMap((s) => s.q);

const UI2 = {
  kicker: ['Démarrer un projet', 'Começar um projeto', 'Start a project', 'Een project starten'],
  h1a: ['Parlez-nous de', 'Conte pra gente sobre o', 'Tell us about', 'Vertel ons over'],
  h1b: ['votre projet.', 'seu projeto.', 'your project.', 'uw project.'],
  lead: ['Quelques minutes, surtout des cases à cocher. On revient vers vous sous 48 h avec une proposition claire.', 'Poucos minutos, quase tudo de marcar. Voltamos em até 48 h com uma proposta clara.', 'A few minutes, mostly tick boxes. We get back to you within 48 hours with a clear proposal.', 'Enkele minuten, vooral aankruisen. Binnen 48 uur krijgt u een duidelijk voorstel.'],
  m1: ['≈ 10 min', '≈ 10 min', '≈ 10 min', '≈ 10 min'],
  m2: ['7 étapes', '7 etapas', '7 steps', '7 stappen'],
  m3: ['Sauvegarde automatique', 'Salvo automaticamente', 'Saved automatically', 'Automatisch bewaard'],
  skip: ['Pas sûr ? Passez la question.', 'Não tem certeza? Pule a pergunta.', 'Not sure? Skip the question.', 'Niet zeker? Sla de vraag over.'],
  how: ['Comment ça marche', 'Como funciona', 'How it works', 'Zo werkt het'],
  howS: [
    [['Vous remplissez', 'Você preenche', 'You fill it in', 'U vult in'], ['10 minutes, depuis votre téléphone.', '10 minutos, do seu celular.', '10 minutes, from your phone.', '10 minuten, vanaf uw gsm.']],
    [['On vous appelle', 'A gente liga', 'We call you', 'Wij bellen u'], ['20 minutes pour préciser vos besoins.', '20 minutos para alinhar o que você precisa.', '20 minutes to clarify your needs.', '20 minuten om uw noden te verduidelijken.']],
    [['Vous recevez la proposition', 'Você recebe a proposta', 'You get the proposal', 'U krijgt het voorstel'], ['Prix fixe, délais et aides possibles, sous 48 h.', 'Preço fechado, prazos e auxílios possíveis, em até 48 h.', 'Fixed price, timing and possible grants, within 48 h.', 'Vaste prijs, timing en mogelijke premies, binnen 48 u.']],
  ],
  priv: ['Vos réponses restent entre vous et DRT Creation.', 'Suas respostas ficam só entre você e a DRT Creation.', 'Your answers stay between you and DRT Creation.', 'Uw antwoorden blijven tussen u en DRT Creation.'],
  steps: ['Étapes', 'Etapas', 'Steps', 'Stappen'],
  next: ['Et maintenant ?', 'E agora?', 'What happens next?', 'En nu?'],
  drop: ['Glissez vos fichiers ici', 'Arraste seus arquivos aqui', 'Drop your files here', 'Sleep uw bestanden hierheen'],
  or: ['ou', 'ou', 'or', 'of'],
};
const HELP = [
  ['Les infos de base pour vous recontacter.', 'O básico para a gente falar com você.', 'The basics so we can reach you.', 'De basis om u te bereiken.'],
  ['Ce que vous voulez construire, et pour quand.', 'O que você quer construir, e para quando.', 'What you want to build, and by when.', 'Wat u wilt bouwen, en tegen wanneer.'],
  ['Pour qui on écrit et on dessine.', 'Para quem a gente escreve e desenha.', 'Who we are writing and designing for.', 'Voor wie we schrijven en ontwerpen.'],
  ['Les pages et les outils dont vous avez besoin.', 'As páginas e as ferramentas que você precisa.', 'The pages and tools you need.', 'De pagina’s en tools die u nodig hebt.'],
  ['L’ambiance, vos goûts et vos fichiers.', 'O clima, seus gostos e seus arquivos.', 'The look, your taste and your files.', 'De sfeer, uw smaak en uw bestanden.'],
  ['Domaine, e-mail et réseaux : on s’occupe du reste.', 'Domínio, e-mail e redes: o resto é com a gente.', 'Domain, e-mail and socials: we handle the rest.', 'Domein, e-mail en sociale media: de rest doen wij.'],
  ['Deux dernières questions et c’est envoyé.', 'Mais duas perguntas e pronto.', 'Two last questions and you are done.', 'Nog twee vragen en klaar.'],
];

// ---- página pública ----
const CSS = `
body{background:var(--bg) radial-gradient(900px 520px at 85% -120px,rgba(127,160,255,.22),transparent 70%) no-repeat}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:-1;background:radial-gradient(circle,rgba(228,232,234,.07) 1px,transparent 1.3px) 0 0/22px 22px;-webkit-mask:linear-gradient(180deg,#000,transparent 70%);mask:linear-gradient(180deg,#000,transparent 70%)}
.bf{max-width:1120px;margin:0 auto}
.bf .top2{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:18px 0 26px;flex-wrap:wrap}
.langs{display:flex;gap:2px;border:1px solid var(--line);padding:3px}.langs a,.langs b{font:600 11.5px/1 var(--mono);letter-spacing:.08em;padding:7px 8px;text-decoration:none;color:var(--text-2)}.langs b{background:var(--accent);color:#07141a}.langs a:hover{color:var(--text)}
.hero{padding:clamp(6px,4vw,46px) 0 clamp(20px,4vw,36px);animation:up .6s both}
.kick{display:inline-flex;align-items:center;gap:10px;font:600 11.5px/1 var(--mono);letter-spacing:.18em;text-transform:uppercase;color:var(--accent)}.kick::before{content:"";width:26px;height:1px;background:currentColor}
.hero h1{font-family:var(--disp);font-weight:800;font-stretch:112%;font-size:clamp(36px,7.4vw,76px);line-height:.95;letter-spacing:-.035em;margin:18px 0 18px}
.hero h1 em{font-style:normal;color:var(--accent)}
.hero .lead{font-size:clamp(16px,2vw,19px);color:var(--text-2);max-width:560px;margin:0 0 22px}
.meta{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}.meta li{display:inline-flex;align-items:center;gap:8px;font:600 12px/1 var(--mono);letter-spacing:.06em;padding:9px 11px;border:1px solid var(--line-2);background:rgba(13,31,40,.6)}
.meta svg{width:14px;height:14px;stroke:var(--accent);fill:none;stroke-width:2}
.lay{display:grid;gap:28px;align-items:start}
@media(min-width:980px){.lay{grid-template-columns:minmax(0,1fr) 320px;gap:48px}}
.prog{position:sticky;top:58px;z-index:4;background:rgba(7,20,26,.92);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);padding:14px 0 12px;margin:0 0 8px;border-bottom:1px solid var(--line)}
.segs{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.segs i{height:4px;background:var(--line);transition:background .35s}.segs i.on{background:var(--accent)}.segs i.cur{background:linear-gradient(90deg,var(--accent),#b9caff)}
.prog .pl{display:flex;justify-content:space-between;gap:10px;margin-top:10px;font:600 11px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--text-2)}.prog .pl b{color:var(--text);font-weight:600}
.bf fieldset{border:0;padding:0;margin:0;display:grid;gap:0}.bf fieldset[hidden]{display:none}.bf fieldset:not([hidden]){animation:up .45s both}
@keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.sh{display:grid;grid-template-columns:auto 1fr;gap:4px 16px;align-items:end;margin:18px 0 10px;padding:0}
.sh .no{grid-row:span 2;font:800 clamp(44px,8vw,64px)/.8 var(--disp);font-stretch:112%;color:transparent;-webkit-text-stroke:1.5px var(--accent);letter-spacing:-.04em}
.sh legend,.sh .lg{font:800 clamp(24px,4vw,32px)/1.05 var(--body);letter-spacing:-.025em;padding:0;margin:0;float:none}
.sh p{margin:0;color:var(--text-2);font-size:14.5px}
.box{background:linear-gradient(180deg,rgba(17,40,51,.75),rgba(13,31,40,.75));border:1px solid var(--line);padding:clamp(16px,3.4vw,28px);display:grid;gap:22px}
.q{display:grid;gap:9px}.q+.q{padding-top:22px;border-top:1px solid var(--line)}
.q>.ql{font-weight:600;font-size:15.5px;letter-spacing:-.005em}.q .ql small{color:var(--text-2);font:600 10.5px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;margin-left:8px;vertical-align:2px}
.q input[type=text],.q input[type=email],.q input[type=tel],.q input[type=date],.q textarea{width:100%;font:16px var(--body);padding:13px 14px;background:rgba(7,20,26,.7);color:var(--text);border:1px solid var(--line-2);border-radius:0;transition:border-color .2s,box-shadow .2s}
.q textarea{min-height:88px;resize:vertical}.q input:focus,.q textarea:focus{border-color:var(--accent);outline:0;box-shadow:0 0 0 3px rgba(127,160,255,.18)}
.q ::placeholder{color:#5f7079}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chips label{position:relative;display:inline-flex;align-items:center;min-height:46px;padding:11px 15px;border:1px solid var(--line-2);background:rgba(7,20,26,.55);cursor:pointer;font-size:14.5px;line-height:1.3;transition:border-color .2s,background .2s,transform .1s;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}
.chips label:hover{border-color:rgba(127,160,255,.6)}.chips label:active{transform:scale(.97)}
.chips input{position:absolute;opacity:0;pointer-events:none}
.chips label::before{content:"";width:16px;height:16px;flex:none;margin-right:10px;border:1.5px solid var(--line-2);transition:all .2s}
.chips input[type=radio]+span{display:contents}
.chips label.r::before{border-radius:50%}
.chips label:has(input:checked){border-color:var(--accent);background:rgba(127,160,255,.15);color:#fff}
.chips label:has(input:checked)::before{background:var(--accent) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 8.5l3 3 6-7' fill='none' stroke='%2307141a' stroke-width='2.2'/%3E%3C/svg%3E") center/12px no-repeat;border-color:var(--accent)}
.chips label.r:has(input:checked)::before{background:var(--accent);box-shadow:inset 0 0 0 3px #13293a}
.chips label:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
.q .oth{margin-top:2px}
.consent{display:flex;gap:12px;align-items:flex-start;font-size:14px;color:var(--text-2);cursor:pointer}.consent input{width:22px;height:22px;flex:none;margin:1px 0 0;accent-color:var(--accent)}
.drop{position:relative;border:1.5px dashed var(--line-2);background:rgba(7,20,26,.5);padding:26px 18px;display:grid;justify-items:center;text-align:center;gap:10px;transition:border-color .2s,background .2s}
.drop.over{border-color:var(--accent);background:rgba(127,160,255,.1)}
.drop .ico{width:48px;height:48px;display:grid;place-items:center;border:1px solid var(--line-2);background:var(--panel)}.drop .ico svg{width:22px;stroke:var(--accent);fill:none;stroke-width:1.8}
.drop b{font-size:15.5px}.drop .hint{color:var(--text-2);font-size:13px;margin:0;max-width:420px}
.drop .or{font:600 11px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--text-2)}
.flist{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;margin:0;padding:0;list-style:none;width:100%}.flist:empty{display:none}
.flist li{position:relative;aspect-ratio:1;border:1px solid var(--line-2);background:var(--panel);overflow:hidden;animation:up .3s both}
.flist img{width:100%;height:100%;object-fit:cover;display:block}.flist .fi{width:100%;height:100%;display:grid;place-items:center;font:700 13px/1 var(--mono);color:var(--accent)}
.flist span.n{position:absolute;left:0;right:0;bottom:0;padding:5px 6px;font-size:10.5px;background:rgba(7,20,26,.85);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.flist button{position:absolute;top:4px;right:4px;width:28px;height:28px;display:grid;place-items:center;background:rgba(7,20,26,.85);border:1px solid var(--line-2);color:var(--text);font:600 15px/1 var(--body);cursor:pointer}
.navb{display:flex;gap:10px;justify-content:space-between;margin:22px 0 0;position:sticky;bottom:0;z-index:3;background:linear-gradient(transparent,var(--bg) 32%);padding:22px 0 max(14px,env(safe-area-inset-bottom))}
.navb .btn{flex:1;min-height:52px;font-size:13px}.navb .btn[hidden]{display:none}.navb #bprev{flex:0 0 auto;padding:12px 18px}
.navb .btn.pri::after{content:"→";font:600 16px/1 var(--body);transition:transform .2s}.navb .btn.pri:hover::after{transform:translateX(4px)}
.skip{margin:12px 0 0;font-size:13px;color:var(--text-2)}
.q.bad input,.q.bad textarea,.q.bad .chips label{border-color:var(--bad)}.q.bad>.ql{color:var(--bad)}
aside.side{display:none}
@media(min-width:980px){aside.side{display:grid;gap:16px;position:sticky;top:84px}}
.side .card2{background:var(--panel);border:1px solid var(--line);padding:22px}
.side h3{font:600 11px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--text-2);margin:0 0 16px}
.slist{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.slist button{display:flex;align-items:center;gap:12px;width:100%;background:none;border:0;color:var(--text-2);font:500 14px/1.2 var(--body);padding:9px 0;text-align:left;cursor:default}
.slist button i{width:24px;height:24px;flex:none;display:grid;place-items:center;border:1px solid var(--line-2);font:700 10.5px/1 var(--mono);font-style:normal}
.slist button.done{color:var(--text);cursor:pointer}.slist button.done i{background:var(--accent);border-color:var(--accent);color:#07141a}
.slist button.cur{color:#fff;font-weight:700}.slist button.cur i{border-color:var(--accent);color:var(--accent);box-shadow:0 0 0 3px rgba(127,160,255,.18)}
.how{list-style:none;margin:0;padding:0;display:grid;gap:16px;counter-reset:h}
.how li{display:grid;grid-template-columns:28px 1fr;gap:2px 12px;counter-increment:h}
.how li::before{content:counter(h,decimal-leading-zero);grid-row:span 2;font:700 12px/1.6 var(--mono);color:var(--accent)}
.how b{font-size:14.5px}.how span{font-size:13.5px;color:var(--text-2)}
.side .wa{display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--text);font-size:14px}.side .wa svg{width:22px;flex:none;fill:#3ddc84}
.side .priv{font-size:12.5px;color:var(--text-2);display:flex;gap:8px;align-items:flex-start;margin:0}.side .priv svg{width:15px;flex:none;stroke:var(--text-2);fill:none;stroke-width:2;margin-top:2px}
.done{max-width:640px;margin:0 auto;text-align:center;padding:7vh 0 4vh;animation:up .5s both}
.done .ok{width:84px;height:84px;margin:0 auto 22px}.done .ok circle{stroke:var(--accent);stroke-width:3;fill:rgba(127,160,255,.12);stroke-dasharray:240;stroke-dashoffset:240;animation:dr .7s .1s forwards}.done .ok path{stroke:var(--accent);stroke-width:4;fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:60;stroke-dashoffset:60;animation:dr .4s .7s forwards}
@keyframes dr{to{stroke-dashoffset:0}}
.done h1{font-family:var(--disp);font-stretch:112%;font-size:clamp(34px,6vw,56px);letter-spacing:-.03em;margin:0 0 10px}
.done .how li:first-child::before{content:"✓";color:var(--ok)}.done .how li:first-child b{text-decoration:line-through;text-decoration-color:var(--ok);color:var(--text-2)}
.done .how{text-align:left;background:var(--panel);border:1px solid var(--line);padding:22px;margin:26px 0 22px}
.bf [hidden]{display:none!important}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.done .ok circle,.done .ok path{stroke-dashoffset:0}}
`;

const ICO = {
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  save: '<svg viewBox="0 0 24 24"><path d="M5 12l4 4L19 6"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  wa: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.4 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.5.1.3.6 1.1 1.4 1.8 1 .9 1.8 1.2 2 1.3.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>',
};

function qHtml(q, lang) {
  const id = 'q_' + q.k;
  if (q.t === 'files') return `<div class="q"><span class="ql">${esc(L(UI.files, lang))}</span><div class="drop" id="drop"><span class="ico">${ICO.up}</span><b>${esc(L(UI2.drop, lang))}</b><span class="or">${esc(L(UI2.or, lang))}</span>
<label class="btn">${esc(L(UI.pick, lang))}<input id="fpick" type="file" multiple accept="image/*,application/pdf,.svg,.ai,.eps" hidden></label><p class="hint">${esc(L(UI.filesHint, lang))}</p><ul class="flist" id="flist"></ul></div></div>`;
  if (q.t === 'check') return `<label class="consent q" data-k="${q.k}"><input type="checkbox" name="consent" value="1" required> <span>${esc(L(UI.consent, lang))}</span></label>`;
  const lab = `<span class="ql" id="${id}_l">${esc(L(q.l, lang))}${q.r ? ` <small>${esc(L(UI.req, lang))}</small>` : ''}${q.max ? ` <small>${esc(L(UI.max3, lang))}</small>` : ''}</span>`;
  if (q.t === 'one' || q.t === 'many') {
    const type = q.t === 'one' ? 'radio' : 'checkbox';
    return `<div class="q" role="group" aria-labelledby="${id}_l" data-k="${q.k}"${q.r ? ' data-r="1"' : ''}${q.max ? ` data-max="${q.max}"` : ''}>${lab}<div class="chips">${q.o.map(([v, t]) => `<label${type === 'radio' ? ' class="r"' : ''}><input type="${type}" name="${q.k}" value="${v}">${esc(L(t, lang))}</label>`).join('')}</div>
${q.other ? `<input class="oth" type="text" name="${q.k}_other" placeholder="${esc(L(UI.other, lang))}…" hidden>` : ''}</div>`;
  }
  const ph = q.p ? ` placeholder="${esc(L(q.p, lang))}"` : '';
  const ac = q.ac ? ` autocomplete="${q.ac}"` : '';
  const ctl = q.t === 'area' ? `<textarea id="${id}" name="${q.k}" rows="3"${ph}${q.r ? ' required' : ''}></textarea>`
    : `<input id="${id}" type="${q.t === 'url' ? 'text' : q.t}" name="${q.k}"${ph}${ac}${q.t === 'email' ? ' inputmode="email"' : q.t === 'tel' ? ' inputmode="tel"' : q.t === 'url' ? ' inputmode="url"' : ''}${q.r ? ' required' : ''}>`;
  return `<div class="q" data-k="${q.k}"><label class="ql" for="${id}">${esc(L(q.l, lang))}${q.r ? ` <small>${esc(L(UI.req, lang))}</small>` : ''}</label>${ctl}</div>`;
}

function formPage(lang, wa) {
  if (!LANGS.includes(lang)) lang = 'fr';
  const n = STEPS.length;
  const langs = LANGS.map((l) => l === lang ? `<b>${l.toUpperCase()}</b>` : `<a href="/briefing?lang=${l}">${l.toUpperCase()}</a>`).join('');
  const t = { step: L(UI.step, lang), of: L(UI.of, lang), sending: L(UI.sending, lang), send: L(UI.send, lang), err: L(UI.err, lang), tooBig: L(UI.tooBig, lang), remove: L(UI.remove, lang) };
  const how = `<ol class="how">${UI2.howS.map(([h, d]) => `<li><b>${esc(L(h, lang))}</b><span>${esc(L(d, lang))}</span></li>`).join('')}</ol>`;
  const pad = (i) => String(i + 1).padStart(2, '0');
  const body = `<div class="bf">
<div class="top2"><a class="mono muted" href="https://www.drtcreation.com/">← drtcreation.com</a><span class="langs">${langs}</span></div>
<header class="hero" id="intro"><span class="kick">${esc(L(UI2.kicker, lang))}</span><h1>${esc(L(UI2.h1a, lang))}<br><em>${esc(L(UI2.h1b, lang))}</em></h1><p class="lead">${esc(L(UI2.lead, lang))}</p>
<ul class="meta"><li>${ICO.clock}${esc(L(UI2.m1, lang))}</li><li>${ICO.list}${esc(L(UI2.m2, lang))}</li><li>${ICO.save}${esc(L(UI2.m3, lang))}</li></ul></header>
<noscript><div class="flash err">${esc(L(UI.noscript, lang))}</div></noscript>
<div class="lay" id="lay"><form id="bf" novalidate>
<div class="prog" aria-hidden="true"><div class="segs">${STEPS.map(() => '<i></i>').join('')}</div><div class="pl"><span id="plab"></span><b id="pname"></b></div></div>
<div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
${STEPS.map((s, i) => `<fieldset data-step="${i}" aria-labelledby="st${i}"${i ? ' hidden' : ''}><div class="sh"><span class="no" aria-hidden="true">${pad(i)}</span><h2 class="lg" id="st${i}">${esc(L(s.h, lang))}</h2><p>${esc(L(HELP[i], lang))}</p></div><div class="box">${s.q.map((q) => qHtml(q, lang)).join('')}</div></fieldset>`).join('')}
<p class="skip">${esc(L(UI2.skip, lang))}</p>
<div id="ferr" class="flash err" hidden></div>
<div class="navb"><button type="button" class="btn" id="bprev" hidden>← ${esc(L(UI.prev, lang))}</button><button type="button" class="btn pri" id="bnext">${esc(L(UI.next, lang))}</button><button type="submit" class="btn pri" id="bsend" hidden>${esc(t.send)}</button></div>
</form>
<aside class="side"><div class="card2"><h3>${esc(L(UI2.steps, lang))}</h3><ol class="slist">${STEPS.map((s, i) => `<li><button type="button" data-go="${i}"><i>${pad(i)}</i>${esc(L(s.h, lang))}</button></li>`).join('')}</ol></div>
<div class="card2"><h3>${esc(L(UI2.how, lang))}</h3>${how}</div>
<div class="card2" style="display:grid;gap:14px">${wa ? `<a class="wa" href="${esc(wa)}" target="_blank" rel="noopener">${ICO.wa}<span>${esc(L(UI.wa, lang))}<br><span class="muted mono" style="font-size:12px">+32 470 83 51 86</span></span></a>` : ''}<p class="priv">${ICO.lock}${esc(L(UI2.priv, lang))}</p></div></aside></div>
<div class="done" id="done" hidden><svg class="ok" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="38"/><path d="M26 43l11 11 22-24"/></svg><h1>${esc(L(UI.thanks, lang))}</h1><p class="sub">${esc(L(UI.thanksTxt, lang))}</p>
<div class="how-wrap"><h3 class="lab" style="margin:30px 0 0">${esc(L(UI2.next, lang))}</h3>${how}</div>${wa ? `<a class="btn" href="${esc(wa)}" target="_blank" rel="noopener">${esc(L(UI.wa, lang))}</a>` : ''}</div>
</div>
<script>
(function(){
var LANG=${JSON.stringify(lang)},T=${JSON.stringify(t)},N=${n},NAMES=${JSON.stringify(STEPS.map((s) => L(s.h, lang)))};
var f=document.getElementById('bf'),steps=[].slice.call(f.querySelectorAll('fieldset')),segs=[].slice.call(document.querySelectorAll('.segs i')),sl=[].slice.call(document.querySelectorAll('.slist button')),cur=0,seen=0,files=[],KEY='drt-briefing-v1',t0=Date.now(),ready=false;
function $(i){return document.getElementById(i)}
function collect(){var o={};[].slice.call(f.elements).forEach(function(e){if(!e.name||e.name==='website'||e.type==='file')return;if(e.type==='checkbox'||e.type==='radio'){if(!(e.name in o))o[e.name]=e.type==='checkbox'&&e.name!=='consent'?[]:'';if(e.checked){if(Array.isArray(o[e.name]))o[e.name].push(e.value);else o[e.name]=e.value}}else o[e.name]=e.value.trim()});return o}
function save(){if(!ready)return;try{localStorage.setItem(KEY,JSON.stringify({a:collect(),s:cur,v:seen}))}catch(e){}}
function restore(){var d;try{d=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}if(!d||!d.a)return;Object.keys(d.a).forEach(function(k){var v=d.a[k],els=f.elements[k];if(!els)return;if(els.length&&els[0]&&(els[0].type==='checkbox'||els[0].type==='radio')){[].slice.call(els).forEach(function(e){e.checked=Array.isArray(v)?v.indexOf(e.value)>=0:v===e.value})}else if(els.type==='checkbox'){els.checked=!!v}else if('value' in els)els.value=v||''});others();seen=Math.min(N-1,Math.max(d.v||0,d.s||0));if(d.s>0&&d.s<N)go(d.s,1)}
function others(){[].slice.call(f.querySelectorAll('.oth')).forEach(function(o){var k=o.name.replace(/_other$/,''),c=f.querySelector('input[name="'+k+'"][value="other"]');o.hidden=!(c&&c.checked)})}
function go(i,quiet){steps[cur].hidden=true;cur=i;if(cur>seen)seen=cur;steps[cur].hidden=false;segs.forEach(function(s,j){s.className=j<cur?'on':j===cur?'cur':''});sl.forEach(function(b,j){b.className=j===cur?'cur':j<=seen?'done':''});$('plab').textContent=T.step+' '+(cur+1)+' '+T.of+' '+N;$('pname').textContent=NAMES[cur];$('bprev').hidden=cur===0;$('bnext').hidden=cur===N-1;$('bsend').hidden=cur!==N-1;$('intro').hidden=cur>0;if(!quiet)window.scrollTo({top:0,behavior:'smooth'});save()}
function valid(){var ok=true,first=null;[].slice.call(steps[cur].querySelectorAll('.q')).forEach(function(q){q.classList.remove('bad');var bad=false,inp=q.querySelector('input:not(.oth),textarea');if(q.dataset.r){var any=[].slice.call(q.querySelectorAll('input[type=checkbox],input[type=radio]')).some(function(e){return e.checked});bad=!any}else if(inp&&inp.required){if(inp.type==='checkbox')bad=!inp.checked;else bad=!inp.value.trim()||(inp.type==='email'&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(inp.value.trim()))}if(bad){ok=false;q.classList.add('bad');if(!first)first=q}});if(first){first.scrollIntoView({behavior:'smooth',block:'center'});var i=first.querySelector('input,textarea');if(i)try{i.focus({preventScroll:true})}catch(e){}}return ok}
$('bnext').onclick=function(){if(valid())go(cur+1)};$('bprev').onclick=function(){go(cur-1)};
sl.forEach(function(b,j){b.onclick=function(){if(j===cur||j>seen)return;if(j>cur&&!valid())return;go(j)}});
f.addEventListener('input',save);
f.addEventListener('change',function(e){var q=e.target.closest('.q');if(q){q.classList.remove('bad');var mx=+q.dataset.max;if(mx&&e.target.checked&&q.querySelectorAll('input:checked').length>mx)e.target.checked=false}others();save()});
function shrink(file){return new Promise(function(res){if(!/^image\\/(jpeg|png|webp|heic|heif)$/.test(file.type)||file.size<400000){var r=new FileReader();r.onload=function(){res({name:file.name,type:file.type||'application/octet-stream',data:r.result.split(',')[1]})};r.onerror=function(){res(null)};r.readAsDataURL(file);return}var img=new Image(),u=URL.createObjectURL(file);img.onload=function(){var s=Math.min(1,2000/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);var keep=file.type==='image/png'&&file.size<3e6;var d=keep?c.toDataURL('image/png'):c.toDataURL('image/jpeg',.85);res({name:file.name.replace(/\\.(heic|heif|webp|png)$/i,keep?'.png':'.jpg'),type:keep?'image/png':'image/jpeg',data:d.split(',')[1]})};img.onerror=function(){URL.revokeObjectURL(u);var r=new FileReader();r.onload=function(){res({name:file.name,type:file.type||'application/octet-stream',data:r.result.split(',')[1]})};r.readAsDataURL(file)};img.src=u})}
function draw(){var l=$('flist');l.innerHTML='';files.forEach(function(x,i){var li=document.createElement('li');li.innerHTML=(/^image\\/(jpeg|png|webp|gif)$/.test(x.type)?'<img alt="">':'<span class="fi"></span>')+'<span class="n"></span><button type="button">×</button>';if(/^image\\/(jpeg|png|webp|gif)$/.test(x.type))li.querySelector('img').src='data:'+x.type+';base64,'+x.data;else li.querySelector('.fi').textContent=(x.name.split('.').pop()||'').slice(0,4).toUpperCase();li.querySelector('.n').textContent=x.name;var b=li.querySelector('button');b.title=T.remove;b.setAttribute('aria-label',T.remove+' '+x.name);b.onclick=function(){files.splice(i,1);draw()};l.appendChild(li)})}
function add(fl){var list=[].slice.call(fl).slice(0,10-files.length);Promise.all(list.map(function(x){if(x.size>25e6){alert(T.tooBig+' '+x.name);return null}return shrink(x)})).then(function(r){r.forEach(function(x){if(!x)return;if(x.data.length*.75>8e6){alert(T.tooBig+' '+x.name);return}files.push(x)});draw()})}
var fp=$('fpick');if(fp)fp.onchange=function(){add(fp.files);fp.value=''};
var dz=$('drop');if(dz){['dragenter','dragover'].forEach(function(ev){dz.addEventListener(ev,function(e){e.preventDefault();dz.classList.add('over')})});['dragleave','drop'].forEach(function(ev){dz.addEventListener(ev,function(e){e.preventDefault();dz.classList.remove('over')})});dz.addEventListener('drop',function(e){if(e.dataTransfer&&e.dataTransfer.files)add(e.dataTransfer.files)})}
f.addEventListener('submit',function(e){e.preventDefault();if(!valid())return;var b=$('bsend');b.disabled=true;b.textContent=T.sending;$('ferr').hidden=true;
var payload={lang:LANG,answers:collect(),files:files,website:f.elements.website.value,ms:Date.now()-t0};
fetch('/briefing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(){try{localStorage.removeItem(KEY)}catch(e){}$('lay').hidden=true;$('intro').hidden=true;$('done').hidden=false;window.scrollTo(0,0)}).catch(function(){$('ferr').textContent=T.err;$('ferr').hidden=false;b.disabled=false;b.textContent=T.send})});
go(0,1);restore();ready=true;
})();
</script>`;
  return page({ title: L(UI.title, lang) + ' · DRT Creation', lang, robots: 'index, follow', body, head: '<style>' + CSS + '</style><meta name="description" content="' + esc(L(UI2.lead, lang)) + '">' });
}

// ---- validação e gravação ----
const clip = (s, n = 3000) => String(s == null ? '' : s).replace(/\u0000/g, '').trim().slice(0, n);
function clean(raw) {
  const a = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const q of QS) {
    if (q.t === 'files') continue;
    if (q.t === 'many') { const ok = new Set(q.o.map((x) => x[0])); out[q.k] = (Array.isArray(a[q.k]) ? a[q.k] : []).filter((v) => ok.has(v)).slice(0, q.max || 20); if (q.other) out[q.k + '_other'] = clip(a[q.k + '_other'], 300); }
    else if (q.t === 'one') { out[q.k] = q.o.some((x) => x[0] === a[q.k]) ? a[q.k] : ''; }
    else if (q.t === 'check') out[q.k] = !!a[q.k];
    else out[q.k] = clip(a[q.k], q.t === 'area' ? 3000 : 300);
  }
  const miss = QS.filter((q) => q.r && (q.t === 'many' ? !out[q.k].length : !out[q.k])).map((q) => q.k);
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) miss.push('email');
  return { answers: out, miss };
}
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'application/pdf': 'pdf', 'image/heic': 'heic' };
function saveFiles(dir, list) {
  const out = []; let total = 0;
  for (const f of (Array.isArray(list) ? list : []).slice(0, 10)) {
    if (!f || typeof f.data !== 'string') continue;
    const buf = Buffer.from(f.data, 'base64'); if (!buf.length || buf.length > 8e6) continue;
    total += buf.length; if (total > 40e6) break;
    const type = EXT[f.type] ? f.type : 'application/octet-stream';
    const base = String(f.name || 'fichier').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+/, '').slice(0, 60) || 'fichier';
    const name = (out.length + 1) + '-' + (/\.[a-z0-9]{2,4}$/i.test(base) ? base : base + '.' + (EXT[type] || 'bin'));
    fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, name), buf);
    out.push({ name: String(f.name || name).slice(0, 120), file: name, type, size: buf.length });
  }
  return out;
}

// ---- leitura (painel, em português) ----
const lab = (q) => q.l ? L(q.l, 'pt') : q.k === 'files' ? 'Arquivos' : 'Consentimento';
function answerText(q, a) {
  const v = a[q.k];
  if (q.t === 'many') { const xs = (v || []).map((id) => { const x = q.o.find((y) => y[0] === id); return x ? L(x[1], 'pt') : id; }); if (q.other && a[q.k + '_other']) xs.push('Outro: ' + a[q.k + '_other']); return xs.join(' · '); }
  if (q.t === 'one') { const x = q.o.find((y) => y[0] === v); return x ? L(x[1], 'pt') : ''; }
  if (q.t === 'check') return v ? 'Sim' : 'Não';
  if (q.t === 'date') return v ? fdate(v, 'pt', 1) : '';
  return v || '';
}
function summaryText(b) {
  return STEPS.map((s) => '— ' + L(s.h, 'pt') + '\n' + s.q.filter((q) => q.t !== 'files' && q.t !== 'check').map((q) => { const t = answerText(q, b.answers); return t ? lab(q) + ': ' + t : null; }).filter(Boolean).join('\n')).join('\n\n');
}
const STATUSES = { new: 'Novo', contacted: 'Contatado', proposal: 'Proposta enviada', won: 'Fechado', lost: 'Perdido' };

function detailHtml(b) {
  return STEPS.map((s) => {
    const rows = s.q.filter((q) => q.t !== 'check' && q.t !== 'files').map((q) => { const t = answerText(q, b.answers); return `<tr><th style="width:38%">${esc(lab(q))}</th><td>${t ? esc(t).replace(/\n/g, '<br>') : '<span class="muted">—</span>'}</td></tr>`; }).join('');
    return `<h2>${esc(L(s.h, 'pt'))}</h2><div class="tbl"><table>${rows}</table></div>`;
  }).join('') + `<h2>Arquivos (${b.files.length})</h2>${b.files.length ? `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${b.files.map((f, i) => `<a class="panel" style="padding:8px;text-decoration:none;color:var(--text);font-size:12px;display:grid;gap:6px" href="/admin/briefings/${b.id}/f/${i}" target="_blank" rel="noopener">${/^image\/(jpeg|png|webp|gif)$/.test(f.type) ? `<img src="/admin/briefings/${b.id}/f/${i}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;background:#fff">` : `<span class="mono" style="aspect-ratio:1;display:grid;place-items:center;border:1px solid var(--line-2)">${esc((f.file.split('.').pop() || '').toUpperCase())}</span>`}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</span></a>`).join('')}</div>` : '<p class="muted">Nenhum arquivo enviado.</p>'}`;
}

const MAIL = {
  subject: ['Votre briefing est bien reçu · DRT Creation', 'Recebemos seu briefing · DRT Creation', 'Your briefing has been received · DRT Creation', 'Uw briefing is goed ontvangen · DRT Creation'],
  hello: ['Bonjour', 'Olá', 'Hello', 'Hallo'],
  body: ['Merci pour votre briefing pour <b>{c}</b>. Nous l’étudions et revenons vers vous sous 48 h avec une proposition.', 'Obrigado pelo briefing da <b>{c}</b>. Vamos analisar e voltamos a falar com você em até 48 h com uma proposta.', 'Thank you for the briefing for <b>{c}</b>. We will review it and get back to you within 48 hours with a proposal.', 'Bedankt voor de briefing voor <b>{c}</b>. We bekijken ze en komen binnen 48 uur terug met een voorstel.'],
  q: ['Une question en attendant ? Répondez simplement à cet e-mail ou écrivez-nous sur WhatsApp au +32 470 83 51 86.', 'Alguma dúvida enquanto isso? É só responder este e-mail ou chamar no WhatsApp: +32 470 83 51 86.', 'Any questions in the meantime? Just reply to this e-mail or message us on WhatsApp: +32 470 83 51 86.', 'Vragen in tussentijd? Antwoord gewoon op deze e-mail of stuur een WhatsApp naar +32 470 83 51 86.'],
};
function clientMail(b) {
  const lang = b.lang; const a = b.answers;
  const first = String(a.contact || '').split(/\s+/)[0];
  const txt = L(MAIL.body, lang).replace('{c}', esc(a.company));
  const html = `<div style="font:15px/1.6 Arial,sans-serif;color:#07141a;max-width:560px"><p>${esc(L(MAIL.hello, lang))} ${esc(first)},</p><p>${txt}</p><p>${esc(L(MAIL.q, lang))}</p><p>Matheus D.<br><b>DRT Creation</b> · Bruxelles<br><a href="https://www.drtcreation.com">www.drtcreation.com</a></p></div>`;
  return { subject: L(MAIL.subject, lang), html, text: html.replace(/<br>/g, '\n').replace(/<\/p>/g, '\n\n').replace(/<[^>]+>/g, '').replace(/&#39;/g, "'").replace(/&amp;/g, '&') };
}

module.exports = { LANGS, STEPS, QS, formPage, clean, saveFiles, summaryText, detailHtml, answerText, STATUSES, clientMail };
