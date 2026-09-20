#!/usr/bin/env python3
"""Dependency-free checks for LuxeRoutes public HTML, links and SEO rules."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import json, re, sys

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = {'login','register','reset-password','account','owner-panel','manager-panel','affiliate-panel','admin-panel'}

class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.h1=0; self.canonical=[]; self.forms=[]; self.affiliate=[]; self.meta={}; self.json_ld=[]; self._json_script=False; self._json_text=[]
    def handle_data(self, data):
        if self._json_script: self._json_text.append(data)
    def handle_endtag(self, tag):
        if tag=='script' and self._json_script:
            self.json_ld.append(''.join(self._json_text)); self._json_script=False; self._json_text=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='script' and a.get('type')=='application/ld+json': self._json_script=True; self._json_text=[]
        if tag=='a' and a.get('href'):
            self.links.append(a['href'])
            if 'jdoqocy.com/' in a['href']: self.affiliate.append(a)
        if tag=='h1': self.h1 += 1
        if tag=='link' and 'canonical' in a.get('rel','').split(): self.canonical.append(a.get('href',''))
        if tag=='meta':
            key=a.get('property') or a.get('name')
            if key: self.meta[key]=a.get('content','')
        if tag=='form': self.forms.append(a)

def target_exists(page, href):
    value=urlsplit(href).path
    if not value or value.startswith(('/api/','mailto:','tel:')): return True
    if href.startswith(('http://','https://')):
        if not href.startswith('https://luxeroutes.eu/'): return True
        value=urlsplit(href).path
        base=ROOT
    else: base=page.parent
    if value=='/': return (ROOT/'index.html').exists()
    candidate=(ROOT/value.lstrip('/')) if value.startswith('/') else (base/value)
    if candidate.suffix: return candidate.exists()
    return candidate.with_suffix('.html').exists() or (candidate/'index.html').exists()

errors=[]
candidate_pages=[p for p in ROOT.glob('*.html') if p.stem not in PRIVATE and not p.name.startswith('admin')] + list((ROOT/'journal').glob('*.html'))
pages=[p for p in candidate_pages if 'noindex' not in p.read_text() and 'http-equiv="refresh"' not in p.read_text() and p.name != 'offer.html']
for path in pages:
    source=path.read_text(); parser=Page(); parser.feed(source)
    if parser.h1 != 1: errors.append(f'{path.relative_to(ROOT)}: expected one H1, got {parser.h1}')
    if parser.meta.get('robots') != 'index, follow': errors.append(f'{path.relative_to(ROOT)}: expected index, follow robots metadata')
    if not parser.meta.get('og:image:alt'): errors.append(f'{path.relative_to(ROOT)}: missing og:image:alt')
    for block in parser.json_ld:
        try: json.loads(block)
        except json.JSONDecodeError as exc: errors.append(f'{path.relative_to(ROOT)}: invalid JSON-LD: {exc}')
    if not parser.canonical: errors.append(f'{path.relative_to(ROOT)}: missing canonical')
    for canonical in parser.canonical:
        if canonical.endswith('.html'): errors.append(f'{path.relative_to(ROOT)}: .html canonical')
        if not target_exists(path,canonical): errors.append(f'{path.relative_to(ROOT)}: missing canonical target {canonical}')
        if parser.meta.get('og:url') != canonical: errors.append(f'{path.relative_to(ROOT)}: og:url does not match canonical')
    for href in parser.links:
        if href.startswith(('#','mailto:','tel:','javascript:')): continue
        if not target_exists(path,href): errors.append(f'{path.relative_to(ROOT)}: broken link {href}')
    for a in parser.affiliate:
        if a.get('target')!='_blank': errors.append(f'{path.relative_to(ROOT)}: affiliate target is not _blank')
        required={'sponsored','nofollow','noopener','noreferrer'}
        if not required.issubset(set(a.get('rel','').split())): errors.append(f'{path.relative_to(ROOT)}: incomplete affiliate rel')
        if 'affiliate-link' not in a.get('class','').split(): errors.append(f'{path.relative_to(ROOT)}: missing affiliate-link class')
        for attribute in ('data-affiliate-category','data-affiliate-placement'):
            if not a.get(attribute): errors.append(f'{path.relative_to(ROOT)}: missing {attribute}')
        if path.parent.name=='journal' and not a.get('data-affiliate-article'):
            errors.append(f'{path.relative_to(ROOT)}: missing data-affiliate-article')

articles=list((ROOT/'journal').glob('*.html'))
if len(articles)!=15: errors.append(f'expected 15 articles, got {len(articles)}')
for path in articles:
    text=path.read_text()
    for required in ('FAQPage','BreadcrumbList','Related Guides','Published ','Updated ','min read','affiliate-notice','editorial-trust-note','../editorial-policy'):
        if required not in text: errors.append(f'{path.name}: missing {required}')
    parser=Page(); parser.feed(text)
    for required in ('description','og:title','og:description','og:url','og:image','twitter:card','twitter:title','twitter:description','twitter:image'):
        if not parser.meta.get(required): errors.append(f'{path.name}: missing {required} metadata')

important=[ROOT/name for name in ('index.html','journal.html','destinations.html','stays.html','experiences.html','partner-offers.html','plan-trip.html','slovenia-croatia-trip-planning.html')]
for path in important:
    parser=Page(); parser.feed(path.read_text())
    for required in ('description','og:title','og:description','og:url','og:image','twitter:card','twitter:title','twitter:description','twitter:image'):
        if not parser.meta.get(required): errors.append(f'{path.name}: missing {required} metadata')

forbidden=(
    'for the The','for the A','for the How','This The','This A','This How',
    'Static luxury travel landing page','Handpicked Luxury Routes Across Europe',
    'Curated stays, private experiences, and premium European travel routes',
)
for path in candidate_pages:
    text=path.read_text()
    for phrase in forbidden:
        if phrase in text: errors.append(f'{path.relative_to(ROOT)}: forbidden phrase {phrase!r}')
if re.search(r'(?:€|£|\$)\s*\d', (ROOT/'partner-offers.html').read_text()):
    errors.append('partner-offers.html: static price found; provider prices must remain live')
for slug,count in [('7-day-luxury-road-trip-slovenia',7),('slovenia-croatia-10-day-adriatic-road-trip',10),('ultimate-alps-road-trip-austria-slovenia-italy',12)]:
    text=(ROOT/'journal'/f'{slug}.html').read_text()
    days={int(x) for x in re.findall(r'<h3>Day (\d+):',text)}
    if days != set(range(1,count+1)): errors.append(f'{slug}: wrong day sequence {sorted(days)}')

sitemap=(ROOT/'sitemap.xml').read_text()
if '<loc>https://luxeroutes.eu/slovenia-croatia-trip-planning</loc>' not in sitemap: errors.append('sitemap missing Slovenia-Croatia planning page')
if 'marketing-materials' in sitemap: errors.append('sitemap exposes non-public marketing materials')
if '.html</loc>' in sitemap: errors.append('sitemap contains .html URL')
if re.search(r'<loc>[^<]+/(?:login|account|admin|manager-panel|owner-panel|api)(?:<|/)',sitemap): errors.append('sitemap contains protected URL')
article_locs=set(re.findall(r'<loc>https://luxeroutes\.eu/journal/([^<]+)</loc>',sitemap))
expected_articles={path.stem for path in articles}
if article_locs != expected_articles: errors.append(f'sitemap article set mismatch: expected {sorted(expected_articles)}, got {sorted(article_locs)}')

robots=(ROOT/'robots.txt').read_text()
if 'Sitemap: https://luxeroutes.eu/sitemap.xml' not in robots: errors.append('robots.txt missing absolute sitemap URL')
for route in ('/admin/','/account.html','/api/'):
    if f'Disallow: {route}' not in robots: errors.append(f'robots.txt does not block {route}')

redirects=(ROOT/'_redirects').read_text()
for path in pages:
    relative=path.relative_to(ROOT).as_posix()
    clean='/' if relative == 'index.html' else '/' + relative[:-5]
    rule=f'/{relative} {clean} 301 # legacy-html'
    if rule not in redirects: errors.append(f'{relative}: missing permanent legacy HTML redirect')

for path in pages:
    source=path.read_text()
    for required in ('About','Contact','Journal','Partner Offers','Plan My Trip','Work With LuxeRoutes',
                     'Editorial Policy','Affiliate Disclosure','Privacy Policy','Terms','Cookie Policy',
                     'Dayzzzz S.P.','Independent European travel guides and selected external offers.'):
        if required not in source: errors.append(f'{path.relative_to(ROOT)}: shared footer missing {required!r}')

landing=(ROOT/'slovenia-croatia-trip-planning.html').read_text()
for required in ('WebPage','FAQPage','Ljubljana → Bled or Bohinj → Piran → Istria → Rovinj → Opatija → Zagreb',
                 'href="slovenia"','href="croatia"','href="plan-trip#trip-brief"','href="partner-offers"'):
    if required not in landing: errors.append(f'slovenia-croatia-trip-planning.html: missing {required!r}')

measurement_script=(ROOT/'script.js').read_text()
for event in ('plan_trip_cta_click','trip_brief_form_start','trip_brief_form_submit','affiliate_link_click',
              'journal_article_view','slovenia_croatia_landing_view'):
    if event not in measurement_script: errors.append(f'script.js: missing privacy-safe measurement event {event}')

if errors:
    print('\n'.join(f'ERROR: {e}' for e in errors)); sys.exit(1)
print(f'OK: {len(pages)} public pages, 15 articles, internal links, canonicals, sitemap and affiliate attributes validated.')
