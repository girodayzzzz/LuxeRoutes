import { privateErrorJson, privateJson, nowIso, requireAdmin } from '../_utils.js';
import { cleanAffiliateCode, ensureAffiliateSchema } from '../affiliate/_utils.js';

const AFFILIATE_STATUSES = ['pending_review', 'active', 'rejected', 'paused'];

const affiliateSelect = `
  SELECT a.id, a.email, a.name, a.company_name AS companyName, a.website, a.audience,
    a.referral_code AS referralCode, a.status, a.note, a.approved_by_email AS approvedByEmail,
    a.created_at AS createdAt, a.updated_at AS updatedAt,
    COALESCE(SUM(CASE WHEN e.event_type = 'visit' THEN 1 ELSE 0 END), 0) AS visits,
    COALESCE(SUM(CASE WHEN e.event_type = 'inquiry' THEN 1 ELSE 0 END), 0) AS inquiries,
    COALESCE(COUNT(e.id), 0) AS totalEvents
  FROM affiliate_partners a
  LEFT JOIN affiliate_events e ON lower(trim(e.referral_code)) = lower(trim(a.referral_code))
`;

export const onRequestGet = async ({ request, env }) => {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    await ensureAffiliateSchema(auth.db);

    const affiliates = await auth.db.prepare(`
      ${affiliateSelect}
      GROUP BY a.id
      ORDER BY a.updated_at DESC
      LIMIT 500
    `).all();

    return privateJson({ affiliates: affiliates.results || [] });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to load affiliates.', 500);
  }
};

export const onRequestPatch = async ({ request, env }) => {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    await ensureAffiliateSchema(auth.db);

    const body = await request.json().catch(() => ({}));
    const id = String(body.id || '').trim();
    const status = String(body.status || '').trim();
    const note = String(body.note || '').trim().slice(0, 2000);
    const requestedCode = cleanAffiliateCode(body.referralCode || body.referral_code);

    if (!id) return privateErrorJson('Affiliate ID is required.', 400);
    if (!AFFILIATE_STATUSES.includes(status)) return privateErrorJson('Invalid affiliate status.', 400);

    const existing = await auth.db.prepare('SELECT referral_code AS referralCode FROM affiliate_partners WHERE id = ? LIMIT 1').bind(id).first();
    if (!existing) return privateErrorJson('Affiliate partner not found.', 404);

    const referralCode = requestedCode || existing.referralCode;
    await auth.db.prepare(`
      UPDATE affiliate_partners
      SET status = ?, note = ?, referral_code = ?, approved_by_email = CASE WHEN ? = 'active' THEN ? ELSE approved_by_email END, updated_at = ?
      WHERE id = ?
    `).bind(status, note, referralCode, status, auth.email, nowIso(), id).run();

    const affiliates = await auth.db.prepare(`
      ${affiliateSelect}
      WHERE a.id = ?
      GROUP BY a.id
      LIMIT 1
    `).bind(id).all();

    return privateJson({ affiliate: affiliates.results?.[0] || null });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to update affiliate partner.', 500);
  }
};
