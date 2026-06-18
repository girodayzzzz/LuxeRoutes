# LuxeRoutes

Static LuxeRoutes website prepared for GitHub source control and Cloudflare Pages deployment.

## Deploy on Cloudflare Pages from GitHub

1. Push this repository to GitHub.
2. In Cloudflare, open **Workers & Pages → Create application → Pages → Connect to Git**.
3. Select the GitHub repository.
4. Use these build settings:
   - **Framework preset:** None
   - **Build command:** `exit 0`
   - **Build output directory:** `.`
5. Add the production custom domain in Cloudflare Pages after the first deploy.

Cloudflare Pages will publish the static files from the repository root. The `_headers`, `_redirects`, and `_routes.json` files are included for security headers, clean admin routing, and limiting Pages Functions invocation to `/api/*`. Do not add `_redirects` rewrites from extensionless public account URLs such as `/account`, `/login`, or `/register` back to their `.html` files; Cloudflare Pages already serves those clean URLs, and explicit rewrites can loop against Pages' built-in pretty-URL handling.

The admin APIs accept Cloudflare Access identity from either the verified email header or a validated `Cf-Access-Jwt-Assertion` token. Keep these non-secret Access values configured for the Pages production environment; they are also present in `wrangler.toml` for source-controlled deployments:

- `CLOUDFLARE_ACCESS_TEAM_DOMAIN=cool-heart-b7e3.cloudflareaccess.com`
- `CLOUDFLARE_ACCESS_AUD=9bd120625647058847770d9cd6a125d745203300af1c9f47db87fcdbbf12a0c7`

> **Do not enable GitHub Pages for the production domain.** GitHub Pages can display the static site, but it cannot execute `functions/api/*` or connect to D1. The repository intentionally does not include a root `CNAME` file because that file makes GitHub Pages claim `luxeroutes.eu`. Configure `luxeroutes.eu` as a custom domain on the Cloudflare Pages project instead.

After deployment, verify that the domain is running the Cloudflare API rather than GitHub Pages:

```bash
node scripts/check-production-api.mjs https://luxeroutes.eu
```

A successful check returns JSON from `/api/offers`. A GitHub Pages `404 File not found` means the domain/DNS is still connected to GitHub Pages and the inquiry, admin, account, and publishing APIs cannot work.

## Account and admin access

Use this setup for everything to work properly:

- **Cloudflare Access is only for staff/admin protection**: `/admin/index.html`, `/admin/*`, `/admin-panel.html`, and `/api/admin/*`. If `/admin/index.html` already recognizes you, Cloudflare Access is working and you do not need Resend for the admin panel.
- **The LuxeRoutes public login is for customers, owners, and managers**: `/login.html`, `/account.html`, `/owner-panel.html`, `/manager-panel.html`, `/register.html`, `/api/account`, and `/api/auth/otp` must stay public in Cloudflare Access. These users enter their email on the LuxeRoutes form and receive a code from the site. After login, customers stay on `/account.html`, approved owners go to `/owner-panel.html`, approved managers go to `/manager-panel.html`, and admins can open `/admin/index.html`.
- **Create one Resend account/API key for the LuxeRoutes site, not one Resend profile per user**. Customers, owners, and managers do not need Resend accounts. Resend is only the email sender that delivers your LuxeRoutes one-time login codes.

Do not try to use Cloudflare Access for every customer/owner/manager login unless you want to manually manage every user inside Cloudflare Zero Trust. For this codebase, the recommended production setup is Cloudflare Access for admins plus Resend OTP for public account users.

Configure `RESEND_API_KEY` and `AUTH_SESSION_SECRET` as Cloudflare Pages production runtime secrets so the public `/login.html` OTP flow can send emails and sign account sessions. `OTP_EMAIL_FROM` defaults to `LuxeRoutes <login@luxeroutes.eu>` in `wrangler.toml`; override it only if Resend uses a different verified sender.

If `/login.html` shows `Missing RESEND_API_KEY for OTP email delivery`, the deployed Pages Function does not have the one site-wide Resend sending key for the public OTP form yet. Fix it in **Cloudflare Dashboard → Workers & Pages → LuxeRoutes Pages project → Settings → Environment variables → Production**:

