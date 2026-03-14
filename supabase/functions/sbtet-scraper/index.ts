// Supabase Edge Function — sbtet-scraper
// Runtime: Deno (TypeScript)
// Deploy: npx supabase functions deploy sbtet-scraper

const SBTET_URL = 'https://sbtet.ap.gov.in/APSBTET/gradeWiseResults.do'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { pin, semester } = await req.json()
    console.log(`[Scraper] Fetching results for PIN: ${pin}, Sem: ${semester}`)
    
    if (!pin || !semester) return json({ error: 'pin and semester are required' }, 400)

    let grade2 = `${semester}SEM`
    if (semester === '1') grade2 = '1YR'

    const form = new URLSearchParams()
    form.append('aadhar1', pin.trim().toUpperCase())
    form.append('grade2', grade2)
    form.append('mode', 'getData')

    const res = await fetch(SBTET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': SBTET_URL,
        'Origin': 'https://sbtet.ap.gov.in',
      },
      body: form.toString(),
    })

    if (!res.ok) {
        return json({ error: `Portal Error (${res.status})` }, 502)
    }

    let html = await res.text()
    
    if (html.includes("No Results Found") || html.includes("Invalid PIN") || html.length < 500) {
        return json({ error: 'Result not found. Check PIN and Semester.' }, 404)
    }

    // Strip scripts for cleaner HTML processing
    const cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

    const result = parseResultHTML(html, cleanHtml, pin, semester)

    if (!result || result.subjects.length === 0) {
      return json({ error: 'Could not parse results. Portal structure might have changed.' }, 404)
    }

    return json(result)
  } catch (err) {
    console.error(`[Scraper] Error:`, err)
    return json({ error: `Internal Error: ${err instanceof Error ? err.message : String(err)}` }, 500)
  }
})

function parseResultHTML(originalHtml: string, cleanHtml: string, pin: string, semester: string) {
  let subjects: any[] = []
  let studName = '', examMonth = '', resultStr = 'PASS'
  let officialGpa: number | null = null
  let officialTotal: number | null = null

  // 1. Try to extract from subjectList JS variable (Best for Marks)
  const scriptMatch = originalHtml.match(/var\s+subjectList\s*=\s*(\[[\s\S]*?\])\s*;/i)
  if (scriptMatch) {
    try {
      const list = JSON.parse(scriptMatch[1])
      subjects = list.map((s: any) => {
        const isPassGrade = s.grade && s.grade !== 'F' && s.grade !== 'AB'
        const isPassStatus = ['P', 'N', 'C', 'COMPLETED', 'PASS'].includes(String(s.status || s.result).toUpperCase())
        
        return {
          code: s.scode || s.pcode,
          internal: parseInt(s.internalme || s.int) || 0,
          external: parseInt(s.external || s.ext) || 0,
          total: parseInt(s.total) || 0,
          grade: s.grade || (parseInt(s.total) >= 35 ? 'D' : 'F'),
          gradePoints: parseInt(s.gpoints || s.gp) || 0,
          credits: parseFloat(s.cpoints || s.credits) || 0,
          result: (isPassGrade || isPassStatus) ? 'PASS' : 'FAIL'
        }
      })
    } catch (e) {
      console.warn("[Scraper] subjectList JSON parse failed")
    }
  }

  // 2. Parse HTML Table (Metadata & Fallback)
  const useFallback = subjects.length === 0
  const rows = cleanHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || []
  
  for (const row of rows) {
    const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []
    const txt = cells.map(c => c.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
    const key = txt.length >= 1 ? txt[0].toUpperCase() : ''

    // A. Detect Name/Metadata (Key-Value Row)
    if (txt.length >= 2) {
        if (key === 'NAME') studName = txt[1]
        if (key.includes('MONTH') || key.includes('SESSION')) examMonth = txt[1]
        
        if (key === 'GPA' || key === 'SGPA' || key === 'CGPA') {
            officialGpa = parseFloat(txt[1]) || null
        }
        if (key.includes('TOTAL') && !key.includes('SUBJECT')) {
            officialTotal = parseInt(txt[1].replace(/[^0-9]/g, '')) || null
        }

        if (key.includes('RESULT') && txt[1]) {
            const resTxt = txt[1].toUpperCase()
            if (resTxt === 'P' || resTxt === 'N' || resTxt.includes('PASS') || resTxt.includes('PROMOTED') || resTxt.includes('COMPLETED')) {
                resultStr = 'PASS'
            } else {
                resultStr = 'FAIL'
            }
        }
    }

    // B. Detect Subject Row (Fallback if script list failed)
    if (useFallback && txt.length >= 8 && /^[A-Z0-9-]{2,10}$/.test(txt[0]) && !key.includes('PIN') && !key.includes('NAME')) {
      const isPassGrade = txt[6] && txt[6] !== 'F' && txt[6] !== 'AB'
      const isPassStatus = ['P', 'N', 'C', 'COMPLETED', 'PASS'].includes(String(txt[7]).toUpperCase())

      subjects.push({
        code: txt[0],
        external: parseInt(txt[1]) || 0,
        internal: parseInt(txt[2]) || 0,
        total: parseInt(txt[3]) || 0,
        gradePoints: parseInt(txt[4]) || 0,
        credits: parseFloat(txt[5]) || 0,
        grade: txt[6] || (parseInt(txt[3]) >= 35 ? 'D' : 'F'),
        result: (isPassGrade || isPassStatus) ? 'PASS' : 'FAIL'
      })
    }
  }

  // 3. Status determination (If resultStr hasn't been set by metadata)
  const hasFail = subjects.some(s => s.result === 'FAIL' || s.grade === 'F')
  if (hasFail) resultStr = 'FAIL'

  // 4. Final Aggregates
  const calculatedTotal = subjects.reduce((s, b) => s + b.total, 0)
  const calculatedGpa = calcFallBackGPA(subjects)

  const SEM_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th']
  const semLabel = SEM_LABELS[parseInt(semester) - 1] || `${parseInt(semester)}th`

  // 5. Normalization & Masking
  let finalGpa: number | null = officialGpa ?? calculatedGpa
  if (resultStr === 'FAIL' || (finalGpa === 0)) {
      resultStr = 'FAIL'
      finalGpa = null // "no gpa for failed students"
  }

  return {
    studentName: studName || 'Unknown Student',
    pin: pin.toUpperCase(),
    semester: `${semLabel} Semester`,
    gpa: finalGpa,
    grandTotal: officialTotal ?? calculatedTotal,
    result: resultStr,
    examMonth: examMonth || 'Unknown Session',
    subjects
  }
}



function calcFallBackGPA(subs: any[]) {
  if (subs.length === 0) return 0
  const totalGP = subs.reduce((s, b) => s + (b.gradePoints * b.credits), 0)
  const totalCredits = subs.reduce((s, b) => s + b.credits, 0)
  return totalCredits > 0 ? (Math.round((totalGP / totalCredits) * 100) / 100) : 0
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}


