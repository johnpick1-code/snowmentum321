const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Unauthorized' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // Select * so we can see what columns actually exist
    const { data: parties, error } = await supabase
      .from('parties')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const { data: partyCounts } = await supabase
      .from('party_snowballers')
      .select('party_id');

    const counts = {};
    (partyCounts || []).forEach(r => { counts[r.party_id] = (counts[r.party_id] || 0) + 1; });

    // Map flexibly — handle both 'name' and 'party_name' column names
    const result = (parties || []).map(p => ({
      id: p.id,
      name: p.party_name || p.name || '—',
      city: p.party_city || p.city || '—',
      party_size: p.party_size || p.size,
      keyword: p.keyword,
      status: p.status || 'draft',
      stops_data: p.stops_data,
      created_at: p.created_at,
      updated_at: p.updated_at,
      snowballer_count: counts[p.id] || 0,
    }));

    return res.status(200).json({ parties: result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
