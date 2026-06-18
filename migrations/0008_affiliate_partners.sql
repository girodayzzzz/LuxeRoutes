CREATE TABLE IF NOT EXISTS affiliate_partners (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  company_name TEXT,
  website TEXT,
  audience TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'active', 'rejected', 'paused')),
  note TEXT,
  approved_by_email TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS affiliate_events (
  id TEXT PRIMARY KEY,
  affiliate_id TEXT,
  referral_code TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('click', 'visit', 'inquiry')),
  target_url TEXT,
  source_url TEXT,
  inquiry_id TEXT,
  visitor_key TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (affiliate_id) REFERENCES affiliate_partners(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_affiliate_partners_email ON affiliate_partners(email);
CREATE INDEX IF NOT EXISTS idx_affiliate_partners_code ON affiliate_partners(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_partners_status ON affiliate_partners(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_code ON affiliate_events(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_type ON affiliate_events(event_type);
CREATE INDEX IF NOT EXISTS idx_affiliate_events_created_at ON affiliate_events(created_at);

ALTER TABLE inquiries ADD COLUMN affiliate_referral_code TEXT;
ALTER TABLE inquiries ADD COLUMN affiliate_partner_id TEXT;
CREATE INDEX IF NOT EXISTS idx_inquiries_affiliate_referral_code ON inquiries(lower(trim(affiliate_referral_code)));
