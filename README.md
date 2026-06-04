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

The production site uses **Cloudflare Access email one-time codes** for public account login plus admin-approved role grants by email. The Pages Functions trust the verified Cloudflare Access email header when loading and saving account data. No Resend API key is required for the primary Cloudflare Access login flow.

Use two Cloudflare Access applications:

- Keep `/login.html` and `/login` public so visitors can see the custom branded entry page.
- Public-customer Access app: protect `/account.html`, `/account`, `/register.html`, `/register`, and `/api/account` with an **Allow / Include Everyone** policy and the One-time PIN login method.
- Admin app: protect `/admin/*`, `/admin-panel.html`, and `/api/admin/*` with a separate application restricted to approved internal admin emails.

Keep `/api/auth/otp` outside the public-customer Access application. It is an optional Resend-based alternative, is not called by the public login page, and is not part of the primary Cloudflare Access flow. Cloudflare Access sends and verifies the production login code; no `RESEND_API_KEY`, `OTP_EMAIL_FROM`, or `AUTH_SESSION_SECRET` is required for that flow.

Admins can then grant `customer`, `owner`, `manager`, or `admin` access by verified email after D1 is created, the `DB` binding is connected, and the first admin row is seeded. See [`docs/cloudflare-admin-auth.md`](docs/cloudflare-admin-auth.md) for the full Cloudflare + D1 plan.

## Content workflow

Offer source content lives under `content/offers`. To regenerate offer cards locally, run:

```bash
python3 scripts/generate-offers.py
```
