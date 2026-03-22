// api/activities.js
// GET — returns all active activities (public, used by main app)
// POST — creates new activity (admin only)
// PUT — updates activity (admin only)
// DELETE — deletes activity (admin only)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sb(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': method === 'POST' ? 'return=representation' : 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

function isAdmin(req) {
  return req.headers['x-admin-token'] === process.env.ADMIN_PASSWORD;
}

module.exports = async function handler(req, res) {
  // GET — public, returns all active activities
  if (req.method === 'GET') {
    const result = await sb('GET', 'activities?active=eq.true&order=category.asc,sort_order.asc');
    return res.status(200).json({ activities: result.data || [] });
  }

  // All other methods require admin
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  // POST — create
  if (req.method === 'POST') {
    const { name, category, description, url, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const result = await sb('POST', 'activities', {
      name, category: category || 'Social',
      description: description || null,
      url: url || null,
      sort_order: sort_order || 0,
      active: true,
      updated_at: new Date().toISOString(),
    });
    return res.status(result.ok ? 200 : 500).json(result.data);
  }

  // PUT — update
  if (req.method === 'PUT') {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    updates.updated_at = new Date().toISOString();
    const result = await sb('PATCH', `activities?id=eq.${id}`, updates);
    return res.status(result.ok ? 200 : 500).json(result.data);
  }

  // DELETE — soft delete (set active=false)
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    const result = await sb('PATCH', `activities?id=eq.${id}`, { active: false, updated_at: new Date().toISOString() });
    return res.status(result.ok ? 200 : 500).json({ success: result.ok });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
