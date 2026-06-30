import { getAccountSessionEmail, privateErrorJson, privateJson, requireDb } from '../_utils.js';
import { ensureAffiliateSchema, getAffiliateByEmail, publicAffiliate } from './_utils.js';

const countFor = async (db, code, eventType = '') => {
  const whereType = eventType ? 'AND event_type = ?' : '';
  const statement = db.prepare(`SELECT COUNT(*) AS count FROM affiliate_events WHERE lower(trim(referral_code)) = ? ${whereType}`);
  const row = eventType ? await statement.bind(code, eventType).first() : await statement.bind(code).first();
  return Number(row?.count || 0);
};

const recentEventsFor = async (db, code) => {
  const events = await db.prepare(`
    SELECT event_type AS eventType, target_url AS targetUrl, source_url AS sourceUrl,
      inquiry_id AS inquiryId, created_at AS createdAt
    FROM affiliate_events
    WHERE lower(trim(referral_code)) = ?
    ORDER BY created_at DESC
    LIMIT 12
  `).bind(code).all();
  return events.results || [];
};

export const onRequestGet = async ({ request, env }) => {
  try {
    const email = await getAccountSessionEmail(request, env);
    if (!email) return privateErrorJson('Verified account session is required.', 401);

    const db = requireDb(env);
    await ensureAffiliateSchema(db);
    const affiliate = await getAffiliateByEmail(db, email);
    if (!affiliate) return privateJson({ affiliate: null, stats: { visits: 0, inquiries: 0, totalEvents: 0 }, recentEvents: [] });

    const code = String(affiliate.referralCode || '').toLowerCase();
    const [visits, inquiries, totalEvents, recentEvents] = await Promise.all([
      countFor(db, code, 'visit'),
      countFor(db, code, 'inquiry'),
      countFor(db, code),
      recentEventsFor(db, code),
    ]);

    return privateJson({ affiliate: publicAffiliate(affiliate), stats: { visits, inquiries, totalEvents }, recentEvents });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to load affiliate stats.', 500);
  }
};
