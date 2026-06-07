import { privateErrorJson, privateJson, requireAccountRole } from '../_utils.js';

const inquirySelect = `
  SELECT id, inquiry_type AS inquiryType, name, email, phone, source_page AS sourcePage,
    submitted_from AS submittedFrom, payload_json AS payloadJson, offer_id AS offerId,
    offer_title AS offerTitle, owner_email AS ownerEmail, manager_email AS managerEmail,
    status, created_at AS createdAt, updated_at AS updatedAt
  FROM inquiries
`;

export const onRequestGet = async ({ request, env }) => {
  try {
    const auth = await requireAccountRole(request, env, ['owner']);
    if (auth.error) return auth.error;

    const statement = auth.role === 'admin'
      ? auth.db.prepare(`${inquirySelect} ORDER BY created_at DESC LIMIT 200`)
      : auth.db.prepare(`${inquirySelect} WHERE lower(trim(owner_email)) = ? ORDER BY created_at DESC LIMIT 100`).bind(auth.email);
    const inquiries = await statement.all();
    return privateJson({ email: auth.email, role: auth.role, inquiries: inquiries.results || [] });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to load owner inquiries.', 500);
  }
};
