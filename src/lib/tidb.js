/**
 * 🏛️ Nexus Institutional Intelligence — TiDB Cloud Bridge (v4.0)
 * 
 * This library replaces '@supabase/supabase-js' by routing all database 
 * requests through a secure serverless API proxy. 
 */

const API_BASE = '/api/tidb'; // Vercel API Route

export const tidb = {
  /**
   * Universal Data Fetcher (Select)
   * Usage: const { data } = await tidb.from('profiles').select('*').eq('id', '123')
   */
  from: (table) => {
    let _select = '*';
    let _filters = [];
    let _order = null;
    let _limit = null;

    const builder = {
      select: (fields = '*') => { _select = fields; return builder; },
      eq: (column, value) => { _filters.push({ column, op: '=', value }); return builder; },
      in: (column, values) => { _filters.push({ column, op: 'IN', value: values }); return builder; },
      order: (column, { ascending = true } = {}) => { _order = { column, dir: ascending ? 'ASC' : 'DESC' }; return builder; },
      limit: (n) => { _limit = n; return builder; },
      
      // 🚀 Execution
      then: async (resolve, reject) => {
        try {
          const res = await fetch(`${API_BASE}?table=${table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'select', 
              select: _select, 
              filters: _filters, 
              order: _order, 
              limit: _limit 
            })
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'TiDB Fetch Error');
          resolve({ data: json.data, error: null });
        } catch (err) {
          console.error(`[TiDB ${table}] Select Failed:`, err);
          resolve({ data: null, error: err });
        }
      },

      /**
       * Mutation: Insert
       */
      insert: async (records) => {
        try {
          const res = await fetch(`${API_BASE}?table=${table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'insert', data: Array.isArray(records) ? records : [records] })
          });
          const json = await res.json();
          return { data: json.data, error: res.ok ? null : json.error };
        } catch (err) {
          return { data: null, error: err };
        }
      },

      /**
       * Mutation: Upsert
       */
      upsert: async (records, options = {}) => {
        try {
          const res = await fetch(`${API_BASE}?table=${table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'upsert', data: Array.isArray(records) ? records : [records], options })
          });
          const json = await res.json();
          return { data: json.data, error: res.ok ? null : json.error };
        } catch (err) {
          return { data: null, error: err };
        }
      },

      /**
       * Mutation: Update
       */
      update: async (patch) => {
        return {
          eq: async (column, value) => {
            try {
              const res = await fetch(`${API_BASE}?table=${table}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update', data: patch, filters: [{ column, op: '=', value }] })
              });
              const json = await res.json();
              return { data: json.data, error: res.ok ? null : json.error };
            } catch (err) {
              return { data: null, error: err };
            }
          }
        };
      },

      /**
       * Mutation: Delete
       */
      delete: () => {
        return {
          eq: async (column, value) => {
            try {
              const res = await fetch(`${API_BASE}?table=${table}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', filters: [{ column, op: '=', value }] })
              });
              const json = await res.json();
              return { data: json.data, error: res.ok ? null : json.error };
            } catch (err) {
              return { data: null, error: err };
            }
          }
        };
      }
    };

    return builder;
  }
};
