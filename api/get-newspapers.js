const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET is public — the archive of issues is meant to be read.
  // Writes still happen via save-newspaper.js, which keeps the admin token check.

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase
      .from('newspaper_issues')
      .select('id, volume, issue, updated_at, settings')
      .order('volume', { ascending: false })
      .order('issue', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ issues: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
