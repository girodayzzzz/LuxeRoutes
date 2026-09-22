import { makeId, nowIso, privateErrorJson, privateJson, requireAccountRole } from '../_utils.js';

const clean = (value, max = 2000) => String(value || '').trim().slice(0, max);
const slugify = (value) => clean(value, 160).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
const email = (value) => clean(value, 320).toLowerCase();
const url = (value) => { try { const parsed = new URL(clean(value, 1500)); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : ''; } catch { return ''; } };
const STATUSES = ['draft', 'pending'];
const normalize = (body, ownerEmail, id) => ({
  id, ownerEmail, title: clean(body.title, 180), description: clean(body.description, 5000), country: clean(body.country, 80), region: clean(body.region, 120), location: clean(body.location, 180),
  type: clean(body.accommodationType, 80), price: Number(body.priceFrom) || 0, currency: clean(body.currency, 3).toUpperCase() || 'EUR', guests: Number.parseInt(body.maxGuests, 10) || 0,
  amenities: [...new Set((Array.isArray(body.amenities) ? body.amenities : []).map((v) => clean(v, 60)).filter(Boolean))].slice(0, 30), contactName: clean(body.contactName, 160),
  contactEmail: email(body.contactEmail || ownerEmail), contactPhone: clean(body.contactPhone, 80), website: body.websiteUrl ? url(body.websiteUrl) : '', images: (Array.isArray(body.imageUrls) ? body.imageUrls : []).map(url).filter(Boolean).slice(0, 20),
  status: STATUSES.includes(body.status) ? body.status : 'draft',
});
const validate = (item) => !item.title || !item.description || !item.country || !item.region || !item.location || !item.type || item.guests < 1 || !item.contactEmail.includes('@') ? 'Complete all required listing fields with valid values.' : '';
const select = `SELECT id, slug, title, description, country, region, location, accommodation_type AS accommodationType, price_from AS priceFrom, currency, max_guests AS maxGuests, amenities, contact_name AS contactName, contact_email AS contactEmail, contact_phone AS contactPhone, website_url AS websiteUrl, image_urls AS imageUrls, status, featured, rejection_reason AS rejectionReason, views, clicks, created_at AS createdAt, updated_at AS updatedAt FROM accommodation_listings`;

export const onRequestGet = async ({ request, env }) => {
  const auth = await requireAccountRole(request, env, ['owner']); if (auth.error) return auth.error;
  const listings = await auth.db.prepare(`${select} WHERE owner_email = ? ORDER BY updated_at DESC`).bind(auth.email).all();
  const inquiries = await auth.db.prepare('SELECT i.id, i.listing_id AS listingId, l.title AS listingTitle, i.guest_name AS guestName, i.guest_email AS guestEmail, i.guest_phone AS guestPhone, i.message, i.created_at AS createdAt FROM listing_inquiries i JOIN accommodation_listings l ON l.id=i.listing_id WHERE i.owner_email=? ORDER BY i.created_at DESC LIMIT 100').bind(auth.email).all();
  return privateJson({ listings: listings.results || [], inquiries: inquiries.results || [] });
};
export const onRequestPost = async ({ request, env }) => {
  const auth = await requireAccountRole(request, env, ['owner']); if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({})); const id = makeId('place'); const item = normalize(body, auth.email, id); const error = validate(item); if (error) return privateErrorJson(error, 400);
  const timestamp = nowIso(); const slug = `${slugify(item.title) || 'stay'}-${id.slice(-8)}`;
  await auth.db.prepare(`INSERT INTO accommodation_listings (id, owner_email, slug, title, description, country, region, location, accommodation_type, price_from, currency, max_guests, amenities, contact_name, contact_email, contact_phone, website_url, image_urls, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, auth.email, slug, item.title, item.description, item.country, item.region, item.location, item.type, item.price, item.currency, item.guests, JSON.stringify(item.amenities), item.contactName, item.contactEmail, item.contactPhone, item.website, JSON.stringify(item.images), item.status, timestamp, timestamp).run();
  return privateJson({ listing: await auth.db.prepare(`${select} WHERE id=?`).bind(id).first() }, { status: 201 });
};
export const onRequestPatch = async ({ request, env }) => {
  const auth = await requireAccountRole(request, env, ['owner']); if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({})); const id = clean(body.id, 160); const existing = await auth.db.prepare('SELECT * FROM accommodation_listings WHERE id=? AND owner_email=?').bind(id, auth.email).first();
  if (!existing) return privateErrorJson('Listing not found.', 404);
  const item = normalize(body, auth.email, id); const error = validate(item); if (error) return privateErrorJson(error, 400);
  await auth.db.prepare(`UPDATE accommodation_listings SET title=?,description=?,country=?,region=?,location=?,accommodation_type=?,price_from=?,currency=?,max_guests=?,amenities=?,contact_name=?,contact_email=?,contact_phone=?,website_url=?,image_urls=?,status=?,featured=0,rejection_reason=NULL,approved_at=NULL,updated_at=? WHERE id=? AND owner_email=?`)
    .bind(item.title,item.description,item.country,item.region,item.location,item.type,item.price,item.currency,item.guests,JSON.stringify(item.amenities),item.contactName,item.contactEmail,item.contactPhone,item.website,JSON.stringify(item.images),item.status,nowIso(),id,auth.email).run();
  return privateJson({ listing: await auth.db.prepare(`${select} WHERE id=?`).bind(id).first() });
};
