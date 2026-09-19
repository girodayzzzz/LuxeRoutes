# Google Search Console setup

1. Sign in to Google Search Console with the owner's Google account, choose **Add property**, select **Domain**, and enter `luxeroutes.eu` (without a protocol or path).
2. Copy Google's TXT verification value into a new DNS TXT record at the domain's root. Make this DNS change only through the authorised DNS administrator. Return to Search Console after propagation and select **Verify**; do not remove the record afterward.
3. Open **Sitemaps**, submit `https://luxeroutes.eu/sitemap.xml`, and confirm that its status becomes successful.
4. In **URL Inspection**, inspect the live URL and request indexing for these pages first:
   - `https://luxeroutes.eu/`
   - `https://luxeroutes.eu/journal`
   - `https://luxeroutes.eu/journal/7-day-luxury-road-trip-slovenia`
   - `https://luxeroutes.eu/journal/slovenia-croatia-10-day-adriatic-road-trip`
   - `https://luxeroutes.eu/journal/boutique-stays-lake-bled-lake-bohinj`
5. Use **Page indexing** to review indexed and excluded pages. For an important excluded URL, inspect it and compare the declared canonical, Google's selected canonical, robots status, and live-test result.
6. Use **Performance → Search results** to monitor impressions, clicks, CTR, average position, pages, countries, devices, and search queries. Compare meaningful date ranges rather than reacting to a single day.
7. Investigate canonical or indexing issues when Google selects a different canonical, reports a duplicate without a user-selected canonical, discovers but does not index a key page, or says a submitted URL is blocked. Confirm that the extensionless canonical returns `200`, is present in the sitemap, is internally linked, is not `noindex`, and is not blocked by `robots.txt` before requesting validation.

DNS settings and property ownership must not be changed or verified without the domain owner's explicit authorisation.
