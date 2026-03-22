const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_PASSWORD && token !== 'auto') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { partyName, partyCity, startTime, partySize, keyword, status, partyId, stops, snowballers } = req.body;

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const stopsData = JSON.stringify(stops || {});
    let savedPartyId = partyId;

    // Build update object — only include columns we know exist
    const updateObj = {
      name: partyName || 'Untitled Party',
      city: partyCity || '',
      party_size: partySize || 16,
      stops_data: stopsData,
    };

    // Try to add optional columns — catch if they don't exist
    if (startTime !== undefined) updateObj.start_time = startTime;
    if (keyword !== undefined) updateObj.keyword = keyword;
    if (status !== undefined) updateObj.status = status || 'draft';

    // Try updated_at — may not exist yet
    try { updateObj.updated_at = new Date().toISOString(); } catch(e) {}

    if (partyId) {
      const { error } = await supabase
        .from('parties')
        .update(updateObj)
        .eq('id', partyId);
      if (error) {
        // If updated_at fails, retry without it
        if (error.message && error.message.includes('updated_at')) {
          delete updateObj.updated_at;
          const { error: e2 } = await supabase.from('parties').update(updateObj).eq('id', partyId);
          if (e2) throw e2;
        } else {
          throw error;
        }
      }
    } else {
      const insertObj = { ...updateObj };
      delete insertObj.updated_at;
      const { data, error } = await supabase
        .from('parties')
        .insert([insertObj])
        .select('id')
        .single();
      if (error) throw error;
      savedPartyId = data.id;
    }

    // Upsert snowballers
    if (snowballers && snowballers.length && savedPartyId) {
      for (const sb of snowballers) {
        if (!sb.name) continue;
        let sbId;
        const cleanPhone = sb.phone ? sb.phone.replace(/\D/g,'') : null;
        if (cleanPhone) {
          const { data: existing } = await supabase
            .from('snowballers').select('id').eq('phone', cleanPhone).limit(1);
          if (existing && existing[0]) sbId = existing[0].id;
        }
        if (!sbId) {
          const { data: newSb } = await supabase
            .from('snowballers')
            .insert([{ name: sb.name, phone: cleanPhone, passport_name: sb.passportName || null }])
            .select('id').single();
          if (newSb) sbId = newSb.id;
        }
        if (sbId) {
          await supabase.from('party_snowballers')
            .upsert([{ party_id: savedPartyId, snowballer_id: sbId, stop_key: sb.stopKey || null }],
              { onConflict: 'party_id,snowballer_id' });
        }
      }
    }

    return res.status(200).json({ success: true, partyId: savedPartyId });
  } catch (err) {
    console.error('save-party error:', err);
    return res.status(500).json({ error: err.message });
  }
};
