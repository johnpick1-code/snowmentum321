const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Unauthorized' });

  const { partyId, flyerBase64, fileName } = req.body;
  if (!partyId || !flyerBase64) return res.status(400).json({ error: 'Missing partyId or flyerBase64' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // Convert base64 to buffer
    const base64Data = flyerBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = fileName ? fileName.split('.').pop() : 'jpg';
    const path = `flyers/${partyId}.${ext}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('party-flyers')
      .upload(path, buffer, { contentType: `image/${ext}`, upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('party-flyers')
      .getPublicUrl(path);

    // Save URL to party record
    await supabase.from('parties').update({ flyer_url: publicUrl }).eq('id', partyId);

    return res.status(200).json({ flyer_url: publicUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
