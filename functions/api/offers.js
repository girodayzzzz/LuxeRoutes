import { errorJson, json, requireDb } from './_utils.js';

const offerSelect = `
  SELECT id, title, slug, country, region, stay_type AS stayType, options,
    location_label AS locationLabel, guest_label AS guestLabel, price_label AS priceLabel,
    description, image_url AS imageUrl, image_alt AS imageAlt, published_at AS publishedAt
  FROM stay_offers
`;

export const onRequestGet = async ({ env }) => {
  try {
    const db = requireDb(env);
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
