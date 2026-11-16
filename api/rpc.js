/**
 * Vercel serverless proxy for BDAG JSON-RPC (avoids browser CORS issues)
 * POST /api/rpc?target=https://rpc.bdagexplorer.com
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const target = (req.query.target || 'https://rpc.bdagexplorer.com').replace(/\/$/, '');
  let url;
  try {
    url = new URL(target);
  } catch {
    return res.status(400).json({ error: 'Invalid target URL' });
  }

  const allowed = [
    'rpc.bdagexplorer.com',
    'rpc.blockdag.engineering',
    'rpc.east.bdag-us.org',
    'rpc.west.bdag-us.org',
    'rpc.bdagscan.com',
    'rpc.welshdag.trade'
  ];
  if (!allowed.some(h => url.hostname === h || url.hostname.endsWith('.' + h))) {
    return res.status(403).json({ error: 'Target host not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const upstream = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(12000)
    });
    const text = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (e) {
    res.status(502).json({ error: e.message || 'Upstream failed' });
  }
};
