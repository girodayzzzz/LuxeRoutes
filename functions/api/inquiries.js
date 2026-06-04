import { errorJson, json, makeId, nowIso, requireDb } from './_utils.js';

const CONTACT_FIELDS = ['email', 'phone', 'whatsapp'];

const cleanString = (value, maxLength = 2000) => String(value || '').trim().slice(0, maxLength);

const getContactValue = (body) => CONTACT_FIELDS
  .map((field) => cleanString(body[field], 320))
  .find(Boolean);

const normalizeInquiry = (body) => {
  const inquiryType = cleanString(body.inquiry_type, 180);
  const submittedFrom = cleanString(body.submitted_from, 1000);
  const name = cleanString(body.name, 220);
  const email = cleanString(body.email, 320).toLowerCase();
  const phone = cleanString(body.phone || body.whatsapp, 120);
  const sourcePage = cleanString(body.source_page, 220);

  return {
    inquiryType,
    submittedFrom,
    name,
    email,
    phone,
    sourcePage,
    hasContact: Boolean(getContactValue(body)),
  };
};

const methodNotAllowed = () => json(
  { error: 'Method not allowed.' },
  { status: 405, headers: { Allow: 'POST' } },
);

export const onRequestPost = async ({ request, env }) => {
  try {
    const db = requireDb(env);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return errorJson('Valid JSON body is required.', 400);
    }

    if (cleanString(body.website)) {
      return json({ ok: true, spam: true });
    }

    const payloadJson = JSON.stringify(body);
    if (new TextEncoder().encode(payloadJson).length > 25000) {
      return errorJson('Inquiry is too large.', 413);
    }

    const inquiry = normalizeInquiry(body);

    if (!inquiry.inquiryType) {
      return errorJson('Inquiry type is required.', 400);
    }

    if (!inquiry.submittedFrom) {
      return errorJson('Submitted page is required.', 400);
    }

    if (!inquiry.hasContact) {
      return errorJson('Email or phone is required.', 400);
    }

    const id = makeId('inquiry');
    const timestamp = nowIso();

    await db.prepare(`
      INSERT INTO inquiries (
        id,
        inquiry_type,
        name,
        email,
        phone,
        source_page,
        submitted_from,
        payload_json,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
    `).bind(
      id,
      inquiry.inquiryType,
      inquiry.name,
      inquiry.email,
      inquiry.phone,
      inquiry.sourcePage,
      inquiry.submittedFrom,
      payloadJson,
      timestamp,
      timestamp,
    ).run();

    return json({ ok: true, id }, { status: 201 });
  } catch (error) {
    return errorJson(error.message || 'Unable to save inquiry.', 500);
  }
};

export const onRequestGet = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestPatch = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;
export const onRequestOptions = methodNotAllowed;
