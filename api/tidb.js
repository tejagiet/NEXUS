import pool from './lib/db';

/**
 * 🏛️ Nexus Generic TiDB Bridge (v5.0)
 * 
 * Supports SELECT, INSERT, UPSERT, UPDATE, DELETE 
 * for institutional data migration from Supabase.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { table } = req.query;
  const { action, select, filters, data, order, limit, options } = req.body;

  if (!table) return res.status(400).json({ error: 'Table name required' });

  try {
    let sql = '';
    let params = [];

    switch (action) {
      case 'select':
        sql = `SELECT ${select || '*'} FROM \`${table}\``;
        if (filters && filters.length > 0) {
          const filterSql = filters.map(f => {
            if (f.op === 'IN') {
              params.push(...f.value);
              return `\`${f.column}\` IN (${f.value.map(() => '?').join(',')})`;
            }
            params.push(f.value);
            return `\`${f.column}\` ${f.op} ?`;
          }).join(' AND ');
          sql += ` WHERE ${filterSql}`;
        }
        if (order) sql += ` ORDER BY \`${order.column}\` ${order.dir}`;
        if (limit) sql += ` LIMIT ${limit}`;
        break;

      case 'insert':
        const columns = Object.keys(data[0]);
        const placeholders = data.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
        sql = `INSERT INTO \`${table}\` (\`${columns.join('`,`')}\`) VALUES ${placeholders}`;
        params = data.flatMap(d => Object.values(d));
        break;

      case 'upsert':
        const upCols = Object.keys(data[0]);
        const upPlaceholders = data.map(() => `(${upCols.map(() => '?').join(',')})`).join(',');
        sql = `INSERT INTO \`${table}\` (\`${upCols.join('`,`')}\`) VALUES ${upPlaceholders} 
               ON DUPLICATE KEY UPDATE ${upCols.map(c => `\`${c}\`=VALUES(\`${c}\`)`).join(',')}`;
        params = data.flatMap(d => Object.values(d));
        break;

      case 'update':
        const setSql = Object.keys(data).map(c => `\`${c}\`=?`).join(',');
        sql = `UPDATE \`${table}\` SET ${setSql}`;
        params = Object.values(data);
        if (filters && filters.length > 0) {
          const updateFilterSql = filters.map(f => {
            params.push(f.value);
            return `\`${f.column}\` ${f.op} ?`;
          }).join(' AND ');
          sql += ` WHERE ${updateFilterSql}`;
        }
        break;

      case 'delete':
        sql = `DELETE FROM \`${table}\``;
        if (filters && filters.length > 0) {
          const deleteFilterSql = filters.map(f => {
            params.push(f.value);
            return `\`${f.column}\` ${f.op} ?`;
          }).join(' AND ');
          sql += ` WHERE ${deleteFilterSql}`;
        } else {
          throw new Error('Deletion without filters is restricted.');
        }
        break;

      default:
        return res.status(400).json({ error: 'Unsupported action' });
    }

    const [rows] = await pool.execute(sql, params);
    return res.status(200).json({ data: rows, success: true });
  } catch (err) {
    console.error(`[TiDB Proxy Error] ${table}:`, err);
    return res.status(500).json({ error: err.message });
  }
}
