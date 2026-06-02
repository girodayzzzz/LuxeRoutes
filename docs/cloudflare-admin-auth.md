# Cloudflare account, database, and role access plan

This site now includes the first production-ready Cloudflare Pages Functions + D1 layer for **email login for everyone**, account registration, and admin-approved role grants by email.

## Current status

Implemented in this repository:

- `account.html`, `register.html` + `account.js` — separate login/status and registration screens. It now tries to save the profile to `/api/account` and falls back to browser `localStorage` only if the API/D1 binding is missing.
- `admin-panel.html` + `admin-panel.js` — operations panel. It now tries to load and save access grants from `/api/admin/grants`; local preview still works on `localhost`.
- `functions/api/account.js` — Cloudflare Pages Function for reading/upserting the verified visitor profile.
- `functions/api/admin/grants.js` — Cloudflare Pages Function for admin-only role grant reads/writes.
- `functions/api/_utils.js` — shared API helpers; it also returns 404 if Pages maps it as `/api/_utils` during function bundling.
- `_routes.json` — explicitly invokes Pages Functions only for `/api/*`, keeping static pages on the asset path.
- `migrations/0001_auth.sql` — D1 schema for `profiles` and `access_grants`.
- `wrangler.toml` — keeps Pages build output at the repository root and intentionally omits placeholder D1 IDs; bind `DB` in the Pages dashboard or add a real D1 UUID only after creation.

The property/inquiry workspace is still demo data in browser storage. Move it to D1 later when account and role setup is confirmed.

## Owner/manager approval workflow now included

The repository now separates public customer registration from privileged partner access:

- Visitors login on `/account.html`; new customers, owners, and managers register on `/register.html`.
- Customers, owners, and managers submit optional company, website, and business-context fields during registration.
- Owners and managers keep default `customer` access and wait in **Admin Panel → People → Registrations** as `pending_admin_grant`.
- **Approve** promotes the verified email to `owner` or `manager` in `access_grants` and marks the profile approved/active.
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

If you already applied `0001_auth.sql`, run migrations again after pulling this update so D1 also applies `0002_profile_business_fields.sql` and adds the optional company/business fields:

```bash
wrangler d1 migrations apply luxeroutes-db --remote
```

For Cloudflare Pages production, add the D1 database binding in **Workers & Pages → LuxeRoutes Pages project → Settings → Functions → D1 database bindings**:

- Variable/binding name: `DB`
- D1 database: `luxeroutes-db`

> Build troubleshooting: do not commit `database_id = "REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID"`. Cloudflare Pages can fail during “Initializing build environment” when Wrangler sees a placeholder D1 ID. Keep `wrangler.toml` without a `[[d1_databases]]` block until you have a real UUID, or configure the `DB` binding only in the Pages dashboard.

## Phase 2 — Public account login for customers

Create a Cloudflare Zero Trust Access application for the public account area.

Recommended setup:

1. Open **Cloudflare Zero Trust → Access → Applications**.
2. Create a **Self-hosted** application for the production LuxeRoutes domain.
3. Protect these paths:
   - `/account.html`
   - `/account`
   - `/login`
   - `/register*` (covers `/register` and `/register.html`)
   - `/api/account`
4. Add an **Allow** policy with **Include: Everyone**.
5. Use email OTP or your chosen identity provider.

Result: every visitor can login or register with a verified email. A `customer` registration is active immediately. If the visitor requests `owner` or `manager`, the email still receives safe customer access only, while the requested privileged role stays pending for admin review.

## Phase 3 — Admin panel gate

Create a separate Cloudflare Zero Trust Access application for the operations panel.

Recommended setup:

1. Protect these paths:
   - `/admin-panel.html`
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

Then open `/admin-panel.html`, login with the same email, and use the **People** panel:

- **Registrations** — view `customer`, `owner`, and `manager` registrations in separate columns with names, emails, company context, and pending/approved/rejected status.
- **Grant access by email** — manually grant `customer`, `owner`, `manager`, or `admin` access for direct invitations or corrections.

Role meanings:

- `customer` — default role for public registrations and travel leads.
- `owner` — property owner access, granted by admin after review.
- `manager` — regional or listing manager access, granted by admin after review.
- `admin` — internal operations access only.

## Phase 5 — Test the real login/register flow

1. Open `/account.html` in production to confirm login/status loads.
2. Open `/register.html` and complete Cloudflare email verification.
3. Submit the profile form.
4. Confirm D1 received the profile:

```bash
wrangler d1 execute luxeroutes-db --remote --command "SELECT email, full_name, requested_role, status FROM profiles ORDER BY updated_at DESC LIMIT 10;"
```

5. Open `/admin-panel.html` as the seeded admin.
6. Confirm customer, owner, and manager profiles load under **People → Registrations**.
7. Click **Approve** for a suitable owner/manager request, or **Reject** if it should stay customer-only.
8. Confirm D1 received the profile status and grant:

```bash
wrangler d1 execute luxeroutes-db --remote --command "SELECT p.email, p.requested_role, p.status AS profile_status, g.role AS active_role, g.note FROM profiles p LEFT JOIN access_grants g ON g.email = p.email ORDER BY p.updated_at DESC LIMIT 10;"
```


## Exact production checklist for the site owner

You still need to complete these steps outside the repository in Cloudflare:

1. Create the D1 database named `luxeroutes-db` if it does not already exist.
2. Apply all migrations remotely with Wrangler, including `0001_auth.sql` and `0002_profile_business_fields.sql`.
3. Bind that D1 database to the Pages project with binding name `DB`.
4. Create a public Cloudflare Access application for `/account.html`, `/account`, `/login`, `/register*`, and `/api/account` with an **Everyone** allow policy.
5. Create a separate Cloudflare Access application for `/admin-panel.html`, `/admin/*`, and `/api/admin/*` that only allows your trusted admin email addresses.
6. Seed your first admin email into `access_grants` with the command in Phase 4.
7. Test with three different emails: one customer, one owner request, and one manager request.
8. From the admin email, approve one owner/manager request and reject the other to confirm both paths work.

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
