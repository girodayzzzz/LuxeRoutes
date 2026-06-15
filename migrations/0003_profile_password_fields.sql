ALTER TABLE profiles ADD COLUMN password_hash TEXT;
ALTER TABLE profiles ADD COLUMN password_salt TEXT;
ALTER TABLE profiles ADD COLUMN password_iterations INTEGER;
ALTER TABLE profiles ADD COLUMN password_enabled INTEGER NOT NULL DEFAULT 0;
