// api/passports.js
// GET — returns all active passports (used by app to auto-assign)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/passports?active=eq.true&order=sort_order.asc`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  const data = await response.json();
  return res.status(200).json({ passports: data || [] });
}
