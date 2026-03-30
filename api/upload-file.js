import pool from './lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, type, branch, uploaded_by, base64Data, category } = req.body;
  
  if (!base64Data || !name) return res.status(400).json({ error: 'Name and file data required' });

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    
    const [result] = await pool.execute(
      'INSERT INTO institutional_files (name, file_type, file_data, branch, uploaded_by, category) VALUES (?, ?, ?, ?, ?, ?)',
      [name, type || 'Other', buffer, branch || 'ALL', uploaded_by || 'Unknown', category || 'LMS']
    );

    return res.status(200).json({ success: true, id: result.insertId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
