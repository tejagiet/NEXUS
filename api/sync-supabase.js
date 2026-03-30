import { createClient } from '@supabase/supabase-js';
import pool from './lib/db';

/**
 * 🏛️ Nexus Data Mirror (v5.0)
 * 
 * Secure one-time migration utility to pull institutional 
 * records from Supabase and push them into TiDB Cloud.
 */
export default async function handler(req, res) {
  // Only allow POST for security
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Requires service role to bypass RLS

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const tables = [
    'profiles', 'attendance', 'subjects', 'notices', 
    'lms_files', 'students', 'curriculum', 'assignments', 
    'submissions', 'timetable_slots', 'feedback'
  ];

  const results = {};

  try {
    for (const table of tables) {
      // 1. Fetch from Supabase
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        results[table] = `❌ Fetch Error: ${error.message}`;
        continue;
      }

      if (!data || data.length === 0) {
        results[table] = `⚠️ No records found in Supabase.`;
        continue;
      }

      // 2. Prepare columns and Upsert into TiDB
      // Handle mapping for 'lms_files' to 'institutional_files' if needed
      const targetTable = table === 'lms_files' ? 'institutional_files' : table;
      
      const columns = Object.keys(data[0]);
      const placeholders = data.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
      const sql = `INSERT INTO \`${targetTable}\` (\`${columns.join('`,`')}\`) VALUES ${placeholders} 
                   ON DUPLICATE KEY UPDATE ${columns.map(c => `\`${c}\`=VALUES(\`${c}\`)`).join(',')}`;
      
      const params = data.flatMap(d => Object.values(d));
      
      const [dbResult] = await pool.execute(sql, params);
      results[table] = `✅ Migrated ${dbResult.affectedRows} records to TiDB.`;
    }

    return res.status(200).json({ success: true, report: results });
  } catch (err) {
    console.error('[Migration Utility Critical Error]:', err);
    return res.status(500).json({ error: err.message });
  }
}
