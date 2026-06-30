const adminApp = document.querySelector('[data-admin-app]');
const authStatus = document.querySelector('[data-auth-status]');
const authEmail = document.querySelector('[data-auth-email]');
const authRole = document.querySelector('[data-auth-role]');
const alertBox = document.querySelector('[data-admin-alert]');
const refreshButton = document.querySelector('[data-refresh-admin]');
const statsTarget = document.querySelector('[data-admin-stats]');
const applicationsTarget = document.querySelector('[data-applications]');
const membersTarget = document.querySelector('[data-members]');
const inquiriesTarget = document.querySelector('[data-inquiries]');
const inquiryFilterInput = document.querySelector('[data-admin-inquiry-filter]');
const inquirySearchInput = document.querySelector('[data-admin-inquiry-search]');
const affiliateFilterInput = document.querySelector('[data-admin-affiliate-filter]');
const affiliateSearchInput = document.querySelector('[data-admin-affiliate-search]');
const offersTarget = document.querySelector('[data-admin-offers]');
const customerOffersTarget = document.querySelector('[data-customer-offers]');
const revenueStatsTarget = document.querySelector('[data-revenue-stats]');
const sendProposalRemindersButton = document.querySelector('[data-send-proposal-reminders]');
const couponsTarget = document.querySelector('[data-coupons]');
const couponForm = document.querySelector('[data-coupon-form]');
const customerOfferForm = document.querySelector('[data-customer-offer-form]');
const grantForm = document.querySelector('[data-grant-form]');
const inquiryDialog = document.querySelector('[data-inquiry-dialog]');
const inquiryDialogTitle = document.querySelector('[data-inquiry-dialog-title]');
const inquiryDialogContent = document.querySelector('[data-inquiry-dialog-content]');
const publishDialog = document.querySelector('[data-publish-dialog]');
const publishForm = document.querySelector('[data-publish-form]');
const createOwnerOfferButton = document.querySelector('[data-create-owner-offer]');

let currentAdminEmail = '';
let profiles = [];
let grants = [];
let inquiries = [];
let offers = [];
let affiliates = [];
let coupons = [];
let customerOffers = [];

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[character]));
const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};
const roleLabel = (role) => ({ customer: 'Customer', owner: 'Owner', manager: 'Manager', admin: 'Admin', villa: 'Private villa', chalet: 'Chalet', 'boutique-hotel': 'Boutique hotel', apartment: 'Apartment', cabin: 'Cabin or glamping', retreat: 'Wellness retreat', 'wine-tasting': 'Wine tasting', 'food-experience': 'Food experience', 'private-transfer': 'Private transfer', 'yacht-experience': 'Yacht experience', 'fishing-escape': 'Fishing escape', 'wellness-experience': 'Wellness experience', 'guided-route': 'Guided route', 'event-service': 'Event or concierge service' }[role] || role || 'Customer');
const statusLabel = (status) => String(status || 'unknown').replaceAll('_', ' ');
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const safeExternalUrl = (value) => {
  try { const url = new URL(String(value || '')); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch (error) { return ''; }
};
const parsePayload = (inquiry) => { try { return JSON.parse(inquiry.payloadJson || '{}'); } catch (error) { return {}; } };
const showAlert = (message = '', kind = 'error') => {
  if (!alertBox) return;
  alertBox.hidden = !message;
  alertBox.textContent = message;
  alertBox.dataset.kind = kind;
};
const requestJson = async (url, options = {}) => {
  const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) }, ...options });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};
  if (!response.ok) {
    if (response.status === 404 && !contentType.includes('application/json')) {
      throw new Error('The API route was not found. This site must be deployed on Cloudflare Pages, not GitHub Pages, for admin publishing to work.');
    }
    throw new Error(data.error || `Request failed with HTTP ${response.status}.`);
  }
  return data;
};

