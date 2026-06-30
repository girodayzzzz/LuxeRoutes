import { getNotificationRecipients, normalizeEmail, nowIso, privateErrorJson, privateJson, requireAdmin, sendTransactionalEmail } from '../../_utils.js';

const cleanString = (value, maxLength = 2000) => String(value || '').trim().slice(0, maxLength);
const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[character]));

const customerReminderSelect = `
  SELECT id, inquiry_id AS inquiryId, customer_email AS customerEmail, offer_id AS offerId,
    owner_email AS ownerEmail, manager_email AS managerEmail, title, destination_label AS destinationLabel,
    owner_price_amount AS ownerPriceAmount, currency, coupon_label AS couponLabel, perk_label AS perkLabel,
    customer_message AS customerMessage, commission_status AS commissionStatus, status, expires_at AS expiresAt,
    customer_responded_at AS customerRespondedAt, customer_reminder_sent_at AS customerReminderSentAt,
    internal_reminder_sent_at AS internalReminderSentAt, updated_at AS updatedAt
  FROM customer_offers
`;

const ensureOptionalColumn = async (db, table, column, type) => {
  try {
    await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
  } catch (error) {
    if (!String(error.message || '').toLowerCase().includes('duplicate column')) throw error;
  }
};

const ensureCustomerOfferReminderSchema = async (db) => {
  await db.prepare(`CREATE TABLE IF NOT EXISTS customer_offers (
    id TEXT PRIMARY KEY,
    inquiry_id TEXT,
    customer_email TEXT NOT NULL,
    offer_id TEXT,
    owner_email TEXT,
    manager_email TEXT,
    title TEXT NOT NULL,
    destination_label TEXT,
    owner_price_amount REAL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    coupon_label TEXT,
    perk_label TEXT,
    customer_message TEXT,
    commission_status TEXT NOT NULL DEFAULT 'not_due',
    status TEXT NOT NULL DEFAULT 'draft',
    expires_at TEXT,
    customer_responded_at TEXT,
    customer_reminder_sent_at TEXT,
    internal_reminder_sent_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  const optionalColumns = [
    ['offer_id', 'TEXT'], ['owner_email', 'TEXT'], ['manager_email', 'TEXT'], ['destination_label', 'TEXT'],
    ['owner_price_amount', 'REAL'], ['currency', 'TEXT'], ['coupon_label', 'TEXT'], ['perk_label', 'TEXT'],
    ['customer_message', 'TEXT'], ['commission_status', 'TEXT'], ['expires_at', 'TEXT'], ['customer_responded_at', 'TEXT'],
    ['customer_reminder_sent_at', 'TEXT'], ['internal_reminder_sent_at', 'TEXT'],
  ];
  for (const [column, type] of optionalColumns) await ensureOptionalColumn(db, 'customer_offers', column, type);
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_customer_offers_customer_reminder ON customer_offers(status, customer_responded_at, customer_reminder_sent_at)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_customer_offers_internal_reminder ON customer_offers(status, commission_status, internal_reminder_sent_at)').run();
};

const moneyLabel = (offer = {}) => Number(offer.ownerPriceAmount || 0) > 0
  ? `${offer.currency || 'EUR'} ${Number(offer.ownerPriceAmount).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  : 'owner price pending';

const isPastReminderWindow = (lastSent = '', hours = 24) => {
  if (!lastSent) return true;
  const last = new Date(lastSent).getTime();
  return Number.isNaN(last) || Date.now() - last > hours * 60 * 60 * 1000;
};

const sendCustomerReminder = async (env, offer, origin = '') => {
  const accountUrl = `${origin || 'https://luxeroutes.eu'}/account.html`;
  await sendTransactionalEmail(env, {
    to: offer.customerEmail,
    subject: `Reminder: your LuxeRoutes proposal is waiting — ${offer.title}`,
    text: [
      `Your private LuxeRoutes proposal is still waiting: ${offer.title}`,
      offer.destinationLabel ? `Destination: ${offer.destinationLabel}` : '',
      `Owner/partner quote: ${moneyLabel(offer)}`,
      offer.couponLabel || offer.perkLabel ? `Private benefit: ${offer.couponLabel || offer.perkLabel}` : '',
      offer.expiresAt ? `Valid until: ${offer.expiresAt}` : '',
      '',
      'Open your account to mark that you are interested, request changes, or decline the proposal.',
      '',
      `Review it here: ${accountUrl}`,
      '',
      'Final availability, booking terms, and stay payment are confirmed by the owner or partner.',
    ].filter(Boolean).join('\n'),
    html: `<!doctype html><html><body style="margin:0;background:#0d0f12;color:#f8f4ea;font-family:Inter,Arial,sans-serif;"><div style="max-width:640px;margin:0 auto;padding:28px 18px;"><div style="border:1px solid rgba(217,188,122,.32);border-radius:22px;background:#15181d;padding:28px;"><p style="color:#d9bc7a;letter-spacing:.14em;text-transform:uppercase;font-size:12px;margin:0 0 10px;">Proposal reminder</p><h1 style="font-family:Georgia,serif;font-size:30px;line-height:1.1;margin:0 0 14px;color:#fff;">${escapeHtml(offer.title)}</h1><p style="color:#c9c2b4;line-height:1.65;">Your private LuxeRoutes proposal is still waiting for your response.</p><p style="color:#f8f4ea;"><strong>Owner/partner quote:</strong> ${escapeHtml(moneyLabel(offer))}</p>${offer.expiresAt ? `<p style="color:#f8f4ea;"><strong>Valid until:</strong> ${escapeHtml(offer.expiresAt)}</p>` : ''}<a href="${escapeHtml(accountUrl)}" style="display:inline-block;margin-top:12px;padding:13px 20px;border-radius:999px;background:#d9bc7a;color:#111;text-decoration:none;font-weight:700;">Review proposal</a><p style="margin-top:22px;color:#8f887b;font-size:13px;line-height:1.55;">Final availability, booking terms, and stay payment are confirmed by the owner or partner.</p></div></div></body></html>`,
  });
};

const sendInternalReminder = async (env, offer, origin = '') => {
  const recipients = [
    ...getNotificationRecipients(env, ['CUSTOMER_OFFER_NOTIFICATION_EMAILS', 'ADMIN_NOTIFICATION_EMAILS', 'ADMIN_EMAILS']),
    normalizeEmail(offer.managerEmail),
  ].filter(Boolean);
  const uniqueRecipients = [...new Set(recipients)];
  if (!uniqueRecipients.length) return;
  const adminUrl = `${origin || 'https://luxeroutes.eu'}/admin/index.html#customer-offers-title`;
  const reason = offer.commissionStatus === 'due' ? 'Commission is due' : `Follow-up needed (${cleanString(offer.status, 80).replaceAll('_', ' ')})`;
  await sendTransactionalEmail(env, {
    to: uniqueRecipients,
    subject: `${reason}: ${offer.title}`,
    text: [
      reason,
      '',
      `Proposal: ${offer.title}`,
      `Customer: ${offer.customerEmail}`,
      `Status: ${cleanString(offer.status, 80).replaceAll('_', ' ')}`,
      `Commission: ${cleanString(offer.commissionStatus, 80).replaceAll('_', ' ')}`,
      `Owner/partner quote: ${moneyLabel(offer)}`,
      '',
      `Review in admin: ${adminUrl}`,
    ].filter(Boolean).join('\n'),
  });
};

export const onRequestPost = async ({ request, env }) => {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.error) return auth.error;
    await ensureCustomerOfferReminderSchema(auth.db);
    const origin = new URL(request.url).origin;
    const timestamp = nowIso();

    const customerRows = await auth.db.prepare(`
      ${customerReminderSelect}
      WHERE status IN ('sent', 'changes_requested')
        AND customer_responded_at IS NULL
      ORDER BY updated_at ASC
      LIMIT 50
    `).all();

    let customerReminders = 0;
    for (const offer of customerRows.results || []) {
      if (!offer.customerEmail || !isPastReminderWindow(offer.customerReminderSentAt, 24)) continue;
      await sendCustomerReminder(env, offer, origin);
      await auth.db.prepare('UPDATE customer_offers SET customer_reminder_sent_at = ?, updated_at = ? WHERE id = ?')
        .bind(timestamp, timestamp, offer.id).run();
      customerReminders += 1;
    }

    const internalRows = await auth.db.prepare(`
      ${customerReminderSelect}
      WHERE status IN ('customer_interested', 'owner_confirmed')
        OR commission_status = 'due'
      ORDER BY updated_at ASC
      LIMIT 50
    `).all();

    let internalReminders = 0;
    for (const offer of internalRows.results || []) {
      if (!isPastReminderWindow(offer.internalReminderSentAt, 12)) continue;
      await sendInternalReminder(env, offer, origin);
      await auth.db.prepare('UPDATE customer_offers SET internal_reminder_sent_at = ?, updated_at = ? WHERE id = ?')
        .bind(timestamp, timestamp, offer.id).run();
      internalReminders += 1;
    }

    return privateJson({ ok: true, customerReminders, internalReminders });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to send proposal reminders.', 500);
  }
};
