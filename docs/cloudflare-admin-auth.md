# Cloudflare account, database, and role access plan

This site now includes the first production-ready Cloudflare Pages Functions + D1 layer for **email login for everyone**, account registration, and admin-approved role grants by email.

## Current status

Implemented in this repository:

- `login.html`, `register.html`, `account.html`, and `account.js` — public branded account screens protected by the in-site Resend OTP flow. Protected pages wait for a verified signed account session or Access identity before loading or saving `/api/account`. Local browser fallback is limited to localhost preview behavior.
- `/admin/index.html` (plus `/admin/offers.html`, `/admin/partners.html`, `/admin/users.html`) + `admin-panel.js` — operations panel. It now tries to load and save access grants from `/api/admin/grants`; local preview still works on `localhost`.
- `functions/api/account.js` — Cloudflare Pages Function for reading/upserting the verified visitor profile.
- `functions/api/auth/otp.js` — Cloudflare Pages Function for issuing and verifying Resend-based email OTP codes for the primary branded customer login flow.
- `functions/api/admin/grants.js` — Cloudflare Pages Function for admin-only role grant reads/writes.
- `functions/api/_utils.js` — shared API helpers; it also returns 404 if Pages maps it as `/api/_utils` during function bundling.
- `_routes.json` — explicitly invokes Pages Functions only for `/api/*`, keeping static pages on the asset path.
- `migrations/0001_auth.sql` — initial D1 schema for `profiles` and `access_grants`.
- `migrations/0002_profile_business_fields.sql` — adds company name, website, and business context fields for registration review.
- `migrations/0003_login_otps.sql` — stores short-lived hashed OTP challenges for passwordless login.
- `wrangler.toml` — keeps Pages build output at the repository root and intentionally omits placeholder D1 IDs; bind `DB` in the Pages dashboard or add a real D1 UUID only after creation.

The production inquiry queue and stay-offer publishing workflow are D1-backed. Public property offers arrive as inquiries; admins review and complete a public card, then publish it to the live stay finder.

## Owner/manager approval workflow now included

The repository now separates public customer registration from privileged partner access:

- Customers start on public `/login.html`, verify a Resend OTP, then choose `/register.html` and become `active` after saving a profile for their verified email session. `/account.html` is reserved for accepted offers, settings, coupons, and profile status.
- Owners and managers register on `/register.html`, keep the default `customer` access, and wait in the admin panel as `pending_admin_grant`.
- Admins review pending requests in **Admin Panel → People → Registrations**.
- **Approve** promotes the verified email to `owner` or `manager` in `access_grants` and marks the profile active.
- **Reject** keeps/returns the email to `customer` access and marks the profile rejected.

## Phase 1 — Create and bind Cloudflare D1

From the repository root, login to Wrangler and create the database:

```bash
wrangler login
wrangler d1 create luxeroutes-db
```

