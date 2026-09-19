#!/usr/bin/env python3
"""Dependency-free checks for LuxeRoutes public HTML, links and SEO rules."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import re, sys

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = {'login','register','reset-password','account','owner-panel','manager-panel','affiliate-panel','admin-panel'}

class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.h1=0; self.canonical=[]; self.forms=[]; self.affiliate=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='a' and a.get('href'):
            self.links.append(a['href'])
            if 'jdoqocy.com/' in a['href']: self.affiliate.append(a)
        if tag=='h1': self.h1 += 1
        if tag=='link' and 'canonical' in a.get('rel','').split(): self.canonical.append(a.get('href',''))
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
    parser=Page(); parser.feed(path.read_text())
    if parser.h1 != 1: errors.append(f'{path.relative_to(ROOT)}: expected one H1, got {parser.h1}')
    if not parser.canonical: errors.append(f'{path.relative_to(ROOT)}: missing canonical')
    for canonical in parser.canonical:
        if canonical.endswith('.html'): errors.append(f'{path.relative_to(ROOT)}: .html canonical')
        if not target_exists(path,canonical): errors.append(f'{path.relative_to(ROOT)}: missing canonical target {canonical}')
    for href in parser.links:
        if href.startswith(('#','mailto:','tel:','javascript:')): continue
        if not target_exists(path,href): errors.append(f'{path.relative_to(ROOT)}: broken link {href}')
    for a in parser.affiliate:
        if a.get('target')!='_blank': errors.append(f'{path.relative_to(ROOT)}: affiliate target is not _blank')
        required={'sponsored','nofollow','noopener'}
        if not required.issubset(set(a.get('rel','').split())): errors.append(f'{path.relative_to(ROOT)}: incomplete affiliate rel')

articles=list((ROOT/'journal').glob('*.html'))
if len(articles)!=15: errors.append(f'expected 15 articles, got {len(articles)}')
for path in articles:
    text=path.read_text()
    for required in ('FAQPage','BreadcrumbList','Related Guides','Published ','Updated ','min read','affiliate-notice'):
        if required not in text: errors.append(f'{path.name}: missing {required}')
for slug,count in [('7-day-luxury-road-trip-slovenia',7),('slovenia-croatia-10-day-adriatic-road-trip',10),('ultimate-alps-road-trip-austria-slovenia-italy',12)]:
    text=(ROOT/'journal'/f'{slug}.html').read_text()
    days={int(x) for x in re.findall(r'<h3>Day (\d+):',text)}
    if days != set(range(1,count+1)): errors.append(f'{slug}: wrong day sequence {sorted(days)}')

sitemap=(ROOT/'sitemap.xml').read_text()
if '.html</loc>' in sitemap: errors.append('sitemap contains .html URL')
if re.search(r'<loc>[^<]+/(?:login|account|admin|manager-panel|owner-panel|api)(?:<|/)',sitemap): errors.append('sitemap contains protected URL')

if errors:
    print('\n'.join(f'ERROR: {e}' for e in errors)); sys.exit(1)
print(f'OK: {len(pages)} public pages, 15 articles, internal links, canonicals, sitemap and affiliate attributes validated.')
