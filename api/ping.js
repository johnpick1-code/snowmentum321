const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    await supabase.from('parties').select('id').limit(1);
    return res.status(200).json({ ok: true, ts: Date.now() });
  } catch(e) {
    return res.status(500).json({ ok: false });
  }
};
