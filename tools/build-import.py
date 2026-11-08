#!/usr/bin/env python3
"""Junta uma busca do Google Maps (places.json) com a checagem de presença online (web*.json),
dá uma nota de prioridade (1 a 3) e acrescenta os negócios novos em prospects-import.json.
Uso: python3 tools/build-import.py places.json web1.json [web2.json ...] --batch "Saint-Gilles e Forest · nov. 2026"
A central importa o arquivo no próximo deploy (uma vez por chave; apagados não voltam)."""
import json, re, sys, os, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'prospects-import.json')
AREAS = {'1000': 'Bruxelles-Centre', '1020': 'Laeken', '1030': 'Schaerbeek', '1040': 'Etterbeek', '1050': 'Ixelles', '1060': 'Saint-Gilles', '1070': 'Anderlecht', '1080': 'Molenbeek', '1081': 'Koekelberg', '1082': 'Berchem', '1083': 'Ganshoren', '1090': 'Jette', '1140': 'Evere', '1150': 'Woluwe-St-Pierre', '1160': 'Auderghem', '1170': 'Watermael-Boitsfort', '1180': 'Uccle', '1190': 'Forest', '1200': 'Woluwe-St-Lambert', '1210': 'Saint-Josse'}
SKIP_NAMES = {'marcola barbershop', 'big festa', 'agito sushi'}  # já são clientes
CHAINS = re.compile(r'\b(kfc|mcdonald|burger king|quick|fritiko|kf burger|domino|pizza hut|subway|exki|starbucks|panos|delitraiteur|carrefour|delhaize)\b', re.I)

def norm(s): return re.sub(r'[^a-z0-9]+', ' ', unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode().lower()).strip()

def kind(types, name):
    t = ' '.join(types) + ' ' + name.lower()
    if re.search(r'barber|hair|beauty|nail|spa|coiff|esth', t): return 'beauty'
    if re.search(r'restaurant|food|snack|bar\b|bistro|cafe|bakery|meal|grill|pizza|sushi', t): return 'resto'
    if re.search(r'store|shop|party|event|ballon|balloon|decor', t): return 'events'
    return 'other'

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    batch = sys.argv[sys.argv.index('--batch') + 1] if '--batch' in sys.argv else 'Google Maps'
    args = [a for a in args if a != batch]
    places = json.load(open(args[0]))
    web = {}
    for f in args[1:]:
        for w in json.load(open(f)): web[norm(w['name'])] = w
    cur = json.load(open(OUT)) if os.path.exists(OUT) else []
    have = {x['key'] for x in cur}
    added, skipped = [], {'ok': 0, 'dup': 0, 'chain': 0, 'client': 0, 'closed': 0}
    for p in places:
        key = p['place_id']; name = p['name']
        if key in have: skipped['dup'] += 1; continue
        if norm(name) in SKIP_NAMES: skipped['client'] += 1; continue
        if CHAINS.search(name): skipped['chain'] += 1; continue
        if p.get('business_status') and p['business_status'] != 'OPERATIONAL': skipped['closed'] += 1; continue
        w = web.get(norm(name), {})
        sig = w.get('signal', 'unknown')
        if sig == 'ok': skipped['ok'] += 1; continue
        phone = p.get('phone') or ''
        mobile = bool(re.match(r'^\+?32\s?4', phone.replace(' ', '')) or re.match(r'^04', phone.replace(' ', '')))
        reviews = p.get('reviews') or 0
        score = {'nosite': 2, 'insta': 2, 'oldsite': 2}.get(sig, 1) + (1 if mobile else 0) + (1 if reviews >= 50 else 0)
        score = max(1, min(3, score - 1))
        typ = kind(p.get('types', []), name)
        signals = {'nosite': ['nosite', 'gbp'], 'insta': ['insta'], 'oldsite': ['oldsite']}.get(sig, [])
        booking = (w.get('booking') or '').strip()
        if typ in ('beauty', 'resto') and (not booking or re.search(r'none|aucun|nenhum', booking, re.I)): signals.append('nobooking')
        pc = re.search(r'\b(1\d{3})\b', p.get('address', ''))
        lang = 'pt' if re.search(r'brazil|portug|🇧🇷|brasil|cantinho|aldeia|churrasq|castiço|boteco|sabor do', ' '.join(p.get('types', [])) + ' ' + name, re.I) else 'fr'
        notes = ' · '.join(x for x in [
            ('Sem site próprio' if sig == 'nosite' else 'Só redes sociais' if sig == 'insta' else 'Site fraco: ' + (w.get('website') or '') if sig == 'oldsite' else 'Presença online não confirmada'),
            ('Reservas/pedidos: ' + booking) if booking and not re.search(r'none|aucun|nenhum', booking, re.I) else '',
            w.get('note') or '', p.get('address', '')] if x)
        added.append({'key': key, 'batch': batch, 'name': name, 'type': typ, 'area': AREAS.get(pc.group(1), '') if pc else '', 'phone': phone,
                      'instagram': w.get('instagram') or '', 'website': w.get('website') or '', 'maps': 'https://www.google.com/maps/place/?q=place_id:' + key,
                      'signals': signals, 'lang': lang, 'channel': 'whatsapp' if mobile else 'visit', 'notes': notes[:600], 'score': score,
                      'rating': p.get('rating'), 'reviews': reviews})
        have.add(key)
    json.dump(cur + added, open(OUT, 'w'), ensure_ascii=False, indent=1)
    print(json.dumps({'added': len(added), 'by_score': {s: sum(1 for a in added if a['score'] == s) for s in (3, 2, 1)}, 'skipped': skipped}, ensure_ascii=False))

if __name__ == '__main__': main()
