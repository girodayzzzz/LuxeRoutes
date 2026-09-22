import { privateErrorJson, privateJson, requireAccountRole } from '../_utils.js';
import { PLAN_CONFIG, stripeRequest } from '../_stripe.js';

export const onRequestGet = async ({ request, env }) => {
  const auth = await requireAccountRole(request, env, ['owner']);
  if (auth.error) return auth.error;
  const subscription = await auth.db.prepare('SELECT plan, status, current_period_end AS currentPeriodEnd, cancel_at_period_end AS cancelAtPeriodEnd FROM provider_subscriptions WHERE owner_email = ?').bind(auth.email).first();
  return privateJson({ subscription: subscription || { status: 'inactive' }, plans: Object.fromEntries(Object.entries(PLAN_CONFIG).map(([id, p]) => [id, { label: p.label, amount: p.amount }])) });
};

export const onRequestPost = async ({ request, env }) => {
  try {
    const auth = await requireAccountRole(request, env, ['owner']);
    if (auth.error) return auth.error;
    const { action, plan } = await request.json().catch(() => ({}));
    const origin = new URL(request.url).origin;
    const existing = await auth.db.prepare('SELECT stripe_customer_id AS customerId FROM provider_subscriptions WHERE owner_email = ?').bind(auth.email).first();
    if (action === 'portal') {
      if (!existing?.customerId) return privateErrorJson('No Stripe customer exists for this account.', 409);
      const session = await stripeRequest(env, 'billing_portal/sessions', { customer: existing.customerId, return_url: `${origin}/owner-panel.html#subscription` });
      return privateJson({ url: session.url });
    }
    const config = PLAN_CONFIG[plan];
    const price = config && env[config.env];
    if (action !== 'checkout' || !price) return privateErrorJson('Choose a configured subscription plan.', 400);
    const params = {
      mode: 'subscription', success_url: `${origin}/owner-panel.html?subscription=success#subscription`, cancel_url: `${origin}/owner-panel.html?subscription=cancelled#subscription`,
      'line_items[0][price]': price, 'line_items[0][quantity]': '1', 'subscription_data[metadata][owner_email]': auth.email,
      'metadata[owner_email]': auth.email, 'metadata[plan]': plan, allow_promotion_codes: 'true',
    };
    if (existing?.customerId) params.customer = existing.customerId; else params.customer_email = auth.email;
    const session = await stripeRequest(env, 'checkout/sessions', params);
    return privateJson({ url: session.url });
  } catch (error) { return privateErrorJson(error.message || 'Unable to open Stripe.', 500); }
};
