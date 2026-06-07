import { nowIso, privateErrorJson, privateJson, requireAccountRole } from '../_utils.js';

const cleanString = (value, maxLength = 2000) => String(value || '').trim().slice(0, maxLength);
const cleanDate = (value) => {
  const input = cleanString(value, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(input) ? input : '';
};

const ownerOfferSelect = `
  SELECT id, title, slug, country, region, stay_type AS stayType, options,
    location_label AS locationLabel, guest_label AS guestLabel, price_label AS priceLabel,
    available_from AS availableFrom, available_to AS availableTo,
    discount_label AS discountLabel, availability_notes AS availabilityNotes,
    description, image_url AS imageUrl, image_alt AS imageAlt, status, published_at AS publishedAt,
    owner_email AS ownerEmail, manager_email AS managerEmail, partner_status AS partnerStatus,
    owner_notes AS ownerNotes, manager_notes AS managerNotes, updated_at AS updatedAt
  FROM stay_offers
`;

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
    const timestamp = nowIso();

    await auth.db.prepare(`
      UPDATE stay_offers
      SET available_from = ?, available_to = ?, price_label = ?, discount_label = ?, availability_notes = ?, updated_at = ?
      WHERE id = ?
    `).bind(availableFrom || null, availableTo || null, priceLabel, discountLabel, availabilityNotes, timestamp, id).run();

    const updated = await auth.db.prepare(`${ownerOfferSelect} WHERE id = ? LIMIT 1`).bind(id).first();
    return privateJson({ offer: updated });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to update owner offer.', 500);
  }
};
