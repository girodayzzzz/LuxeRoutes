# LuxeRoutes

Static LuxeRoutes website prepared for GitHub source control and Cloudflare Pages deployment.

## Deploy on Cloudflare Pages from GitHub

1. Push this repository to GitHub.
2. In Cloudflare, open **Workers & Pages → Create application → Pages → Connect to Git**.
3. Select the GitHub repository.
4. Use these build settings:
   - **Framework preset:** None
   - **Build command:** `exit 0`
   - **Build output directory:** `/`
5. Add the production custom domain in Cloudflare Pages after the first deploy.

Cloudflare Pages will publish the static files from the repository root. The `_headers`, `_redirects`, and `_routes.json` files are included for security headers, clean admin routing, and limiting Pages Functions invocation to `/api/*`.

## Account and admin access

The site is prepared for **Cloudflare email login for everyone** plus **admin-approved role grants by email**. It now includes Cloudflare Pages Functions and a D1 migration for account profiles and access grants.

Start with two Cloudflare Access applications:

- Public account app: protect `/account.html`, `/account`, `/login`, `/register`, and `/api/account` with **Include: Everyone** so customers can register/login and LuxeRoutes captures verified emails.
- Admin app: protect `/admin-panel.html`, `/admin/*`, and `/api/admin/*` with approved internal admin emails only.

Admins can then grant `customer`, `owner`, `manager`, or `admin` access by verified email after D1 is created, the `DB` binding is connected, and the first admin row is seeded. See [`docs/cloudflare-admin-auth.md`](docs/cloudflare-admin-auth.md) for the full Cloudflare + D1 plan.

## Content workflow

Offer source content lives under `content/offers`. To regenerate offer cards locally, run:

```bash
python3 scripts/generate-offers.py
```
