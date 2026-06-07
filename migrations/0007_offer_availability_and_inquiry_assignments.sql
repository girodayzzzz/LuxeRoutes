ALTER TABLE stay_offers ADD COLUMN available_from TEXT;
ALTER TABLE stay_offers ADD COLUMN available_to TEXT;
ALTER TABLE stay_offers ADD COLUMN discount_label TEXT NOT NULL DEFAULT '';
ALTER TABLE stay_offers ADD COLUMN availability_notes TEXT NOT NULL DEFAULT '';

ALTER TABLE inquiries ADD COLUMN offer_id TEXT;
ALTER TABLE inquiries ADD COLUMN offer_title TEXT;
ALTER TABLE inquiries ADD COLUMN owner_email TEXT;
ALTER TABLE inquiries ADD COLUMN manager_email TEXT;

CREATE INDEX IF NOT EXISTS idx_stay_offers_available_from ON stay_offers(available_from);
CREATE INDEX IF NOT EXISTS idx_stay_offers_available_to ON stay_offers(available_to);
CREATE INDEX IF NOT EXISTS idx_inquiries_offer_id ON inquiries(offer_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_owner_email ON inquiries(lower(trim(owner_email)));
CREATE INDEX IF NOT EXISTS idx_inquiries_manager_email ON inquiries(lower(trim(manager_email)));
