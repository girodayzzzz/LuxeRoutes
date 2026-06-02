# Cloudflare account and role access plan

This site is a static Cloudflare Pages project. The right model is **email login for everyone**, then **admin-approved role grants by email**.

## Phase 1 — Public account login for customers

Create a Cloudflare Zero Trust Access application for the public account area.

Recommended setup:

1. Open **Cloudflare Zero Trust → Access → Applications**.
2. Create a **Self-hosted** application for the production LuxeRoutes domain.
3. Protect these paths:
   - `/account.html`
   - `/account`
   - `/login`
   - `/register`
4. Add an **Allow** policy with **Include: Everyone**.
5. Use email OTP or your chosen identity provider.

Result: every visitor can login/register with an email. Their first role should be `customer` by default, so LuxeRoutes captures customer emails before travel planning or partner onboarding continues.

The public account page checks Cloudflare Access identity at `/.cloudflare/access/get-identity`. If Cloudflare verified the visitor, the page can prefill the verified email. Local development still works on `localhost` as a preview.

## Phase 2 — Admin panel gate

Create a separate Cloudflare Zero Trust Access application for the operations panel.

Recommended setup:

1. Protect these paths:
   - `/admin-panel.html`
   - `/admin/*`
2. Add an **Allow** policy only for trusted admin emails.
3. Block everyone else.
4. Test in a private browser window before sharing the admin URL.

Admins should use the People → Access grants workflow to map verified emails to roles:

- `customer` — default role for public registrations and travel leads.
- `owner` — property owner access, granted by admin after review.
- `manager` — regional or listing manager access, granted by admin after review.
- `admin` — internal operations access only.

## Phase 3 — Replace browser demo storage

The current registration and admin access grant UI is still a browser-side demo. Before real properties, inquiries, owners, managers, or customer emails are stored, move this data into Cloudflare storage:

- **D1** for users, roles, profiles, properties, inquiries, and role grants.
- **R2** for property photos and documents.
- **Workers/Pages Functions** for authenticated API routes.

Suggested tables:

```sql
profiles (
  id text primary key,
  email text not null unique,
  full_name text,
  default_role text not null default 'customer',
  status text not null default 'active',
  created_at text not null,
  updated_at text not null
);

access_grants (
  id text primary key,
  email text not null,
  role text not null check (role in ('customer', 'owner', 'manager', 'admin')),
  note text,
  granted_by_email text,
  status text not null default 'active',
  created_at text not null,
  updated_at text not null
);

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

## Phase 4 — Manager portal

Managers login through the same account system, but the API should check `access_grants` before returning manager data. Managers should be able to:

- read only assigned properties or assigned regions,
- add regional notes,
- update inquiry progress,
- recommend approval,
- never publish public offers directly.

## Phase 5 — Owner portal

Owners login through the same account system, but the API should check `access_grants` before returning owner data. Owners should be able to:

- create draft property submissions,
- edit their own drafts,
- submit for review,
- see only their own property statuses,
- never see other owners, admin notes, or all inquiries.

## Important security rule

Cloudflare Access proves the email. Production data permissions must still be enforced in Worker/Pages Function API code by checking D1 `access_grants`. Do not rely only on hidden buttons or client-side JavaScript for real admin, manager, owner, or customer permissions.
