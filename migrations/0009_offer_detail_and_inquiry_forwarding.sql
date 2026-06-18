ALTER TABLE stay_offers ADD COLUMN accommodation_details TEXT NOT NULL DEFAULT '';
ALTER TABLE stay_offers ADD COLUMN pricing_details TEXT NOT NULL DEFAULT '';
ALTER TABLE stay_offers ADD COLUMN gallery_urls TEXT NOT NULL DEFAULT '';
ALTER TABLE stay_offers ADD COLUMN external_availability_url TEXT NOT NULL DEFAULT '';
ALTER TABLE stay_offers ADD COLUMN owner_profile_snapshot TEXT NOT NULL DEFAULT '';

ALTER TABLE inquiries ADD COLUMN admin_approved_at TEXT;
ALTER TABLE inquiries ADD COLUMN forwarded_to_owner_at TEXT;
ALTER TABLE inquiries ADD COLUMN inquiry_fee_status TEXT NOT NULL DEFAULT 'not_billable';
ALTER TABLE inquiries ADD COLUMN inquiry_fee_label TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_inquiries_forwarded_owner ON inquiries(owner_email, forwarded_to_owner_at);
