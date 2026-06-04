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

class FakeStatement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.params = []; }
  bind(...params) { this.params = params; return this; }
  all() {
    if (this.sql.includes('FROM stay_offers')) {
      const results = this.sql.includes("WHERE status = 'published'") ? this.db.offers.filter((offer) => offer.status === 'published') : this.db.offers;
      return { results };
    }
    throw new Error(`Unhandled all SQL: ${this.sql}`);
  }
  first() {
    if (this.sql.includes('FROM access_grants')) return this.db.adminGrant;
    if (this.sql.includes('FROM stay_offers')) return this.db.offers.find((offer) => offer.id === this.params[0]) || null;
    throw new Error(`Unhandled first SQL: ${this.sql}`);
  }
  run() {
    if (this.sql.includes('INSERT INTO stay_offers')) {
      const [id, sourceInquiryId, title, slug, country, region, stayType, options, locationLabel, guestLabel, priceLabel, description, imageUrl, imageAlt, status, publishedAt, createdByEmail, createdAt, updatedAt] = this.params;
      this.db.offers.unshift({ id, sourceInquiryId, title, slug, country, region, stayType, options, locationLabel, guestLabel, priceLabel, description, imageUrl, imageAlt, status, publishedAt, createdByEmail, createdAt, updatedAt });
      return { success: true };
    }
    if (this.sql.includes('UPDATE inquiries SET status')) { this.db.resolvedInquiry = this.params[1]; return { success: true }; }
    if (this.sql.includes('UPDATE stay_offers SET status')) {
      const [status, , publishedAt, updatedAt, id] = this.params;
      const offer = this.db.offers.find((item) => item.id === id);
      if (offer) Object.assign(offer, { status, publishedAt: offer.publishedAt || publishedAt, updatedAt });
      return { success: true };
    }
    throw new Error(`Unhandled run SQL: ${this.sql}`);
  }
}
class FakeDb {
  constructor() {
    this.adminGrant = { id: 'grant-1', email: 'admin@example.com', role: 'admin', status: 'active' };
    this.offers = [{ id: 'offer-existing', title: 'Existing Villa', slug: 'existing-villa', country: 'italy', region: 'lakes', stayType: 'villa', options: 'pool', locationLabel: 'Italy · Lakes', guestLabel: '6 guests', priceLabel: 'From €500/night', description: 'Existing public offer.', imageUrl: '', imageAlt: 'Existing Villa', status: 'published', publishedAt: '2026-06-04T00:00:00.000Z', updatedAt: '2026-06-04T00:00:00.000Z' }];
  }
  prepare(sql) { return new FakeStatement(this, sql); }
}
const db = new FakeDb();
const adminRequest = (method, body) => new Request('https://luxeroutes.test/api/admin/offers', { method, headers: { 'CF-Access-Authenticated-User-Email': 'admin@example.com', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });

const publicResponse = await publicOffers.onRequestGet({ env: { DB: db } });
assert.equal(publicResponse.status, 200);
assert.equal((await publicResponse.json()).offers.length, 1, 'Public API should only return published offers.');

const createResponse = await adminOffers.onRequestPost({ request: adminRequest('POST', { sourceInquiryId: 'inquiry-1', title: 'Lake House', country: 'slovenia', region: 'lakes', stayType: 'villa', locationLabel: 'Slovenia · Lakes', description: 'A private lakeside house.', options: ['pool', 'invalid', 'family'], status: 'published' }), env: { DB: db } });
assert.equal(createResponse.status, 201, await createResponse.text());
assert.equal(db.offers[0].options, 'pool family', 'Only supported taxonomy options should be saved.');
assert.equal(db.resolvedInquiry, 'inquiry-1', 'Publishing should resolve its source inquiry.');

const invalidResponse = await adminOffers.onRequestPost({ request: adminRequest('POST', { title: 'Bad', country: 'unknown', region: 'lakes', stayType: 'villa', locationLabel: 'Bad', description: 'Bad country' }), env: { DB: db } });
assert.equal(invalidResponse.status, 400, 'Invalid taxonomy values should be rejected.');

const partnerSource = readFileSync('partners.html', 'utf8');
const adminSource = readFileSync('admin-panel.js', 'utf8');
const publicSource = readFileSync('script.js', 'utf8');
assert.match(partnerSource, /name="property_name"/, 'Public partner form should collect a property name.');
assert.match(adminSource, /requestJson\('\/api\/admin\/offers'\)/, 'Admin console should load the publishing API.');
assert.match(publicSource, /fetch\('\/api\/offers'/, 'Public offer finder should load published offers.');
console.log('Offer publishing checks passed.');
