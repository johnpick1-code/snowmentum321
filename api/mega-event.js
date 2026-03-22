// api/mega-event.js
// FIX: standardized column name to party_ids (consistent with save-mega-event.js)

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  if (req.method === 'GET') {
    const token = req.headers['x-admin-token'];
    if (token !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('mega_events')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ mega_events: data || [] });
  }

  if (req.method === 'POST') {
    const { action } = req.body || {};

    // Public: assign a bracket to a registrant via mega event keyword
    if (action === 'assign') {
      const { keyword } = req.body;
      if (!keyword) return res.status(400).json({ error: 'Missing keyword' });

      const { data: mega } = await supabase
        .from('mega_events')
        .select('*')
        .eq('keyword', keyword.toUpperCase())
        .limit(1);

      if (!mega || !mega.length) return res.status(404).json({ error: 'Event not found' });
      const event = mega[0];

      // FIX: use party_ids (not bracket_ids)
      const partyIds = event.party_ids || [];
      if (!partyIds.length) return res.status(400).json({ error: 'No brackets in this event' });

      // Round-robin: assign to bracket with fewest signups
      const counts = await Promise.all(partyIds.map(async (id) => {
        const { count } = await supabase
          .from('party_snowballers')
          .select('*', { count: 'exact', head: true })
          .eq('party_id', id);
        return { id, count: count || 0 };
      }));
      counts.sort((a, b) => a.count - b.count);
      const assignedBracketId = counts[0].id;

      const { data: bracket } = await supabase
        .from('parties')
        .select('keyword, name')
        .eq('id', assignedBracketId)
        .single();

      return res.status(200).json({
        success: true,
        assigned_bracket_id: assignedBracketId,
        assigned_keyword: bracket?.keyword,
        bracket_name: bracket?.name,
        event_name: event.name,
      });
    }

    // Admin: create mega event
    const token = req.headers['x-admin-token'];
    if (token !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });

    // FIX: accept party_ids (not bracket_ids) for consistency
    const { name, keyword, party_ids } = req.body;
    if (!name || !keyword || !party_ids?.length)
      return res.status(400).json({ error: 'Missing name, keyword, or party_ids' });

    const { data, error } = await supabase
      .from('mega_events')
      .insert([{ name, keyword: keyword.toUpperCase(), party_ids, created_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, mega_event: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
