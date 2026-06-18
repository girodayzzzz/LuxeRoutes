import { json, requireDb } from '../_utils.js';
import { cleanAffiliateCode, ensureAffiliateSchema, getAffiliateByCode, recordAffiliateEvent } from './_utils.js';

export const onRequestPost = async ({ request, env }) => {
  try {
    const db = requireDb(env);
    const body = await request.json().catch(() => ({}));
    const referralCode = cleanAffiliateCode(body.referralCode || body.ref || body.code);
    if (!referralCode) return json({ ok: true, tracked: false });

    await ensureAffiliateSchema(db);
    const affiliate = await getAffiliateByCode(db, referralCode);
    if (!affiliate || affiliate.status !== 'active') return json({ ok: true, tracked: false });

    await recordAffiliateEvent(db, {
      affiliate,
      eventType: 'visit',
      targetUrl: body.targetUrl,
      sourceUrl: body.sourceUrl,
      visitorKey: body.visitorKey,
    });
    return json({ ok: true, tracked: true });
  } catch (error) {
    return json({ ok: false, tracked: false });
  }
};
