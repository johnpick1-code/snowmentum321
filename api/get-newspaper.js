const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // GET is public — newspapers are meant to be read.
  // Writes (save-newspaper) still require the admin token.

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { volume, issue } = req.query || {};

    // No params? Return the latest issue (highest volume, then highest issue within that volume).
    if (!volume || !issue) {
      const { data, error } = await supabase
        .from('newspaper_issues')
        .select('*')
        .order('volume', { ascending: false })
        .order('issue', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json({ issue: data || null });
    }

    // Specific volume + issue requested.
    const { data, error } = await supabase
      .from('newspaper_issues')
      .select('*')
      .eq('volume', volume)
      .eq('issue', issue)
      .maybeSingle();

    if (error) throw error;
    return res.status(200).json({ issue: data || null });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
