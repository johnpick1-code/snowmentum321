const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Unauthorized' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase.from('mega_events')
      .select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return res.status(200).json({ megaEvents: data || [] });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
};
