const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, phone, email, keyword } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });

  // Normalize to E.164
  const cleanPhone = phone.replace(/\D/g, '');
  const e164 = cleanPhone.startsWith('1') ? '+' + cleanPhone : '+1' + cleanPhone;

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // Find party by keyword — FIX: use 'name' not 'party_name'
    let partyId = null, partyName = 'Snowmentum';
    if (keyword) {
      const { data: parties } = await supabase
        .from('parties')
        .select('id, name')
        .ilike('keyword', keyword)
        .limit(1);
      if (parties && parties[0]) {
        partyId = parties[0].id;
        partyName = parties[0].name;
      }
    }

    // Check if already signed up
    const { data: existing } = await supabase
      .from('snowballers')
      .select('id')
      .eq('phone', e164)
      .limit(1);

    let snowballerId;
    if (existing && existing[0]) {
      snowballerId = existing[0].id;
    } else {
      const { data: newSb, error } = await supabase
        .from('snowballers')
        .insert([{ name, phone: e164, email: email || null }])
        .select('id')
        .single();
      if (error) throw error;
      snowballerId = newSb.id;
    }

    // Link to party
    if (partyId && snowballerId) {
      await supabase.from('party_snowballers')
        .upsert([{ party_id: partyId, snowballer_id: snowballerId }],
          { onConflict: 'party_id,snowballer_id' });
    }

    // Send welcome SMS
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const firstName = name.split(' ')[0];
    const smsBody = `Hey ${firstName}! You're officially in for ${partyName} 🎉\n\nWhen you arrive at your stop, text ${keyword || 'SNOWBALL'} to this number to check in.\n\nSee you out there! — Snowmentum`;

    await twilioClient.messages.create({
      body: smsBody,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: e164,
    });

    return res.status(200).json({ success: true, name: firstName, partyName });

  } catch (err) {
    console.error('Join error:', err);
    return res.status(500).json({ error: 'Something went wrong', detail: err.message });
  }
};
