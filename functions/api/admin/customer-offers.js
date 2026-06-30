import { makeId, normalizeEmail, nowIso, privateErrorJson, privateJson, requireAdmin, sendTransactionalEmail } from '../_utils.js';

const OFFER_STATUSES = ['draft', 'sent', 'customer_interested', 'changes_requested', 'owner_confirmed', 'won', 'lost', 'expired', 'cancelled'];
const COMMISSION_STATUSES = ['not_due', 'due', 'invoiced', 'paid', 'waived'];
const COMMISSION_TYPES = ['percent', 'fixed', 'lead_fee', 'concierge_fee', 'none'];
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];

const cleanString = (value, maxLength = 2000) => String(value || '').trim().slice(0, maxLength);
const cleanDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(cleanString(value, 20)) ? cleanString(value, 20) : '';
const cleanNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : 0;
};
const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[character]));

const moneyLabel = (offer = {}) => Number(offer.ownerPriceAmount || 0) > 0
  ? `${offer.currency || 'EUR'} ${Number(offer.ownerPriceAmount).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  : 'Owner price pending';

const splitLines = (value = '') => cleanString(value, 2000).split(/[\n;]+/).map((item) => item.trim()).filter(Boolean).slice(0, 8);


const ensureOptionalColumn = async (db, table, column, type) => {
  try {
    await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
  } catch (error) {
    if (!String(error.message || '').toLowerCase().includes('duplicate column')) throw error;
  }
};

const customerOfferSelect = `
  SELECT id, inquiry_id AS inquiryId, customer_email AS customerEmail, offer_id AS offerId,
    owner_email AS ownerEmail, manager_email AS managerEmail, title, destination_label AS destinationLabel,
    owner_price_amount AS ownerPriceAmount, currency, price_note AS priceNote, included_items AS includedItems,
    coupon_id AS couponId, coupon_label AS couponLabel, perk_label AS perkLabel, customer_message AS customerMessage,
    internal_note AS internalNote, commission_type AS commissionType, commission_value AS commissionValue,
    estimated_commission_amount AS estimatedCommissionAmount, commission_status AS commissionStatus, status,
    expires_at AS expiresAt, customer_responded_at AS customerRespondedAt, owner_confirmed_at AS ownerConfirmedAt,
    commission_paid_at AS commissionPaidAt, customer_reminder_sent_at AS customerReminderSentAt,
    internal_reminder_sent_at AS internalReminderSentAt, created_at AS createdAt, updated_at AS updatedAt
  FROM customer_offers
