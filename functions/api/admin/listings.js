import { nowIso, privateErrorJson, privateJson, requireAdmin } from '../_utils.js';
const ALLOWED = ['draft', 'pending', 'approved', 'rejected', 'paused'];
export const onRequestGet = async ({ request, env }) => { const auth = await requireAdmin(request, env); if (auth.error) return auth.error; const data = await auth.db.prepare(`SELECT l.*, s.plan AS subscription_plan, s.status AS subscription_status FROM accommodation_listings l LEFT JOIN provider_subscriptions s ON s.owner_email=l.owner_email ORDER BY l.updated_at DESC`).all(); return privateJson({ listings: data.results || [] }); };
export const onRequestPatch = async ({ request, env }) => {
  const auth = await requireAdmin(request, env); if (auth.error) return auth.error; const body = await request.json().catch(() => ({}));
  const id = String(body.id || ''); const status = String(body.status || ''); if (!id || !ALLOWED.includes(status)) return privateErrorJson('Valid listing and status are required.', 400);
  await auth.db.prepare(`UPDATE accommodation_listings SET status=?, featured=?, rejection_reason=?, approved_at=CASE WHEN ?='approved' THEN ? ELSE approved_at END, updated_at=? WHERE id=?`)
    .bind(status, body.featured ? 1 : 0, String(body.rejectionReason || '').slice(0,1000), status, nowIso(), nowIso(), id).run();
  const listing = await auth.db.prepare('SELECT * FROM accommodation_listings WHERE id=?').bind(id).first(); return listing ? privateJson({ listing }) : privateErrorJson('Listing not found.', 404);
};
