import pool from './lib/db';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).send('ID required');

  try {
    const [rows] = await pool.execute('SELECT avatar_url FROM profiles WHERE id = ?', [id]);
    if (rows.length === 0 || !rows[0].avatar_url) {
      return res.status(404).send('Image not found');
    }

    const buffer = rows[0].avatar_url;
    
    res.setHeader('Content-Type', 'image/jpeg'); // Default to jpeg, or detect from buffer if needed
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    return res.end(buffer);
  } catch (err) {
    return res.status(500).send(err.message);
  }
}
