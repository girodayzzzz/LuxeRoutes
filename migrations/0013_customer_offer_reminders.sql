ALTER TABLE customer_offers ADD COLUMN customer_reminder_sent_at TEXT;
ALTER TABLE customer_offers ADD COLUMN internal_reminder_sent_at TEXT;

CREATE INDEX IF NOT EXISTS idx_customer_offers_customer_reminder ON customer_offers(status, customer_responded_at, customer_reminder_sent_at);
CREATE INDEX IF NOT EXISTS idx_customer_offers_internal_reminder ON customer_offers(status, commission_status, internal_reminder_sent_at);
