// api/party-by-keyword.js
// Public endpoint — returns party info for the join page banner

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

module.exports = async function handler(req, res) {
  const keyword = (req.query.keyword || '').toUpperCase().trim();
  if (!keyword) return res.status(400).json({ error: 'keyword required' });

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/parties?keyword=eq.${encodeURIComponent(keyword)}&order=created_at.desc&limit=1`,
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  const data = await r.json();
  if (!Array.isArray(data) || !data.length) return res.status(404).json({ error: 'Not found' });

  const p = data[0];
  // Return only public-safe fields
  return res.status(200).json({
    name: p.name,
    city: p.city,
    start_time: p.start_time,
    keyword: p.keyword,
    party_size: p.party_size,
  });
}
