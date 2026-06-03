-- Email OTP login challenges for passwordless LuxeRoutes sign-in.
-- Apply with: wrangler d1 migrations apply luxeroutes-db --remote

CREATE TABLE IF NOT EXISTS login_otps (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'locked')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_otps_email_status ON login_otps(email, status);
CREATE INDEX IF NOT EXISTS idx_login_otps_expires_at ON login_otps(expires_at);
