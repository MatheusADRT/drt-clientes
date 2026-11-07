'use strict';
// Avaliações do Google de cada cliente (nota e número), via Places API (New). Precisa de GOOGLE_PLACES_KEY
// e do Place ID do cliente (campo "googlePlaceId"). Uma consulta por cliente por dia; histórico guardado por dia.
const https = require('https');
const store = require('./store');
const B = require('./billing');

const KEY = () => process.env.GOOGLE_PLACES_KEY || '';
const on = () => !!KEY();
function fetchPlace(placeId) {
  return new Promise((resolve) => {
    if (!on() || !placeId) return resolve(null);
    const req = https.get({ host: 'places.googleapis.com', path: '/v1/places/' + encodeURIComponent(placeId), timeout: 8000, headers: { 'X-Goog-Api-Key': KEY(), 'X-Goog-FieldMask': 'rating,userRatingCount,displayName' } }, (res) => {
      let b = ''; res.on('data', (c) => { if (b.length < 20000) b += c; });
      res.on('end', () => { try { const j = JSON.parse(b); resolve(res.statusCode === 200 && j.rating != null ? { rating: Number(j.rating), count: Number(j.userRatingCount) || 0 } : null); } catch (e) { resolve(null); } });
    });
    req.on('timeout', () => req.destroy()); req.on('error', () => resolve(null));
  });
}
async function refresh(client) {
  if (!client.googlePlaceId) return null;
  const k = B.today(); client.reviews = client.reviews || { days: {} };
  if (client.reviews.days[k]) return client.reviews.days[k];
  const r = await fetchPlace(client.googlePlaceId); if (!r) return null;
  client.reviews.days[k] = r; client.reviews.last = { ...r, at: k };
  const keys = Object.keys(client.reviews.days).sort(); while (keys.length > 400) delete client.reviews.days[keys.shift()];
  store.save(); return r;
}
function summary(client) {
  const R = client.reviews; if (!R || !R.last) return null;
  const ago = R.days[B.addDays(B.today(), -30)] || Object.values(R.days)[0] || R.last;
  return { rating: R.last.rating, count: R.last.count, newCount: Math.max(0, R.last.count - ago.count), at: R.last.at, writeUrl: 'https://search.google.com/local/writereview?placeid=' + encodeURIComponent(client.googlePlaceId) };
}
module.exports = { on, refresh, summary, fetchPlace };
