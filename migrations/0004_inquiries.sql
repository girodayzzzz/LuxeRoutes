CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  inquiry_type TEXT NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  source_page TEXT,
  submitted_from TEXT,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries(email);
