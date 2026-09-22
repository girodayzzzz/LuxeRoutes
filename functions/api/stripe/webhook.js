import { getEnvValue, json, nowIso } from '../_utils.js';
import { planForPrice, verifyStripeSignature } from '../_stripe.js';

export const onRequestPost = async ({ request, env }) => {
  const payload = await request.text();
  const secret = getEnvValue(env, ['STRIPE_WEBHOOK_SECRET']);
  if (!await verifyStripeSignature(payload, request.headers.get('Stripe-Signature'), secret)) return json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  const event = JSON.parse(payload);
  const duplicate = await env.DB.prepare('SELECT id FROM stripe_webhook_events WHERE id = ?').bind(event.id).first();
  if (duplicate) return json({ received: true, duplicate: true });
  const object = event.data?.object || {};
  let customer = object.customer;
  let subscriptionId = object.id;
  let status = object.status;
  let ownerEmail = object.metadata?.owner_email;
  let priceId = object.items?.data?.[0]?.price?.id;
  if (event.type === 'checkout.session.completed') {
    customer = object.customer; subscriptionId = object.subscription; status = 'active'; ownerEmail = object.metadata?.owner_email; priceId = null;
  }
  if (event.type.startsWith('customer.subscription.')) {
    const existing = await env.DB.prepare('SELECT owner_email AS ownerEmail FROM provider_subscriptions WHERE stripe_customer_id = ? OR stripe_subscription_id = ?').bind(customer, subscriptionId).first();
    ownerEmail ||= existing?.ownerEmail;
  }
  if (ownerEmail && (event.type === 'checkout.session.completed' || event.type.startsWith('customer.subscription.'))) {
    const timestamp = nowIso();
    const plan = planForPrice(env, priceId) || object.metadata?.plan || null;
    await env.DB.prepare(`INSERT INTO provider_subscriptions (id, owner_email, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan, status, current_period_end, cancel_at_period_end, last_event_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(owner_email) DO UPDATE SET stripe_customer_id=excluded.stripe_customer_id, stripe_subscription_id=COALESCE(excluded.stripe_subscription_id, stripe_subscription_id), stripe_price_id=COALESCE(excluded.stripe_price_id, stripe_price_id), plan=COALESCE(excluded.plan, plan), status=excluded.status, current_period_end=excluded.current_period_end, cancel_at_period_end=excluded.cancel_at_period_end, last_event_id=excluded.last_event_id, updated_at=excluded.updated_at`)
      .bind(`sub_${crypto.randomUUID()}`, ownerEmail.toLowerCase(), customer || null, subscriptionId || null, priceId, plan, status || 'active', object.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : null, object.cancel_at_period_end ? 1 : 0, event.id, timestamp, timestamp).run();
  }
  await env.DB.prepare('INSERT INTO stripe_webhook_events (id, event_type, processed_at) VALUES (?, ?, ?)').bind(event.id, event.type, nowIso()).run();
  return json({ received: true });
};
