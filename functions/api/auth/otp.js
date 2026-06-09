import { errorJson, json } from '../_utils.js';

const ACCESS_LOGIN_MESSAGE = 'LuxeRoutes account login is handled by Cloudflare Access. Open the protected account entry to verify your email.';

export const onRequestGet = () => json({
  ok: false,
  auth: 'cloudflare_access',
  redirect: '/account.html',
  message: ACCESS_LOGIN_MESSAGE,
}, { status: 410 });

export const onRequestPost = async (context) => {
  const action = new URL(context.request.url).searchParams.get('action');
  if (action === 'logout') {
    return json({ ok: true, logout: '/cdn-cgi/access/logout' }, {
      headers: {
        'Set-Cookie': 'luxeroutes_account_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
      },
    });
  }

  return errorJson(ACCESS_LOGIN_MESSAGE, 410);
};
