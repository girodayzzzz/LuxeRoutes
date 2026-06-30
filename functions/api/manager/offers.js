import { privateErrorJson, privateJson, requireAccountRole } from '../_utils.js';

const managerOfferSelect = `
  SELECT id, title, slug, country, region, stay_type AS stayType, options,
    location_label AS locationLabel, guest_label AS guestLabel, price_label AS priceLabel,
    available_from AS availableFrom, available_to AS availableTo,
    discount_label AS discountLabel, availability_notes AS availabilityNotes,
    description, image_url AS imageUrl, image_alt AS imageAlt, status, published_at AS publishedAt,
    owner_email AS ownerEmail, manager_email AS managerEmail, partner_status AS partnerStatus,
    owner_notes AS ownerNotes, manager_notes AS managerNotes, owner_follow_up_at AS ownerFollowUpAt, owner_follow_up_status AS ownerFollowUpStatus, manager_follow_up_at AS managerFollowUpAt, manager_follow_up_status AS managerFollowUpStatus, updated_at AS updatedAt
  FROM stay_offers
`;
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

export const onRequestGet = async ({ request, env }) => {
  try {
    const auth = await requireAccountRole(request, env, ['manager']);
    if (auth.error) return auth.error;
    await ensureOfferFollowUpColumns(auth.db);

    const isAdmin = auth.role === 'admin';
    const statement = isAdmin
      ? auth.db.prepare(`${managerOfferSelect} ORDER BY updated_at DESC LIMIT 200`)
      : auth.db.prepare(`${managerOfferSelect} WHERE lower(trim(manager_email)) = ? ORDER BY updated_at DESC LIMIT 100`).bind(auth.email);
    const offers = await statement.all();
    return privateJson({ email: auth.email, role: auth.role, offers: offers.results || [] });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to load manager offers.', 500);
  }
};
