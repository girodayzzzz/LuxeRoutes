import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const tempRoot = mkdtempSync(join(tmpdir(), 'luxeroutes-inquiries-'));
cpSync('functions', join(tempRoot, 'functions'), { recursive: true });
writeFileSync(join(tempRoot, 'package.json'), '{"type":"module"}\n');
const inquiriesModule = await import(pathToFileURL(join(tempRoot, 'functions/api/inquiries.js')));

class FakeStatement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.params = []; }
  bind(...params) { this.params = params; return this; }
  run() {
    if (!this.sql.includes('INSERT INTO inquiries')) throw new Error(`Unhandled SQL: ${this.sql}`);
    const [id, inquiryType, name, email, phone, sourcePage, submittedFrom, payloadJson, createdAt, updatedAt] = this.params;
    this.db.inquiries.push({ id, inquiryType, name, email, phone, sourcePage, submittedFrom, payloadJson, status: 'new', createdAt, updatedAt });
    return { success: true };
  }
}
class FakeDb {
  constructor() { this.inquiries = []; }
  prepare(sql) { return new FakeStatement(this, sql); }
}

const request = (body) => new Request('https://luxeroutes.test/api/inquiries', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const db = new FakeDb();
const env = { DB: db };

const validResponse = await inquiriesModule.onRequestPost({ request: request({ inquiry_type: 'Trip request', submitted_from: 'https://luxeroutes.test/plan-trip.html', name: 'Traveler', email: 'TRAVELER@example.com' }), env });
assert.equal(validResponse.status, 201, 'Valid public inquiries should be saved.');
assert.equal(db.inquiries[0].email, 'traveler@example.com', 'Inquiry emails should be normalized.');

const oversizedResponse = await inquiriesModule.onRequestPost({ request: request({ inquiry_type: 'Trip request', submitted_from: 'https://luxeroutes.test/plan-trip.html', email: 'traveler@example.com', notes: 'x'.repeat(26000) }), env });
assert.equal(oversizedResponse.status, 413, 'Oversized public inquiries should be rejected before D1 storage.');
assert.equal(db.inquiries.length, 1, 'Rejected oversized inquiries must not be saved.');

const spamResponse = await inquiriesModule.onRequestPost({ request: request({ website: 'spam.example', inquiry_type: 'Spam' }), env });
assert.equal(spamResponse.status, 200, 'Honeypot spam should receive a non-revealing successful response.');
assert.equal(db.inquiries.length, 1, 'Honeypot spam must not be saved.');

const getResponse = inquiriesModule.onRequestGet();
assert.equal(getResponse.status, 405, 'Public inquiry API must reject unsupported methods.');
console.log('Public inquiry checks passed.');
