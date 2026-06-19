import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const tempRoot = mkdtempSync(join(tmpdir(), 'luxeroutes-offers-'));
cpSync('functions', join(tempRoot, 'functions'), { recursive: true });
writeFileSync(join(tempRoot, 'package.json'), '{"type":"module"}\n');
const publicOffers = await import(pathToFileURL(join(tempRoot, 'functions/api/offers.js')));
const adminOffers = await import(pathToFileURL(join(tempRoot, 'functions/api/admin/offers.js')));
const ownerOffers = await import(pathToFileURL(join(tempRoot, 'functions/api/owner/offers.js')));
const managerOffers = await import(pathToFileURL(join(tempRoot, 'functions/api/manager/offers.js')));
const ownerInquiries = await import(pathToFileURL(join(tempRoot, 'functions/api/owner/inquiries.js')));
const managerInquiries = await import(pathToFileURL(join(tempRoot, 'functions/api/manager/inquiries.js')));

const sentNotifications = [];
globalThis.fetch = async (url, options = {}) => {
  if (String(url).includes('api.resend.com/emails')) {
    sentNotifications.push(JSON.parse(options.body || '{}'));
    return new Response(JSON.stringify({ id: `email-${sentNotifications.length}` }), { status: 200 });
  }
  throw new Error(`Unexpected fetch during offer checks: ${url}`);
};

