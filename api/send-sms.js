// api/send-sms.js
// Vercel serverless function — sends SMS via Twilio
// Environment variables required (set in Vercel dashboard):
//   TWILIO_ACCOUNT_SID   — your Account SID (starts with AC...)
//   TWILIO_AUTH_TOKEN    — your Auth Token
//   TWILIO_PHONE_NUMBER  — your Twilio number (e.g. +14706890303)

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, to } = req.body;
  if (!message || !to) {
    return res.status(400).json({ error: 'message and to are required' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    return res.status(500).json({ error: 'Twilio credentials not configured' });
  }

  // Normalize phone number
  let toClean = to.replace(/\D/g, '');
  if (toClean.length === 10) toClean = '+1' + toClean;
  else if (toClean.length === 11 && toClean.startsWith('1')) toClean = '+' + toClean;
  else toClean = '+' + toClean;

  try {
    const params = new URLSearchParams();
    params.append('To', toClean);
    params.append('From', from);
    params.append('Body', message);

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        },
        body: params.toString(),
      }
    );

    const data = await twilioRes.json();
    console.log('Twilio response:', twilioRes.status, JSON.stringify(data));

    if (!twilioRes.ok) {
      return res.status(twilioRes.status).json({ error: data.message, code: data.code });
    }

    return res.status(200).json({ success: true, sid: data.sid });
  } catch (err) {
    console.error('Send SMS error:', err);
    return res.status(500).json({ error: err.message });
  }
}
