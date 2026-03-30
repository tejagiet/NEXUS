import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ 
        error: 'Missing environment variables. Did you set SUPABASE_SERVICE_ROLE_KEY in the Supabase Dashboard?',
        details: { url: !!supabaseUrl, key: !!serviceRoleKey }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const data = await req.json()
    const students = data.students || []
    const results = []

    for (const stu of students) {
      const cleanPin = stu.pin_number?.trim()
      const finalEmail = (stu.email?.trim() || `${cleanPin}@nexusgiet.edu.in`).toLowerCase()

      // 1. Create User in Auth
      const { data: user, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: finalEmail,
        password: stu.password || "GIET@2026",
        email_confirm: true,
        user_metadata: {
          full_name: stu.full_name,
          pin_number: cleanPin,
          branch: stu.branch,
          role: 'student'
        }
      })

      if (authError) {
        results.push({ pin: cleanPin, status: 'error', message: authError.message })
        continue
      }

      const userId = user.user.id

      // 2. Link to profiles (handle_new_user trigger will do this, but we force sync)
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        full_name: stu.full_name,
        pin_number: cleanPin,
        branch: stu.branch,
        role: 'student',
        email: finalEmail,
        section: stu.section || 'A'
      }, { onConflict: 'id' })
      
      // 3. Link to students table
      await supabaseAdmin.from('students').upsert({
        full_name: stu.full_name,
        pin_number: stu.pin_number,
        branch: stu.branch,
        section: stu.section || 'A',
        auth_id: userId
      }, { onConflict: 'pin_number' })

      results.push({ pin: stu.pin_number, status: 'success', userId: userId })
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
