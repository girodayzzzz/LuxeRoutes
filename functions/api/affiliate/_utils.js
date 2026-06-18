import { makeId, normalizeEmail, nowIso } from '../_utils.js';

export const affiliateSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS affiliate_partners (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    company_name TEXT,
    website TEXT,
    audience TEXT,
    referral_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'active', 'rejected', 'paused')),
    note TEXT,
    approved_by_email TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS affiliate_events (
    id TEXT PRIMARY KEY,
    affiliate_id TEXT,
    referral_code TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('click', 'visit', 'inquiry')),
    target_url TEXT,
    source_url TEXT,
    inquiry_id TEXT,
    visitor_key TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (affiliate_id) REFERENCES affiliate_partners(id) ON DELETE SET NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_affiliate_partners_email ON affiliate_partners(email)',
  'CREATE INDEX IF NOT EXISTS idx_affiliate_partners_code ON affiliate_partners(referral_code)',
  'CREATE INDEX IF NOT EXISTS idx_affiliate_partners_status ON affiliate_partners(status)',
  'CREATE INDEX IF NOT EXISTS idx_affiliate_events_code ON affiliate_events(referral_code)',
  'CREATE INDEX IF NOT EXISTS idx_affiliate_events_type ON affiliate_events(event_type)',
  'CREATE INDEX IF NOT EXISTS idx_affiliate_events_created_at ON affiliate_events(created_at)',
];

const ensureOptionalColumn = async (db, table, column, definition) => {
  const columns = await db.prepare(`PRAGMA table_info(${table})`).all();
  const hasColumn = Array.isArray(columns?.results)
    && columns.results.some((entry) => entry.name === column);
  if (!hasColumn) await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
};

export const ensureAffiliateSchema = async (db) => {
  for (const statement of affiliateSchemaStatements) await db.prepare(statement).run();
  await ensureOptionalColumn(db, 'inquiries', 'affiliate_referral_code', 'TEXT');
  await ensureOptionalColumn(db, 'inquiries', 'affiliate_partner_id', 'TEXT');
};

const slugify = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 40);

export const cleanAffiliateCode = (value) => slugify(value).replace(/-/g, '') || '';

export const generateAffiliateCode = (name, email) => {
  const base = slugify(name) || normalizeEmail(email).split('@')[0] || 'affiliate';
  return `${base.replace(/-/g, '').slice(0, 18)}${Math.floor(1000 + Math.random() * 9000)}`;
};

export const publicAffiliate = (affiliate = null) => affiliate ? {
  id: affiliate.id,
  email: affiliate.email,
  name: affiliate.name,
  companyName: affiliate.companyName,
  website: affiliate.website,
  audience: affiliate.audience,
  referralCode: affiliate.referralCode,
  status: affiliate.status,
  note: affiliate.note,
  approvedByEmail: affiliate.approvedByEmail,
  createdAt: affiliate.createdAt,
  updatedAt: affiliate.updatedAt,
} : null;

export const getAffiliateByCode = async (db, referralCode) => {
  const code = cleanAffiliateCode(referralCode);
  if (!code) return null;
  return db.prepare(`
    SELECT id, email, name, company_name AS companyName, website, audience,
      referral_code AS referralCode, status, note, approved_by_email AS approvedByEmail,
      created_at AS createdAt, updated_at AS updatedAt
    FROM affiliate_partners
    WHERE lower(trim(referral_code)) = ?
    LIMIT 1
  `).bind(code).first();
};

export const getAffiliateByEmail = async (db, email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  return db.prepare(`
    SELECT id, email, name, company_name AS companyName, website, audience,
      referral_code AS referralCode, status, note, approved_by_email AS approvedByEmail,
      created_at AS createdAt, updated_at AS updatedAt
    FROM affiliate_partners
    WHERE lower(trim(email)) = ?
    LIMIT 1
  `).bind(normalizedEmail).first();
};

export const recordAffiliateEvent = async (db, { affiliate = null, referralCode = '', eventType = 'click', targetUrl = '', sourceUrl = '', inquiryId = null, visitorKey = '' } = {}) => {
  const code = cleanAffiliateCode(referralCode || affiliate?.referralCode);
  if (!code || !['click', 'visit', 'inquiry'].includes(eventType)) return null;
  const timestamp = nowIso();
  const id = makeId('affevt');
  await db.prepare(`
    INSERT INTO affiliate_events (id, affiliate_id, referral_code, event_type, target_url, source_url, inquiry_id, visitor_key, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, affiliate?.id || null, code, eventType, String(targetUrl || '').slice(0, 1000), String(sourceUrl || '').slice(0, 1000), inquiryId || null, String(visitorKey || '').slice(0, 120), timestamp).run();
  return { id, createdAt: timestamp };
};
