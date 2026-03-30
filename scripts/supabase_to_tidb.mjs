/**
 * 📦 Nexus Institutional Intelligence — Supabase to TiDB Data Migrator (v1.0)
 * 
 * A one-time script to export your current Supabase data and transform 
 * it into MySQL-compatible INSERT statements for TiDB Cloud.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// 1. Initial Source & Destination Config
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ALL_TABLES = ['profiles', 'students', 'subjects', 'attendance', 'notices', 'feedback', 'curriculum', 'cctv_nodes', 'academic_calendar'];

async function migrateData() {
  console.log("🚀 Starting Data Extraction from Supabase...");

  for (const table of ALL_TABLES) {
    console.log(`📡 Fetching [${table}]...`);
    const { data, error } = await supabase.from(table).select('*');

    if (error) {
       console.error(`❌ Failed to fetch [${table}]:`, error.message);
       continue;
    }

    if (!data || data.length === 0) {
       console.warn(`⚠️ Table [${table}] has no records.`);
       continue;
    }

    // Transform logic: Handling PG specific types for MySQL
    const sqlStatements = data.map(item => {
      const keys = Object.keys(item);
      const values = keys.map(k => {
        let val = item[k];
        if (val === null) return 'NULL';
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        if (Array.isArray(val) || typeof val === 'object') return `'${JSON.stringify(val)}'`;
        return val;
      });

      return `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${values.join(', ')});`;
    });

    fs.writeFileSync(`./supabase/data_migration_${table}.sql`, sqlStatements.join('\n'));
    console.log(`✅ [${table}] - Exported ${data.length} records to ./supabase/data_migration_${table}.sql`);
  }

  console.log("🏁 Migration Extraction Complete. Please execute the generated SQL files in TiDB Cloud Console.");
}

migrateData();
