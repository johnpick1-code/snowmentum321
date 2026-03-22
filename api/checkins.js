// api/checkins.js
// FIX: global._checkins doesn't persist across Vercel serverless invocations.
// Check-ins are now read directly from Supabase party_snowballers (checked_in=true).
// The sms-webhook.js should also be updated to write checked_in=true to Supabase
// instead of pushing to global._checkins.

const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { party_id, since } = req.query;
  if (!party_id) return res.status(400).json({ error: 'party_id required' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    let query = supabase
      .from('party_snowballers')
      .select(`
        id,
        checked_in,
        checked_in_at,
        stop_key,
        snowballers (id, name, phone, passport_name)
      `)
      .eq('party_id', party_id)
      .eq('checked_in', true)
      .order('checked_in_at', { ascending: false });

    // Optional: only return check-ins since a given timestamp (for polling)
    if (since) {
      query = query.gt('checked_in_at', since);
    }

    const { data, error } = await query;
    if (error) throw error;

    const checkins = (data || []).map(row => ({
      id: row.id,
      stop_key: row.stop_key,
      checked_in_at: row.checked_in_at,
      snowballer: row.snowballers,
    }));

    return res.status(200).json({ checkins });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
