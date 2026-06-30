import { makeId, normalizeEmail, nowIso, privateErrorJson, privateJson, requireAdmin } from '../_utils.js';

const COUPON_STATUSES = ['active', 'used', 'expired', 'revoked'];
const cleanString = (value, maxLength = 1000) => String(value || '').trim().slice(0, maxLength);
const cleanDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(cleanString(value, 20)) ? cleanString(value, 20) : '';

const couponSelect = `
  SELECT id, email, code, title, description, status, expires_at AS expiresAt,
    redeemed_at AS redeemedAt, note, created_at AS createdAt, updated_at AS updatedAt
  FROM account_coupons
`;

const ensureCouponsSchema = async (db) => {
  await db.prepare(`CREATE TABLE IF NOT EXISTS account_coupons (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    expires_at TEXT,
    redeemed_at TEXT,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_account_coupons_email_status ON account_coupons(email, status)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_account_coupons_code ON account_coupons(code)').run();
};

const normalizeCoupon = (body = {}) => ({
  email: normalizeEmail(body.email),
  code: cleanString(body.code, 80).toUpperCase().replace(/\s+/g, '-'),
  title: cleanString(body.title, 180),
  description: cleanString(body.description, 1000),
  status: COUPON_STATUSES.includes(cleanString(body.status, 30).toLowerCase()) ? cleanString(body.status, 30).toLowerCase() : 'active',
  expiresAt: cleanDate(body.expiresAt),
  note: cleanString(body.note, 500),
});

export const onRequestGet = async ({ request, env }) => {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    await ensureCouponsSchema(auth.db);
    const coupons = await auth.db.prepare(`${couponSelect} ORDER BY updated_at DESC LIMIT 200`).all();
    return privateJson({ coupons: coupons.results || [] });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to load coupons.', 500);
  }
};

export const onRequestPost = async ({ request, env }) => {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    await ensureCouponsSchema(auth.db);
    const coupon = normalizeCoupon(await request.json().catch(() => ({})));
    if (!coupon.email || !coupon.email.includes('@')) return privateErrorJson('A valid customer email is required.', 400);
    if (!coupon.code || !coupon.title) return privateErrorJson('Coupon code and title are required.', 400);
    const timestamp = nowIso();
    const id = makeId('coupon');
    await auth.db.prepare(`INSERT INTO account_coupons (id, email, code, title, description, status, expires_at, redeemed_at, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'used' THEN ? ELSE NULL END, ?, ?, ?)`)
      .bind(id, coupon.email, coupon.code, coupon.title, coupon.description, coupon.status, coupon.expiresAt || null, coupon.status, timestamp, coupon.note, timestamp, timestamp).run();
    const saved = await auth.db.prepare(`${couponSelect} WHERE id = ? LIMIT 1`).bind(id).first();
    return privateJson({ coupon: saved }, { status: 201 });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to save coupon.', 500);
  }
};

export const onRequestPatch = async ({ request, env }) => {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    await ensureCouponsSchema(auth.db);
    const body = await request.json().catch(() => ({}));
    const id = cleanString(body.id, 160);
    const coupon = normalizeCoupon(body);
    if (!id) return privateErrorJson('Coupon ID is required.', 400);
    const existing = await auth.db.prepare(`${couponSelect} WHERE id = ? LIMIT 1`).bind(id).first();
    if (!existing) return privateErrorJson('Coupon not found.', 404);
    const timestamp = nowIso();
    await auth.db.prepare(`UPDATE account_coupons SET
      email = CASE WHEN ? IS NULL THEN email ELSE ? END,
      code = CASE WHEN ? IS NULL THEN code ELSE ? END,
      title = CASE WHEN ? IS NULL THEN title ELSE ? END,
      description = CASE WHEN ? IS NULL THEN description ELSE ? END,
      status = CASE WHEN ? IS NULL THEN status ELSE ? END,
      expires_at = CASE WHEN ? IS NULL THEN expires_at ELSE NULLIF(?, '') END,
      redeemed_at = CASE WHEN ? = 'used' AND redeemed_at IS NULL THEN ? WHEN ? IS NOT NULL AND ? != 'used' THEN NULL ELSE redeemed_at END,
      note = CASE WHEN ? IS NULL THEN note ELSE ? END,
      updated_at = ?
      WHERE id = ?`)
      .bind(body.email === undefined ? null : coupon.email, coupon.email,
        body.code === undefined ? null : coupon.code, coupon.code,
        body.title === undefined ? null : coupon.title, coupon.title,
        body.description === undefined ? null : coupon.description, coupon.description,
        body.status === undefined ? null : coupon.status, coupon.status,
        body.expiresAt === undefined ? null : coupon.expiresAt, coupon.expiresAt,
        coupon.status, timestamp, body.status === undefined ? null : coupon.status, coupon.status,
        body.note === undefined ? null : coupon.note, coupon.note, timestamp, id).run();
    const saved = await auth.db.prepare(`${couponSelect} WHERE id = ? LIMIT 1`).bind(id).first();
    return privateJson({ coupon: saved });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to update coupon.', 500);
  }
};
