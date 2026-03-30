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
    let _maybeSingle = false;
    let _single = false;
    let _count = null;
    let _or = null;

    const builder = {
      select: (fields = '*', options = {}) => { 
        _select = fields; 
        if (options.count) _count = options.count;
        return builder; 
      },
      eq: (column, value) => { _filters.push({ column, op: '=', value }); return builder; },
      in: (column, values) => { _filters.push({ column, op: 'IN', value: values }); return builder; },
      not: (column, op, value) => { _filters.push({ column, op: `NOT ${op}`, value }); return builder; },
      lt: (column, value) => { _filters.push({ column, op: '<', value }); return builder; },
      gt: (column, value) => { _filters.push({ column, op: '>', value }); return builder; },
      match: (obj) => { 
        Object.entries(obj).forEach(([column, value]) => _filters.push({ column, op: '=', value }));
        return builder; 
      },
      or: (query) => { _or = query; return builder; },
      maybeSingle: () => { _maybeSingle = true; return builder; },
      single: () => { _single = true; return builder; },
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
              or: _or,
              count: _count,
              order: _order, 
              limit: _limit 
            })
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'TiDB Fetch Error');
          
          let resultData = json.data;
          
          // Handle Single/MaybeSingle logic
          if (_maybeSingle || _single) {
            if (!resultData || resultData.length === 0) {
              resultData = null;
            } else {
              resultData = resultData[0];
            }
          }

          resolve({ data: resultData, error: null });
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
