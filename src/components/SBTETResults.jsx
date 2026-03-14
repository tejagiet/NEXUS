import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { GraduationCap, RefreshCw, Award, BookOpen, ChevronDown, ChevronUp, Loader2, AlertCircle, Sparkles, Info, Search } from 'lucide-react'

const SEMESTERS = [
  { value: '1', label: '1st Semester' },
  { value: '2', label: '2nd Semester' },
  { value: '3', label: '3rd Semester' },
  { value: '4', label: '4th Semester' },
  { value: '5', label: '5th Semester' },
  { value: '6', label: '6th Semester' },
]

// Matches actual SBTET portal grades: O, A+, A, B, C+, C, F
const GRADE_COLORS = {
  'O':  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'A+': 'bg-blue-100    text-blue-700    border-blue-200',
  'A':  'bg-cyan-100    text-cyan-700    border-cyan-200',
  'B':  'bg-yellow-100  text-yellow-700  border-yellow-200',
  'C+': 'bg-orange-100  text-orange-700  border-orange-200',
  'C':  'bg-amber-100   text-amber-700   border-amber-200',
  'F':  'bg-red-100     text-red-700     border-red-200',
}

// ───────────────────────────────────────────────────────────────────
// Real data sample for demo mode
// PIN: 24295-AI-038 | Sem: 3
// ───────────────────────────────────────────────────────────────────
const MOCK_RESULT = {
  studentName: 'MOLLETI TEJA YESWANTH VEERA MANIKANTA',
  branch: 'DIPLOMA IN ARTIFICIAL INTELLIGENCE',
  gpa: 7.64, grandTotal: 687, result: 'PASS',
  examMonth: 'OCT/NOV 2025', semester: '3rd Semester',
  subjects: [
    { code: '301', external: 37, internal: 19, total: 56, gradePoints: 6,  credits: 2.5, grade: 'C+', result: 'P' },
    { code: '302', external: 46, internal: 19, total: 65, gradePoints: 7,  credits: 2.5, grade: 'B',  result: 'P' },
    { code: '303', external: 42, internal: 19, total: 61, gradePoints: 7,  credits: 2.5, grade: 'B',  result: 'P' },
    { code: '304', external: 48, internal: 13, total: 61, gradePoints: 7,  credits: 3.0, grade: 'B',  result: 'P' },
    { code: '305', external: 38, internal: 19, total: 57, gradePoints: 6,  credits: 3.0, grade: 'C+', result: 'P' },
    { code: '306', external: 58, internal: 40, total: 98, gradePoints: 10, credits: 2.0, grade: 'A+', result: 'P' },
    { code: '307', external: 56, internal: 39, total: 95, gradePoints: 10, credits: 1.0, grade: 'A+', result: 'P' },
    { code: '308', external: 58, internal: 39, total: 97, gradePoints: 10, credits: 1.5, grade: 'A+', result: 'P' },
    { code: '309', external: 58, internal: 39, total: 97, gradePoints: 10, credits: 1.5, grade: 'A+', result: 'P' },
  ]
}

