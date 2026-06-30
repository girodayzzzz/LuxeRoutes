import { nowIso, privateErrorJson, privateJson, requireAccountRole } from '../_utils.js';

const INQUIRY_STATUSES = ['new', 'in_progress', 'waiting', 'approved', 'resolved', 'closed', 'declined'];
const CONTACT_STATUSES = ['new', 'customer_contacted', 'owner_contacted', 'waiting_customer', 'waiting_owner', 'resolved'];
const cleanString = (value, maxLength = 2000) => String(value || '').trim().slice(0, maxLength);
const cleanDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(cleanString(value, 20)) ? cleanString(value, 20) : '';

const ensureManagerInquiryColumns = async (db) => {
  for (const [column, type] of [
    ['manager_note', 'TEXT'],
    ['manager_follow_up_at', 'TEXT'],
    ['manager_contact_status', 'TEXT'],
  ]) {
    try {
      await db.prepare(`ALTER TABLE inquiries ADD COLUMN ${column} ${type}`).run();
    } catch (error) {
      if (!String(error.message || '').toLowerCase().includes('duplicate column')) throw error;
    }
  }
};

const inquirySelect = `
  SELECT id, inquiry_type AS inquiryType, name, email, phone, source_page AS sourcePage,
    submitted_from AS submittedFrom, payload_json AS payloadJson, offer_id AS offerId,
    offer_title AS offerTitle, owner_email AS ownerEmail, manager_email AS managerEmail,
    status, manager_note AS managerNote, manager_follow_up_at AS managerFollowUpAt, manager_contact_status AS managerContactStatus, created_at AS createdAt, updated_at AS updatedAt
  FROM inquiries
`;

export const onRequestGet = async ({ request, env }) => {
  try {
    const auth = await requireAccountRole(request, env, ['manager']);
    if (auth.error) return auth.error;
    await ensureManagerInquiryColumns(auth.db);

    const statement = auth.role === 'admin'
      ? auth.db.prepare(`${inquirySelect} ORDER BY created_at DESC LIMIT 200`)
      : auth.db.prepare(`${inquirySelect} WHERE lower(trim(manager_email)) = ? AND forwarded_to_owner_at IS NOT NULL ORDER BY created_at DESC LIMIT 100`).bind(auth.email);
    const inquiries = await statement.all();
    return privateJson({ email: auth.email, role: auth.role, inquiries: inquiries.results || [] });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to load manager inquiries.', 500);
  }
};

export const onRequestPatch = async ({ request, env }) => {
  try {
    const auth = await requireAccountRole(request, env, ['manager']);
    if (auth.error) return auth.error;
    await ensureManagerInquiryColumns(auth.db);

    const body = await request.json().catch(() => ({}));
    const id = String(body.id || '').trim();
    const status = cleanString(body.status, 40);
    const managerNote = cleanString(body.managerNote, 2000);
    const managerFollowUpAt = cleanDate(body.managerFollowUpAt);
    const managerContactStatus = cleanString(body.managerContactStatus, 80);

    if (!id) return privateErrorJson('Inquiry ID is required.', 400);
    if (body.status !== undefined && !INQUIRY_STATUSES.includes(status)) return privateErrorJson('Invalid inquiry status.', 400);
    if (body.managerContactStatus !== undefined && managerContactStatus && !CONTACT_STATUSES.includes(managerContactStatus)) return privateErrorJson('Invalid contact status.', 400);

    const inquiry = await auth.db.prepare(`${inquirySelect} WHERE id = ? LIMIT 1`).bind(id).first();
    if (!inquiry) return privateErrorJson('Inquiry not found.', 404);
    if (auth.role !== 'admin' && String(inquiry.managerEmail || '').trim().toLowerCase() !== auth.email) {
      return privateErrorJson('This inquiry is not assigned to your manager account.', 403);
    }

    await auth.db.prepare(`UPDATE inquiries SET
      status = CASE WHEN ? IS NULL THEN status ELSE ? END,
      manager_note = CASE WHEN ? IS NULL THEN manager_note ELSE ? END,
      manager_follow_up_at = CASE WHEN ? IS NULL THEN manager_follow_up_at ELSE NULLIF(?, '') END,
      manager_contact_status = CASE WHEN ? IS NULL THEN manager_contact_status ELSE ? END,
      updated_at = ?
      WHERE id = ?`)
      .bind(body.status === undefined ? null : status, status,
        body.managerNote === undefined ? null : managerNote, managerNote,
        body.managerFollowUpAt === undefined ? null : managerFollowUpAt, managerFollowUpAt,
        body.managerContactStatus === undefined ? null : managerContactStatus, managerContactStatus,
        nowIso(), id)
      .run();

    const updated = await auth.db.prepare(`${inquirySelect} WHERE id = ? LIMIT 1`).bind(id).first();
    return privateJson({ inquiry: updated });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to update manager inquiry.', 500);
  }
};
