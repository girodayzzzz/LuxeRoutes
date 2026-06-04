import { errorJson, getActiveGrant, getIdentityEmail, json, requireDb } from '../_utils.js';

export const onRequestGet = async ({ request, env }) => {
  try {
    const email = getIdentityEmail(request);
    if (!email) {
      return errorJson('Cloudflare Access did not provide a verified email for the admin application.', 401);
    }

    const grant = await getActiveGrant(requireDb(env), email);
    if (grant?.role !== 'admin') {
      return json({
        error: 'This verified email does not have an active admin grant in D1.',
        email,
        role: grant?.role || null,
      }, { status: 403 });
    }

    return json({ email, role: grant.role });
  } catch (error) {
    return errorJson(error.message || 'Unable to verify admin access.', 500);
  }
};
