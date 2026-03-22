// api/signup.js — public snowballer registration

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH  = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM  = process.env.TWILIO_PHONE_NUMBER;
const RESEND_KEY   = process.env.RESEND_API_KEY;

async function db(method, path, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': method === 'POST' ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  try { return { ok: r.ok, data: JSON.parse(t) }; }
  catch { return { ok: r.ok, data: t }; }
}

async function sms(to, msg) {
  if (!TWILIO_SID) return;
  // FIX: normalize to E.164 — strip all non-digits first, then prepend +1 if needed
  const digits = to.replace(/\D/g, '');
  const e164 = digits.startsWith('1') ? '+' + digits : '+1' + digits;
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: e164, From: TWILIO_FROM, Body: msg }).toString(),
  });
}

async function sendEmail(to, name, party, passport) {
  if (!RESEND_KEY || !to) return;
  const passportHtml = passport ? `
    <div style="background:#f0f6ff;border-radius:10px;padding:20px;margin:20px 0;text-align:center">
      <div style="font-size:12px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Your Secret Identity</div>
      <div style="font-size:24px;font-weight:800;color:#002868">${passport.name}</div>
      ${passport.description ? `<div style="font-size:14px;color:#555;margin-top:6px">${passport.description}</div>` : ''}
    </div>` : '';

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Snowmentum <noreply@snowmentum.live>',
      to: [to],
      subject: `❄️ You're in! ${party.name}`,
      html: `
        <div style="font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto;background:#fff">
          <div style="background:#002868;padding:28px 32px;text-align:center">
            <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:4px">SNOWMENTUM</div>
            <div style="font-size:12px;color:rgba(255,255,255,.6);letter-spacing:2px;margin-top:4px">A COMMUNITY ADVENTURE</div>
          </div>
          <div style="padding:32px">
            <h1 style="font-size:22px;color:#1a1208;margin:0 0 8px">Hey ${name.split(' ')[0]}, you're officially in! ❄️</h1>
            <p style="color:#555;font-size:15px;line-height:1.6">You've been registered for <strong>${party.name}</strong>${party.city ? ' in ' + party.city : ''}. Get ready for an adventure.</p>
            ${passportHtml}
            <div style="background:#f9f9f9;border-radius:10px;padding:20px;margin:20px 0">
              <div style="font-size:12px;color:#888;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px">What happens next</div>
              <div style="font-size:14px;color:#333;line-height:1.8">
                📱 We'll text you when your stop is ready<br>
                📍 Show up and text <strong>SNOWBALL</strong> to check in<br>
                ❄️ Experience something you'll never forget
              </div>
            </div>
            <div style="text-align:center;margin-top:24px">
              <a href="https://snowmentum.org" style="background:#002868;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Visit Snowmentum.org</a>
            </div>
          </div>
          <div style="background:#f4f4f4;padding:16px 32px;text-align:center">
            <div style="font-size:11px;color:#aaa">© Snowmentum · snowmentum.org</div>
          </div>
        </div>
      `,
    }),
  });
}

