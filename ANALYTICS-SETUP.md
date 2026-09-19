# Affiliate analytics setup

LuxeRoutes does not currently load GA4 or another browser analytics provider. Affiliate buttons are labelled with `affiliate-link` and privacy-safe `data-affiliate-*` attributes. `script.js` emits `luxeroutes:affiliate-click` on `document` before the browser follows a link.

The event detail contains only:

- `category` (for example, `hotel` or `car-rental`);
- `placement`;
- `article` or the current page path; and
- `destinationDomain`, the hostname only (never the affiliate URL, query string, name, email, form content, or other personal data).

## Connect GA4 later

1. Complete the site's consent and privacy review before loading GA4.
2. Add the approved GA4 configuration through the site's normal deployment process. Do not put a secret or an invented measurement ID in the repository.
3. After `gtag` is available and consent has been granted, register one listener:

   ```js
   document.addEventListener('luxeroutes:affiliate-click', ({ detail }) => {
     gtag('event', 'affiliate_click', {
       affiliate_category: detail.category,
       affiliate_placement: detail.placement,
       affiliate_page: detail.article,
       destination_domain: detail.destinationDomain,
     });
   });
   ```

4. Use GA4 DebugView with a non-production test link, then register only the useful event parameters as custom dimensions.
5. Confirm that no full destination URL or personal/form data appears in the event before publishing.

The custom event itself uses no cookies and sends nothing over the network, so this change does not add a cookie banner.