`;

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
    customer_reminder_sent_at TEXT,
    internal_reminder_sent_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  await ensureOptionalColumn(db, 'customer_offers', 'customer_reminder_sent_at', 'TEXT');
  await ensureOptionalColumn(db, 'customer_offers', 'internal_reminder_sent_at', 'TEXT');
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_customer_offers_customer_email ON customer_offers(lower(trim(customer_email)), status)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_customer_offers_inquiry ON customer_offers(inquiry_id)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_customer_offers_status ON customer_offers(status, updated_at)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_customer_offers_customer_reminder ON customer_offers(status, customer_responded_at, customer_reminder_sent_at)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_customer_offers_internal_reminder ON customer_offers(status, commission_status, internal_reminder_sent_at)').run();
};

const estimateCommission = ({ ownerPriceAmount, commissionType, commissionValue }) => {
  if (commissionType === 'percent') return Math.round(ownerPriceAmount * (commissionValue / 100) * 100) / 100;
  if (['fixed', 'lead_fee', 'concierge_fee'].includes(commissionType)) return commissionValue;
  return 0;
};

const normalizeCustomerOffer = (body = {}) => {
  const ownerPriceAmount = cleanNumber(body.ownerPriceAmount);
  const commissionType = COMMISSION_TYPES.includes(cleanString(body.commissionType, 40)) ? cleanString(body.commissionType, 40) : 'percent';
  const commissionValue = cleanNumber(body.commissionValue);
  return {
    inquiryId: cleanString(body.inquiryId, 160),
    customerEmail: normalizeEmail(body.customerEmail || body.email),
    offerId: cleanString(body.offerId, 160),
    ownerEmail: normalizeEmail(body.ownerEmail),
    managerEmail: normalizeEmail(body.managerEmail),
    title: cleanString(body.title, 180),
    destinationLabel: cleanString(body.destinationLabel, 180),
    ownerPriceAmount,
    currency: CURRENCIES.includes(cleanString(body.currency, 10).toUpperCase()) ? cleanString(body.currency, 10).toUpperCase() : 'EUR',
    priceNote: cleanString(body.priceNote, 1000),
    includedItems: cleanString(body.includedItems, 2000),
    couponId: cleanString(body.couponId, 160),
    couponLabel: cleanString(body.couponLabel, 180),
    perkLabel: cleanString(body.perkLabel, 180),
    customerMessage: cleanString(body.customerMessage, 3000),
    internalNote: cleanString(body.internalNote, 3000),
    commissionType,
    commissionValue,
    estimatedCommissionAmount: body.estimatedCommissionAmount === undefined ? estimateCommission({ ownerPriceAmount, commissionType, commissionValue }) : cleanNumber(body.estimatedCommissionAmount),
    commissionStatus: COMMISSION_STATUSES.includes(cleanString(body.commissionStatus, 40)) ? cleanString(body.commissionStatus, 40) : 'not_due',
    status: OFFER_STATUSES.includes(cleanString(body.status, 40)) ? cleanString(body.status, 40) : 'draft',
    expiresAt: cleanDate(body.expiresAt),
  };
};

const getInquiryFallback = async (db, inquiryId = '') => {
  if (!inquiryId) return null;
  return db.prepare(`
    SELECT id, email, offer_id AS offerId, offer_title AS offerTitle, owner_email AS ownerEmail, manager_email AS managerEmail, payload_json AS payloadJson
    FROM inquiries
    WHERE id = ?
    LIMIT 1
  `).bind(inquiryId).first();
};

const hydrateFromInquiry = (offer, inquiry = null) => {
  if (!inquiry) return offer;
  let payload = {};
  try { payload = JSON.parse(inquiry.payloadJson || '{}') || {}; } catch (error) { payload = {}; }
  return {
    ...offer,
    customerEmail: offer.customerEmail || normalizeEmail(inquiry.email),
    offerId: offer.offerId || cleanString(inquiry.offerId, 160),
    ownerEmail: offer.ownerEmail || normalizeEmail(inquiry.ownerEmail),
    managerEmail: offer.managerEmail || normalizeEmail(inquiry.managerEmail),
    title: offer.title || cleanString(inquiry.offerTitle || payload.offer || payload.property_name || payload.accommodation_interest || 'Private LuxeRoutes proposal', 180),
    destinationLabel: offer.destinationLabel || cleanString(payload.destination || payload.location || payload.region || '', 180),
  };
};

const proposalEmailHtml = (offer = {}, accountUrl = '') => {
  const includedItems = splitLines(offer.includedItems);
  return `<!doctype html><html><body style="margin:0;background:#0d0f12;color:#f8f4ea;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:680px;margin:0 auto;padding:32px 18px;">
      <div style="border:1px solid rgba(217,188,122,.32);border-radius:24px;background:#15181d;padding:30px;">
        <p style="margin:0 0 10px;color:#d9bc7a;letter-spacing:.14em;text-transform:uppercase;font-size:12px;">Private LuxeRoutes proposal</p>
        <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:32px;line-height:1.1;color:#fff;">${escapeHtml(offer.title || 'Your private offer is ready')}</h1>
        <p style="margin:0 0 22px;color:#c9c2b4;line-height:1.65;">${escapeHtml(offer.customerMessage || 'We prepared a private proposal using owner or partner pricing. Review it in your LuxeRoutes account and tell us if you are interested or would like changes.')}</p>
        <div style="display:grid;gap:12px;margin:22px 0;padding:18px;border-radius:18px;background:#101216;">
          ${offer.destinationLabel ? `<p style="margin:0;color:#f8f4ea;"><strong>Destination:</strong> ${escapeHtml(offer.destinationLabel)}</p>` : ''}
          <p style="margin:0;color:#f8f4ea;"><strong>Owner/partner quote:</strong> ${escapeHtml(moneyLabel(offer))}</p>
          ${offer.couponLabel || offer.perkLabel ? `<p style="margin:0;color:#f8f4ea;"><strong>Private benefit:</strong> ${escapeHtml(offer.couponLabel || offer.perkLabel)}</p>` : ''}
          ${offer.expiresAt ? `<p style="margin:0;color:#f8f4ea;"><strong>Valid until:</strong> ${escapeHtml(offer.expiresAt)}</p>` : ''}
        </div>
        ${includedItems.length ? `<div style="margin:22px 0;"><p style="margin:0 0 8px;color:#d9bc7a;font-weight:700;">Included / proposed</p><ul style="margin:0;padding-left:20px;color:#c9c2b4;line-height:1.7;">${includedItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>` : ''}
        <a href="${escapeHtml(accountUrl)}" style="display:inline-block;margin-top:10px;padding:13px 20px;border-radius:999px;background:#d9bc7a;color:#111;text-decoration:none;font-weight:700;">Review proposal</a>
        <p style="margin:24px 0 0;color:#8f887b;font-size:13px;line-height:1.55;">Final availability, booking terms, and stay payment are confirmed by the owner or partner. LuxeRoutes helps prepare and coordinate the proposal.</p>
      </div>
    </div>
  </body></html>`;
};

const proposalEmailText = (offer = {}, accountUrl = '') => [
  `Your private LuxeRoutes proposal is ready: ${offer.title}`,
  offer.destinationLabel ? `Destination: ${offer.destinationLabel}` : '',
  `Owner/partner quote: ${moneyLabel(offer)}`,
  offer.couponLabel || offer.perkLabel ? `Private benefit: ${offer.couponLabel || offer.perkLabel}` : '',
  offer.expiresAt ? `Valid until: ${offer.expiresAt}` : '',
  '',
  offer.customerMessage || 'Open your LuxeRoutes account to review the proposal and tell us if you are interested or would like changes.',
  '',
  `Review it here: ${accountUrl}`,
  '',
  'Final availability, booking terms, and stay payment are confirmed by the owner or partner. LuxeRoutes helps prepare and coordinate the proposal.',
].filter(Boolean).join('\n');

const notifyCustomerOffer = async (env, offer, origin = '', { shouldSend = false } = {}) => {
  if (!shouldSend || !offer.customerEmail || offer.status !== 'sent') return;
  const accountUrl = `${origin || 'https://luxeroutes.eu'}/account.html`;
  await sendTransactionalEmail(env, {
    to: offer.customerEmail,
    subject: `Your private LuxeRoutes offer is ready: ${offer.title}`,
    text: proposalEmailText(offer, accountUrl),
    html: proposalEmailHtml(offer, accountUrl),
  });
};

export const onRequestGet = async ({ request, env }) => {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    await ensureCustomerOffersSchema(auth.db);
    const offers = await auth.db.prepare(`${customerOfferSelect} ORDER BY updated_at DESC LIMIT 200`).all();
    return privateJson({ customerOffers: offers.results || [] });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to load customer proposals.', 500);
  }
};

export const onRequestPost = async ({ request, env }) => {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    await ensureCustomerOffersSchema(auth.db);
    const body = await request.json().catch(() => ({}));
    const baseOffer = normalizeCustomerOffer(body);
    const inquiry = await getInquiryFallback(auth.db, baseOffer.inquiryId);
    const offer = hydrateFromInquiry(baseOffer, inquiry);
    if (!offer.customerEmail || !offer.customerEmail.includes('@')) return privateErrorJson('Customer email is required.', 400);
    if (!offer.title) return privateErrorJson('Proposal title is required.', 400);
    const timestamp = nowIso();
    const id = makeId('customer_offer');
    await auth.db.prepare(`INSERT INTO customer_offers (
      id, inquiry_id, customer_email, offer_id, owner_email, manager_email, title, destination_label, owner_price_amount,
      currency, price_note, included_items, coupon_id, coupon_label, perk_label, customer_message, internal_note,
      commission_type, commission_value, estimated_commission_amount, commission_status, status, expires_at, created_at, updated_at
    ) VALUES (?, NULLIF(?, ''), ?, NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), ?, ?, ?, ?, ?, ?, NULLIF(?, ''), ?, ?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, ''), ?, ?)`)
      .bind(id, offer.inquiryId, offer.customerEmail, offer.offerId, offer.ownerEmail, offer.managerEmail, offer.title, offer.destinationLabel,
        offer.ownerPriceAmount, offer.currency, offer.priceNote, offer.includedItems, offer.couponId, offer.couponLabel, offer.perkLabel,
        offer.customerMessage, offer.internalNote, offer.commissionType, offer.commissionValue, offer.estimatedCommissionAmount,
        offer.commissionStatus, offer.status, offer.expiresAt, timestamp, timestamp).run();
    if (offer.inquiryId) {
      await auth.db.prepare("UPDATE inquiries SET status = CASE WHEN ? = 'draft' THEN status ELSE 'waiting' END, updated_at = ? WHERE id = ?")
        .bind(offer.status, timestamp, offer.inquiryId).run();
    }
    const saved = await auth.db.prepare(`${customerOfferSelect} WHERE id = ? LIMIT 1`).bind(id).first();
    try { await notifyCustomerOffer(env, saved, new URL(request.url).origin, { shouldSend: saved.status === 'sent' }); } catch (notificationError) { console.warn('Customer proposal email failed:', notificationError.message || notificationError); }
    return privateJson({ customerOffer: saved }, { status: 201 });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to create customer proposal.', 500);
  }
};

export const onRequestPatch = async ({ request, env }) => {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    await ensureCustomerOffersSchema(auth.db);
    const body = await request.json().catch(() => ({}));
    const id = cleanString(body.id, 160);
    if (!id) return privateErrorJson('Proposal ID is required.', 400);
    const existing = await auth.db.prepare(`${customerOfferSelect} WHERE id = ? LIMIT 1`).bind(id).first();
    if (!existing) return privateErrorJson('Customer proposal not found.', 404);
    const offer = normalizeCustomerOffer({ ...existing, ...body });
    const timestamp = nowIso();
    await auth.db.prepare(`UPDATE customer_offers SET
      customer_email = CASE WHEN ? IS NULL THEN customer_email ELSE ? END,
      owner_email = CASE WHEN ? IS NULL THEN owner_email ELSE NULLIF(?, '') END,
      manager_email = CASE WHEN ? IS NULL THEN manager_email ELSE NULLIF(?, '') END,
      title = CASE WHEN ? IS NULL THEN title ELSE ? END,
      destination_label = CASE WHEN ? IS NULL THEN destination_label ELSE ? END,
      owner_price_amount = CASE WHEN ? IS NULL THEN owner_price_amount ELSE ? END,
      currency = CASE WHEN ? IS NULL THEN currency ELSE ? END,
      price_note = CASE WHEN ? IS NULL THEN price_note ELSE ? END,
      included_items = CASE WHEN ? IS NULL THEN included_items ELSE ? END,
      coupon_label = CASE WHEN ? IS NULL THEN coupon_label ELSE ? END,
      perk_label = CASE WHEN ? IS NULL THEN perk_label ELSE ? END,
      customer_message = CASE WHEN ? IS NULL THEN customer_message ELSE ? END,
      internal_note = CASE WHEN ? IS NULL THEN internal_note ELSE ? END,
      commission_type = CASE WHEN ? IS NULL THEN commission_type ELSE ? END,
      commission_value = CASE WHEN ? IS NULL THEN commission_value ELSE ? END,
      estimated_commission_amount = CASE WHEN ? IS NULL THEN estimated_commission_amount ELSE ? END,
      commission_status = CASE WHEN ? IS NULL THEN commission_status ELSE ? END,
      status = CASE WHEN ? IS NULL THEN status ELSE ? END,
      expires_at = CASE WHEN ? IS NULL THEN expires_at ELSE NULLIF(?, '') END,
      owner_confirmed_at = CASE WHEN ? = 'owner_confirmed' THEN COALESCE(owner_confirmed_at, ?) ELSE owner_confirmed_at END,
      commission_paid_at = CASE WHEN ? = 'paid' THEN COALESCE(commission_paid_at, ?) WHEN ? IS NOT NULL AND ? != 'paid' THEN NULL ELSE commission_paid_at END,
      updated_at = ?
      WHERE id = ?`)
      .bind(body.customerEmail === undefined ? null : offer.customerEmail, offer.customerEmail,
        body.ownerEmail === undefined ? null : offer.ownerEmail, offer.ownerEmail,
        body.managerEmail === undefined ? null : offer.managerEmail, offer.managerEmail,
        body.title === undefined ? null : offer.title, offer.title,
        body.destinationLabel === undefined ? null : offer.destinationLabel, offer.destinationLabel,
        body.ownerPriceAmount === undefined ? null : offer.ownerPriceAmount, offer.ownerPriceAmount,
        body.currency === undefined ? null : offer.currency, offer.currency,
        body.priceNote === undefined ? null : offer.priceNote, offer.priceNote,
        body.includedItems === undefined ? null : offer.includedItems, offer.includedItems,
        body.couponLabel === undefined ? null : offer.couponLabel, offer.couponLabel,
        body.perkLabel === undefined ? null : offer.perkLabel, offer.perkLabel,
        body.customerMessage === undefined ? null : offer.customerMessage, offer.customerMessage,
        body.internalNote === undefined ? null : offer.internalNote, offer.internalNote,
        body.commissionType === undefined ? null : offer.commissionType, offer.commissionType,
        body.commissionValue === undefined ? null : offer.commissionValue, offer.commissionValue,
        body.estimatedCommissionAmount === undefined ? null : offer.estimatedCommissionAmount, offer.estimatedCommissionAmount,
        body.commissionStatus === undefined ? null : offer.commissionStatus, offer.commissionStatus,
        body.status === undefined ? null : offer.status, offer.status,
        body.expiresAt === undefined ? null : offer.expiresAt, offer.expiresAt,
        offer.status, timestamp, offer.commissionStatus, timestamp, body.commissionStatus === undefined ? null : offer.commissionStatus, offer.commissionStatus,
        timestamp, id).run();
    const saved = await auth.db.prepare(`${customerOfferSelect} WHERE id = ? LIMIT 1`).bind(id).first();
    try { await notifyCustomerOffer(env, saved, new URL(request.url).origin, { shouldSend: body.status === 'sent' }); } catch (notificationError) { console.warn('Customer proposal email failed:', notificationError.message || notificationError); }
    return privateJson({ customerOffer: saved });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to update customer proposal.', 500);
  }
};
