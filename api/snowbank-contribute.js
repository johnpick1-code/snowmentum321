const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  if (req.method === 'GET') {
    // Get contributions for a party
    const { party_id } = req.query;
    if (!party_id) return res.status(400).json({ error: 'Missing party_id' });
    const { data, error } = await supabase
      .from('snowbank_contributions')
      .select('*')
      .eq('party_id', party_id)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    const total = (data || []).reduce((s, c) => s + (c.amount || 0), 0);
    return res.status(200).json({ contributions: data || [], total });
  }

  if (req.method === 'POST') {
    const { party_id, snowballer_name, amount, stop_key, platform } = req.body;
    if (!party_id || !amount) return res.status(400).json({ error: 'Missing party_id or amount' });

    const { data, error } = await supabase
      .from('snowbank_contributions')
      .insert([{
        party_id,
        snowballer_name: snowballer_name || 'Anonymous',
        amount: parseFloat(amount),
        stop_key: stop_key || null,
        platform: platform || 'venmo',
        created_at: new Date().toISOString(),
      }])
      .select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, contribution: data });
  }
};
