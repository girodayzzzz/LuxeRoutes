import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

const affiliatePage = readFileSync('become-affiliate.html', 'utf8');
const affiliatePanel = readFileSync('affiliate-panel.html', 'utf8');
const accountSource = readFileSync('account.js', 'utf8');
const scriptSource = readFileSync('script.js', 'utf8');
const adminSource = readFileSync('admin-panel.js', 'utf8');
const adminHtml = readFileSync('admin/index.html', 'utf8');
const inquiriesSource = readFileSync('functions/api/inquiries.js', 'utf8');
const migration = readFileSync('migrations/0008_affiliate_partners.sql', 'utf8');

assert.match(affiliatePage, /data-affiliate-application-form/, 'Affiliate application page should post a dedicated affiliate application form.');
assert.match(affiliatePage, /\/api\/affiliate\/apply/, 'Affiliate applications should use the affiliate apply API.');
assert.match(affiliatePanel, /data-affiliate-link-form/, 'Affiliate dashboard should include a referral link builder.');
assert.match(accountSource, /\/api\/affiliate\/stats/, 'Affiliate dashboard should load signed-in affiliate stats.');
assert.match(scriptSource, /affiliate_referral_code/, 'Public inquiry payloads should include stored affiliate referral codes.');
assert.match(scriptSource, /\/api\/affiliate\/click/, 'Referral visits should be tracked with the affiliate click endpoint.');
assert.match(adminHtml, /data-affiliates/, 'Admin panel should render affiliate partners.');
assert.match(adminSource, /\/api\/admin\/affiliates/, 'Admin panel should load and update affiliate partners.');
assert.match(inquiriesSource, /recordAffiliateEvent/, 'Inquiries should record affiliate inquiry events when an active referral is present.');
assert.match(migration, /CREATE TABLE IF NOT EXISTS affiliate_partners/, 'Affiliate migration should create affiliate partners.');
assert.match(migration, /CREATE TABLE IF NOT EXISTS affiliate_events/, 'Affiliate migration should create affiliate tracking events.');

console.log('Affiliate flow checks passed.');
