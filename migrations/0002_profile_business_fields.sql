-- Add optional business context for customers, owners, and managers.
-- Apply with: wrangler d1 migrations apply luxeroutes-db --remote

ALTER TABLE profiles ADD COLUMN company_name TEXT;
ALTER TABLE profiles ADD COLUMN company_website TEXT;
ALTER TABLE profiles ADD COLUMN business_context TEXT;