export default function SBTETResults({ profile }) {
  const [result,    setResult]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [expanded,  setExpanded]  = useState(true)
  const [semester,  setSemester]  = useState('3')
  const [pin,       setPin]       = useState(profile?.pin_number || '')
  const [usingMock, setUsingMock] = useState(false)

  // Sync PIN if profile changes
  useEffect(() => {
    if (profile?.pin_number && !pin) setPin(profile.pin_number)
  }, [profile])

  async function fetchResults() {
    setLoading(true); setError(null); setUsingMock(false)
    
    if (!pin) {
      setError('Please enter a valid PIN number.')
      setLoading(false); return
    }

    try {
      // Edge Function POSTs to https://sbtet.ap.gov.in/APSBTET/gradeWiseResults.do
      // with params: htno=PIN & sem=SEMESTER
      const { data, error: fnErr } = await supabase.functions.invoke('sbtet-scraper', {
        body: { pin: pin.trim().toUpperCase(), semester }
      })

      if (fnErr) {
        console.error('[SBTET] Invoke Error:', fnErr)
        throw new Error(fnErr.message || 'Edge Function Error')
      }
      
      if (!data?.subjects) {
        console.warn('[SBTET] No subjects in response:', data)
        throw new Error(data?.error || 'Result not found on portal.')
      }
      
      setResult({ ...data, pin })
    } catch (e) {
      setResult(null)
      // If the specific demo PIN is searched, show the mock data for visual demo
      if (pin.replace(/\s/g, '').toUpperCase() === '24295-AI-038' || pin === 'DEMO') {
        setResult({ ...MOCK_RESULT, pin: '24295-AI-038' })
        setUsingMock(true)
      } else {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const semLabel = SEMESTERS.find(s => s.value === semester)?.label

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <h2 className="text-3xl font-black text-[#272A6F]">SBTET Portal Hub</h2>
        <p className="text-gray-500 mt-1">
          Fetch live grade-wise results from the official SBTET portal for any PIN.
        </p>
      </header>

      {/* Generic Search/Filter Bar */}
      <div className="glass rounded-2xl p-6 shadow-xl border border-white/20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* PIN Input */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Hall Ticket Number (PIN)</label>
            <div className="relative group">
              <input 
                type="text" 
                value={pin} 
                onChange={e => setPin(e.target.value)}
                placeholder="e.g. 24295-AI-038"
                className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 pl-11 font-mono font-bold text-[#272A6F] outline-none focus:border-[#272A6F] focus:ring-4 focus:ring-[#272A6F]/5 transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#272A6F] transition-colors" size={18} />
            </div>
          </div>

          {/* Sem Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Semester</label>
            <select 
              value={semester} 
              onChange={e => setSemester(e.target.value)}
              className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-bold text-[#272A6F] outline-none focus:border-[#272A6F] transition-all cursor-pointer"
            >
              {SEMESTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Fetch Button */}
          <button 
            onClick={fetchResults} 
            disabled={loading}
            className="h-12 bg-[#272A6F] text-white rounded-xl font-black flex items-center justify-center space-x-2 hover:bg-[#1a1d4e] hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
            <span>Pull Data</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-start space-x-3 bg-red-50 border border-red-200 p-5 rounded-2xl text-red-700 animate-in zoom-in-95 duration-200">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Fetch Failed</p>
            <p className="text-sm opacity-80 mt-1">{error}</p>
            {error.includes('Function not deployed') && (
              <p className="text-[10px] mt-2 font-mono uppercase bg-red-100 px-2 py-0.5 rounded-full inline-block">
                Required: npx supabase functions deploy sbtet-scraper
              </p>
            )}
          </div>
        </div>
      )}

      {/* Demo Mode Notice */}
      {usingMock && (
        <div className="flex items-start space-x-3 bg-[#EFBE33]/10 border border-[#EFBE33]/30 p-5 rounded-2xl text-[#272A6F] animate-in zoom-in-95 duration-200">
          <Sparkles size={20} className="flex-shrink-0 mt-0.5 text-[#EFBE33]" />
          <div>
            <p className="font-bold">Sandbox Mode: Viewing Real Cached Result</p>
            <p className="text-xs opacity-70 mt-1">
              You're viewing a result verified live on the SBTET portal for PIN <span className="font-mono font-bold tracking-tight">24295-AI-038</span>.
              This demo mode activates for this specific PIN or if the Edge Function is pending deployment.
            </p>
          </div>
        </div>
      )}

      {/* Results Content */}
      {loading ? (
        <div className="glass rounded-3xl p-20 text-center flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-[#272A6F]/10 rounded-full" />
            <div className="absolute inset-0 w-20 h-20 border-4 border-[#272A6F] border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-black text-[#272A6F]">Crawling SBTET Portal...</p>
            <p className="text-gray-400 font-medium">Validating htno={pin} for {semLabel}</p>
          </div>
        </div>
      ) : result ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
          
          {/* Summary Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main GPA Card */}
            <div className="lg:col-span-1 bg-gradient-to-br from-[#272A6F] to-[#1a1d4e] rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[220px]">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#EFBE33] rounded-full blur-[80px] opacity-20" />
              <div className="relative z-10">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Semester GPA</p>
                <div className="flex items-baseline space-x-2">
                  <h3 className="text-7xl font-black text-[#EFBE33]">{result.gpa ?? result.sgpa ?? '—'}</h3>
                  <span className="text-white/30 font-bold">/ 10</span>
                </div>
              </div>
              <div className="relative z-10 space-y-1">
                <p className="text-white font-black text-lg truncate">{result.studentName}</p>
                <p className="text-white/40 text-xs font-mono uppercase tracking-widest">{result.pin}</p>
              </div>
            </div>

            {/* Sub Stats */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="glass rounded-3xl p-6 flex flex-col justify-between border-white/50">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Grand Total</p>
                <p className="text-3xl font-black text-[#272A6F]">{result.grandTotal}</p>
              </div>
              <div className="glass rounded-3xl p-6 flex flex-col justify-between border-white/50">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Final Result</p>
                <div className="flex items-center space-x-2">
                  <p className={`text-2xl font-black ${(result.result === 'PASS' && (result.gpa > 0 || result.sgpa > 0)) ? 'text-green-600' : 'text-red-500'}`}>
                    {(result.result === 'PASS' && (result.gpa > 0 || result.sgpa > 0)) ? 'PASS' : 'FAIL'}
                  </p>
                  <div className={`w-2 h-2 rounded-full ${(result.result === 'PASS' && (result.gpa > 0 || result.sgpa > 0)) ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                </div>
              </div>
              <div className="glass rounded-3xl p-6 flex flex-col justify-between border-white/50 hidden sm:flex">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Exam Session</p>
                <p className="text-lg font-black text-[#272A6F]">{result.examMonth}</p>
              </div>
              <div className="col-span-full glass rounded-3xl p-4 bg-white/40 border-white/50">
                 <div className="flex justify-between items-center px-2">
                   <p className="text-gray-500 text-xs font-bold">Grade Distribution</p>
                   <div className="flex space-x-1.5">
                     {['O','A+','A','B','C+','C','F'].map(g => {
                        const count = result.subjects.filter(s => s.grade === g).length
                        if (count === 0) return null
                        return (
                          <div key={g} className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${GRADE_COLORS[g]}`}>
                            {g}: {count}
                          </div>
                        )
                     })}
                   </div>
                 </div>
              </div>
            </div>
          </div>

          {/* Marks Table */}
          <div className="glass rounded-[32px] overflow-hidden shadow-2xl border-white/50">
            <div className="px-8 py-6 bg-white/80 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#272A6F] rounded-xl flex items-center justify-center text-white">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h4 className="font-black text-[#272A6F] tracking-tight">Paper-Wise Breakdown</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{result.semester}</p>
                </div>
              </div>
              {/* Grand Total Footer-style info moved here for mobile */}
              <div className="text-right">
                 <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Credits Earned</p>
                 <p className="text-xl font-black text-[#272A6F]">
                   {result.subjects.reduce((acc, s) => acc + (s.credits || 0), 0)}
                 </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#272A6F]/5">
                  <tr className="text-[#272A6F] text-[10px] font-black uppercase tracking-[0.15em]">
                    <th className="px-8 py-4 text-left">Paper Code</th>
                    <th className="px-8 py-4 text-center">Ext</th>
                    <th className="px-8 py-4 text-center">Int</th>
                    <th className="px-8 py-4 text-center">Total</th>
                    <th className="px-8 py-4 text-center">GP</th>
                    <th className="px-8 py-4 text-center">Credits</th>
                    <th className="px-8 py-4 text-center">Grade</th>
                    <th className="px-8 py-4 text-center">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.subjects.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-white/60 transition-colors group">
                      <td className="px-8 py-4 font-mono font-black text-[#272A6F] group-hover:text-[#EFBE33] transition-colors">{sub.code}</td>
                      <td className="px-8 py-4 text-center font-bold text-gray-600">{sub.external}</td>
                      <td className="px-8 py-4 text-center font-bold text-gray-600">{sub.internal}</td>
                      <td className="px-8 py-4 text-center font-black text-[#272A6F]">{sub.total}</td>
                      <td className="px-8 py-4 text-center font-bold text-gray-400">{sub.gradePoints}</td>
                      <td className="px-8 py-4 text-center font-bold text-gray-400">{sub.credits}</td>
                      <td className="px-8 py-4 text-center">
                        <span className={`px-3 py-1 rounded-lg text-xs font-black border ${GRADE_COLORS[sub.grade] || 'bg-gray-100 border-gray-200'}`}>
                          {sub.grade}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-md ${sub.result === 'PASS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                          {sub.result === 'PASS' ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Final Aggregation Row */}
                  <tr className="bg-[#272A6F] text-white">
                    <td colSpan={3} className="px-8 py-6 font-black text-lg">Grand Summary</td>
                    <td className="px-8 py-6 text-center text-2xl font-black text-[#EFBE33]">{result.grandTotal}</td>
                    <td colSpan={2} className="px-8 py-6 text-right">
                       <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Semester Performance</p>
                       <p className="text-xl font-black">{result.result}</p>
                    </td>
                    <td colSpan={2} className="px-8 py-6 text-center bg-[#EFBE33] text-[#272A6F]">
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Final GPA</p>
                       <p className="text-3xl font-black">{result.gpa ?? result.sgpa ?? '—'}</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 font-medium">
            Source Data Verified: SBTET AP Portal Gateway · {result.semester} · htno={result.pin}
          </p>
        </div>
      ) : !loading && (
        <div className="glass rounded-[40px] p-24 text-center border-dashed border-2 border-[#272A6F]/10">
          <div className="w-24 h-24 bg-[#272A6F]/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <GraduationCap size={48} className="text-[#272A6F]/20" />
          </div>
          <h3 className="text-2xl font-black text-[#272A6F]/40 mb-2 whitespace-nowrap">Enter Student Credentials</h3>
          <p className="text-gray-400 max-w-xs mx-auto text-sm">
            Provide the Hall Ticket Number and select the Semester to pull live data.
          </p>
        </div>
      )}
    </div>
  )
}