const formatMoney = (amount = 0, currency = 'EUR') => `${currency || 'EUR'} ${Number(amount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const sumCustomerOffers = (predicate, field = 'estimatedCommissionAmount') => customerOffers
  .filter(predicate)
  .reduce((total, offer) => total + Number(offer[field] || 0), 0);
const renderRevenueStats = () => {
  if (!revenueStatsTarget) return;
  const activeStatuses = new Set(['sent', 'customer_interested', 'changes_requested', 'owner_confirmed']);
  const primaryCurrency = customerOffers.find((offer) => offer.currency)?.currency || 'EUR';
  const activeProposals = customerOffers.filter((offer) => activeStatuses.has(offer.status || 'draft'));
  const wonProposals = customerOffers.filter((offer) => offer.status === 'won');
  const pendingCustomer = customerOffers.filter((offer) => ['sent', 'changes_requested'].includes(offer.status || '') && !offer.customerRespondedAt).length;
  const commissionDue = sumCustomerOffers((offer) => offer.commissionStatus === 'due');
  const commissionPaid = sumCustomerOffers((offer) => offer.commissionStatus === 'paid');
  const activeValue = activeProposals.reduce((total, offer) => total + Number(offer.ownerPriceAmount || 0), 0);
  const activeCommission = activeProposals.reduce((total, offer) => total + Number(offer.estimatedCommissionAmount || 0), 0);
  revenueStatsTarget.innerHTML = [
    ['Active proposal value', formatMoney(activeValue, primaryCurrency)],
    ['Estimated commission', formatMoney(activeCommission, primaryCurrency)],
    ['Commission due', formatMoney(commissionDue, primaryCurrency)],
    ['Commission paid', formatMoney(commissionPaid, primaryCurrency)],
    ['Won proposals', wonProposals.length],
    ['Needs customer reply', pendingCustomer],
  ].map(([label, value]) => `<article><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></article>`).join('');
};

const isPropertyInquiry = (inquiry) => {
  const payload = parsePayload(inquiry);
  return Boolean(payload.property_type || String(payload.offer_type || '').toLowerCase() === 'property' || /property|owner/i.test(inquiry.inquiryType));
};

const renderStats = () => {
  if (!statsTarget) return;
  const pending = profiles.filter((profile) => profile.status === 'pending_admin_grant').length;
  const openInquiries = inquiries.filter((inquiry) => !['approved', 'resolved', 'closed', 'declined'].includes(inquiry.status)).length;
  const publishedOffers = offers.filter((offer) => offer.status === 'published').length;
  statsTarget.innerHTML = [['Pending applications', pending], ['Active members', grants.filter((grant) => grant.status === 'active').length], ['Open inquiries', openInquiries], ['Published stays', publishedOffers]]
    .map(([label, value]) => `<article><strong>${value}</strong><span>${label}</span></article>`).join('');
};
const renderApplications = () => {
  if (!applicationsTarget) return;
  const pending = profiles.filter((profile) => profile.status === 'pending_admin_grant');
  applicationsTarget.innerHTML = pending.map((profile) => {
    const website = safeExternalUrl(profile.companyWebsite);
    return `<article class="admin-record"><div><span class="status-pill status-warning">${escapeHtml(roleLabel(profile.requestedRole))} request</span><h3>${escapeHtml(profile.name || profile.email)}</h3><p><strong>${escapeHtml(profile.email)}</strong>${profile.companyName ? ` · ${escapeHtml(profile.companyName)}` : ''}</p>${website ? `<p><a href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(website)}</a></p>` : ''}${profile.businessContext ? `<p>${escapeHtml(profile.businessContext)}</p>` : ''}<small>Submitted ${escapeHtml(formatDate(profile.updatedAt))}</small></div><div class="admin-record-actions"><button class="btn btn-primary" type="button" data-grant-action="approve" data-email="${escapeHtml(profile.email)}" data-role="${escapeHtml(profile.requestedRole)}">Approve</button><button class="btn btn-secondary" type="button" data-grant-action="reject" data-email="${escapeHtml(profile.email)}" data-role="customer">Reject</button></div></article>`;
  }).join('') || '<p class="empty-state">No owner or manager applications are waiting for review.</p>';
};
const renderMembers = () => {
  if (!membersTarget) return;
  const profileByEmail = new Map(profiles.map((profile) => [profile.email, profile]));
  membersTarget.innerHTML = grants.map((grant) => {
    const profile = profileByEmail.get(grant.email) || {};
    const isSelf = normalizeEmail(grant.email) === normalizeEmail(currentAdminEmail);
    return `<tr><td><strong>${escapeHtml(profile.name || grant.email)}</strong><br><small>${escapeHtml(grant.email)}</small></td><td>${escapeHtml(roleLabel(grant.role))}</td><td>${escapeHtml(statusLabel(grant.status))}</td><td>${escapeHtml(profile.companyName || '—')}</td><td>${escapeHtml(formatDate(grant.updatedAt))}</td><td><form class="inline-role-form" data-member-form data-email="${escapeHtml(grant.email)}"><select name="role" aria-label="Role for ${escapeHtml(grant.email)}" ${isSelf ? 'disabled' : ''}>${['customer', 'owner', 'manager', 'admin'].map((role) => `<option value="${role}" ${grant.role === role ? 'selected' : ''}>${roleLabel(role)}</option>`).join('')}</select><button class="mini-action" type="submit" ${isSelf ? 'disabled' : ''}>Save</button></form></td></tr>`;
  }).join('') || '<tr><td colspan="6" class="empty-state">No member grants found.</td></tr>';
};
const getFilteredInquiries = () => {
  const statusFilter = inquiryFilterInput?.value || 'all';
  const search = String(inquirySearchInput?.value || '').trim().toLowerCase();
  return inquiries.filter((inquiry) => {
    if (statusFilter !== 'all' && inquiry.status !== statusFilter) return false;
    if (!search) return true;
    const payload = parsePayload(inquiry);
    return [inquiry.name, inquiry.email, inquiry.phone, inquiry.inquiryType, inquiry.status, inquiry.offerTitle, payload.message, payload.notes, payload.property_name, payload.offer]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search);
  });
};

const renderInquiries = () => {
  if (!inquiriesTarget) return;
  const filteredInquiries = getFilteredInquiries();
  inquiriesTarget.innerHTML = filteredInquiries.map((inquiry) => `<tr><td><strong>${escapeHtml(inquiry.name || 'Unnamed')}</strong><br><small>${escapeHtml(inquiry.email || inquiry.phone || 'No contact')}</small></td><td>${escapeHtml(inquiry.inquiryType)}</td><td>${escapeHtml(formatDate(inquiry.createdAt))}</td><td><select data-inquiry-status data-id="${escapeHtml(inquiry.id)}" aria-label="Status for ${escapeHtml(inquiry.inquiryType)}">${['new', 'in_progress', 'waiting', 'approved', 'resolved', 'closed', 'declined'].map((status) => `<option value="${status}" ${inquiry.status === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}</select></td><td><button class="mini-action" type="button" data-inquiry-detail="${escapeHtml(inquiry.id)}">View details</button>${isPropertyInquiry(inquiry) && !offers.some((offer) => offer.sourceInquiryId === inquiry.id) ? ` <button class="mini-action" type="button" data-publish-inquiry="${escapeHtml(inquiry.id)}">Publish stay</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="empty-state">No inquiries match the current filters.</td></tr>';
};
const getFilteredAffiliates = () => {
  const statusFilter = affiliateFilterInput?.value || 'all';
  const search = String(affiliateSearchInput?.value || '').trim().toLowerCase();
  return affiliates.filter((affiliate) => {
    if (statusFilter !== 'all' && (affiliate.status || 'pending_review') !== statusFilter) return false;
    if (!search) return true;
    return [affiliate.name, affiliate.email, affiliate.website, affiliate.audience, affiliate.referralCode, affiliate.note]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search);
  });
};

