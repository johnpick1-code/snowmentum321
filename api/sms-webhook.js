// api/sms-webhook.js
// Receives inbound SMS from Twilio
// Commands:
//   KEYWORD        — check in to party (writes to Supabase)
//   SNOWBALL       — legacy check-in
//   PAID 20        — log $20 to Snowbank
//   PAY 20         — same as PAID
//   TOTAL          — get current Snowbank total

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function dbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  return res.json();
}

async function dbPatch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

function twiml(msg) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${msg}</Message></Response>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const body = req.body || {};
  const fromNumber = (body.From || '').trim();
  const rawMessage = (body.Body || '').trim();
  const messageBody = rawMessage.toUpperCase();

  res.setHeader('Content-Type', 'text/xml');

  if (!fromNumber || !messageBody) {
    return res.status(200).send(twiml(''));
  }

  const cleanPhone = fromNumber.replace(/\D/g, '');

  // ── PAID / PAY command ──────────────────────────────────────────────────
  const paidMatch = messageBody.match(/^(?:PAID?|PAY)\s+(\d+(?:\.\d+)?)/);
  if (paidMatch) {
    const amount = parseFloat(paidMatch[1]);

    const snowballers = await dbGet(`snowballers?phone=eq.${encodeURIComponent(cleanPhone)}&limit=1`);
    const snowballer = Array.isArray(snowballers) && snowballers.length ? snowballers[0] : null;
    const name = snowballer?.name || fromNumber;

    let replyMsg = `💙 Got it! $${amount.toFixed(0)} noted. Make sure you're signed up at snowball-party.vercel.app so we can link your payment. ❄️`;

    if (snowballer) {
      const links = await dbGet(`party_snowballers?snowballer_id=eq.${snowballer.id}&order=signed_up_at.desc&limit=1`);
      if (Array.isArray(links) && links.length) {
        const partyId = links[0].party_id;
        const parties = await dbGet(`parties?id=eq.${partyId}&limit=1`);
        if (Array.isArray(parties) && parties.length) {
          const party = parties[0];
          let stopsData = {};
          try { stopsData = typeof party.stops_data === 'string' ? JSON.parse(party.stops_data) : (party.stops_data || {}); } catch(e) {}

          if (!stopsData._snowbank) stopsData._snowbank = { contributions: [], goal: 0 };
          if (!stopsData._snowbank.contributions) stopsData._snowbank.contributions = [];

          stopsData._snowbank.contributions.push({
            id: Date.now(),
            name,
            amount,
            ts: new Date().toISOString(),
            via: 'sms',
          });

          const total = stopsData._snowbank.contributions.reduce((sum, c) => sum + (c.amount || 0), 0);

          await dbPatch(`parties?id=eq.${partyId}`, {
            stops_data: JSON.stringify(stopsData),
            updated_at: new Date().toISOString(),
          });

          replyMsg = `💙 Got it ${name.split(' ')[0]}! $${amount.toFixed(0)} logged to the Snowbank for ${party.name}. Running total: $${total.toFixed(0)}. Thanks! ❄️`;
        }
      }
    }

    return res.status(200).send(twiml(replyMsg));
  }

  // ── TOTAL command ───────────────────────────────────────────────────────
  if (messageBody === 'TOTAL') {
    const snowballers = await dbGet(`snowballers?phone=eq.${encodeURIComponent(cleanPhone)}&limit=1`);
    const snowballer = Array.isArray(snowballers) && snowballers.length ? snowballers[0] : null;

    let replyMsg = `❄️ Can't find your account. Sign up first at snowball-party.vercel.app`;

    if (snowballer) {
      const links = await dbGet(`party_snowballers?snowballer_id=eq.${snowballer.id}&order=signed_up_at.desc&limit=1`);
      if (Array.isArray(links) && links.length) {
        const parties = await dbGet(`parties?id=eq.${links[0].party_id}&limit=1`);
        if (Array.isArray(parties) && parties.length) {
          let stopsData = {};
          try { stopsData = typeof parties[0].stops_data === 'string' ? JSON.parse(parties[0].stops_data) : (parties[0].stops_data || {}); } catch(e) {}
          const contribs = stopsData._snowbank?.contributions || [];
          const total = contribs.reduce((sum, c) => sum + (c.amount || 0), 0);
          replyMsg = `❄️ Snowbank total for ${parties[0].name}: $${total.toFixed(0)} from ${contribs.length} contribution${contribs.length !== 1 ? 's' : ''}.`;
        }
      }
    }

    return res.status(200).send(twiml(replyMsg));
  }

  // ── CHECK-IN by party keyword ───────────────────────────────────────────
  // FIX: write checked_in=true to Supabase instead of global._checkins
  const parties = await dbGet(`parties?keyword=eq.${encodeURIComponent(messageBody)}&order=created_at.desc&limit=1`);
  const party = Array.isArray(parties) && parties.length > 0 ? parties[0] : null;

  let replyMsg = '❄️ Snowmentum here! Ask your host for the check-in keyword.';

  if (party || messageBody === 'SNOWBALL') {
    // Find this snowballer
    const snowballers = await dbGet(`snowballers?phone=eq.${encodeURIComponent(cleanPhone)}&limit=1`);
    const snowballer = Array.isArray(snowballers) && snowballers.length ? snowballers[0] : null;

    if (snowballer && party) {
      // Mark checked_in in Supabase so checkins.js can read it reliably
      await dbPatch(
        `party_snowballers?party_id=eq.${party.id}&snowballer_id=eq.${snowballer.id}`,
        { checked_in: true, checked_in_at: new Date().toISOString() }
      );
      replyMsg = `❄️ You're checked in to ${party.name}! Your Snow Patrol has you. Stay tuned for your next stop.`;
    } else if (messageBody === 'SNOWBALL') {
      replyMsg = `❄️ You're checked in! Your Snow Patrol has you. Stay tuned for your next stop.`;
    }
  }

  return res.status(200).send(twiml(replyMsg));
};
