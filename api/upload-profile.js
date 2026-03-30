import pool from './lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, avatar_base64 } = req.body;
  
  if (!id || !avatar_base64) return res.status(400).json({ error: 'Missing id or avatar data' });

  try {
    const buffer = Buffer.from(avatar_base64, 'base64');
    
    await pool.execute(
      'UPDATE profiles SET avatar_url = ? WHERE id = ?',
      [buffer, id]
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
