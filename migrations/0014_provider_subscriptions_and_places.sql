-- Provider advertising subscriptions and moderated accommodation directory.
CREATE TABLE IF NOT EXISTS provider_subscriptions (
  id TEXT PRIMARY KEY, owner_email TEXT NOT NULL UNIQUE, stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE, stripe_price_id TEXT, plan TEXT CHECK(plan IN ('basic','premium','featured')),
  status TEXT NOT NULL DEFAULT 'inactive', current_period_end TEXT, cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  last_event_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accommodation_listings (
  id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
  description TEXT NOT NULL, country TEXT NOT NULL, region TEXT NOT NULL, location TEXT NOT NULL,
  accommodation_type TEXT NOT NULL, price_from REAL, currency TEXT NOT NULL DEFAULT 'EUR', max_guests INTEGER NOT NULL,
  amenities TEXT NOT NULL DEFAULT '[]', contact_name TEXT, contact_email TEXT NOT NULL, contact_phone TEXT,
  website_url TEXT, image_urls TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','pending','approved','rejected','paused')),
  featured INTEGER NOT NULL DEFAULT 0, rejection_reason TEXT, views INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0, approved_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_listings_public ON accommodation_listings(status, featured, updated_at);
CREATE INDEX IF NOT EXISTS idx_listings_owner ON accommodation_listings(owner_email, updated_at);

CREATE TABLE IF NOT EXISTS listing_inquiries (
  id TEXT PRIMARY KEY, listing_id TEXT NOT NULL, owner_email TEXT NOT NULL, guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL, guest_phone TEXT, message TEXT NOT NULL, consent INTEGER NOT NULL,
  created_at TEXT NOT NULL, FOREIGN KEY(listing_id) REFERENCES accommodation_listings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_listing_inquiries_owner ON listing_inquiries(owner_email, created_at);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY, event_type TEXT NOT NULL, processed_at TEXT NOT NULL
);
