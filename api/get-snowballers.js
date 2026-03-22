const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data: snowballers } = await supabase
      .from('snowballers')
      .select('*')
      .order('first_seen', { ascending: false });

    const { data: links } = await supabase
      .from('party_snowballers')
      .select('snowballer_id, party_id, stop_key, checked_in');

    const { data: parties } = await supabase
      .from('parties')
      .select('id, name, city, created_at, stops_data');

    // Build party lookup with stop/passport data
    const partyMap = {};
    (parties || []).forEach(p => {
      partyMap[p.id] = p;
    });

    // Build snowballer history with passport identities
    const history = {};
    (links || []).forEach(l => {
      if (!history[l.snowballer_id]) history[l.snowballer_id] = [];
      const party = partyMap[l.party_id];
      let passportName = null;
      let passportUrl = null;

      // Try to pull passport from stops_data
      if (party && party.stops_data && l.stop_key) {
        try {
          const stopsData = typeof party.stops_data === 'string'
            ? JSON.parse(party.stops_data) : party.stops_data;
          const stop = stopsData[l.stop_key];
          if (stop && stop.snowballers) {
            const sb = stop.snowballers.find(s => s.name);
            if (sb) { passportName = sb.passportName; passportUrl = sb.passportUrl; }
          }
        } catch(e) {}
      }

      history[l.snowballer_id].push({
        id: party?.id,
        name: party?.name || '—',
        city: party?.city || '—',
        created_at: party?.created_at,
        stop_key: l.stop_key,
        checked_in: l.checked_in,
        passportName,
        passportUrl,
      });
    });

    const result = (snowballers || []).map(sb => ({
      id: sb.id,
      name: sb.name,
      phone: sb.phone,
      passport_name: sb.passport_name,
      first_seen: sb.first_seen,
      last_seen: sb.last_seen,
      parties: history[sb.id] || [],
      parties_count: (history[sb.id] || []).length,
    }));

    return res.status(200).json({ snowballers: result });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
};
