# Google Search Console setup

## Domain property and verification
1. Add `luxeroutes.eu` as a **Domain property** in Google Search Console.
2. Copy Google's DNS TXT verification value into the existing DNS provider. This is a manual owner action; do not commit the token or change DNS from this repository.
3. Complete verification, retaining the TXT record while the property is used.

## Sitemap and indexing workflow
1. Submit `https://luxeroutes.eu/sitemap.xml` under **Sitemaps** and confirm it is fetched without errors.
2. Use **URL Inspection** on the canonical URL (never the legacy `.html` form), run **Test live URL**, then use **Request indexing** after a material update.
3. Inspect both legacy and canonical forms if Google reports duplication; confirm the legacy URL redirects and Google selects the extensionless canonical.
4. Review **Page indexing** regularly for redirect, duplicate/canonical and accidental `noindex` issues.

## Priority inspection list
- `https://luxeroutes.eu/`
- `https://luxeroutes.eu/journal`
- `https://luxeroutes.eu/partner-offers`
- `https://luxeroutes.eu/journal/7-day-luxury-road-trip-slovenia`
- `https://luxeroutes.eu/journal/slovenia-croatia-10-day-adriatic-road-trip`
- `https://luxeroutes.eu/journal/boutique-stays-lake-bled-lake-bohinj`

## Ongoing reporting
Compare 28-day and three-month periods in **Performance → Search results**. Track impressions, clicks, CTR and queries by page and country. Investigate high-impression/low-CTR pages, canonical changes and material query losses; do not repeatedly request indexing without a meaningful page change.
