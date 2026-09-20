#!/usr/bin/env python3
"""Apply the shared public footer and approved positioning language.

Run this script after adding a public HTML page so navigation and legal links do
not drift between otherwise hand-authored static pages.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = {"account.html", "admin-panel.html", "affiliate-panel.html", "login.html",
           "manager-panel.html", "owner-panel.html", "register.html", "reset-password.html"}

def footer(prefix: str) -> str:
    links = [
        ("About", "about"), ("Contact", "contact"), ("Journal", "journal"),
        ("Partner Offers", "partner-offers"), ("Plan My Trip", "plan-trip"),
        ("Work With LuxeRoutes", "work-with-luxeroutes"),
        ("Editorial Policy", "editorial-policy"),
        ("Affiliate Disclosure", "affiliate-disclosure"),
        ("Privacy Policy", "privacy"), ("Terms", "terms"),
        ("Cookie Policy", "cookies"),
    ]
    items = "".join(f'<li><a href="{prefix}{url}">{label}</a></li>' for label, url in links)
    return f'''  <footer class="site-footer">
    <div class="container footer-consultation">
      <div><p class="eyebrow">Informational route research</p><h2>Request a Personalized Travel Research Brief.</h2><p>Receive route ideas and practical notes for your own planning. This is not a booking service.</p></div>
      <a class="btn btn-primary" href="{prefix}plan-trip">Request a Travel Research Brief</a>
    </div>
    <div class="container footer-grid unified-footer-grid">
      <div class="footer-about">
        <a class="footer-brand" href="{prefix or '/'}"><img src="{prefix}logo.svg" alt="LuxeRoutes wordmark" width="620" height="160" loading="lazy" decoding="async" /></a>
        <p>LuxeRoutes provides independent European travel guides, informational route research and selected links to external booking providers.</p>
        <div class="footer-contact-card company-card"><span>Operated by</span><strong>Dayzzzz S.P.</strong><small>Tibi Topolinjak Munda · VAT: SI23492783</small><small>Spodnji Ključarovci 15A, 2274 Velika Nedelja, Slovenia</small><a href="mailto:info@luxeroutes.eu">info@luxeroutes.eu</a></div>
      </div>
      <div><h2>Information</h2><ul>{items}</ul></div>
      <div><h2>Booking clarity</h2><p>Bookings, payments, prices, availability and customer support are handled by the external provider.</p></div>
    </div>
    <div class="container footer-bottom"><p>© <span data-current-year>2026</span> LuxeRoutes. All rights reserved.</p><p>Independent European travel guides and selected external offers.</p></div>
  </footer>'''

pages = [p for p in ROOT.glob("*.html") if p.name not in PRIVATE and not p.name.startswith("admin")]
pages += list((ROOT / "journal").glob("*.html"))
for path in pages:
    source = path.read_text()
    prefix = "../" if path.parent.name == "journal" else ""
    source = re.sub(r'\s*<footer class="[^"]*site-footer[^"]*">.*?</footer>', "\n" + footer(prefix), source, flags=re.S)
    source = source.replace("LuxeRoutes will shape a refined first proposal with stays, routes, and experiences that feel personal from the start.", "LuxeRoutes may respond with informational route ideas and links for further checking with external providers.")
    source = source.replace("Designed for bespoke European travel planning.", "Independent European travel guides and selected external offers.")
    path.write_text(source)

print(f"Updated shared trust content on {len(pages)} public pages.")
