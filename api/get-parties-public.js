const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  // Cache for 30s, stale-while-revalidate for 60s — instant loads after first hit
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data: parties, error } = await supabase
      .from('parties')
      .select('*')
      .in('status', ['active', 'draft'])
      .order('created_at', { ascending: false });
    if (error) throw error;

    const { data: partyCounts } = await supabase
      .from('party_snowballers')
      .select('party_id');

    const counts = {};
    (partyCounts || []).forEach(r => { counts[r.party_id] = (counts[r.party_id] || 0) + 1; });

    const result = (parties || []).map(p => ({
      id: p.id,
      name: p.name || p.party_name || '—',
      city: p.city || p.party_city || '—',
      party_size: p.party_size || 16,
      keyword: p.keyword,
      flyer_url: p.flyer_url || null,
      status: p.status || 'draft',
      created_at: p.created_at,
      snowballer_count: counts[p.id] || 0,
    }));

    return res.status(200).json({ parties: result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
