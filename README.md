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

The production site uses the branded LuxeRoutes email one-time-code login for public account access plus admin-approved role grants by email. The login page calls `/api/auth/otp`, sends the code through Resend, and stores a signed `luxeroutes_account_session` cookie after verification. Configure `RESEND_API_KEY` and `AUTH_SESSION_SECRET` as Cloudflare Pages production runtime secrets. `OTP_EMAIL_FROM` defaults to `LuxeRoutes <login@luxeroutes.eu>` in `wrangler.toml`; override it only if Resend uses a different verified sender.

Use Cloudflare Access only for the admin surface:

- Keep `/login.html`, `/login`, `/account.html`, `/account`, `/register.html`, `/register`, `/api/account`, and `/api/auth/otp` public at the Cloudflare Access layer so the in-site OTP flow can load without redirect loops. The account API still requires a verified signed session cookie or Access identity before returning private data.
- Admin app: protect `/admin/*`, `/admin-panel.html`, and `/api/admin/*` with a separate application restricted to approved internal admin emails.

If `/login.html` itself is added to a Cloudflare Access app, visitors can see browser `ERR_TOO_MANY_REDIRECTS` errors before the branded login page loads.

Admins can then grant `customer`, `owner`, `manager`, or `admin` access by verified email after D1 is created, the `DB` binding is connected, and the first admin row is seeded. See [`docs/cloudflare-admin-auth.md`](docs/cloudflare-admin-auth.md) for the full Cloudflare + D1 plan.

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

Apply all D1 migrations, including `migrations/0005_stay_offers.sql`, before using this workflow. See `docs/cloudflare-admin-auth.md` for deployment and security details.
