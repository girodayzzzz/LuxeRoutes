CREATE TABLE IF NOT EXISTS stay_offers (
  id TEXT PRIMARY KEY,
  source_inquiry_id TEXT UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  stay_type TEXT NOT NULL,
  options TEXT NOT NULL DEFAULT '',
  location_label TEXT NOT NULL,
  guest_label TEXT NOT NULL DEFAULT '',
  price_label TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  image_alt TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'unpublished')),
  published_at TEXT,
  created_by_email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (source_inquiry_id) REFERENCES inquiries(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stay_offers_status_published_at ON stay_offers(status, published_at);
CREATE INDEX IF NOT EXISTS idx_stay_offers_country_type ON stay_offers(country, stay_type);