- In Resend, create the production API key with **Name** `LuxeRoutes production OTP`, **Permission** `Sending access`, and **Domain** `luxeroutes.eu`. Use **Full access** only if Resend will not let you select the domain yet; after domain verification, replace it with a `Sending access` key.
- Add a **secret** named `RESEND_API_KEY` with the Resend API key value. `RESEND_API_TOKEN` or `RESEND_TOKEN` also work, but `RESEND_API_KEY` is the canonical name.
- The Resend **Free** package is enough for launch/testing if LuxeRoutes sends no more than 100 OTP emails per day and uses one sending domain. Upgrade later only if the site needs more daily OTP emails, more domains, or paid support/features.
- Verify the exact domain `luxeroutes.eu` in Resend before creating the API key. If Resend shows `luxeroues.eu`, delete/fix it because that typo will not verify the `login@luxeroutes.eu` sender. If Resend auto-configured the Cloudflare DNS records, do not add duplicate DKIM/SPF/MX records manually; confirm the records exist in Cloudflare DNS, then click **Verify DNS Records** in Resend. If auto-configuration did not create them, add Resend's generated DNS records in Cloudflare DNS: `TXT resend._domainkey`, `MX send` to `feedback-smtp.us-east-1.amazonses.com` with priority `10`, `TXT send` with `v=spf1 include:amazonses.com ~all`, and optional `TXT _dmarc` with `v=DMARC1; p=none;`.
- Add one more **secret** named `AUTH_SESSION_SECRET`; this is the only missing item if Cloudflare already shows `CLOUDFLARE_ACCESS_AUD`, `CLOUDFLARE_ACCESS_TEAM_DOMAIN`, `OTP_EMAIL_FROM`, and encrypted `RESEND_API_KEY`. Its value must be your own random string, generated with `openssl rand -base64 32`; do not reuse the Resend API key.
- Confirm `OTP_EMAIL_FROM` matches a verified Resend sender/domain, for example `LuxeRoutes <login@luxeroutes.eu>`.
- Redeploy the Pages project after saving production runtime variables, then test `/login.html` again.

For local Pages preview, copy `.dev.vars.example` to `.dev.vars` and fill in real secret values; `.dev.vars` is ignored by Git.

Use Cloudflare Access only for the admin surface:

- Keep `/login.html`, `/login`, `/account.html`, `/account`, `/owner-panel.html`, `/manager-panel.html`, `/register.html`, `/register`, `/api/account`, and `/api/auth/otp` public at the Cloudflare Access layer so the in-site OTP flow can load without redirect loops. The account API still requires a verified signed session cookie or Access identity before returning private data.
- Admin app: protect `/admin/*`, `/admin-panel.html`, and `/api/admin/*` with a separate application restricted to approved internal admin emails.

If `/login.html` itself is added to a Cloudflare Access app, visitors can see browser `ERR_TOO_MANY_REDIRECTS` errors before the branded login page loads.

Admins can then grant `customer`, `owner`, `manager`, or `admin` access by verified email after D1 is created, the `DB` binding is connected, and the first admin row is seeded. Offers can also be assigned to `owner_email` and `manager_email` in D1 so `/owner-panel.html` and `/manager-panel.html` show only the signed-in role's connected listings, connected stay requests, and owner-managed availability/pricing fields. See [`docs/cloudflare-admin-auth.md`](docs/cloudflare-admin-auth.md) for the full Cloudflare + D1 plan.

## Affiliate referral program

The affiliate program is separate from the core account roles (`customer`, `owner`, `manager`, `admin`). Affiliate applicants submit `become-affiliate.html`, admins review them in the admin console, and approved affiliates use `affiliate-panel.html` to build referral links to any LuxeRoutes page.

Cloudflare setup for affiliates uses the same Pages/D1 project:

1. Apply D1 migrations after deployment, including `migrations/0008_affiliate_partners.sql`, so `affiliate_partners`, `affiliate_events`, and affiliate attribution columns on `inquiries` exist.
2. Keep `/become-affiliate.html`, `/affiliate-panel.html`, `/api/affiliate/apply`, `/api/affiliate/click`, and `/api/affiliate/stats` public at the Cloudflare Access layer. The stats endpoint still requires the normal LuxeRoutes signed account session before it returns private affiliate data.
3. Keep `/api/admin/affiliates` protected by the existing admin Cloudflare Access application together with `/api/admin/*`.
4. Approved affiliates should continue using the public LuxeRoutes login flow; do not add each affiliate to Cloudflare Zero Trust unless they are also internal admins.

## Content workflow

Offer source content lives under `content/offers`. To regenerate offer cards locally, run:

```bash
python3 scripts/generate-offers.py
```

## Production stay publishing workflow

The static Markdown offers remain the curated baseline collection. New owner-submitted properties use the D1-backed workflow:

1. Owners submit the structured property offer on `partners.html`; `/api/inquiries` saves it.
2. Admins review the inquiry at `/admin/index.html` and choose **Publish stay**.
3. The admin completes the public card and approves it through `/api/admin/offers`.
4. Published offers are returned by `/api/offers` and automatically appear in the filtered collection on `offers.html`.
5. Admins can unpublish a stay without deleting its record.

Apply all D1 migrations, including `migrations/0006_offer_assignments.sql` and `migrations/0007_offer_availability_and_inquiry_assignments.sql`, before using this workflow. Migration `0007` adds owner-editable availability, pricing/discount notes, and inquiry assignment fields so customer requests can appear in owner and manager panels. See `docs/cloudflare-admin-auth.md` for deployment and security details.
