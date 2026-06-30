CREATE TABLE IF NOT EXISTS customer_offers (
  id TEXT PRIMARY KEY,
  inquiry_id TEXT,
  customer_email TEXT NOT NULL,
  offer_id TEXT,
  owner_email TEXT,
  manager_email TEXT,
  title TEXT NOT NULL,
  destination_label TEXT,
  owner_price_amount REAL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  price_note TEXT,
  included_items TEXT,
  coupon_id TEXT,
  coupon_label TEXT,
  perk_label TEXT,
  customer_message TEXT,
  internal_note TEXT,
  commission_type TEXT NOT NULL DEFAULT 'percent' CHECK (commission_type IN ('percent', 'fixed', 'lead_fee', 'concierge_fee', 'none')),
  commission_value REAL NOT NULL DEFAULT 0,
  estimated_commission_amount REAL NOT NULL DEFAULT 0,
  commission_status TEXT NOT NULL DEFAULT 'not_due' CHECK (commission_status IN ('not_due', 'due', 'invoiced', 'paid', 'waived')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'customer_interested', 'changes_requested', 'owner_confirmed', 'won', 'lost', 'expired', 'cancelled')),
  expires_at TEXT,
  customer_responded_at TEXT,
  owner_confirmed_at TEXT,
  commission_paid_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_offers_customer_email ON customer_offers(lower(trim(customer_email)), status);
CREATE INDEX IF NOT EXISTS idx_customer_offers_inquiry ON customer_offers(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_customer_offers_offer ON customer_offers(offer_id);
CREATE INDEX IF NOT EXISTS idx_customer_offers_status ON customer_offers(status, updated_at);
