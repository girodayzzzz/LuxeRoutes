-- LuxeRoutes account/login role model for Cloudflare D1.
-- Apply with: wrangler d1 migrations apply luxeroutes-db --remote

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  default_role TEXT NOT NULL DEFAULT 'customer' CHECK (default_role IN ('customer', 'owner', 'manager', 'admin')),
  requested_role TEXT NOT NULL DEFAULT 'customer' CHECK (requested_role IN ('customer', 'owner', 'manager')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending_admin_grant',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS access_grants (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'owner', 'manager', 'admin')),
  note TEXT,
  granted_by_email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_access_grants_email ON access_grants(email);
CREATE INDEX IF NOT EXISTS idx_access_grants_role ON access_grants(role);