class FakeStatement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.params = []; }
  bind(...params) { this.params = params; return this; }
  all() {
    if (this.sql.includes('FROM stay_offers')) {
      let results = this.sql.includes("WHERE status = 'published'") ? this.db.offers.filter((offer) => offer.status === 'published') : this.db.offers;
      if (this.sql.includes('WHERE lower(trim(owner_email))')) results = results.filter((offer) => offer.ownerEmail === this.params[0]);
      if (this.sql.includes('WHERE lower(trim(manager_email))')) results = results.filter((offer) => offer.managerEmail === this.params[0]);
      return { results };
    }
    if (this.sql.includes('FROM inquiries')) {
      let results = this.db.inquiries;
      if (this.sql.includes('WHERE lower(trim(owner_email))')) results = results.filter((inquiry) => inquiry.ownerEmail === this.params[0]);
      if (this.sql.includes('WHERE lower(trim(manager_email))')) results = results.filter((inquiry) => inquiry.managerEmail === this.params[0]);
      if (this.sql.includes('forwarded_to_owner_at IS NOT NULL')) results = results.filter((inquiry) => inquiry.forwardedToOwnerAt);
      return { results };
    }
    throw new Error(`Unhandled all SQL: ${this.sql}`);
  }
  first() {
    if (this.sql.includes('FROM access_grants')) return this.db.grants.find((grant) => grant.email === this.params[0] && grant.status === 'active') || null;
    if (this.sql.includes('FROM profiles')) return this.db.profiles?.find((profile) => profile.email === this.params[0]) || null;
    if (this.sql.includes('FROM stay_offers')) return this.db.offers.find((offer) => offer.id === this.params[0]) || null;
    throw new Error(`Unhandled first SQL: ${this.sql}`);
  }
  run() {
    if (this.sql.includes('INSERT INTO stay_offers') && this.sql.includes('available_from')) {
      const [id, title, slug, country, region, stayType, options, locationLabel, guestLabel, priceLabel, availableFrom, availableTo, discountLabel, availabilityNotes, accommodationDetails, pricingDetails, galleryUrls, externalAvailabilityUrl, description, imageUrl, imageAlt, createdByEmail, ownerEmail, ownerNotes, createdAt, updatedAt] = this.params;
      this.db.offers.unshift({ id, sourceInquiryId: null, title, slug, country, region, stayType, options, locationLabel, guestLabel, priceLabel, availableFrom, availableTo, discountLabel, availabilityNotes, accommodationDetails, pricingDetails, galleryUrls, externalAvailabilityUrl, description, imageUrl, imageAlt, status: 'unpublished', publishedAt: null, createdByEmail, ownerEmail, managerEmail: null, partnerStatus: 'pending_review', ownerNotes, managerNotes: '', createdAt, updatedAt });
      return { success: true };
    }
    if (this.sql.includes('INSERT INTO stay_offers')) {
      const [id, sourceInquiryId, title, slug, country, region, stayType, options, locationLabel, guestLabel, priceLabel, accommodationDetails, pricingDetails, galleryUrls, externalAvailabilityUrl, description, imageUrl, imageAlt, status, publishedAt, createdByEmail, ownerEmail, managerEmail, partnerStatus, ownerNotes, managerNotes, createdAt, updatedAt] = this.params;
      this.db.offers.unshift({ id, sourceInquiryId, title, slug, country, region, stayType, options, locationLabel, guestLabel, priceLabel, availableFrom: null, availableTo: null, discountLabel: '', availabilityNotes: '', accommodationDetails, pricingDetails, galleryUrls, externalAvailabilityUrl, description, imageUrl, imageAlt, status, publishedAt, createdByEmail, ownerEmail, managerEmail, partnerStatus, ownerNotes, managerNotes, createdAt, updatedAt });
      return { success: true };
    }
    if (this.sql.includes('UPDATE inquiries') && this.sql.includes('offer_id = ?')) {
      const [status, offerId, offerTitle, ownerEmail, managerEmail, updatedAt, id] = this.params;
      const inquiry = this.db.inquiries.find((item) => item.id === id);
      if (inquiry) Object.assign(inquiry, { status: status === 'published' ? 'resolved' : inquiry.status, offerId, offerTitle, ownerEmail: ownerEmail || null, managerEmail: managerEmail || null, updatedAt });
      this.db.resolvedInquiry = id;
      return { success: true };
    }
    if (this.sql.includes('UPDATE inquiries SET status')) { this.db.resolvedInquiry = this.params[1]; return { success: true }; }
    if (this.sql.includes('UPDATE stay_offers') && this.sql.includes('available_from')) {
      const [availableFrom, availableTo, priceLabel, discountLabel, availabilityNotes, accommodationDetails, pricingDetails, galleryUrls, externalAvailabilityUrl, updatedAt, id] = this.params;
      const offer = this.db.offers.find((item) => item.id === id);
      if (offer) Object.assign(offer, { availableFrom, availableTo, priceLabel, discountLabel, availabilityNotes, accommodationDetails, pricingDetails, galleryUrls, externalAvailabilityUrl, updatedAt });
      return { success: true };
    }
    if (this.sql.includes('UPDATE stay_offers') && this.sql.includes('SET status')) {
      const [status, , publishedAt, , ownerEmail, , managerEmail, partnerStatus, , ownerNotes, , managerNotes, updatedAt, id] = this.params;
      const offer = this.db.offers.find((item) => item.id === id);
      if (offer) Object.assign(offer, { status: status || offer.status, publishedAt: offer.publishedAt || publishedAt, ownerEmail: ownerEmail || offer.ownerEmail, managerEmail: managerEmail || offer.managerEmail, partnerStatus: partnerStatus || offer.partnerStatus, ownerNotes, managerNotes, updatedAt });
      return { success: true };
    }
    throw new Error(`Unhandled run SQL: ${this.sql}`);
  }
}
class FakeDb {
  constructor() {
    this.grants = [
      { id: 'grant-1', email: 'admin@example.com', role: 'admin', status: 'active' },
      { id: 'grant-owner', email: 'owner@example.com', role: 'owner', status: 'active' },
      { id: 'grant-manager', email: 'manager@example.com', role: 'manager', status: 'active' },
    ];
    this.profiles = [];
    this.offers = [{ id: 'offer-existing', title: 'Existing Villa', slug: 'existing-villa', country: 'italy', region: 'lakes', stayType: 'villa', options: 'pool', locationLabel: 'Italy · Lakes', guestLabel: '6 guests', priceLabel: 'From €500/night', description: 'Existing public offer.', imageUrl: '', imageAlt: 'Existing Villa', status: 'published', publishedAt: '2026-06-04T00:00:00.000Z', ownerEmail: 'owner@example.com', managerEmail: 'manager@example.com', partnerStatus: 'published', ownerNotes: 'Owner note', managerNotes: 'Manager note', availableFrom: null, availableTo: null, discountLabel: '', availabilityNotes: '', updatedAt: '2026-06-04T00:00:00.000Z' }];
    this.inquiries = [
      { id: 'inquiry-stay-1', inquiryType: 'Trip request', name: 'Traveler', email: 'traveler@example.com', phone: '', offerId: 'offer-existing', offerTitle: 'Existing Villa', ownerEmail: 'owner@example.com', managerEmail: 'manager@example.com', payloadJson: JSON.stringify({ offer: 'Existing Villa', message: 'Can we stay in July?', guests: '4' }), status: 'new', createdAt: '2026-06-05T00:00:00.000Z', updatedAt: '2026-06-05T00:00:00.000Z' },
      { id: 'inquiry-1', inquiryType: 'Partner stay submission', name: 'Owner', email: 'owner@example.com', phone: '', offerId: null, offerTitle: '', ownerEmail: null, managerEmail: null, payloadJson: JSON.stringify({ property_name: 'Lake House', property_summary: 'A private lakeside house.' }), status: 'new', createdAt: '2026-06-06T00:00:00.000Z', updatedAt: '2026-06-06T00:00:00.000Z' },
    ];
  }
  prepare(sql) { return new FakeStatement(this, sql); }
}
const db = new FakeDb();
const adminRequest = (method, body) => new Request('https://luxeroutes.test/api/admin/offers', { method, headers: { 'CF-Access-Authenticated-User-Email': 'admin@example.com', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });

const publicResponse = await publicOffers.onRequestGet({ env: { DB: db } });
assert.equal(publicResponse.status, 200);
assert.equal((await publicResponse.json()).offers.length, 1, 'Public API should only return published offers.');

const createResponse = await adminOffers.onRequestPost({ request: adminRequest('POST', { sourceInquiryId: 'inquiry-1', title: 'Lake House', country: 'slovenia', region: 'lakes', stayType: 'villa', locationLabel: 'Slovenia · Lakes', description: 'A private lakeside house.', options: ['pool', 'invalid', 'family'], status: 'published', ownerEmail: 'owner@example.com', managerEmail: 'manager@example.com', ownerNotes: 'Owner-visible note', managerNotes: 'Manager-visible note' }), env: { DB: db } });
assert.equal(createResponse.status, 201, await createResponse.text());
assert.equal(db.offers[0].options, 'pool family', 'Only supported taxonomy options should be saved.');
assert.equal(db.offers[0].ownerEmail, 'owner@example.com', 'Admin publishing should assign an owner email to the offer.');
assert.equal(db.offers[0].managerEmail, 'manager@example.com', 'Admin publishing should assign a manager email to the offer.');
assert.equal(db.resolvedInquiry, 'inquiry-1', 'Publishing should resolve its source inquiry.');
const sourceInquiry = db.inquiries.find((inquiry) => inquiry.id === 'inquiry-1');
assert.equal(sourceInquiry.offerId, db.offers[0].id, 'Publishing should link the source inquiry to the new offer.');
assert.equal(sourceInquiry.offerTitle, 'Lake House', 'Publishing should copy the offer title back to the source inquiry.');
assert.equal(sourceInquiry.ownerEmail, 'owner@example.com', 'Publishing should copy the owner assignment back to the source inquiry.');
assert.equal(sourceInquiry.managerEmail, 'manager@example.com', 'Publishing should copy the manager assignment back to the source inquiry.');

const ownerSubmitResponse = await ownerOffers.onRequestPost({ request: new Request('https://luxeroutes.test/api/owner/offers', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Access-Authenticated-User-Email': 'owner@example.com' }, body: JSON.stringify({ title: 'Owner Submitted Chalet', country: 'austria', region: 'alps', stayType: 'chalet', locationLabel: 'Austria · Alps', guestLabel: 'Up to 10 guests', description: 'Owner submitted mountain chalet for LuxeRoutes review.', options: ['spa', 'pool', 'unknown'], availableFrom: '2026-09-01', availableTo: '2026-12-15', priceLabel: 'From €900/night' }) }), env: { DB: db, RESEND_API_KEY: 'resend-offer-key', OWNER_OFFER_ADMIN_EMAILS: 'admin-review@example.com' } });
assert.equal(ownerSubmitResponse.status, 201, await ownerSubmitResponse.text());
assert.equal(db.offers[0].ownerEmail, 'owner@example.com', 'Owner-submitted offers should be assigned to the submitting owner.');
assert.equal(db.offers[0].status, 'unpublished', 'Owner-submitted offers should stay hidden until admin approval.');
assert.equal(db.offers[0].partnerStatus, 'pending_review', 'Owner-submitted offers should enter the admin review queue.');
assert.equal(db.offers[0].managerEmail, null, 'Owner-submitted offers should wait for admin manager assignment.');
assert.equal(db.offers[0].options, 'spa pool', 'Owner-submitted offers should keep only supported taxonomy options.');
assert.equal(sentNotifications.at(-1).to, 'admin-review@example.com', 'Owner submissions should notify configured admin reviewers.');
assert.match(sentNotifications.at(-1).subject, /New owner offer waiting for review/, 'Admin notification should describe the review queue action.');

const ownerApprovalResponse = await adminOffers.onRequestPatch({ request: adminRequest('PATCH', { id: db.offers[0].id, partnerStatus: 'approved', ownerNotes: 'Approved for publication after final image review.' }), env: { DB: db, RESEND_API_KEY: 'resend-offer-key' } });
assert.equal(ownerApprovalResponse.status, 200, await ownerApprovalResponse.text());
assert.equal(sentNotifications.at(-1).to, 'owner@example.com', 'Approving an owner offer should notify the submitting owner.');
assert.match(sentNotifications.at(-1).subject, /Your LuxeRoutes offer was approved/, 'Owner notification should include the approved decision.');

const ownerResponse = await ownerOffers.onRequestGet({ request: new Request('https://luxeroutes.test/api/owner/offers', { headers: { 'CF-Access-Authenticated-User-Email': 'owner@example.com' } }), env: { DB: db } });
assert.equal(ownerResponse.status, 200, 'Approved owners should read their assigned offers.');
const ownerPayload = await ownerResponse.json();
assert.equal(ownerPayload.offers.length >= 2, true, 'Owner API should return assigned and owner-submitted offers.');
assert.equal(ownerPayload.offers.every((offer) => offer.ownerEmail === 'owner@example.com'), true, 'Owner API should only return owner-assigned offers.');

const ownerPatchResponse = await ownerOffers.onRequestPatch({ request: new Request('https://luxeroutes.test/api/owner/offers', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'CF-Access-Authenticated-User-Email': 'owner@example.com' }, body: JSON.stringify({ id: 'offer-existing', availableFrom: '2026-07-01', availableTo: '2026-08-31', priceLabel: 'From €600/night', discountLabel: '10% for 7+ nights', availabilityNotes: 'August weekends fill quickly.' }) }), env: { DB: db } });
assert.equal(ownerPatchResponse.status, 200, await ownerPatchResponse.text());
assert.equal(db.offers.find((offer) => offer.id === 'offer-existing').discountLabel, '10% for 7+ nights', 'Owners should update discount labels on assigned offers.');

const ownerInquiryResponse = await ownerInquiries.onRequestGet({ request: new Request('https://luxeroutes.test/api/owner/inquiries', { headers: { 'CF-Access-Authenticated-User-Email': 'owner@example.com' } }), env: { DB: db } });
assert.equal(ownerInquiryResponse.status, 200, 'Approved owners should read customer requests for their offers.');
const ownerInquiryPayload = await ownerInquiryResponse.json();
assert.equal(ownerInquiryPayload.inquiries.length, 0, 'Owner inquiry API should only return admin-approved, forwarded requests.');

const managerResponse = await managerOffers.onRequestGet({ request: new Request('https://luxeroutes.test/api/manager/offers', { headers: { 'CF-Access-Authenticated-User-Email': 'manager@example.com' } }), env: { DB: db } });
assert.equal(managerResponse.status, 200, 'Approved managers should read their assigned offers.');
const managerPayload = await managerResponse.json();
assert.equal(managerPayload.offers.length >= 1, true, 'Manager API should return assigned offers but not unassigned owner submissions.');
assert.equal(managerPayload.offers.every((offer) => offer.managerEmail === 'manager@example.com'), true, 'Manager API should only return manager-assigned offers.');

const managerInquiryResponse = await managerInquiries.onRequestGet({ request: new Request('https://luxeroutes.test/api/manager/inquiries', { headers: { 'CF-Access-Authenticated-User-Email': 'manager@example.com' } }), env: { DB: db } });
assert.equal(managerInquiryResponse.status, 200, 'Approved managers should read customer requests for assigned properties.');
const managerInquiryPayload = await managerInquiryResponse.json();
assert.equal(managerInquiryPayload.inquiries.length, 0, 'Manager inquiry API should only return admin-approved, forwarded requests.');

const invalidResponse = await adminOffers.onRequestPost({ request: adminRequest('POST', { title: 'Bad', country: 'unknown', region: 'lakes', stayType: 'villa', locationLabel: 'Bad', description: 'Bad country' }), env: { DB: db } });
assert.equal(invalidResponse.status, 400, 'Invalid taxonomy values should be rejected.');

const partnerSource = readFileSync('partners.html', 'utf8');
const adminSource = readFileSync('admin-panel.js', 'utf8');
const publicSource = readFileSync('script.js', 'utf8');
assert.match(partnerSource, /name="property_name"/, 'Public partner form should collect a property name.');
assert.match(adminSource, /requestJson\('\/api\/admin\/offers'\)/, 'Admin console should load the publishing API.');
assert.match(publicSource, /fetch\('\/api\/offers'/, 'Public offer finder should load published offers.');
assert.match(adminSource, /ownerEmail/, 'Admin publish form should collect owner assignments for offers.');
const accountSource = readFileSync('account.js', 'utf8');
assert.match(accountSource, /data-owner-offer-form/, 'Owner panel should render availability and pricing controls.');
assert.match(accountSource, /data-owner-new-offer-form/, 'Owner panel should submit new offers for admin approval.');
assert.match(accountSource, /\/api\/manager\/inquiries/, 'Manager panel should load customer requests for assigned properties.');
console.log('Offer publishing checks passed.');
