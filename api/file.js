import pool from './lib/db';

const MIME_TYPES = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  mp4: 'video/mp4',
  mkv: 'video/x-matroska',
  csv: 'text/csv',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png'
};

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).send('ID required');

  try {
    const [rows] = await pool.execute('SELECT name, file_type, file_data FROM institutional_files WHERE id = ?', [id]);
    if (rows.length === 0 || !rows[0].file_data) {
      return res.status(404).send('File not found');
    }

    const file = rows[0];
    const ext = file.name.split('.').pop().toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    return res.end(file.file_data);
  } catch (err) {
    return res.status(500).send(err.message);
  }
}
