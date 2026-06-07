ALTER TABLE stay_offers ADD COLUMN owner_email TEXT;
ALTER TABLE stay_offers ADD COLUMN manager_email TEXT;
ALTER TABLE stay_offers ADD COLUMN partner_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (partner_status IN ('draft', 'pending_review', 'changes_requested', 'approved', 'published', 'archived'));
ALTER TABLE stay_offers ADD COLUMN owner_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE stay_offers ADD COLUMN manager_notes TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_stay_offers_owner_email ON stay_offers(owner_email);
CREATE INDEX IF NOT EXISTS idx_stay_offers_manager_email ON stay_offers(manager_email);
CREATE INDEX IF NOT EXISTS idx_stay_offers_partner_status ON stay_offers(partner_status);
