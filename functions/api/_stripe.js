import { getEnvValue } from './_utils.js';

const encoder = new TextEncoder();
export const PLAN_CONFIG = {
  basic: { label: 'Basic', amount: 15, env: 'STRIPE_PRICE_BASIC' },
  premium: { label: 'Premium', amount: 29, env: 'STRIPE_PRICE_PREMIUM' },
  featured: { label: 'Featured', amount: 49, env: 'STRIPE_PRICE_FEATURED' },
};
export const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'];

export const stripeRequest = async (env, path, params = {}) => {
  const key = getEnvValue(env, ['STRIPE_SECRET_KEY']);
  if (!key) throw new Error('Stripe is not configured.');
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || 'Stripe request failed.');
  return data;
};

const hex = (buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const safeEqual = (a, b) => a.length === b.length && [...a].reduce((result, value, i) => result | (value.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;
export const verifyStripeSignature = async (payload, signatureHeader, secret, now = Date.now()) => {
  const parts = String(signatureHeader || '').split(',').map((part) => part.split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || !signatures.length || !secret || Math.abs(Math.floor(now / 1000) - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = hex(await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`)));
  return signatures.some((signature) => safeEqual(signature, expected));
};

export const planForPrice = (env, priceId) => Object.entries(PLAN_CONFIG).find(([, config]) => env[config.env] === priceId)?.[0] || null;
export const hasActiveSubscription = (subscription) => ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription?.status);
