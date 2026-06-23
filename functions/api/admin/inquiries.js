import { privateErrorJson, privateJson, nowIso, requireAdmin } from '../_utils.js';

const INQUIRY_STATUSES = ['new', 'in_progress', 'waiting', 'approved', 'resolved', 'closed', 'declined'];

const inquirySelect = `
  SELECT id, inquiry_type AS inquiryType, name, email, phone, source_page AS sourcePage,
    submitted_from AS submittedFrom, payload_json AS payloadJson,
    offer_id AS offerId, offer_title AS offerTitle, owner_email AS ownerEmail, manager_email AS managerEmail,
    affiliate_referral_code AS affiliateReferralCode, affiliate_partner_id AS affiliatePartnerId,
    admin_approved_at AS adminApprovedAt, forwarded_to_owner_at AS forwardedToOwnerAt,
    inquiry_fee_status AS inquiryFeeStatus, inquiry_fee_label AS inquiryFeeLabel,
    status, created_at AS createdAt, updated_at AS updatedAt
  FROM inquiries
`;

export const onRequestGet = async ({ request, env }) => {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const inquiries = await auth.db.prepare(`${inquirySelect} ORDER BY created_at DESC LIMIT 200`).all();
    return privateJson({ inquiries: inquiries.results || [] });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to load inquiries.', 500);
  }
};

export const onRequestPatch = async ({ request, env }) => {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const id = String(body.id || '').trim();
    const status = String(body.status || '').trim();

    if (!id) return privateErrorJson('Inquiry ID is required.', 400);
    if (!INQUIRY_STATUSES.includes(status)) return privateErrorJson('Invalid inquiry status.', 400);

    const timestamp = nowIso();
    if (status === 'approved') {
      await auth.db.prepare(`
        UPDATE inquiries SET status = ?,
          admin_approved_at = COALESCE(admin_approved_at, ?),
          forwarded_to_owner_at = COALESCE(forwarded_to_owner_at, ?),
          inquiry_fee_status = CASE WHEN NULLIF(owner_email, '') IS NOT NULL THEN 'billable' ELSE inquiry_fee_status END,
          inquiry_fee_label = CASE WHEN NULLIF(owner_email, '') IS NOT NULL THEN COALESCE(NULLIF(inquiry_fee_label, ''), 'Billable approved LuxeRoutes inquiry') ELSE inquiry_fee_label END,
          updated_at = ?
        WHERE id = ?
      `).bind(status, timestamp, timestamp, timestamp, id).run();
    } else {
      await auth.db.prepare(`
        UPDATE inquiries SET status = ?, updated_at = ?
        WHERE id = ?
      `).bind(status, timestamp, id).run();
    }

    const inquiry = await auth.db.prepare(`${inquirySelect} WHERE id = ? LIMIT 1`).bind(id).first();
    if (!inquiry) return privateErrorJson('Inquiry not found.', 404);

    return privateJson({ inquiry });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to update inquiry.', 500);
  }
};
