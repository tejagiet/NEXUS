// Supabase Edge Function — fee-sync
// Runtime: Deno (TypeScript)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CAMPX_API_BASE = 'https://api.campx.in'
const TENANT_ID = 'giet'
const INSTITUTION_CODE = 'gier'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // 1. Precise CORS Handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { pin } = await req.json()
    const normalizedPin = pin ? pin.trim().toUpperCase() : null
    
    console.log(`[Fee Sync] Processing PIN: ${normalizedPin}`)
    if (!normalizedPin) return json({ error: 'PIN is required' }, 400)

    // 1. Student Lookup (Get Admission ID)
    const lookupRes = await fetch(`${CAMPX_API_BASE}/payment-portal-api/admissions/by-roll-no?rollNo=${normalizedPin}`, {
      headers: {
        'x-tenant-id': TENANT_ID,
        'x-institution-code': INSTITUTION_CODE
      }
    })

    if (!lookupRes.ok) throw new Error(`Lookup failed: ${lookupRes.status}`)
    const studentData = await lookupRes.json()
    const admissionId = studentData.id

    if (!admissionId) throw new Error('Student not found on CampX')
    console.log(`[Fee Sync] Found AdmissionID: ${admissionId}`)

    // 2. Session Login (Get Token)
    const loginRes = await fetch(`${CAMPX_API_BASE}/auth-server/auth/open-payments-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': TENANT_ID,
        'x-institution-code': INSTITUTION_CODE
      },
      body: JSON.stringify({ id: normalizedPin, idType: 'rollNo', type: 'WEB' })
    })

    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`)
    const { token } = await loginRes.json()
    console.log(`[Fee Sync] Session Established`)

    // 3. Fetch Ledger (Fee Details)
    const ledgerRes = await fetch(`${CAMPX_API_BASE}/payment-portal-api/ledger/academic-fee-group-details`, {
      headers: {
        'campx_open_payments_key': token,
        'x-tenant-id': TENANT_ID,
        'x-institution-code': INSTITUTION_CODE
      }
    })

    if (!ledgerRes.ok) throw new Error(`Ledger fetch failed: ${ledgerRes.status}`)
    const ledgerData = await ledgerRes.json()

    // 4. Extract & Map Breakdowns (Categorized)
    const fees = ledgerData.feeDetails || []
    const breakdown = {
      total: 0,
      college: 0,
      transport: 0,
      y1: fees.find((f: any) => f.year === 1)?.yearDue || 0,
      y2: fees.find((f: any) => f.year === 2)?.yearDue || 0,
      y3: fees.find((f: any) => f.year === 3)?.yearDue || 0,
      y4: fees.find((f: any) => f.year === 4)?.yearDue || 0,
    }

    // New Categorical Summation
    fees.forEach((yearDetail: any) => {
      const groups = yearDetail.feeGroups || []
      groups.forEach((group: any) => {
        const name = group.feeGroup?.name || ''
        const due = group.due || 0
        if (name.toLowerCase().includes('transport')) {
          breakdown.transport += due
        } else {
          // Default all others (College, Placement, Exam, etc.) to College Dues
          breakdown.college += due
        }
      })
    })
    
    breakdown.total = breakdown.y1 + breakdown.y2 + breakdown.y3 + breakdown.y4

    // 5. Persist to Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: student } = await supabase
      .from('profiles')
      .select('id')
      .eq('pin_number', normalizedPin)
      .single()

    if (student) {
      await supabase.from('fees').upsert({
        student_id: student.id,
        total_fee: breakdown.total,
        college_due: breakdown.college,
        transport_due: breakdown.transport,
        year_1_due: breakdown.y1,
        year_2_due: breakdown.y2,
        year_3_due: breakdown.y3,
        year_4_due: breakdown.y4,
        admission_id: admissionId,
        last_synced_at: new Date().toISOString(),
        status: breakdown.total > 0 ? 'partial' : 'paid'
      }, { onConflict: 'student_id' })
    }

    return json({ 
      success: true, 
      student: studentData.fullName,
      breakdown 
    })

  } catch (err) {
    console.error(`[Fee Sync] Error:`, err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
