import { makeId, privateErrorJson, privateJson, requireAccountRole, requireAdmin } from '../_utils.js';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

const cleanString = (value, maxLength = 2000) => String(value || '').trim().slice(0, maxLength);
const cleanKey = (value) => cleanString(value, 500).replace(/^\/+/, '');
const getImagesBucket = (env = {}) => env.OWNER_IMAGES || null;

const requireImageUploader = async (request, env) => {
  const accountAuth = await requireAccountRole(request, env, ['owner']);
  if (!accountAuth.error) return accountAuth;

  const adminAuth = await requireAdmin(request, env);
  if (!adminAuth.error) return { ...adminAuth, role: 'admin' };

  return accountAuth;
};

const getUploadOrigin = (request) => new URL(request.url).origin;
const makeImageUrl = (request, key) => `${getUploadOrigin(request)}/api/owner/images?key=${encodeURIComponent(key)}`;

export const onRequestGet = async ({ request, env }) => {
  try {
    const bucket = getImagesBucket(env);
    if (!bucket) return privateErrorJson('Owner image storage is not configured.', 500);

    const key = cleanKey(new URL(request.url).searchParams.get('key'));
    if (!key || !key.startsWith('owner-images/')) return privateErrorJson('Image key is required.', 400);

    const object = await bucket.get(key);
    if (!object) return privateErrorJson('Image not found.', 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', object.httpEtag);
    return new Response(object.body, { headers });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to load image.', 500);
  }
};

export const onRequestPost = async ({ request, env }) => {
  try {
    const auth = await requireImageUploader(request, env);
    if (auth.error) return auth.error;

    const bucket = getImagesBucket(env);
    if (!bucket) return privateErrorJson('Owner image storage is not configured.', 500);

    const formData = await request.formData().catch(() => null);
    const file = formData?.get('image') || formData?.get('file');
    if (!(file instanceof File)) return privateErrorJson('Choose an image file to upload.', 400);
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) return privateErrorJson('Upload a JPG, PNG, WebP, or GIF image.', 400);
    if (file.size <= 0) return privateErrorJson('The selected image is empty.', 400);
    if (file.size > MAX_IMAGE_BYTES) return privateErrorJson('Images must be 8 MB or smaller.', 400);

    const extension = ALLOWED_IMAGE_TYPES.get(file.type);
    const ownerSegment = cleanString(auth.email, 320).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'account';
    const key = `owner-images/${ownerSegment}/${makeId('img')}.${extension}`;
    await bucket.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: {
        uploadedBy: auth.email,
        uploaderRole: auth.role || auth.grant?.role || 'admin',
        originalName: cleanString(file.name, 180),
      },
    });

    return privateJson({ key, url: makeImageUrl(request, key) }, { status: 201 });
  } catch (error) {
    return privateErrorJson(error.message || 'Unable to upload image.', 500);
  }
};
