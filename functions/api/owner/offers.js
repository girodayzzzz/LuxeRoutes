import { makeId, nowIso, privateErrorJson, privateJson, requireAccountRole } from '../_utils.js';

const COUNTRIES = ['slovenia', 'croatia', 'italy', 'austria', 'switzerland', 'france'];
const REGIONS = ['alps', 'adriatic', 'lakes', 'wine-country', 'city', 'countryside', 'riviera'];
const STAY_TYPES = ['villa', 'chalet', 'boutique-hotel', 'apartment', 'cabin', 'retreat'];
const OPTIONS = ['pool', 'spa', 'sea-view', 'family', 'pet-friendly', 'private-chef'];

const cleanString = (value, maxLength = 2000) => String(value || '').trim().slice(0, maxLength);
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

const ownerOfferSelect = `
  SELECT id, title, slug, country, region, stay_type AS stayType, options,
    location_label AS locationLabel, guest_label AS guestLabel, price_label AS priceLabel,
    available_from AS availableFrom, available_to AS availableTo,
    discount_label AS discountLabel, availability_notes AS availabilityNotes,
    accommodation_details AS accommodationDetails, pricing_details AS pricingDetails,
    gallery_urls AS galleryUrls, external_availability_url AS externalAvailabilityUrl,
    description, image_url AS imageUrl, image_alt AS imageAlt, status, published_at AS publishedAt,
    owner_email AS ownerEmail, manager_email AS managerEmail, partner_status AS partnerStatus,
    owner_notes AS ownerNotes, manager_notes AS managerNotes, updated_at AS updatedAt
  FROM stay_offers
`;

const normalizeOwnerOffer = (body = {}, authEmail = '', id = makeId('offer')) => {
  const title = cleanString(body.title, 180);
  const country = cleanString(body.country, 80).toLowerCase();
  const region = cleanString(body.region, 80).toLowerCase();
  const stayType = cleanString(body.stayType || body.stay_type, 80).toLowerCase();
  const options = (Array.isArray(body.options) ? body.options : String(body.options || '').split(/[\s,]+/))
    .map((option) => cleanString(option, 40).toLowerCase())
    .filter((option) => OPTIONS.includes(option));
  const availableFrom = cleanDate(body.availableFrom);
  const availableTo = cleanDate(body.availableTo);

  return {
    id,
    title,
    slug: `${slugify(title) || 'owner-offer'}-${id.split('-').at(-1).slice(0, 8)}`,
    country,
    region,
    stayType,
    options: [...new Set(options)].join(' '),
    locationLabel: cleanString(body.locationLabel, 180) || [country, region].filter(Boolean).join(' · '),
    guestLabel: cleanString(body.guestLabel, 140),
    priceLabel: cleanString(body.priceLabel, 180),
    availableFrom,
    availableTo,
    discountLabel: cleanString(body.discountLabel, 180),
    availabilityNotes: cleanString(body.availabilityNotes, 2000),
    accommodationDetails: cleanString(body.accommodationDetails, 5000),
    pricingDetails: cleanString(body.pricingDetails, 5000),
    galleryUrls: (Array.isArray(body.galleryUrls) ? body.galleryUrls : cleanString(body.galleryUrls, 4000).split(/[\n,]+/)).map(safeImageUrl).filter(Boolean).slice(0, 12).join('\n'),
    externalAvailabilityUrl: safeImageUrl(body.externalAvailabilityUrl),
    description: cleanString(body.description, 4000),
    imageUrl: safeImageUrl(body.imageUrl),
    imageAlt: cleanString(body.imageAlt, 220) || title,
    ownerEmail: authEmail,
  };
};

const validateOwnerOffer = (offer, body = {}) => {
  if (!offer.title) return 'Offer title is required.';
  if (!COUNTRIES.includes(offer.country)) return 'Choose a supported country.';
  if (!REGIONS.includes(offer.region)) return 'Choose a supported region.';
  if (!STAY_TYPES.includes(offer.stayType)) return 'Choose a supported stay type.';
  if (!offer.locationLabel) return 'Location label is required.';
  if (!offer.description) return 'Offer description is required.';
  if (body.imageUrl && !offer.imageUrl) return 'Image URL must start with http:// or https://.';
  if (body.externalAvailabilityUrl && !offer.externalAvailabilityUrl) return 'External availability URL must start with http:// or https://.';
  if (body.availableFrom && !offer.availableFrom) return 'Available from must use YYYY-MM-DD.';
  if (body.availableTo && !offer.availableTo) return 'Available to must use YYYY-MM-DD.';
  if (offer.availableFrom && offer.availableTo && offer.availableFrom > offer.availableTo) return 'Available from must be before available to.';
  return '';
};

export const onRequestGet = async ({ request, env }) => {
  try {
    const auth = await requireAccountRole(request, env, ['owner']);
    if (auth.error) return auth.error;

    const isAdmin = auth.role === 'admin';
    const statement = isAdmin
      ? auth.db.prepare(`${ownerOfferSelect} ORDER BY updated_at DESC LIMIT 200`)
      : auth.db.prepare(`${ownerOfferSelect} WHERE lower(trim(owner_email)) = ? ORDER BY updated_at DESC LIMIT 100`).bind(auth.email);
    const offers = await statement.all();
    return privateJson({ email: auth.email, role: auth.role, offers: offers.results || [] });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to load owner offers.', 500);
  }
};

