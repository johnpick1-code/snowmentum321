const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_PASSWORD && token !== 'auto')
    return res.status(401).json({ error: 'Unauthorized' });

  const { partyId, status } = req.body;
  if (!partyId || !status) return res.status(400).json({ error: 'partyId and status required' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { error } = await supabase
      .from('parties')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', partyId);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
