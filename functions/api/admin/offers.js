import { makeId, nowIso, privateErrorJson, privateJson, requireAdmin, sendTransactionalEmail } from '../_utils.js';

const COUNTRIES = ['slovenia', 'croatia', 'italy', 'austria', 'switzerland', 'france'];
const REGIONS = ['alps', 'adriatic', 'lakes', 'wine-country', 'city', 'countryside', 'riviera'];
const STAY_TYPES = ['villa', 'chalet', 'boutique-hotel', 'apartment', 'cabin', 'retreat', 'wine-tasting', 'food-experience', 'private-transfer', 'yacht-experience', 'fishing-escape', 'wellness-experience', 'guided-route', 'event-service'];
const OPTIONS = ['pool', 'spa', 'sea-view', 'family', 'pet-friendly', 'private-chef', 'wine', 'food', 'driver', 'yacht', 'adventure', 'romantic'];
const STATUSES = ['draft', 'published', 'unpublished'];
const PARTNER_STATUSES = ['draft', 'pending_review', 'changes_requested', 'approved', 'published', 'archived'];

const cleanString = (value, maxLength = 2000) => String(value || '').trim().slice(0, maxLength);
const cleanEmail = (value) => cleanString(value, 320).toLowerCase();
const slugify = (value) => cleanString(value, 160).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
const cleanDate = (value) => {
  const input = cleanString(value, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(input) ? input : '';
};
const safeImageUrl = (value) => {
  const input = cleanString(value, 1500);
  if (!input) return '';
  try {
    const url = new URL(input);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch (error) {
    return '';
  }
};
const normalizeOptions = (value) => {
  const values = Array.isArray(value) ? value : cleanString(value, 500).split(/[\s,]+/);
  return [...new Set(values.map((item) => cleanString(item, 80)).filter((item) => OPTIONS.includes(item)))].join(' ');
};

const ensureOfferFollowUpColumns = async (db) => {
  for (const [column, type] of [
    ['owner_follow_up_at', 'TEXT'],
    ['owner_follow_up_status', 'TEXT'],
    ['manager_follow_up_at', 'TEXT'],
    ['manager_follow_up_status', 'TEXT'],
  ]) {
    try {
      await db.prepare(`ALTER TABLE stay_offers ADD COLUMN ${column} ${type}`).run();
    } catch (error) {
      if (!String(error.message || '').toLowerCase().includes('duplicate column')) throw error;
    }
  }
};

const getOwnerOfferDecision = (offer = {}) => {
  const partnerStatus = String(offer.partnerStatus || '').toLowerCase();
  if (offer.status === 'published' || partnerStatus === 'published') return 'published';
  if (partnerStatus === 'approved') return 'approved';
  if (partnerStatus === 'changes_requested') return 'changes_requested';
  return '';
};

const notifyOwnerOfOfferDecision = async (env, offer = {}, origin = '') => {
  if (!offer.ownerEmail) return;
  const decision = getOwnerOfferDecision(offer);
  if (!decision) return;

  const ownerUrl = `${origin || 'https://luxeroutes.eu'}/owner-panel.html#owner-properties`;
  const decisionCopy = {
    published: 'published on LuxeRoutes',
    approved: 'approved and waiting for final publishing',
    changes_requested: 'reviewed with changes requested',
  }[decision];

  await sendTransactionalEmail(env, {
    to: offer.ownerEmail,
    subject: `Your LuxeRoutes offer was ${decisionCopy}: ${offer.title}`,
    text: [
      `Good news from LuxeRoutes — your offer "${offer.title}" was ${decisionCopy}.`,
      '',
      offer.ownerNotes ? `Owner note: ${offer.ownerNotes}` : '',
      offer.managerEmail ? `Assigned manager: ${offer.managerEmail}` : '',
      '',
      `Open your owner panel for details: ${ownerUrl}`,
    ].filter(Boolean).join('\n'),
  });
};

const shouldNotifyOwner = (before = null, after = {}, body = {}) => {
  if (!after?.ownerEmail) return false;
  const beforeDecision = getOwnerOfferDecision(before || {});
  const afterDecision = getOwnerOfferDecision(after);
  if (!afterDecision) return false;
  if (!before || before.ownerEmail !== after.ownerEmail) return true;
  if (beforeDecision !== afterDecision) return true;
  return body.ownerNotes !== undefined && ['approved', 'published', 'changes_requested'].includes(afterDecision);
};

const offerSelect = `
  SELECT id, source_inquiry_id AS sourceInquiryId, title, slug, country, region,
    stay_type AS stayType, options, location_label AS locationLabel, guest_label AS guestLabel,
    price_label AS priceLabel, available_from AS availableFrom, available_to AS availableTo,
    discount_label AS discountLabel, availability_notes AS availabilityNotes,
    accommodation_details AS accommodationDetails, pricing_details AS pricingDetails, gallery_urls AS galleryUrls,
    external_availability_url AS externalAvailabilityUrl, description, image_url AS imageUrl, image_alt AS imageAlt,
    status, published_at AS publishedAt, created_by_email AS createdByEmail,
    owner_email AS ownerEmail, manager_email AS managerEmail, partner_status AS partnerStatus,
    owner_notes AS ownerNotes, manager_notes AS managerNotes, owner_follow_up_at AS ownerFollowUpAt, owner_follow_up_status AS ownerFollowUpStatus, manager_follow_up_at AS managerFollowUpAt, manager_follow_up_status AS managerFollowUpStatus, created_at AS createdAt, updated_at AS updatedAt
  FROM stay_offers
`;

const normalizeOffer = (body) => ({
  sourceInquiryId: cleanString(body.sourceInquiryId, 160),
  title: cleanString(body.title, 180),
  slug: slugify(body.slug || body.title),
  country: cleanString(body.country, 80).toLowerCase(),
  region: cleanString(body.region, 80).toLowerCase(),
  stayType: cleanString(body.stayType, 80).toLowerCase(),
  options: normalizeOptions(body.options),
  locationLabel: cleanString(body.locationLabel, 180),
  guestLabel: cleanString(body.guestLabel, 120),
  priceLabel: cleanString(body.priceLabel, 180),
  availableFrom: cleanDate(body.availableFrom),
  availableTo: cleanDate(body.availableTo),
  discountLabel: cleanString(body.discountLabel, 180),
  availabilityNotes: cleanString(body.availabilityNotes, 2000),
  accommodationDetails: cleanString(body.accommodationDetails, 5000),
  pricingDetails: cleanString(body.pricingDetails, 5000),
  galleryUrls: (Array.isArray(body.galleryUrls) ? body.galleryUrls : cleanString(body.galleryUrls, 4000).split(/[\n,]+/)).map(safeImageUrl).filter(Boolean).slice(0, 12).join('\n'),
  externalAvailabilityUrl: safeImageUrl(body.externalAvailabilityUrl),
  description: cleanString(body.description, 4000),
  imageUrl: safeImageUrl(body.imageUrl),
  imageAlt: cleanString(body.imageAlt, 240),
  status: cleanString(body.status, 30).toLowerCase() || 'published',
  ownerEmail: cleanEmail(body.ownerEmail),
  managerEmail: cleanEmail(body.managerEmail),
  partnerStatus: cleanString(body.partnerStatus, 40).toLowerCase() || (cleanString(body.status, 30).toLowerCase() === 'published' ? 'published' : 'pending_review'),
  ownerNotes: cleanString(body.ownerNotes, 2000),
  managerNotes: cleanString(body.managerNotes, 2000),
  ownerFollowUpAt: cleanDate(body.ownerFollowUpAt),
  ownerFollowUpStatus: cleanString(body.ownerFollowUpStatus, 80).toLowerCase(),
  managerFollowUpAt: cleanDate(body.managerFollowUpAt),
  managerFollowUpStatus: cleanString(body.managerFollowUpStatus, 80).toLowerCase(),
});

const validateOffer = (offer, body = {}) => {
  if (!offer.title || !offer.slug || !offer.locationLabel || !offer.description) return 'Title, location, and description are required.';
  if (!COUNTRIES.includes(offer.country)) return 'Invalid country.';
  if (!REGIONS.includes(offer.region)) return 'Invalid region.';
  if (!STAY_TYPES.includes(offer.stayType)) return 'Invalid offer category.';
  if (!STATUSES.includes(offer.status)) return 'Invalid offer status.';
  if (!PARTNER_STATUSES.includes(offer.partnerStatus)) return 'Invalid partner status.';
  if (body.availableFrom && !offer.availableFrom) return 'Available from must use YYYY-MM-DD.';
  if (body.availableTo && !offer.availableTo) return 'Available to must use YYYY-MM-DD.';
  if (offer.availableFrom && offer.availableTo && offer.availableFrom > offer.availableTo) return 'Available from must be before available to.';
  if (body.imageUrl && !offer.imageUrl) return 'Image URL must start with http:// or https://.';
  if (body.externalAvailabilityUrl && !offer.externalAvailabilityUrl) return 'External availability URL must start with http:// or https://.';
  if (offer.ownerEmail && !offer.ownerEmail.includes('@')) return 'Owner email must be a valid email address.';
  if (offer.managerEmail && !offer.managerEmail.includes('@')) return 'Manager email must be a valid email address.';
  return '';
};

export const onRequestGet = async ({ request, env }) => {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    await ensureOfferFollowUpColumns(auth.db);
    const offers = await auth.db.prepare(`${offerSelect} ORDER BY updated_at DESC LIMIT 200`).all();
    return privateJson({ offers: offers.results || [] });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to load offers.', 500);
  }
};

export const onRequestPost = async ({ request, env }) => {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    await ensureOfferFollowUpColumns(auth.db);
    const body = await request.json().catch(() => ({}));
    const offer = normalizeOffer(body);
    const validationError = validateOffer(offer, body);
    if (validationError) return privateErrorJson(validationError, 400);

    const timestamp = nowIso();
    const id = makeId('offer');
    const publishedAt = offer.status === 'published' ? timestamp : null;
    await auth.db.prepare(`
      INSERT INTO stay_offers (
        id, source_inquiry_id, title, slug, country, region, stay_type, options,
        location_label, guest_label, price_label, accommodation_details, pricing_details, gallery_urls, external_availability_url,
        description, image_url, image_alt,
        status, published_at, created_by_email, owner_email, manager_email, partner_status,
        owner_notes, manager_notes, owner_follow_up_at, owner_follow_up_status, manager_follow_up_at, manager_follow_up_status, created_at, updated_at
      ) VALUES (?, NULLIF(?, ''), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''), ?, ?, ?, NULLIF(?, ''), ?, NULLIF(?, ''), ?, ?, ?)
    `).bind(id, offer.sourceInquiryId, offer.title, offer.slug, offer.country, offer.region, offer.stayType,
      offer.options, offer.locationLabel, offer.guestLabel, offer.priceLabel, offer.accommodationDetails, offer.pricingDetails,
      offer.galleryUrls, offer.externalAvailabilityUrl, offer.description, offer.imageUrl,
      offer.imageAlt || offer.title, offer.status, publishedAt, auth.email, offer.ownerEmail, offer.managerEmail,
      offer.partnerStatus, offer.ownerNotes, offer.managerNotes, offer.ownerFollowUpAt, offer.ownerFollowUpStatus, offer.managerFollowUpAt, offer.managerFollowUpStatus, timestamp, timestamp).run();

    await auth.db.prepare(`
      UPDATE stay_offers
      SET available_from = ?,
        available_to = ?,
        discount_label = ?,
        availability_notes = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(offer.availableFrom || null, offer.availableTo || null, offer.discountLabel, offer.availabilityNotes, timestamp, id).run();

    if (offer.sourceInquiryId) {
      await auth.db.prepare(`
        UPDATE inquiries
        SET status = CASE WHEN ? = 'published' THEN 'resolved' ELSE status END,
          offer_id = ?,
          offer_title = ?,
          owner_email = NULLIF(?, ''),
          manager_email = NULLIF(?, ''),
          updated_at = ?
        WHERE id = ?
      `).bind(offer.status, id, offer.title, offer.ownerEmail, offer.managerEmail, timestamp, offer.sourceInquiryId).run();
    }
    const saved = await auth.db.prepare(`${offerSelect} WHERE id = ? LIMIT 1`).bind(id).first();
    if (shouldNotifyOwner(null, saved, body)) {
      try {
        await notifyOwnerOfOfferDecision(env, saved, new URL(request.url).origin);
      } catch (notificationError) {
        console.warn('Owner offer decision notification failed:', notificationError.message || notificationError);
      }
    }
    return privateJson({ offer: saved }, { status: 201 });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) return privateErrorJson('This inquiry or offer slug has already been published.', 409);
    return privateErrorJson(error.message || 'Unable to publish offer.', 500);
  }
};

export const onRequestPatch = async ({ request, env }) => {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    await ensureOfferFollowUpColumns(auth.db);
    const body = await request.json().catch(() => ({}));
    const id = cleanString(body.id, 160);
    const status = cleanString(body.status, 30).toLowerCase();
    const ownerEmail = cleanEmail(body.ownerEmail);
    const managerEmail = cleanEmail(body.managerEmail);
    const requestedPartnerStatus = cleanString(body.partnerStatus, 40).toLowerCase();
    const partnerStatus = requestedPartnerStatus || (status === 'published' ? 'published' : status === 'unpublished' ? 'approved' : '');
    const ownerNotes = cleanString(body.ownerNotes, 2000);
    const managerNotes = cleanString(body.managerNotes, 2000);
    const ownerFollowUpAt = cleanDate(body.ownerFollowUpAt);
    const ownerFollowUpStatus = cleanString(body.ownerFollowUpStatus, 80).toLowerCase();
    const managerFollowUpAt = cleanDate(body.managerFollowUpAt);
    const managerFollowUpStatus = cleanString(body.managerFollowUpStatus, 80).toLowerCase();
    const imageUrl = safeImageUrl(body.imageUrl);
    const galleryUrls = (Array.isArray(body.galleryUrls) ? body.galleryUrls : cleanString(body.galleryUrls, 4000).split(/[\n,]+/)).map(safeImageUrl).filter(Boolean).slice(0, 12).join('\n');
    if (!id) return privateErrorJson('Offer ID is required.', 400);
    if (status && !STATUSES.includes(status)) return privateErrorJson('Invalid offer status.', 400);
    if (partnerStatus && !PARTNER_STATUSES.includes(partnerStatus)) return privateErrorJson('Invalid partner status.', 400);
    if (ownerEmail && !ownerEmail.includes('@')) return privateErrorJson('Owner email must be a valid email address.', 400);
    if (managerEmail && !managerEmail.includes('@')) return privateErrorJson('Manager email must be a valid email address.', 400);
    if (body.imageUrl && !imageUrl) return privateErrorJson('Image URL must start with http:// or https://.', 400);
    const existingOffer = await auth.db.prepare(`${offerSelect} WHERE id = ? LIMIT 1`).bind(id).first();
    if (!existingOffer) return privateErrorJson('Offer not found.', 404);

    const timestamp = nowIso();
    await auth.db.prepare(`
      UPDATE stay_offers
      SET status = COALESCE(NULLIF(?, ''), status),
        published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, ?) ELSE published_at END,
        owner_email = CASE WHEN ? IS NULL THEN owner_email ELSE NULLIF(?, '') END,
        manager_email = CASE WHEN ? IS NULL THEN manager_email ELSE NULLIF(?, '') END,
        partner_status = COALESCE(NULLIF(?, ''), partner_status),
        owner_notes = CASE WHEN ? IS NULL THEN owner_notes ELSE ? END,
        manager_notes = CASE WHEN ? IS NULL THEN manager_notes ELSE ? END,
        owner_follow_up_at = CASE WHEN ? IS NULL THEN owner_follow_up_at ELSE NULLIF(?, '') END,
        owner_follow_up_status = CASE WHEN ? IS NULL THEN owner_follow_up_status ELSE ? END,
        manager_follow_up_at = CASE WHEN ? IS NULL THEN manager_follow_up_at ELSE NULLIF(?, '') END,
        manager_follow_up_status = CASE WHEN ? IS NULL THEN manager_follow_up_status ELSE ? END,
        image_url = CASE WHEN ? IS NULL THEN image_url ELSE ? END,
        gallery_urls = CASE WHEN ? IS NULL THEN gallery_urls ELSE ? END,
        updated_at = ?
      WHERE id = ?
    `).bind(status, status, timestamp, body.ownerEmail === undefined ? null : ownerEmail, ownerEmail,
      body.managerEmail === undefined ? null : managerEmail, managerEmail, partnerStatus,
      body.ownerNotes === undefined ? null : ownerNotes, ownerNotes, body.managerNotes === undefined ? null : managerNotes,
      managerNotes,
      body.ownerFollowUpAt === undefined ? null : ownerFollowUpAt, ownerFollowUpAt,
      body.ownerFollowUpStatus === undefined ? null : ownerFollowUpStatus, ownerFollowUpStatus,
      body.managerFollowUpAt === undefined ? null : managerFollowUpAt, managerFollowUpAt,
      body.managerFollowUpStatus === undefined ? null : managerFollowUpStatus, managerFollowUpStatus,
      body.imageUrl === undefined ? null : imageUrl, imageUrl,
      body.galleryUrls === undefined ? null : galleryUrls, galleryUrls, timestamp, id).run();
    const offer = await auth.db.prepare(`${offerSelect} WHERE id = ? LIMIT 1`).bind(id).first();
    if (!offer) return privateErrorJson('Offer not found.', 404);

    if (shouldNotifyOwner(existingOffer, offer, body)) {
      try {
        await notifyOwnerOfOfferDecision(env, offer, new URL(request.url).origin);
      } catch (notificationError) {
        console.warn('Owner offer decision notification failed:', notificationError.message || notificationError);
      }
    }

    if (body.ownerEmail !== undefined || body.managerEmail !== undefined) {
      await auth.db.prepare(`
        UPDATE inquiries
        SET owner_email = CASE WHEN ? IS NULL THEN owner_email ELSE NULLIF(?, '') END,
          manager_email = CASE WHEN ? IS NULL THEN manager_email ELSE NULLIF(?, '') END,
          updated_at = ?
        WHERE offer_id = ?
      `).bind(body.ownerEmail === undefined ? null : ownerEmail, ownerEmail,
        body.managerEmail === undefined ? null : managerEmail, managerEmail, timestamp, id).run();
    }

    return privateJson({ offer });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to update offer.', 500);
  }
};
