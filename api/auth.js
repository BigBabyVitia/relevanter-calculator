// Vercel Serverless Function — Admin auth
// Environment variable: ADMIN_PASSWORD

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ADMIN_PASSWORD } = process.env;

  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD not configured' });
  }

  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false, error: 'Invalid password' });
}
