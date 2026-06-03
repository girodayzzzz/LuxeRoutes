# Cloudflare account, database, and role access plan

This site now includes the first production-ready Cloudflare Pages Functions + D1 layer for **email login for everyone**, account registration, and admin-approved role grants by email.

## Current status

Implemented in this repository:

- `login.html`, `register.html`, `account.html`, and `account.js` — separate public login, registration, and account dashboard screens. The login page now uses a passwordless email OTP step, while `account.js` supports all three pages, saves profiles to `/api/account`, and falls back to browser `localStorage` only if the API/D1 binding is missing.
- `/admin/index.html` (plus `/admin/offers.html`, `/admin/partners.html`, `/admin/users.html`) + `admin-panel.js` — operations panel. It now tries to load and save access grants from `/api/admin/grants`; local preview still works on `localhost`.
- `functions/api/account.js` — Cloudflare Pages Function for reading/upserting the verified visitor profile.
- `functions/api/auth/otp.js` — Cloudflare Pages Function for issuing and verifying 6-digit email OTP login codes.
- `functions/api/admin/grants.js` — Cloudflare Pages Function for admin-only role grant reads/writes.
- `functions/api/_utils.js` — shared API helpers; it also returns 404 if Pages maps it as `/api/_utils` during function bundling.
- `_routes.json` — explicitly invokes Pages Functions only for `/api/*`, keeping static pages on the asset path.
- `migrations/0001_auth.sql` — initial D1 schema for `profiles` and `access_grants`.
- `migrations/0002_profile_business_fields.sql` — adds company name, website, and business context fields for registration review.
- `migrations/0003_login_otps.sql` — stores short-lived hashed OTP challenges for passwordless login.
- `wrangler.toml` — keeps Pages build output at the repository root and intentionally omits placeholder D1 IDs; bind `DB` in the Pages dashboard or add a real D1 UUID only after creation.

The property/inquiry workspace is still demo data in browser storage. Move it to D1 later when account and role setup is confirmed.

## Owner/manager approval workflow now included

The repository now separates public customer registration from privileged partner access:

- Customers register on `/register.html` and become `active` automatically; `/login.html` is the email verification page, while `/account.html` is reserved for accepted offers, settings, coupons, and profile status.
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

Create a Cloudflare Zero Trust Access application for the public account area.

Recommended setup:

1. Open **Cloudflare Zero Trust → Access → Applications**.
2. Create a **Self-hosted** application for the production LuxeRoutes domain.
3. Protect these paths:
   - `/login.html`
   - `/login`
   - `/register*`
   - `/account.html`
   - `/account`
   - `/api/account`
4. Add an **Allow** policy with **Include: Everyone**.
5. Use email OTP or your chosen identity provider.
6. Add Pages/Workers secrets for app-sent OTP emails if you use the custom `/api/auth/otp` route:
   - `RESEND_API_KEY` — API key for Resend email delivery.
   - `OTP_EMAIL_FROM` — verified sender address, for example `LuxeRoutes <login@luxeroutes.eu>`.

The `/register*` destination covers both `/register` and `/register.html`. The custom OTP route stores only hashed codes in D1 and expires them after 10 minutes. Result: every visitor can login on `/login.html`, register with a verified email on `/register.html`, and then use `/account.html` as the dashboard for accepted offers, settings, coupons, and profile status. A `customer` registration is active immediately. If the visitor requests `owner` or `manager`, the email still receives safe customer access only, while the requested privileged role stays pending for admin review.

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

## Phase 4 — Seed your first admin

After applying the D1 migration, insert your own verified email as the first admin. Replace the email before running:

```bash
wrangler d1 execute luxeroutes-db --remote --command "INSERT INTO access_grants (id, email, role, note, granted_by_email, status, created_at, updated_at) VALUES ('grant-initial-admin', 'YOUR_ADMIN_EMAIL@example.com', 'admin', 'Initial LuxeRoutes admin', 'system', 'active', datetime('now'), datetime('now')) ON CONFLICT(email) DO UPDATE SET role = 'admin', status = 'active', updated_at = datetime('now');"
```

Then open `/admin/index.html`, login with the same email, and use **People → Access grants**:

- **Review role requests** — approve or reject pending `owner` and `manager` registrations.
- **Grant access by email** — manually grant `customer`, `owner`, `manager`, or `admin` access for direct invitations or corrections.

Role meanings:

- `customer` — default role for public registrations and travel leads.
- `owner` — property owner access, granted by admin after review.
- `manager` — regional or listing manager access, granted by admin after review.
- `admin` — internal operations access only.

## Phase 5 — Test the real login/register flow

1. Open `/login.html` in production, enter an email, and confirm the 6-digit OTP sent by the custom route or Cloudflare Access.
2. Open `/register.html` for a new profile and complete Cloudflare email verification if Access prompts for it.
3. Submit the profile form.
4. Confirm D1 received the profile:

```bash
wrangler d1 execute luxeroutes-db --remote --command "SELECT email, full_name, requested_role, status FROM profiles ORDER BY updated_at DESC LIMIT 10;"
```

5. Open `/admin/index.html` as the seeded admin.
6. Confirm pending owner/manager profiles load under **Review role requests**.
7. Click **Approve** for a suitable owner/manager request, or **Reject** if it should stay customer-only.
8. Confirm D1 received the profile status and grant:

```bash
wrangler d1 execute luxeroutes-db --remote --command "SELECT p.email, p.requested_role, p.status AS profile_status, g.role AS active_role, g.note FROM profiles p LEFT JOIN access_grants g ON g.email = p.email ORDER BY p.updated_at DESC LIMIT 10;"
```


## Exact production checklist for the site owner

You still need to complete these steps outside the repository in Cloudflare:

1. Create the D1 database named `luxeroutes-db` if it does not already exist.
2. Apply `migrations/0001_auth.sql` remotely with Wrangler.
3. Bind that D1 database to the Pages project with binding name `DB`.
4. Add `RESEND_API_KEY` and `OTP_EMAIL_FROM` secrets if the site should send OTP codes from the custom login form. Add `AUTH_SESSION_SECRET` as a long random string so verified OTP logins can set the secure account session cookie used by `/api/account`; if it is omitted, the API falls back to `RESEND_API_KEY` for signing.
5. Create a public Cloudflare Access application for `/login.html`, `/login`, `/register*`, `/account.html`, `/account`, and `/api/account` with an **Everyone** allow policy. Keep `/api/auth/otp` reachable so the custom form can request the first email code before an Access identity exists.
6. Create a separate Cloudflare Access application for `/admin/index.html`, `/admin/*`, and `/api/admin/*` that only allows your trusted admin email addresses.
7. Seed your first admin email into `access_grants` with the command in Phase 4.
8. Test with three different emails: one customer, one owner request, and one manager request.
9. From the admin email, approve one owner/manager request and reject the other to confirm both paths work.

Do not share the admin URL until step 8 succeeds in a private/incognito browser window.

## Phase 6 — Next backend work

After account and role grants are stable, move these modules from browser demo storage into D1/API routes:

- properties,
- owners,
- managers,
- inquiries,
- offer publishing workflow.

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