const renderAffiliates = () => {
  if (!affiliatesTarget) return;
  const filteredAffiliates = getFilteredAffiliates();
  affiliatesTarget.innerHTML = filteredAffiliates.map((affiliate) => `<tr><td><strong>${escapeHtml(affiliate.name || affiliate.email)}</strong><br><small>${escapeHtml(affiliate.email || '')}${affiliate.website ? ` · <a href="${escapeHtml(affiliate.website)}" target="_blank" rel="noopener noreferrer">website</a>` : ''}</small><br><small>${escapeHtml(affiliate.audience || '')}</small></td><td>${escapeHtml(statusLabel(affiliate.status || 'pending_review'))}</td><td><code>${escapeHtml(affiliate.referralCode || '')}</code></td><td>${Number(affiliate.visits || 0)} visits<br>${Number(affiliate.inquiries || 0)} inquiries<br>${Number(affiliate.totalEvents || 0)} events</td><td><form class="inline-role-form" data-affiliate-form data-id="${escapeHtml(affiliate.id)}"><select name="status" aria-label="Affiliate status for ${escapeHtml(affiliate.email || '')}">${['pending_review', 'active', 'paused', 'rejected'].map((status) => `<option value="${status}" ${(affiliate.status || 'pending_review') === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}</select><input name="referralCode" value="${escapeHtml(affiliate.referralCode || '')}" placeholder="referralcode" /><textarea name="note" rows="2" placeholder="Admin note">${escapeHtml(affiliate.note || '')}</textarea><button class="mini-action" type="submit">Save</button></form></td></tr>`).join('') || '<tr><td colspan="5" class="empty-state">No affiliate applications match the current filters.</td></tr>';
};

const appendUploadedImageUrl = (form, targetName, url) => {
  const field = form?.elements?.namedItem(targetName);
  if (!field || !url) return;
  if (field.tagName === 'TEXTAREA') {
    const urls = String(field.value || '').split(/\n+/).map((item) => item.trim()).filter(Boolean);
    if (!urls.includes(url)) urls.push(url);
    field.value = urls.join('\n');
    return;
  }
  field.value = url;
};

const adminAllowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const adminMaxImageBytes = 8 * 1024 * 1024;

const validateAdminImageFile = (file) => {
  if (!adminAllowedImageTypes.includes(file.type)) return 'Upload a JPG, PNG, WebP, or GIF image.';
  if (file.size <= 0) return 'The selected image is empty.';
  if (file.size > adminMaxImageBytes) return 'Images must be 8 MB or smaller.';
  return '';
};

const uploadOfferImageFile = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const data = await requestJson('/api/owner/images', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  });
  return data.url;
};

const payloadFromTextFields = (formData) => {
  const payload = {};
  formData.forEach((value, key) => {
    if (value instanceof File) return;
    payload[key] = value;
  });
  return payload;
};

const renderCoupons = () => {
  if (!couponsTarget) return;
  couponsTarget.innerHTML = coupons.map((coupon) => `<tr><td><strong>${escapeHtml(coupon.email)}</strong><br><small>${escapeHtml(coupon.title || '')}</small></td><td><code>${escapeHtml(coupon.code || '')}</code><br><small>${escapeHtml(coupon.description || coupon.note || '')}</small></td><td>${escapeHtml(statusLabel(coupon.status || 'active'))}</td><td>${escapeHtml(coupon.expiresAt || 'No expiry')}</td><td><form class="inline-role-form" data-coupon-row-form data-id="${escapeHtml(coupon.id)}"><select name="status" aria-label="Coupon status for ${escapeHtml(coupon.code || '')}">${['active', 'used', 'expired', 'revoked'].map((status) => `<option value="${status}" ${(coupon.status || 'active') === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}</select><input type="date" name="expiresAt" value="${escapeHtml(coupon.expiresAt || '')}" /><input name="note" value="${escapeHtml(coupon.note || '')}" placeholder="Internal note" /><button class="mini-action" type="submit">Save</button></form></td></tr>`).join('') || '<tr><td colspan="5" class="empty-state">No customer coupons have been created yet.</td></tr>';
};

const renderCustomerOffers = () => {
  if (!customerOffersTarget) return;
  const statuses = ['draft', 'sent', 'customer_interested', 'changes_requested', 'owner_confirmed', 'won', 'lost', 'expired', 'cancelled'];
  const commissionStatuses = ['not_due', 'due', 'invoiced', 'paid', 'waived'];
  customerOffersTarget.innerHTML = customerOffers.map((offer) => `<tr><td><strong>${escapeHtml(offer.customerEmail || '')}</strong><br><small>${escapeHtml(offer.inquiryId || 'No inquiry linked')}</small></td><td><strong>${escapeHtml(offer.title || 'Private proposal')}</strong><br><small>${escapeHtml(offer.destinationLabel || '')}</small><br><small>${escapeHtml(offer.couponLabel || offer.perkLabel || '')}</small></td><td>${escapeHtml(offer.currency || 'EUR')} ${Number(offer.ownerPriceAmount || 0).toLocaleString()}<br><small>${escapeHtml(offer.priceNote || '')}</small></td><td>${escapeHtml(statusLabel(offer.commissionType || 'percent'))}: ${Number(offer.commissionValue || 0)}<br><small>Est. ${escapeHtml(offer.currency || 'EUR')} ${Number(offer.estimatedCommissionAmount || 0).toLocaleString()}</small><br><small>${escapeHtml(statusLabel(offer.commissionStatus || 'not_due'))}</small></td><td>${escapeHtml(statusLabel(offer.status || 'draft'))}<br><small>${offer.expiresAt ? `Expires ${escapeHtml(offer.expiresAt)}` : 'No expiry'}</small></td><td><form class="inline-role-form" data-customer-offer-row-form data-id="${escapeHtml(offer.id)}"><select name="status" aria-label="Proposal status for ${escapeHtml(offer.customerEmail || '')}">${statuses.map((status) => `<option value="${status}" ${(offer.status || 'draft') === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}</select><select name="commissionStatus" aria-label="Commission status for ${escapeHtml(offer.title || '')}">${commissionStatuses.map((status) => `<option value="${status}" ${(offer.commissionStatus || 'not_due') === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}</select><input type="date" name="expiresAt" value="${escapeHtml(offer.expiresAt || '')}" /><textarea name="internalNote" rows="2" placeholder="Internal note">${escapeHtml(offer.internalNote || '')}</textarea><button class="mini-action" type="submit">Save</button></form></td></tr>`).join('') || '<tr><td colspan="6" class="empty-state">No customer proposals yet.</td></tr>';
};

const renderOffers = () => {
  if (!offersTarget) return;
  const partnerStatuses = ['draft', 'pending_review', 'changes_requested', 'approved', 'published', 'archived'];
  const followUpStatuses = ['not_started', 'contacted', 'waiting_reply', 'scheduled', 'complete'];
  offersTarget.innerHTML = offers.map((offer) => `<tr><td><strong>${escapeHtml(offer.title)}</strong><br><small>${escapeHtml(offer.locationLabel)}</small></td><td>${escapeHtml(roleLabel(offer.stayType))}<br><small>${escapeHtml(offer.country)} · ${escapeHtml(offer.region)}</small></td><td>${escapeHtml(statusLabel(offer.status))}<br><small>${escapeHtml(statusLabel(offer.partnerStatus || 'pending_review'))}</small></td><td><form class="inline-offer-form" data-offer-form data-id="${escapeHtml(offer.id)}"><label>Owner email<input type="email" name="ownerEmail" value="${escapeHtml(offer.ownerEmail || '')}" placeholder="owner@example.com" /></label><label>Manager email<input type="email" name="managerEmail" value="${escapeHtml(offer.managerEmail || '')}" placeholder="manager@example.com" /></label><label>Partner status<select name="partnerStatus">${partnerStatuses.map((status) => `<option value="${status}" ${(offer.partnerStatus || 'pending_review') === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}</select></label><label>Main image URL<input type="url" name="imageUrl" value="${escapeHtml(offer.imageUrl || '')}" placeholder="https://…" /></label><label>Upload main image<input type="file" name="mainImageUpload" accept="image/jpeg,image/png,image/webp,image/gif" data-admin-image-upload data-image-target="imageUrl" /></label><label>Gallery URLs<textarea name="galleryUrls" rows="2" placeholder="One URL per line">${escapeHtml(offer.galleryUrls || '')}</textarea></label><label>Upload gallery images<input type="file" name="galleryImageUpload" accept="image/jpeg,image/png,image/webp,image/gif" data-admin-image-upload data-image-target="galleryUrls" multiple /></label><label>Owner note<textarea name="ownerNotes" rows="2" placeholder="Message visible in owner panel">${escapeHtml(offer.ownerNotes || '')}</textarea></label><label>Owner follow-up date<input type="date" name="ownerFollowUpAt" value="${escapeHtml(offer.ownerFollowUpAt || '')}" /></label><label>Owner follow-up status<select name="ownerFollowUpStatus"><option value="">Not set</option>${followUpStatuses.map((status) => `<option value="${status}" ${(offer.ownerFollowUpStatus || '') === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}</select></label><label>Manager note<textarea name="managerNotes" rows="2" placeholder="Message visible in manager panel">${escapeHtml(offer.managerNotes || '')}</textarea></label><label>Manager follow-up date<input type="date" name="managerFollowUpAt" value="${escapeHtml(offer.managerFollowUpAt || '')}" /></label><label>Manager follow-up status<select name="managerFollowUpStatus"><option value="">Not set</option>${followUpStatuses.map((status) => `<option value="${status}" ${(offer.managerFollowUpStatus || '') === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}</select></label><button class="mini-action" type="submit">Save assignments</button></form></td><td>${escapeHtml(formatDate(offer.updatedAt))}</td><td><div class="admin-action-stack">${offer.status === 'published' ? `<button class="mini-action" type="button" data-offer-status="unpublished" data-partner-status="approved" data-id="${escapeHtml(offer.id)}">Unpublish</button>` : `<button class="mini-action" type="button" data-offer-status="published" data-partner-status="published" data-id="${escapeHtml(offer.id)}">Approve & publish</button>`}<button class="mini-action" type="button" data-offer-status="unpublished" data-partner-status="changes_requested" data-id="${escapeHtml(offer.id)}">Request changes</button><button class="mini-action" type="button" data-offer-status="unpublished" data-partner-status="archived" data-id="${escapeHtml(offer.id)}">Decline/archive</button></div></td></tr>`).join('') || '<tr><td colspan="6" class="empty-state">No database-backed stay offers yet.</td></tr>';
};
const renderAll = () => { renderStats(); renderRevenueStats(); renderApplications(); renderMembers(); renderInquiries(); renderAffiliates(); renderCoupons(); renderCustomerOffers(); renderOffers(); };
const loadAdminData = async () => {
  showAlert('');
  if (refreshButton) refreshButton.disabled = true;
  try {
    const [grantData, inquiryData, offerData, affiliateData, couponData, customerOfferData] = await Promise.all([requestJson('/api/admin/grants'), requestJson('/api/admin/inquiries'), requestJson('/api/admin/offers'), requestJson('/api/admin/affiliates'), requestJson('/api/admin/coupons'), requestJson('/api/admin/customer-offers')]);
    profiles = Array.isArray(grantData.profiles) ? grantData.profiles : [];
    grants = Array.isArray(grantData.grants) ? grantData.grants : [];
    inquiries = Array.isArray(inquiryData.inquiries) ? inquiryData.inquiries : [];
    offers = Array.isArray(offerData.offers) ? offerData.offers : [];
    affiliates = Array.isArray(affiliateData.affiliates) ? affiliateData.affiliates : [];
    coupons = Array.isArray(couponData.coupons) ? couponData.coupons : [];
    customerOffers = Array.isArray(customerOfferData.customerOffers) ? customerOfferData.customerOffers : [];
    renderAll();
  } catch (error) { showAlert(error.message); } finally { if (refreshButton) refreshButton.disabled = false; }
};
const saveGrant = async ({ email, role, action = 'approve', note = '' }) => {
  await requestJson('/api/admin/grants', { method: 'POST', body: JSON.stringify({ email, role, action, note }) });
  showAlert(`${email} was updated successfully.`, 'success');
  await loadAdminData();
};
const resetPublishOptions = () => {
  publishForm?.querySelectorAll('[name="options"]').forEach((input) => { input.checked = false; });
};

const openBlankOfferDialog = () => {
  if (!publishForm || !publishDialog) return;
  publishForm.reset();
  resetPublishOptions();
  if (publishForm.elements.partnerStatus) publishForm.elements.partnerStatus.value = 'published';
  publishDialog.showModal();
};

const openPublishDialog = (inquiry) => {
  if (!publishForm || !publishDialog) return;
  const payload = parsePayload(inquiry);
  publishForm.reset();
  resetPublishOptions();
  const title = payload.property_name || payload.offer_name || payload.company_name || '';
  const location = payload.location || '';
  const values = { sourceInquiryId: inquiry.id, title, description: payload.property_summary || payload.message || '', imageUrl: payload.image_url || '', guestLabel: payload.guest_capacity || '', priceLabel: payload.price_from || '', ownerEmail: inquiry.email || payload.email || '', ownerNotes: payload.property_summary || '', partnerStatus: 'published' };
  Object.entries(values).forEach(([name, value]) => { const field = publishForm.elements.namedItem(name); if (field) field.value = value; });
  const typeMap = { Villa: 'villa', Apartment: 'apartment', Chalet: 'chalet', 'Boutique hotel': 'boutique-hotel', Cabin: 'cabin', 'Wellness retreat': 'retreat', 'Wine tasting': 'wine-tasting', 'Food experience': 'food-experience', 'Private transfer': 'private-transfer', 'Yacht experience': 'yacht-experience', 'Fishing escape': 'fishing-escape', 'Wellness experience': 'wellness-experience', 'Guided route': 'guided-route', 'Event service': 'event-service' };
  if (typeMap[payload.property_type]) publishForm.elements.stayType.value = typeMap[payload.property_type];
  if (payload.country && Array.from(publishForm.elements.country.options).some((option) => option.value === String(payload.country).toLowerCase())) publishForm.elements.country.value = String(payload.country).toLowerCase();
  if (payload.region && Array.from(publishForm.elements.region.options).some((option) => option.value === payload.region)) publishForm.elements.region.value = payload.region;
  publishForm.elements.locationLabel.value = location || [publishForm.elements.country.selectedOptions[0].textContent, publishForm.elements.region.selectedOptions[0].textContent].join(' · ');
  const selectedOptions = Array.isArray(payload.options) ? payload.options : String(payload.options || '').split(/[\s,]+/);
  publishForm.querySelectorAll('[name="options"]').forEach((input) => { input.checked = selectedOptions.includes(input.value); });
  publishDialog.showModal();
};

const verifyAdmin = async () => {
  try {
    const session = await requestJson('/api/admin/session');
    currentAdminEmail = session.email;
    authStatus.textContent = 'Verified by Cloudflare Access and the D1 admin grant.';
    authEmail.textContent = session.email;
    authRole.textContent = 'Admin'; authRole.className = 'status-pill status-approved';
    if (adminApp) adminApp.hidden = false;
    await loadAdminData();
  } catch (error) {
    authStatus.textContent = error.message; authEmail.textContent = 'No verified admin session'; authRole.textContent = 'Locked'; authRole.className = 'status-pill status-warning'; if (adminApp) adminApp.hidden = true;
  }
};

document.addEventListener('click', async (event) => {
  const createOfferButton = event.target.closest('[data-create-owner-offer]');
  if (createOfferButton) { openBlankOfferDialog(); return; }
  const reminderButton = event.target.closest('[data-send-proposal-reminders]');
  if (reminderButton) {
    reminderButton.disabled = true;
    try {
      const result = await requestJson('/api/admin/customer-offers/reminders', { method: 'POST', body: JSON.stringify({}) });
      showAlert(`Proposal reminders sent: ${Number(result.customerReminders || 0)} customer, ${Number(result.internalReminders || 0)} internal.`, 'success');
      await loadAdminData();
    } catch (error) {
      showAlert(error.message);
    } finally {
      reminderButton.disabled = false;
    }
    return;
  }
  const grantButton = event.target.closest('[data-grant-action]');
  if (grantButton) { grantButton.disabled = true; try { await saveGrant({ email: grantButton.dataset.email, role: grantButton.dataset.role, action: grantButton.dataset.grantAction }); } catch (error) { showAlert(error.message); grantButton.disabled = false; } return; }
  const detailButton = event.target.closest('[data-inquiry-detail]');
  if (detailButton) { const inquiry = inquiries.find((item) => item.id === detailButton.dataset.inquiryDetail); if (!inquiry) return; const details = { name: inquiry.name, email: inquiry.email, phone: inquiry.phone, received: formatDate(inquiry.createdAt), ...parsePayload(inquiry) }; inquiryDialogTitle.textContent = inquiry.inquiryType || 'Inquiry'; inquiryDialogContent.innerHTML = Object.entries(details).filter(([, value]) => value).map(([key, value]) => `<div><dt>${escapeHtml(key.replaceAll('_', ' '))}</dt><dd>${escapeHtml(Array.isArray(value) ? value.join(', ') : value)}</dd></div>`).join('') || '<p>No additional details.</p>'; inquiryDialog.showModal(); return; }
  const publishButton = event.target.closest('[data-publish-inquiry]');
  if (publishButton) { const inquiry = inquiries.find((item) => item.id === publishButton.dataset.publishInquiry); if (inquiry) openPublishDialog(inquiry); return; }
  const statusButton = event.target.closest('[data-offer-status]');
  if (statusButton) { statusButton.disabled = true; try { await requestJson('/api/admin/offers', { method: 'PATCH', body: JSON.stringify({ id: statusButton.dataset.id, status: statusButton.dataset.offerStatus, partnerStatus: statusButton.dataset.partnerStatus }) }); showAlert(`Offer ${statusButton.textContent.trim().toLowerCase()} saved.`, 'success'); await loadAdminData(); } catch (error) { showAlert(error.message); statusButton.disabled = false; } }
});
document.addEventListener('change', async (event) => {
  const input = event.target.closest('[data-admin-image-upload]');
  if (!input) return;

  const form = input.form;
  const files = Array.from(input.files || []);
  if (!form || files.length === 0) return;

  input.disabled = true;
  const validationError = files.map(validateAdminImageFile).find(Boolean);
  if (validationError) {
    showAlert(validationError);
    input.value = '';
    input.disabled = false;
    return;
  }
  showAlert(`Uploading ${files.length === 1 ? 'image' : `${files.length} images`}…`, 'success');
  try {
    for (const file of files) {
      const url = await uploadOfferImageFile(file);
      appendUploadedImageUrl(form, input.dataset.imageTarget, url);
    }
    input.value = '';
    showAlert('Image upload complete. Uploaded URL fields were filled automatically.', 'success');
  } catch (error) {
    showAlert(error.message || 'Unable to upload image.');
  } finally {
    input.disabled = false;
  }
});
document.addEventListener('submit', async (event) => {
  const offerForm = event.target.closest('[data-offer-form]');
  if (offerForm) {
    event.preventDefault();
    const data = new FormData(offerForm);
    const payload = payloadFromTextFields(data);
    payload.id = offerForm.dataset.id;
    try {
      await requestJson('/api/admin/offers', { method: 'PATCH', body: JSON.stringify(payload) });
      showAlert('Offer assignments and partner notes saved.', 'success');
      await loadAdminData();
    } catch (error) {
      showAlert(error.message);
    }
    return;
  }
  if (event.target === customerOfferForm) {
    event.preventDefault();
    const formData = new FormData(customerOfferForm);
    try {
      await requestJson('/api/admin/customer-offers', { method: 'POST', body: JSON.stringify(payloadFromTextFields(formData)) });
      customerOfferForm.reset();
      showAlert('Customer proposal created.', 'success');
      await loadAdminData();
    } catch (error) { showAlert(error.message); }
    return;
  }
  const customerOfferRowForm = event.target.closest('[data-customer-offer-row-form]');
  if (customerOfferRowForm) {
    event.preventDefault();
    const formData = new FormData(customerOfferRowForm);
    try {
      await requestJson('/api/admin/customer-offers', { method: 'PATCH', body: JSON.stringify({ id: customerOfferRowForm.dataset.id, status: formData.get('status'), commissionStatus: formData.get('commissionStatus'), expiresAt: formData.get('expiresAt'), internalNote: formData.get('internalNote') }) });
      showAlert('Customer proposal updated.', 'success');
      await loadAdminData();
    } catch (error) { showAlert(error.message); }
    return;
  }
  if (event.target === couponForm) {
    event.preventDefault();
    const formData = new FormData(couponForm);
    try {
      await requestJson('/api/admin/coupons', { method: 'POST', body: JSON.stringify(payloadFromTextFields(formData)) });
      couponForm.reset();
      showAlert('Customer coupon saved.', 'success');
      await loadAdminData();
    } catch (error) { showAlert(error.message); }
    return;
  }
  const couponRowForm = event.target.closest('[data-coupon-row-form]');
  if (couponRowForm) {
    event.preventDefault();
    const formData = new FormData(couponRowForm);
    try {
      await requestJson('/api/admin/coupons', { method: 'PATCH', body: JSON.stringify({ id: couponRowForm.dataset.id, status: formData.get('status'), expiresAt: formData.get('expiresAt'), note: formData.get('note') }) });
      showAlert('Coupon updated.', 'success');
      await loadAdminData();
    } catch (error) { showAlert(error.message); }
    return;
  }
  const affiliateForm = event.target.closest('[data-affiliate-form]');
  if (affiliateForm) {
    event.preventDefault();
    const formData = new FormData(affiliateForm);
    try {
      await requestJson('/api/admin/affiliates', { method: 'PATCH', body: JSON.stringify({ id: affiliateForm.dataset.id, status: formData.get('status'), referralCode: formData.get('referralCode'), note: formData.get('note') }) });
      showAlert('Affiliate partner saved.', 'success');
      await loadAdminData();
    } catch (error) {
      showAlert(error.message);
    }
    return;
  }

  const memberForm = event.target.closest('[data-member-form]');
  if (memberForm) { event.preventDefault(); try { await saveGrant({ email: memberForm.dataset.email, role: new FormData(memberForm).get('role'), note: 'Role updated from admin console' }); } catch (error) { showAlert(error.message); } return; }
  if (event.target === grantForm) { event.preventDefault(); const data = new FormData(grantForm); try { await saveGrant({ email: data.get('email'), role: data.get('role'), note: data.get('note') }); grantForm.reset(); } catch (error) { showAlert(error.message); } return; }
  if (event.target === publishForm) { event.preventDefault(); const data = new FormData(publishForm); const payload = payloadFromTextFields(data); payload.options = data.getAll('options'); payload.status = payload.partnerStatus === 'published' ? 'published' : 'unpublished'; try { await requestJson('/api/admin/offers', { method: 'POST', body: JSON.stringify(payload) }); publishDialog.close(); showAlert(payload.status === 'published' ? 'Offer assigned to owner and published.' : 'Offer assigned to owner for review.', 'success'); await loadAdminData(); } catch (error) { showAlert(error.message); } }
});
document.addEventListener('change', async (event) => {
  const select = event.target.closest('[data-inquiry-status]');
  if (!select) return;
  select.disabled = true;
  try { await requestJson('/api/admin/inquiries', { method: 'PATCH', body: JSON.stringify({ id: select.dataset.id, status: select.value }) }); showAlert('Inquiry status updated.', 'success'); await loadAdminData(); } catch (error) { showAlert(error.message); select.disabled = false; }
});
inquiryFilterInput?.addEventListener('change', renderInquiries);
inquirySearchInput?.addEventListener('input', renderInquiries);
affiliateFilterInput?.addEventListener('change', renderAffiliates);
affiliateSearchInput?.addEventListener('input', renderAffiliates);
refreshButton?.addEventListener('click', loadAdminData);
verifyAdmin();
