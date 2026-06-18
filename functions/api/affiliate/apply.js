import { errorJson, json, makeId, normalizeEmail, nowIso, requireDb } from '../_utils.js';
import { ensureAffiliateSchema, generateAffiliateCode, getAffiliateByEmail } from './_utils.js';

const cleanString = (value, maxLength = 2000) => String(value || '').trim().slice(0, maxLength);

export const onRequestPost = async ({ request, env }) => {
  try {
    const db = requireDb(env);
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body.email);
    const name = cleanString(body.name, 220);
    const companyName = cleanString(body.companyName || body.company_name, 220);
    const website = cleanString(body.websiteUrl || body.website || body.website_url, 1000);
    const audience = cleanString(body.audience, 4000);
    const note = cleanString(body.note || body.message, 2000);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorJson('Valid email is required.', 400);
    if (!name) return errorJson('Full name is required.', 400);
    if (!audience) return errorJson('Audience and promotion plan are required.', 400);

    await ensureAffiliateSchema(db);
    const existing = await getAffiliateByEmail(db, email);
    const timestamp = nowIso();

    if (existing) {
      await db.prepare(`
        UPDATE affiliate_partners
        SET name = ?, company_name = ?, website = ?, audience = ?, note = ?,
          status = CASE WHEN status = 'rejected' THEN 'pending_review' ELSE status END,
          updated_at = ?
        WHERE id = ?
      `).bind(name, companyName, website, audience, note, timestamp, existing.id).run();
      return json({ ok: true, status: existing.status === 'rejected' ? 'pending_review' : existing.status, referralCode: existing.referralCode });
    }

    const referralCode = generateAffiliateCode(name, email);
    await db.prepare(`
      INSERT INTO affiliate_partners (id, email, name, company_name, website, audience, referral_code, status, note, approved_by_email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, NULL, ?, ?)
    `).bind(makeId('aff'), email, name, companyName, website, audience, referralCode, note, timestamp, timestamp).run();

    return json({ ok: true, status: 'pending_review', referralCode }, { status: 201 });
  } catch (error) {
    return errorJson(error.message || 'Unable to save affiliate application.', 500);
  }
};
