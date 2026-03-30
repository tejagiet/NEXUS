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
        let whereClauses = [];

        // Standard Filters
        if (filters && filters.length > 0) {
          filters.forEach(f => {
            if (f.op === 'IN') {
              params.push(...f.value);
              whereClauses.push(`\`${f.column}\` IN (${f.value.map(() => '?').join(',')})`);
            } else {
              params.push(f.value);
              whereClauses.push(`\`${f.column}\` ${f.op} ?`);
            }
          });
        }

        // Advanced OR Logic (Postgres-style string parsing)
        if (or) {
          const parts = or.split(',');
          const orClauses = parts.map(part => {
            const [col, op, ...valParts] = part.split('.');
            const val = valParts.join('.'); // Handle dots in values if any
            
            if (op === 'eq') {
              params.push(val);
              return `\`${col}\` = ?`;
            }
            if (op === 'cs') { // JSON Contains check for multi-roles
              // val is usually like '{"student"}' or just 'student'
              const cleanVal = val.replace(/[{}]/g, '').replace(/"/g, '');
              params.push(`"${cleanVal}"`);
              return `JSON_CONTAINS(\`${col}\`, ?)`;
            }
            return '1=1'; // Fallback
          });
          whereClauses.push(`(${orClauses.join(' OR ')})`);
        }

        if (whereClauses.length > 0) {
          sql += ` WHERE ${whereClauses.join(' AND ')}`;
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
    
    let count = null;
    if (action === 'select' && req.body.count) {
      count = rows.length; // Approximate count for single-query compatibility
    }

    return res.status(200).json({ data: rows, count, success: true });
  } catch (err) {
    console.error(`[TiDB Proxy Error] ${table}:`, err);
    return res.status(500).json({ error: err.message });
  }
}
