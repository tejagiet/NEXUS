import pool from './lib/db';

export default async function handler(req, res) {
  const { branch, category } = req.query;

  try {
    let query = 'SELECT id, name, file_type, branch, uploaded_by, created_at FROM institutional_files';
    const params = [];

    if (branch && branch !== 'ALL') {
      query += ' WHERE branch = ?';
      params.push(branch);
    }

    if (category) {
      query += (params.length ? ' AND' : ' WHERE') + ' category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute(query, params);
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
