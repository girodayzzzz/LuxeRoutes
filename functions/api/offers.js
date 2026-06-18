import { errorJson, json, requireDb } from './_utils.js';

const offerSelect = `
  SELECT id, title, slug, country, region, stay_type AS stayType, options,
    location_label AS locationLabel, guest_label AS guestLabel, price_label AS priceLabel,
    available_from AS availableFrom, available_to AS availableTo, discount_label AS discountLabel,
    availability_notes AS availabilityNotes, accommodation_details AS accommodationDetails,
    pricing_details AS pricingDetails, gallery_urls AS galleryUrls, external_availability_url AS externalAvailabilityUrl,
    description, image_url AS imageUrl, image_alt AS imageAlt, published_at AS publishedAt
  FROM stay_offers
`;

const cleanString = (value, maxLength = 500) => String(value || '').trim().slice(0, maxLength);

export const onRequestGet = async ({ request = new Request('https://luxeroutes.local/api/offers'), env }) => {
  try {
    const db = requireDb(env);
    const url = new URL(request.url);
    const slug = cleanString(url.searchParams.get('slug'), 160);
    const id = cleanString(url.searchParams.get('id'), 160);
    if (slug || id) {
      const offer = await db.prepare(`${offerSelect} WHERE status = 'published' AND (${slug ? 'slug = ?' : 'id = ?'}) LIMIT 1`).bind(slug || id).first();
      if (!offer) return errorJson('Offer not found.', 404);
      return json({ offer }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } });
    }
    const offers = await db.prepare(`${offerSelect} WHERE status = 'published' ORDER BY published_at DESC, title ASC LIMIT 200`).all();
    return json({ offers: offers.results || [] }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } });
  } catch (error) {
    return errorJson(error.message || 'Unable to load offers.', 500);
  }
};

const methodNotAllowed = () => json({ error: 'Method not allowed.' }, { status: 405, headers: { Allow: 'GET' } });
export const onRequestPost = methodNotAllowed;
export const onRequestPatch = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;
