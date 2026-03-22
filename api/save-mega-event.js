const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Unauthorized' });

  const { name, keyword, partyIds, megaEventId } = req.body;
  if (!name || !keyword || !partyIds?.length)
    return res.status(400).json({ error: 'Missing required fields' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    if (megaEventId) {
      // Update existing
      const { error } = await supabase.from('mega_events')
        .update({ name, keyword: keyword.toUpperCase(), party_ids: partyIds, updated_at: new Date().toISOString() })
        .eq('id', megaEventId);
      if (error) throw error;
      return res.status(200).json({ success: true, megaEventId });
    } else {
      // Create new
      const { data, error } = await supabase.from('mega_events')
        .insert([{ name, keyword: keyword.toUpperCase(), party_ids: partyIds }])
        .select('id').single();
      if (error) throw error;
      return res.status(200).json({ success: true, megaEventId: data.id });
    }
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
};
