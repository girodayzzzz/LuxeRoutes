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

The site uses its own passwordless email OTP flow for public customer accounts plus admin-approved role grants by email. It includes Cloudflare Pages Functions and D1 migrations for account profiles, access grants, and one-time login codes. Verified custom OTP logins set a secure account session cookie for `/api/account`; configure `AUTH_SESSION_SECRET` as a long random secret.

Use Cloudflare Access only for the internal admin area:

- Keep `/login.html`, `/login`, `/register*`, `/account.html`, `/account`, `/api/auth/otp`, and `/api/account` outside Cloudflare Access so the custom OTP session cookie can authenticate the public account flow without a second Access login.
- Protect `/admin/*`, `/admin-panel.html`, and `/api/admin/*` with a Cloudflare Access application restricted to approved internal admin emails.

Admins can then grant `customer`, `owner`, `manager`, or `admin` access by verified email after D1 is created, the `DB` binding is connected, and the first admin row is seeded. See [`docs/cloudflare-admin-auth.md`](docs/cloudflare-admin-auth.md) for the full Cloudflare + D1 plan.

## Content workflow

Offer source content lives under `content/offers`. To regenerate offer cards locally, run:

```bash
python3 scripts/generate-offers.py
```
