CREATE TABLE IF NOT EXISTS account_coupons (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
  expires_at TEXT,
  redeemed_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_account_coupons_email_status ON account_coupons(email, status);
CREATE INDEX IF NOT EXISTS idx_account_coupons_code ON account_coupons(code);

ALTER TABLE stay_offers ADD COLUMN owner_follow_up_at TEXT;
ALTER TABLE stay_offers ADD COLUMN owner_follow_up_status TEXT;
ALTER TABLE stay_offers ADD COLUMN manager_follow_up_at TEXT;
ALTER TABLE stay_offers ADD COLUMN manager_follow_up_status TEXT;

ALTER TABLE inquiries ADD COLUMN manager_note TEXT;
ALTER TABLE inquiries ADD COLUMN manager_follow_up_at TEXT;
ALTER TABLE inquiries ADD COLUMN manager_contact_status TEXT;