For Cloudflare Pages production, the safest setup is to add the D1 binding in the Pages dashboard instead of committing a placeholder database ID. If you want Wrangler to manage the binding, copy the returned real database UUID into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "luxeroutes-db"
database_id = "YOUR_REAL_DATABASE_ID"
```

Apply the migration locally for development and remotely for production:

```bash
wrangler d1 migrations apply luxeroutes-db --local
wrangler d1 migrations apply luxeroutes-db --remote
```

For Cloudflare Pages production, add the D1 database binding in **Workers & Pages → LuxeRoutes Pages project → Settings → Functions → D1 database bindings**:

- Variable/binding name: `DB`
- D1 database: `luxeroutes-db`

> Build troubleshooting: do not commit `database_id = "REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID"`. Cloudflare Pages can fail during “Initializing build environment” when Wrangler sees a placeholder D1 ID. Keep `wrangler.toml` without a `[[d1_databases]]` block until you have a real UUID, or configure the `DB` binding only in the Pages dashboard.

## Phase 2 — Public login, register, and account dashboard for customers

The production site currently uses the branded LuxeRoutes Resend OTP login on `/login.html`. Emails should come from the verified Resend sender configured as `OTP_EMAIL_FROM` (default: `LuxeRoutes <login@luxeroutes.eu>`). Configure `RESEND_API_KEY` and `AUTH_SESSION_SECRET` as Cloudflare Pages production runtime secrets.

Keep the custom LuxeRoutes entry page public:

- `/login.html`
- `/login`

Do not put the public customer login, account, registration, or account API paths inside a Cloudflare Zero Trust Access application. Keep these paths public so the in-site OTP flow can send and verify codes:

- `/account.html`
- `/account`
- `/register.html`
- `/register`
- `/api/account`

The public login page sends the Resend OTP code, verifies it through `/api/auth/otp?action=verify`, and then opens `/account.html` or `/register.html` with the signed account session cookie.

Keep `/api/auth/otp` public as part of the customer OTP flow. Protect only the admin application with Cloudflare Access so it does not compete with the branded login.

After a visitor enters the Resend OTP code, `/api/auth/otp?action=verify` sets a signed `luxeroutes_account_session` cookie. `/api/account` accepts that signed cookie or an admin Access identity to load and save the visitor profile. A `customer` registration is active immediately. Owner and manager requests retain customer access while waiting for admin review.

## Phase 3 — Admin panel gate

Create a separate Cloudflare Zero Trust Access application for the operations panel.

Recommended setup:

1. Protect these paths:
   - `/admin/index.html`
   - `/admin/*`
   - `/api/admin/*`
2. Add an **Allow** policy only for trusted admin emails.
3. Block everyone else.
4. Test in a private browser window before sharing the admin URL.

Important: the API also checks D1. The signed-in email must have an active `admin` row in `access_grants` before `/api/admin/grants` can write role grants.

The panel verifies access through `/api/admin/session`, which is intentionally inside the same `/api/admin/*` Access application as the rest of the admin API. Do not use `/api/account` as the admin gate because it belongs to the separate public-customer Access application. If the panel remains locked, it now displays the verified email and the specific D1 grant error instead of redirecting away.

The admin API first reads `CF-Access-Authenticated-User-Email`. If Cloudflare Pages does not receive that header, it validates the signed `Cf-Access-Jwt-Assertion` token and extracts the verified `email` claim. Keep these Pages production environment variables aligned with the admin Access application:

```text
CLOUDFLARE_ACCESS_TEAM_DOMAIN=cool-heart-b7e3.cloudflareaccess.com
CLOUDFLARE_ACCESS_AUD=9bd120625647058847770d9cd6a125d745203300af1c9f47db87fcdbbf12a0c7
```

Admin grant lookup trims and compares email addresses case-insensitively. Even so, store grant emails in lowercase to keep profiles, grants, and Cloudflare Access identities consistent.

## Phase 4 — Seed your first admin

After applying the D1 migration, insert your own verified email as the first admin. Replace the email before running:

```bash
wrangler d1 execute luxeroutes-db --remote --command "INSERT INTO access_grants (id, email, role, note, granted_by_email, status, created_at, updated_at) VALUES ('grant-initial-admin', 'YOUR_ADMIN_EMAIL@example.com', 'admin', 'Initial LuxeRoutes admin', 'system', 'active', datetime('now'), datetime('now')) ON CONFLICT(email) DO UPDATE SET role = 'admin', status = 'active', updated_at = datetime('now');"
```

Verify the row before opening the panel:

```bash
wrangler d1 execute luxeroutes-db --remote --command "SELECT email, role, status FROM access_grants WHERE lower(trim(email)) = lower(trim('YOUR_ADMIN_EMAIL@example.com'));"
```

The result must show `role = admin` and `status = active`. Then open `/admin/index.html` directly, complete the Cloudflare Access prompt with the same email, and use **People → Access grants**:

- **Review role requests** — approve or reject pending `owner` and `manager` registrations.
- **Grant access by email** — manually grant `customer`, `owner`, `manager`, or `admin` access for direct invitations or corrections.

Role meanings:

- `customer` — default role for public registrations and travel leads.
- `owner` — property owner access, granted by admin after review.
- `manager` — regional or listing manager access, granted by admin after review.
- `admin` — internal operations access only.

## Phase 5 — Test the real login/register flow

1. Open public `/login.html` in a private browser window and confirm the branded page opens without an Access challenge.
2. Click **Continue to account**, confirm Cloudflare Access requests your email, then enter the code sent by Cloudflare and verify `/account.html` opens instead of redirecting back to login.
3. Confirm `/api/account` returns HTTP 200 in the browser network panel. Return to public `/login.html`, then click **Create an account** and complete Access verification for a new email.
4. Confirm `/register.html` prefills a read-only verified email, then submit the profile form.
5. Confirm D1 received the profile:

```bash
wrangler d1 execute luxeroutes-db --remote --command "SELECT email, full_name, requested_role, status FROM profiles ORDER BY updated_at DESC LIMIT 10;"
```

6. Open `/admin/index.html` as the seeded admin.
7. Confirm pending owner/manager profiles load under **Review role requests**.
8. Click **Approve** for a suitable owner/manager request, or **Reject** if it should stay customer-only.
9. Confirm D1 received the profile status and grant:

```bash
wrangler d1 execute luxeroutes-db --remote --command "SELECT p.email, p.requested_role, p.status AS profile_status, g.role AS active_role, g.note FROM profiles p LEFT JOIN access_grants g ON g.email = p.email ORDER BY p.updated_at DESC LIMIT 10;"
```


## Exact production checklist for the site owner

The production domain must be served by **Cloudflare Pages**, not GitHub Pages. A GitHub Pages `404 File not found` at `/api/offers` proves that the static GitHub host currently owns the domain; GitHub Pages cannot execute Pages Functions or access D1. Disable GitHub Pages/custom-domain publishing for this repository, remove any GitHub Pages DNS records, and attach `luxeroutes.eu` under the Cloudflare Pages project's custom domains.

You still need to complete these steps outside the repository in Cloudflare:

1. Disable GitHub Pages for this repository and ensure `luxeroutes.eu` is configured as a Cloudflare Pages custom domain; the repository must not contain a GitHub Pages `CNAME` file.
2. Create the D1 database named `luxeroutes-db` if it does not already exist.
3. Apply all D1 migrations remotely with `wrangler d1 migrations apply luxeroutes-db --remote` (the OTP endpoint also self-creates its required `login_otps` table as a deployment safeguard).
4. Bind that D1 database to the Pages project with binding name `DB`.
5. Keep `/login.html` and `/login` public; do not add them to an Access application.
6. Keep `/account.html`, `/account`, `/register.html`, `/register`, `/api/account`, and `/api/auth/otp` public so the customer OTP flow can set and read the signed account session.
7. Configure `RESEND_API_KEY` plus `AUTH_SESSION_SECRET` in the Pages production runtime environment; `OTP_EMAIL_FROM` has a production default in `wrangler.toml`.
8. Create a separate Cloudflare Access application for `/admin/index.html`, `/admin/*`, and `/api/admin/*` that only allows your trusted admin email addresses.
9. Seed your first admin email into `access_grants` with the command in Phase 4.
10. Complete the Phase 5 private-window test, then test with three different emails: one customer, one owner request, and one manager request.
11. From the admin email, approve one owner/manager request and reject the other to confirm both paths work.

Do not share the admin URL until the Phase 5 private-window test and admin access checks succeed.

## Phase 6 — Next backend work

The inquiry and stay-offer publishing modules are now in D1. Future backend work can extend the same model for:

- owner self-service listing edits,
- manager assignments,
- R2 photo uploads,
- booking availability and pricing.

Use D1 for records and R2 for property photos/documents.

Suggested future tables:

```sql
properties (
  id text primary key,
  owner_email text,
  manager_email text,
  title text not null,
  country text,
  region text,
  type text,
  status text not null default 'draft',
  notes text,
  created_at text not null,
  updated_at text not null
);

inquiries (
  id text primary key,
  customer_email text,
  assigned_manager_email text,
  guest_name text not null,
  interest text,
  dates text,
  status text not null default 'new',
  next_step text,
  created_at text not null,
  updated_at text not null
);
```

## Important security rule

Cloudflare Access proves the email. Production data permissions must still be enforced in Worker/Pages Function API code by checking D1 `access_grants`. Do not rely only on hidden buttons or client-side JavaScript for real admin, manager, owner, or customer permissions.

## Production admin console

The production admin console at `/admin/index.html` is intentionally focused on D1-backed operational data. It does not use browser demo storage or a local-preview role bypass.

After Cloudflare Access and the D1 admin grant approve the current email, the console provides:

- a review queue for pending owner and manager registrations from `profiles`;
- approve/reject actions that update `profiles` and `access_grants` through `/api/admin/grants`;
- a member and role list for active access grants, including direct email invitations;
- self-lockout protection that prevents an admin from removing or downgrading their own admin role;
- a D1-backed inquiry queue with status management through `/api/admin/inquiries`;
- an approve-and-publish stay workflow through `/api/admin/offers`, with live offers served publicly by `/api/offers`;
- publish/unpublish controls that immediately add or remove database-backed cards from `/offers.html`;
- a secure Cloudflare Access logout link.

All admin API responses are marked `Cache-Control: no-store`, and every admin data read or mutation calls `requireAdmin` before accessing D1. Property applications submitted through public inquiry forms appear in the inquiry queue; owner and manager account applications appear in the role-review queue.

## Stay offer approval and publishing workflow

1. An owner submits the structured property form on `/partners.html`; `/api/inquiries` stores the full payload in D1.
2. An admin opens `/admin/index.html` and clicks **Publish stay** beside an eligible property inquiry.
3. The admin reviews and completes the public title, taxonomy placement, card copy, image, options, guest label, and price label.
4. **Approve and publish stay** inserts a `published` row in `stay_offers` and marks the source inquiry `resolved`.
5. `/offers.html` loads `/api/offers`, adds published D1 offers to the stay finder, and applies the same country, region, type, option, and search filters as static curated offers.
6. **Unpublish** removes the offer from the public API response without deleting its admin record.

Apply `migrations/0005_stay_offers.sql` before using the workflow in production. Admin publishing will fail safely until that migration exists.

## OTP table maintenance

`login_otps` contains one-time-code challenge records, not migration definitions. A row can remain `pending` after its ten-minute `expires_at` time when the code was requested but never submitted. Expired pending rows cannot successfully authenticate because `/api/auth/otp?action=verify` checks `expires_at` before accepting a code.

The OTP endpoint marks expired pending challenges for the requesting email as `expired` before issuing a new code and removes terminal (`verified`, `expired`, or `locked`) records older than seven days. Keep `/api/auth/otp` public for customers and outside the admin Access application.

To perform a one-time cleanup of existing remote records:

```bash
wrangler d1 execute luxeroutes-db --remote --command "UPDATE login_otps SET status = 'expired', updated_at = datetime('now') WHERE status = 'pending' AND expires_at <= datetime('now'); DELETE FROM login_otps WHERE status IN ('verified', 'expired', 'locked') AND updated_at < datetime('now', '-7 days');"
```
