import { json } from './_utils.js';
export const onRequestGet = async ({ request, env }) => {
  const q = new URL(request.url).searchParams; const where = [`l.status='approved'`, `s.status IN ('active','trialing')`]; const values=[];
  for (const [param,column] of [['country','l.country'],['region','l.region'],['type','l.accommodation_type']]) { if(q.get(param)){where.push(`${column}=?`);values.push(q.get(param));} }
  if(q.get('guests')){where.push('l.max_guests>=?');values.push(Number(q.get('guests')));} if(q.get('price')){where.push('l.price_from<=?');values.push(Number(q.get('price')));}
  if(q.get('amenity')){where.push(`l.amenities LIKE ?`);values.push(`%${q.get('amenity').replace(/[%_]/g,'')}%`);} if(q.get('q')){where.push('(l.title LIKE ? OR l.location LIKE ? OR l.description LIKE ?)'); const term=`%${q.get('q').slice(0,100)}%`;values.push(term,term,term);}
  const result=await env.DB.prepare(`SELECT l.id,l.slug,l.title,l.description,l.country,l.region,l.location,l.accommodation_type AS accommodationType,l.price_from AS priceFrom,l.currency,l.max_guests AS maxGuests,l.amenities,l.image_urls AS imageUrls,(CASE WHEN l.featured=1 OR s.plan='featured' THEN 1 ELSE 0 END) AS featured FROM accommodation_listings l JOIN provider_subscriptions s ON s.owner_email=l.owner_email WHERE ${where.join(' AND ')} ORDER BY featured DESC,l.updated_at DESC LIMIT 100`).bind(...values).all();
  return json({ places: result.results || [] }, { headers: { 'Cache-Control':'public, max-age=60' } });
};