async function pickPassport(usedIds) {
  const r = await db('GET', 'passports?select=id,name,description,url&limit=100');
  if (!r.ok || !r.data.length) return null;
  const pool = r.data.filter(p => !usedIds.includes(p.id));
  const source = pool.length ? pool : r.data;
  return source[Math.floor(Math.random() * source.length)];
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const keyword = ((req.method === 'GET' ? req.query.keyword : req.body?.keyword) || '').toUpperCase().trim();
  if (!keyword) return res.status(400).json({ error: 'Missing keyword' });

  // ── Resolve party (mega event or direct) ─────────────────────────────────
  let party = null;

  // FIX: single megaCheck declaration — checks party_ids (consistent with save-mega-event.js)
  const megaCheck = await db('GET', `mega_events?keyword=eq.${encodeURIComponent(keyword)}&limit=1`);

  if (megaCheck.ok && Array.isArray(megaCheck.data) && megaCheck.data.length) {
    const megaEvent = megaCheck.data[0];
    const partyIds = megaEvent.party_ids || [];

    if (!partyIds.length) return res.status(404).json({ error: 'No brackets in this event' });

    // Round-robin: assign to the bracket with fewest signups
    const counts = {};
    for (const pid of partyIds) {
      const c = await db('GET', `party_snowballers?party_id=eq.${pid}&select=party_id`);
      counts[pid] = c.ok ? (c.data?.length || 0) : 0;
    }
    const assignedId = partyIds.reduce((a, b) => (counts[a] <= counts[b] ? a : b));

    const pr = await db('GET', `parties?id=eq.${assignedId}&limit=1`);
    if (!pr.ok || !pr.data.length) return res.status(500).json({ error: 'Could not load bracket' });

    party = pr.data[0];
    party._megaEventName = megaEvent.name;
    party._megaKeyword = keyword;

    // For GET, tell the client which bracket keyword was assigned
    if (req.method === 'GET') {
      return res.status(200).json({
        id: party.id,
        name: party.name,
        city: party.city,
        start_time: party.start_time,
        keyword: party.keyword,
        isMegaEvent: true,
        megaEventName: megaEvent.name,
      });
    }
  } else {
    // Regular party keyword
    const pr = await db('GET', `parties?keyword=eq.${encodeURIComponent(keyword)}&order=created_at.desc&limit=1`);
    if (!pr.ok || !pr.data.length) return res.status(404).json({ error: 'Party not found', keyword });
    party = pr.data[0];

    if (req.method === 'GET') {
      return res.status(200).json({
        id: party.id,
        name: party.name,
        city: party.city,
        start_time: party.start_time,
        keyword: party.keyword,
      });
    }
  }

  // ── POST: register snowballer ─────────────────────────────────────────────
  const { name, phone, email } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name required' });

  const clean = (phone || '').replace(/\D/g, '');
  const cleanEmail = (email || '').trim().toLowerCase();

  // Dupe check
  if (clean) {
    const ex = await db('GET', `snowballers?phone=eq.${encodeURIComponent(clean)}&limit=1`);
    if (ex.ok && ex.data.length) {
      const sid = ex.data[0].id;
      const lnk = await db('GET', `party_snowballers?party_id=eq.${party.id}&snowballer_id=eq.${sid}&limit=1`);
      if (lnk.ok && lnk.data.length) {
        return res.status(200).json({
          success: true,
          alreadyRegistered: true,
          party: { name: party.name, city: party.city, start_time: party.start_time, keyword: party.keyword },
          snowballer: ex.data[0],
        });
      }
    }
  }

  // Pick passport (avoid duplicates within this party)
  const links = await db('GET', `party_snowballers?party_id=eq.${party.id}&select=passport_id`);
  const usedPassports = (links.data || []).map(l => l.passport_id).filter(Boolean);
  const passport = await pickPassport(usedPassports);

  // Upsert snowballer
  let sbId = null, sbData = null;
  if (clean) {
    const ex = await db('GET', `snowballers?phone=eq.${encodeURIComponent(clean)}&limit=1`);
    if (ex.ok && ex.data.length) {
      sbId = ex.data[0].id;
      sbData = ex.data[0];
      await db('PATCH', `snowballers?id=eq.${sbId}`, {
        name,
        last_seen: new Date().toISOString(),
        ...(cleanEmail ? { email: cleanEmail } : {}),
      });
    }
  }
  if (!sbId) {
    const nr = await db('POST', 'snowballers', {
      name,
      phone: clean,
      email: cleanEmail || null,
      passport_id: passport?.id || null,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      parties_count: 1,
    });
    if (!nr.ok) return res.status(500).json({ error: 'Failed to register' });
    sbData = Array.isArray(nr.data) ? nr.data[0] : nr.data;
    sbId = sbData.id;
  }

  // Link snowballer to party
  await db('POST', 'party_snowballers', {
    party_id: party.id,
    snowballer_id: sbId,
    passport_id: passport?.id || null,
    checked_in: false,
    signed_up_at: new Date().toISOString(),
  });

  // Send confirmation SMS + email in parallel
  const pLine = passport ? `\n\nYour identity: *${passport.name}*\n${passport.url || ''}` : '';
  const msg = `❄️ You're in, ${name.split(' ')[0]}! Registered for ${party.name}${party.city ? ' in ' + party.city : ''}.\n\nWe'll text you when your stop is ready. Text ${party.keyword || 'SNOWBALL'} to check in when you arrive.${pLine}`;

  await Promise.all([
    clean ? sms(clean, msg).catch(() => {}) : Promise.resolve(),
    cleanEmail ? sendEmail(cleanEmail, name, party, passport).catch(() => {}) : Promise.resolve(),
  ]);

  return res.status(200).json({
    success: true,
    party: { name: party.name, city: party.city, start_time: party.start_time, keyword: party.keyword },
    snowballer: { id: sbId, name, phone: clean, email: cleanEmail },
    passport: passport ? { name: passport.name, description: passport.description, url: passport.url } : null,
  });
};