export const onRequestPost = async ({ request, env }) => {
  try {
    const auth = await requireAccountRole(request, env, ['owner']);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const timestamp = nowIso();
    const offer = normalizeOwnerOffer(body, auth.email);
    const validationError = validateOwnerOffer(offer, body);
    if (validationError) return privateErrorJson(validationError, 400);

    await auth.db.prepare(`
      INSERT INTO stay_offers (
        id, source_inquiry_id, title, slug, country, region, stay_type, options,
        location_label, guest_label, price_label, available_from, available_to,
        discount_label, availability_notes, accommodation_details, pricing_details, gallery_urls, external_availability_url,
        description, image_url, image_alt, status, published_at, created_by_email, owner_email, manager_email, partner_status,
        owner_notes, manager_notes, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpublished', NULL, ?, ?, NULL, 'pending_review', ?, '', ?, ?)
    `).bind(
      offer.id,
      offer.title,
      offer.slug,
      offer.country,
      offer.region,
      offer.stayType,
      offer.options,
      offer.locationLabel,
      offer.guestLabel,
      offer.priceLabel,
      offer.availableFrom || null,
      offer.availableTo || null,
      offer.discountLabel,
      offer.availabilityNotes,
      offer.accommodationDetails,
      offer.pricingDetails,
      offer.galleryUrls,
      offer.externalAvailabilityUrl,
      offer.description,
      offer.imageUrl,
      offer.imageAlt,
      auth.email,
      offer.ownerEmail,
      'Submitted by owner. Waiting for admin approval and manager assignment.',
      timestamp,
      timestamp,
    ).run();

    const saved = await auth.db.prepare(`${ownerOfferSelect} WHERE id = ? LIMIT 1`).bind(offer.id).first();
    return privateJson({ offer: saved }, { status: 201 });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) return privateErrorJson('An offer with this generated slug already exists. Please submit again.', 409);
    return privateErrorJson(error.message || 'Unable to submit owner offer.', 500);
  }
};

export const onRequestPatch = async ({ request, env }) => {
  try {
    const auth = await requireAccountRole(request, env, ['owner']);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const id = cleanString(body.id, 160);
    if (!id) return privateErrorJson('Offer ID is required.', 400);

    const offer = await auth.db.prepare(`${ownerOfferSelect} WHERE id = ? LIMIT 1`).bind(id).first();
    if (!offer) return privateErrorJson('Offer not found.', 404);
    if (auth.role !== 'admin' && String(offer.ownerEmail || '').trim().toLowerCase() !== auth.email) {
      return privateErrorJson('This offer is not assigned to your owner account.', 403);
    }

    const availableFrom = cleanDate(body.availableFrom);
    const availableTo = cleanDate(body.availableTo);
    if (body.availableFrom && !availableFrom) return privateErrorJson('Available from must use YYYY-MM-DD.', 400);
    if (body.availableTo && !availableTo) return privateErrorJson('Available to must use YYYY-MM-DD.', 400);
    if (availableFrom && availableTo && availableFrom > availableTo) return privateErrorJson('Available from must be before available to.', 400);

    const priceLabel = cleanString(body.priceLabel, 180);
    const discountLabel = cleanString(body.discountLabel, 180);
    const availabilityNotes = cleanString(body.availabilityNotes, 2000);
    const accommodationDetails = cleanString(body.accommodationDetails, 5000);
    const pricingDetails = cleanString(body.pricingDetails, 5000);
    const galleryUrls = (Array.isArray(body.galleryUrls) ? body.galleryUrls : cleanString(body.galleryUrls, 4000).split(/[\n,]+/)).map(safeImageUrl).filter(Boolean).slice(0, 12).join('\n');
    const externalAvailabilityUrl = safeImageUrl(body.externalAvailabilityUrl);
    if (body.externalAvailabilityUrl && !externalAvailabilityUrl) return privateErrorJson('External availability URL must start with http:// or https://.', 400);
    const timestamp = nowIso();

    await auth.db.prepare(`
      UPDATE stay_offers
      SET available_from = ?, available_to = ?, price_label = ?, discount_label = ?, availability_notes = ?,
        accommodation_details = ?, pricing_details = ?, gallery_urls = ?, external_availability_url = ?,
        partner_status = CASE WHEN status = 'published' THEN partner_status ELSE 'pending_review' END, updated_at = ?
      WHERE id = ?
    `).bind(availableFrom || null, availableTo || null, priceLabel, discountLabel, availabilityNotes, accommodationDetails, pricingDetails, galleryUrls, externalAvailabilityUrl, timestamp, id).run();

    const updated = await auth.db.prepare(`${ownerOfferSelect} WHERE id = ? LIMIT 1`).bind(id).first();
    return privateJson({ offer: updated });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to update owner offer.', 500);
  }
};
