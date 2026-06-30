import { getAccountSessionEmail, getNotificationRecipients, normalizeEmail, nowIso, privateErrorJson, privateJson, requireDb, sendTransactionalEmail } from './_utils.js';

const CUSTOMER_ACTIONS = ['customer_interested', 'changes_requested', 'declined'];
const cleanString = (value, maxLength = 2000) => String(value || '').trim().slice(0, maxLength);

const customerOfferSelect = `
  SELECT id, inquiry_id AS inquiryId, customer_email AS customerEmail, offer_id AS offerId,
    owner_email AS ownerEmail, manager_email AS managerEmail, title, destination_label AS destinationLabel,
    owner_price_amount AS ownerPriceAmount, currency, price_note AS priceNote, included_items AS includedItems,
    coupon_label AS couponLabel, perk_label AS perkLabel, customer_message AS customerMessage, internal_note AS internalNote,
    status, expires_at AS expiresAt, customer_responded_at AS customerRespondedAt,
    created_at AS createdAt, updated_at AS updatedAt
  FROM customer_offers
`;


const responseLabel = (status = '') => ({
  customer_interested: 'interested',
  changes_requested: 'requested changes',
  lost: 'declined',
}[status] || status.replaceAll('_', ' '));

const notifyProposalResponse = async (env = {}, offer = {}, responseMessage = '', origin = '') => {
  const recipients = [
    ...getNotificationRecipients(env, ['CUSTOMER_OFFER_NOTIFICATION_EMAILS', 'ADMIN_NOTIFICATION_EMAILS', 'ADMIN_EMAILS']),
    normalizeEmail(offer.managerEmail),
  ].filter(Boolean);
  const uniqueRecipients = [...new Set(recipients)];
  if (!uniqueRecipients.length) return;
  const adminUrl = `${origin || 'https://luxeroutes.eu'}/admin/index.html#customer-offers-title`;
  const text = [
    `Customer proposal response: ${responseLabel(offer.status)}`,
    '',
    `Proposal: ${offer.title}`,
    `Customer: ${offer.customerEmail}`,
    offer.destinationLabel ? `Destination: ${offer.destinationLabel}` : '',
    offer.ownerPriceAmount ? `Owner/partner quote: ${offer.currency || 'EUR'} ${offer.ownerPriceAmount}` : '',
    responseMessage ? `Customer message: ${responseMessage}` : '',
    '',
    `Review in admin: ${adminUrl}`,
  ].filter(Boolean).join('\n');
  await sendTransactionalEmail(env, {
    to: uniqueRecipients,
    subject: `Customer ${responseLabel(offer.status)}: ${offer.title}`,
    text,
  });
};

const ensureCustomerOffersSchema = async (db) => {
  await db.prepare(`CREATE TABLE IF NOT EXISTS customer_offers (
    id TEXT PRIMARY KEY,
    inquiry_id TEXT,
    customer_email TEXT NOT NULL,
    offer_id TEXT,
    owner_email TEXT,
    manager_email TEXT,
    title TEXT NOT NULL,
    destination_label TEXT,
    owner_price_amount REAL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    price_note TEXT,
    included_items TEXT,
    coupon_id TEXT,
    coupon_label TEXT,
    perk_label TEXT,
    customer_message TEXT,
    internal_note TEXT,
    commission_type TEXT NOT NULL DEFAULT 'percent',
    commission_value REAL NOT NULL DEFAULT 0,
    estimated_commission_amount REAL NOT NULL DEFAULT 0,
    commission_status TEXT NOT NULL DEFAULT 'not_due',
    status TEXT NOT NULL DEFAULT 'draft',
    expires_at TEXT,
    customer_responded_at TEXT,
    owner_confirmed_at TEXT,
    commission_paid_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_customer_offers_customer_email ON customer_offers(lower(trim(customer_email)), status)').run();
};

export const onRequestGet = async ({ request, env }) => {
  try {
    const email = await getAccountSessionEmail(request, env);
    if (!email) return privateErrorJson('Verified account session is required.', 401);
    const db = requireDb(env);
    await ensureCustomerOffersSchema(db);
    const offers = await db.prepare(`${customerOfferSelect} WHERE lower(trim(customer_email)) = ? AND status != 'draft' ORDER BY updated_at DESC LIMIT 50`).bind(email).all();
    return privateJson({ customerOffers: offers.results || [] });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to load customer proposals.', 500);
  }
};

export const onRequestPatch = async ({ request, env }) => {
  try {
    const email = await getAccountSessionEmail(request, env);
    if (!email) return privateErrorJson('Verified account session is required.', 401);
    const db = requireDb(env);
    await ensureCustomerOffersSchema(db);
    const body = await request.json().catch(() => ({}));
    const id = cleanString(body.id, 160);
    const action = cleanString(body.action || body.status, 40);
    const message = cleanString(body.message, 1500);
    if (!id) return privateErrorJson('Proposal ID is required.', 400);
    if (!CUSTOMER_ACTIONS.includes(action)) return privateErrorJson('Choose a valid proposal response.', 400);
    const existing = await db.prepare(`${customerOfferSelect} WHERE id = ? LIMIT 1`).bind(id).first();
    if (!existing) return privateErrorJson('Proposal not found.', 404);
    if (normalizeEmail(existing.customerEmail) !== email) return privateErrorJson('This proposal is not assigned to your account.', 403);
    const status = action === 'declined' ? 'lost' : action;
    const timestamp = nowIso();
    await db.prepare(`UPDATE customer_offers
      SET status = ?, customer_responded_at = COALESCE(customer_responded_at, ?), customer_message = CASE WHEN ? = '' THEN customer_message ELSE ? END, updated_at = ?
      WHERE id = ?`).bind(status, timestamp, message, message, timestamp, id).run();
    const saved = await db.prepare(`${customerOfferSelect} WHERE id = ? LIMIT 1`).bind(id).first();
    try { await notifyProposalResponse(env, saved, message, new URL(request.url).origin); } catch (notificationError) { console.warn('Customer proposal response notification failed:', notificationError.message || notificationError); }
    return privateJson({ customerOffer: saved });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to update proposal response.', 500);
  }
};
