import { createClient } from '@supabase/supabase-js'
import { tidb } from './tidb'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 🏛️ Initialize real Supabase for Authentication only
const realSupabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)

// 🏢 Nexus Hybrid Client: Auth via Supabase, Data via TiDB
export const supabase = {
  ...realSupabase,
  // Override database access to use TiDB Proxy
  from: (table) => tidb.from(table),
  // Override auth to ensure it's still available
  auth: realSupabase.auth,
  storage: realSupabase.storage
}
