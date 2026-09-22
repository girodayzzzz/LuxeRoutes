import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import { hasActiveSubscription, planForPrice, verifyStripeSignature } from '../functions/api/_stripe.js';

test('Stripe webhook accepts a current valid signature and rejects tampering', async () => {
  const payload='{"id":"evt_test"}', secret='whsec_unit_test', now=1_800_000_000_000, timestamp=Math.floor(now/1000);
  const signature=createHmac('sha256',secret).update(`${timestamp}.${payload}`).digest('hex');
  assert.equal(await verifyStripeSignature(payload,`t=${timestamp},v1=${signature}`,secret,now),true);
  assert.equal(await verifyStripeSignature(`${payload}x`,`t=${timestamp},v1=${signature}`,secret,now),false);
  assert.equal(await verifyStripeSignature(payload,`t=${timestamp-301},v1=${signature}`,secret,now),false);
});

test('subscription plans map only configured Stripe prices and active states publish', () => {
  const env={STRIPE_PRICE_BASIC:'price_b',STRIPE_PRICE_PREMIUM:'price_p',STRIPE_PRICE_FEATURED:'price_f'};
  assert.equal(planForPrice(env,'price_p'),'premium'); assert.equal(planForPrice(env,'unknown'),null);
  assert.equal(hasActiveSubscription({status:'active'}),true); assert.equal(hasActiveSubscription({status:'trialing'}),true); assert.equal(hasActiveSubscription({status:'past_due'}),false);
});

test('owner listing mutations enforce role and ownership', async () => {
  const source=await readFile(new URL('../functions/api/owner/listings.js',import.meta.url),'utf8');
  assert.match(source,/requireAccountRole\(request, env, \['owner'\]\)/);
  assert.match(source,/WHERE id=\? AND owner_email=\?/);
});

test('public publishing requires approval and an active subscription', async () => {
  const list=await readFile(new URL('../functions/api/places.js',import.meta.url),'utf8');
  const detail=await readFile(new URL('../functions/api/places/[slug].js',import.meta.url),'utf8');
  for(const source of [list,detail]){assert.match(source,/status='approved'/);assert.match(source,/status IN \('active','trialing'\)/)}
});

test('secrets are environment references, not embedded live keys', async () => {
  const vars=await readFile(new URL('../.dev.vars.example',import.meta.url),'utf8');
  assert.doesNotMatch(vars,/sk_live_[A-Za-z0-9]{12,}/);assert.doesNotMatch(vars,/whsec_[A-Za-z0-9]{20,}/);
});
