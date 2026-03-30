import pool from './lib/db';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    if (!id) return res.status(400).json({ error: 'Profile ID required' });
    try {
      const [rows] = await pool.execute('SELECT id, full_name, pin_number, branch, section, semester, role, email FROM profiles WHERE id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
      return res.status(200).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { id, full_name, pin_number, branch, section, semester, role, email } = req.body;
    try {
      await pool.execute(
        `INSERT INTO profiles (id, full_name, pin_number, branch, section, semester, role, email) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         full_name = VALUES(full_name), pin_number = VALUES(pin_number), 
         branch = VALUES(branch), section = VALUES(section), 
         semester = VALUES(semester), role = VALUES(role), email = VALUES(email)`,
        [id, full_name, pin_number, branch, section, semester, role, email]
      );
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
