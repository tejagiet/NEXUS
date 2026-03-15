import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { GraduationCap, RefreshCw, Medal, Loader2, AlertCircle, ChevronUp, ChevronDown, Download, Trophy, Users, TrendingUp, Hash, Layers, CloudUpload, FolderOpen } from 'lucide-react'

const SEMESTERS = [
  { value: '1', label: '1st Sem' },
  { value: '2', label: '2nd Sem' },
  { value: '3', label: '3rd Sem' },
  { value: '4', label: '4th Sem' },
  { value: '5', label: '5th Sem' },
  { value: '6', label: '6th Sem' },
]

const GRADE_COLORS = {
  'O':  'bg-emerald-100 text-emerald-700',
  'A+': 'bg-blue-100    text-blue-700',
  'A':  'bg-cyan-100    text-cyan-700',
  'B':  'bg-yellow-100  text-yellow-700',
  'C+': 'bg-orange-100  text-orange-700',
  'C':  'bg-amber-100   text-amber-700',
  'F':  'bg-red-100     text-red-700',
}

export default function ClassResults({ profile }) {
  const [semester,  setSemester]  = useState('3')
  const [results,   setResults]   = useState([])
  const [fetching,  setFetching]  = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [current,   setCurrent]   = useState('')
  const [useRange,  setUseRange]  = useState(true) // Default to range for bulk needs
  
  // Range Inputs
  const [prefix,    setPrefix]    = useState('24295-AI-')
  const [startNum,  setStartNum]  = useState('001')
  const [endNum,    setEndNum]    = useState('066')
  
  const [sortKey,   setSortKey]   = useState('rank')
  const [sortAsc,   setSortAsc]   = useState(true)
  const [expanded,   setExpanded]   = useState(null)
  const [uploading,  setUploading]  = useState(false)
  const [uploadLog,  setUploadLog]  = useState([])
  const [viewMode,   setViewMode]   = useState('cards') // 'cards' | 'matrix'
  const abortRef = useRef(false)

  async function fetchAll() {
    setFetching(true); setResults([]); setProgress(0);
    abortRef.current = false
    const collected = []

    // 1. Generate PIN list
    let pinList = []
    if (useRange) {
      const start = parseInt(startNum)
      const end = parseInt(endNum)
      const pfx = prefix.trim().toUpperCase()
      
      for (let i = start; i <= end; i++) {
        const numStr = i.toString().padStart(3, '0')
        pinList.push({ pin: `${pfx}${numStr}`, name: `Student ${numStr}` })
      }
    } else {
      // Fetch from DB
      const { data } = await supabase.from('profiles').select('full_name,pin_number').eq('role', 'student')
      pinList = (data || []).map(s => ({ pin: s.pin_number, name: s.full_name }))
    }

    if (!pinList.length) {
      setFetching(false)
      return
    }

    // 2. Fetch results loop
    for (let i = 0; i < pinList.length; i++) {
      if (abortRef.current) break
      const st = pinList[i]
      setCurrent(st.pin)
      setProgress(Math.round(((i) / pinList.length) * 100))

      try {
        const { data, error } = await supabase.functions.invoke('sbtet-scraper', {
          body: { pin: st.pin, semester }
        })
        
        if (!error && data?.subjects && data.subjects.length > 0) {
          // AUTO-REGISTRATION: Upsert to students table
          try {
            await supabase.from('students').upsert({
              pin_number: st.pin,
              full_name: data.studentName,
              branch: data.subjects[0]?.code?.includes('-') ? data.subjects[0].code.split('-')[0] : 'AI'
            }, { onConflict: 'pin_number' })
          } catch (upsertErr) {
            console.error("[Reg] Failed to auto-persist student:", upsertErr)
          }

          collected.push({
            pin: st.pin,
            name: data.studentName || st.name,
            gpa: data.gpa ?? data.sgpa ?? 0,
            grandTotal: data.grandTotal ?? 0,
            result: data.result ?? 'UNKNOWN',
            subjects: data.subjects,
          })
        } else {
          console.error(`[Batch] Failed for ${st.pin}:`, error || 'Empty response')
        }
      } catch (err) {
        console.error(`[Batch] Critical Exception for ${st.pin}:`, err)
      }

      // Gap to avoid rate limiting
      await new Promise(r => setTimeout(r, 600))
    }

    // 3. Post-process
    const sortedResults = collected
      .sort((a, b) => b.gpa - a.gpa)
      .map((r, i) => ({ ...r, rank: i + 1 }))
    
    setResults(sortedResults)
    setFetching(false)
    setProgress(100)
    setCurrent('')
  }

  function stopFetch() { abortRef.current = true; setFetching(false) }

  function sort(key) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  const failedStudents = results.filter(r => r.result !== 'PASS' || r.gpa <= 0)
  const passedStudents = results.filter(r => r.result === 'PASS' && r.gpa > 0)

  function getSortedList(list) {
    return [...list].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'number') return sortAsc ? av - bv : bv - av
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }

  const sortedFailed = getSortedList(failedStudents)
  const sortedPassed = getSortedList(passedStudents)

  const SortIcon = ({ k }) => sortKey === k
    ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
    : <ChevronDown size={12} className="opacity-30" />

  const passCount = results.filter(r => r.result === 'PASS').length
  const avgGpa    = results.length ? (results.reduce((s, r) => s + r.gpa, 0) / results.length).toFixed(2) : '—'
  const topGpa    = results.length ? Math.max(...results.map(r => r.gpa)) : '—'

  function makeCSVBlob(rows) {
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  }

  function downloadCSV() {
    const sortedAll = [...getSortedList(failedStudents), ...getSortedList(passedStudents)]
    const header = ['Rank', 'PIN', 'Name', 'GPA', 'Grand Total', 'Result']
    const rows   = sortedAll.map(r => [r.rank, r.pin, r.name, r.gpa ?? '—', r.grandTotal, r.result])
    const blob   = makeCSVBlob([header, ...rows])
    const a      = document.createElement('a')
    a.href       = URL.createObjectURL(blob)
    a.download   = `SBTET_Results_Batch_Sem${semester}.csv`
    a.click()
  }

  async function uploadToStorage() {
    if (!results.length) return
    setUploading(true)
    setUploadLog([])
    const log = []
    const folder = `sem${semester}`

    // ── 1. Master file: all students, all subject columns ──────────────
    const allSubjectCodes = [...new Set(results.flatMap(r => r.subjects.map(s => s.code)))]
    const masterHeader = ['Rank', 'PIN', 'Name', 'Result', 'GPA', 'Grand Total', ...allSubjectCodes.flatMap(c => [`${c}_Ext`, `${c}_Int`, `${c}_Total`, `${c}_Grade`])]
    const masterRows = results.map(r => {
      const subMap = Object.fromEntries(r.subjects.map(s => [s.code, s]))
      return [
        r.rank, r.pin, r.name, r.result, r.gpa ?? '—', r.grandTotal,
        ...allSubjectCodes.flatMap(c => {
          const s = subMap[c]
          return s ? [s.external, s.internal, s.total, s.grade] : ['', '', '', '']
        })
      ]
    })
    const masterBlob = makeCSVBlob([masterHeader, ...masterRows])
    const masterPath = `${folder}/CLASS_RESULTS_Sem${semester}_Master.csv`
    const { error: masterErr } = await supabase.storage.from('results').upload(masterPath, masterBlob, { upsert: true, contentType: 'text/csv' })
    log.push(masterErr ? `❌ Master: ${masterErr.message}` : `✅ Master file saved`)

    // ── 2. Per-subject files ───────────────────────────────────────────
    for (const code of allSubjectCodes) {
      const subHeader = ['PIN', 'Name', 'External', 'Internal', 'Total', 'Grade', 'Result']
      const subRows = results
        .filter(r => r.subjects.some(s => s.code === code))
        .map(r => {
          const s = r.subjects.find(sub => sub.code === code)
          return [r.pin, r.name, s.external, s.internal, s.total, s.grade, s.result]
        })
      const subBlob = makeCSVBlob([subHeader, ...subRows])
      const subPath = `${folder}/Subject_${code}_Sem${semester}.csv`
      const { error: subErr } = await supabase.storage.from('results').upload(subPath, subBlob, { upsert: true, contentType: 'text/csv' })
      log.push(subErr ? `❌ ${code}: ${subErr.message}` : `✅ Subject ${code} saved`)
    }

    setUploadLog(log)
    setUploading(false)
  }

  const TableHeader = () => (
    <thead className="bg-[#272A6F]/5 border-b border-gray-100">
      <tr className="text-[#272A6F] text-[10px] font-black uppercase tracking-widest">
        <th className="px-6 py-4 text-center cursor-pointer hover:bg-white/50 transition-colors" onClick={() => sort('rank')}>
          <span className="flex items-center justify-center space-x-1">Rank <SortIcon k="rank" /></span>
        </th>
        <th className="px-6 py-4 text-left cursor-pointer hover:bg-white/50 transition-colors" onClick={() => sort('name')}>
          <span className="flex items-center space-x-1">Cadet Name <SortIcon k="name" /></span>
        </th>
        <th className="px-6 py-4 text-center cursor-pointer hover:bg-white/50 transition-colors" onClick={() => sort('pin')}>
          <span className="flex items-center justify-center space-x-1 font-mono">PIN <SortIcon k="pin" /></span>
        </th>
        <th className="px-6 py-4 text-center cursor-pointer hover:bg-white/50 transition-colors" onClick={() => sort('gpa')}>
          <span className="flex items-center justify-center space-x-1">GPA <SortIcon k="gpa" /></span>
        </th>
        <th className="px-6 py-4 text-center">Result</th>
        <th className="px-6 py-4 text-center">Actions</th>
      </tr>
    </thead>
  )

  const Row = (r) => (
    <React.Fragment key={r.pin}>
      <tr className={`hover:bg-white/80 transition-all ${r.rank <= 3 && r.result === 'PASS' ? 'bg-[#EFBE33]/5' : ''} group`}>
        <td className="px-6 py-4 text-center font-black">
          {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank}
        </td>
        <td className="px-6 py-4 font-bold text-[#272A6F]">{r.name}</td>
        <td className="px-6 py-4 text-center font-mono text-xs text-gray-400 font-bold">{r.pin}</td>
        <td className="px-6 py-4 text-center">
          <span className={`text-lg font-black ${r.gpa >= 8 ? 'text-green-600' : r.gpa >= 6 ? 'text-blue-600' : 'text-red-500'}`}>
            {r.gpa || '—'}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${(r.result === 'PASS' && r.gpa > 0) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {(r.result === 'PASS' && r.gpa > 0) ? 'PASS' : 'FAIL'}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <button onClick={() => setExpanded(e => e === r.pin ? null : r.pin)}
            className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 hover:bg-[#272A6F] hover:text-white transition-all flex items-center justify-center mx-auto shadow-sm">
            {expanded === r.pin ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </td>
      </tr>
      {expanded === r.pin && (
          <tr className="bg-white/90">
            <td colSpan={6} className="px-8 py-6 animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {r.subjects.map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100 shadow-sm flex flex-col items-center">
                    <span className="text-[10px] font-black text-gray-400 mb-1">{s.code}</span>
                    <span className="text-xl font-black text-[#272A6F] mb-0.5">{s.total}</span>
                    <span className="text-[9px] font-bold text-gray-400 mb-1.5 uppercase tracking-tighter">
                      Ext: {s.external} | Int: {s.internal}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${GRADE_COLORS[s.grade] || 'bg-gray-100'}`}>{s.grade}</span>
                  </div>
                ))}
              </div>
            </td>
          </tr>
        )}
    </React.Fragment>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#272A6F]">Batch Result Hub</h2>
          <p className="text-gray-500 mt-1">
            Pull and rank results for an entire batch using PIN ranges or database records.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {results.length > 0 && (
            <>
              <button onClick={downloadCSV}
                className="flex items-center space-x-2 bg-white border-2 border-gray-100 text-gray-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:border-[#272A6F] hover:text-[#272A6F] transition-all">
                <Download size={16} />
                <span>Export CSV</span>
              </button>
              <button onClick={uploadToStorage} disabled={uploading}
                className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50 active:scale-95">
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
                <span>{uploading ? 'Uploading…' : 'Save to Storage'}</span>
              </button>
            </>
          )}
          <select value={semester} onChange={e => setSemester(e.target.value)}
            className="border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-[#272A6F] bg-white transition-all">
            {SEMESTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {fetching
            ? <button onClick={stopFetch} className="flex items-center space-x-2 bg-red-500 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-red-600 transition-all shadow-lg active:scale-95">
                <span>Stop Crawler</span>
              </button>
            : <button onClick={fetchAll} className="flex items-center space-x-2 bg-[#272A6F] text-white px-6 py-2.5 rounded-xl font-black hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 shadow-lg shadow-[#272A6F]/20">
                <RefreshCw size={16} />
                <span>Start Batch Fetch</span>
              </button>
          }
        </div>
      </header>

      {/* Fetch Configuration */}
      {!fetching && results.length === 0 && (
        <div className="glass rounded-[32px] p-8 shadow-xl border-white/40">
           <div className="flex items-center space-x-4 mb-8">
              <button 
                onClick={() => setUseRange(true)}
                className={`flex-1 py-4 rounded-2xl font-black flex items-center justify-center space-x-2 transition-all ${useRange ? 'bg-[#272A6F] text-white shadow-xl' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
              >
                <Hash size={20} />
                <span>Manual PIN Range</span>
              </button>
              <button 
                onClick={() => setUseRange(false)}
                className={`flex-1 py-4 rounded-2xl font-black flex items-center justify-center space-x-2 transition-all ${!useRange ? 'bg-[#272A6F] text-white shadow-xl' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
              >
                <Layers size={20} />
                <span>Registered Students</span>
              </button>
           </div>

           {useRange && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">PIN Prefix</label>
                  <input type="text" value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="24295-AI-"
                    className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-mono font-bold text-[#272A6F] outline-none focus:border-[#272A6F] transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Start No.</label>
                  <input type="text" value={startNum} onChange={e => setStartNum(e.target.value)} placeholder="001"
                    className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-mono font-bold text-[#272A6F] outline-none focus:border-[#272A6F] transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">End No.</label>
                  <input type="text" value={endNum} onChange={e => setEndNum(e.target.value)} placeholder="060"
                    className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 font-mono font-bold text-[#272A6F] outline-none focus:border-[#272A6F] transition-all" />
                </div>
             </div>
           )}

           {!useRange && (
             <div className="p-10 text-center bg-[#272A6F]/5 rounded-3xl border-2 border-dashed border-[#272A6F]/10">
                <Users size={48} className="mx-auto text-[#272A6F]/20 mb-4" />
                <p className="text-[#272A6F]/60 font-bold uppercase tracking-widest text-xs">Pulls from database profiles</p>
                <p className="text-gray-400 text-sm mt-1">This will only fetch results for students already registered in Nexus.</p>
              </div>
           )}
        </div>
      )}

      {/* Progress Bar */}
      {fetching && (
        <div className="glass rounded-[32px] p-8 shadow-2xl border-white/50 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#272A6F] rounded-xl flex items-center justify-center text-white shadow-lg">
                <Loader2 className="animate-spin" size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Currently Scraping</p>
                <p className="text-lg font-black text-[#272A6F]">{current}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-[#272A6F]">{progress}%</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden p-1 shadow-inner">
            <div className="h-full bg-gradient-to-r from-[#272A6F] to-[#EFBE33] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }} />
          </div>
          <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-4">
            Connecting to SBTET Portal Gateway... 600ms throttle active
          </p>
        </div>
      )}

      {results.length > 0 && !fetching && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox icon={Users} label="Cadets Pulled" value={results.length} color="blue" />
          <StatBox icon={Trophy} label="Top GPA" value={topGpa} color="gold" />
          <StatBox icon={TrendingUp} label="Batch Avg" value={avgGpa} color="indigo" />
          <StatBox icon={Medal} label="Pass Count" value={`${passCount}/${results.length}`} color="emerald" />
        </div>
      )}

      {/* Upload Log */}
      {uploadLog.length > 0 && (
        <div className="glass rounded-[24px] p-6 shadow-lg border-white/50 animate-in fade-in duration-300">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md">
              <FolderOpen size={18} />
            </div>
            <div>
              <p className="font-black text-[#272A6F]">Storage Upload Report</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Supabase Storage → results bucket</p>
            </div>
          </div>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {uploadLog.map((line, i) => (
              <div key={i} className={`text-xs font-mono px-3 py-1.5 rounded-lg ${line.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tables Section */}
      {results.length > 0 && (
        <div className="space-y-12">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-xl font-black text-[#272A6F] flex items-center space-x-2">
              <Layers size={20} className="text-[#EFBE33]" />
              <span>Result Analytics</span>
            </h3>
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
               <button onClick={() => setViewMode('cards')} 
                 className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'cards' ? 'bg-white text-[#272A6F] shadow-sm' : 'text-gray-400'}`}>
                 Individual Cards
               </button>
               <button onClick={() => setViewMode('matrix')} 
                 className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'matrix' ? 'bg-white text-[#272A6F] shadow-sm' : 'text-gray-400'}`}>
                 Merged Matrix
               </button>
            </div>
          </div>

          {viewMode === 'matrix' ? (
            <div className="glass rounded-[32px] overflow-hidden shadow-2xl border-white/50 border-t-[#272A6F] border-t-8 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#272A6F] text-white">
                  <tr className="uppercase tracking-widest font-black text-[9px]">
                    <th className="px-6 py-5 sticky left-0 bg-[#272A6F] z-10 w-48">Cadet Details</th>
                    {Array.from(new Set(results.flatMap(r => r.subjects.map(s => s.code)))).sort().map(code => (
                      <th key={code} className="px-4 py-5 text-center border-l border-white/10">{code}</th>
                    ))}
                    <th className="px-6 py-5 text-center border-l border-white/10">GPA</th>
                    <th className="px-6 py-5 text-center border-l border-white/10">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-bold">
                  {getSortedList([...sortedPassed, ...sortedFailed]).map((r, i) => {
                    const subMap = Object.fromEntries(r.subjects.map(s => [s.code, s]))
                    const codes = Array.from(new Set(results.flatMap(res => res.subjects.map(s => s.code)))).sort()
                    return (
                      <tr key={r.pin} className={`group ${r.result !== 'PASS' ? 'bg-red-50/30' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r border-gray-100 min-w-[200px]">
                          <p className="text-[#272A6F] font-black">{r.name}</p>
                          <p className="text-[9px] font-mono text-gray-400 mt-0.5">{r.pin}</p>
                        </td>
                        {codes.map(code => {
                          const sub = subMap[code]
                          return (
                            <td key={code} className="px-4 py-4 text-center border-l border-gray-50">
                              {sub ? (
                                <div className="space-y-0.5">
                                  <p className={`text-sm ${sub.result === 'PASS' ? 'text-[#272A6F]' : 'text-red-500 font-black'}`}>{sub.total}</p>
                                  <p className="text-[8px] text-gray-400 opacity-60 font-mono">{sub.external}+{sub.internal}</p>
                                </div>
                              ) : (
                                <span className="text-gray-200">—</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="px-6 py-4 text-center border-l border-gray-100 bg-gray-50/50">
                          <span className={`text-sm font-black ${r.gpa >= 8 ? 'text-green-600' : 'text-[#272A6F]'}`}>{r.gpa || '0'}</span>
                        </td>
                        <td className="px-6 py-4 text-center border-l border-gray-100 bg-gray-50/50">
                           <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${r.result === 'PASS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                             {r.result}
                           </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Vertical labels: Ext+Int marks • Horizontal labels: Subject Codes</p>
                 <p className="text-[9px] font-black text-[#272A6F] uppercase tracking-widest">Dataset: {results.length} Students</p>
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Failed Section */}
              {sortedFailed.length > 0 && (
                <div className="glass rounded-[32px] overflow-hidden shadow-2xl border-white/50 border-t-red-500 border-t-8">
                  <div className="px-8 py-6 bg-red-50/50 flex items-center justify-between border-b border-red-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <AlertCircle size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-red-700">Candidates with Backlogs</h3>
                        <p className="text-xs text-red-600 font-bold uppercase tracking-widest mt-0.5">Focus Group for Remedial Sessions</p>
                      </div>
                    </div>
                    <span className="bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-lg">
                      {sortedFailed.length} STUDENTS
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <TableHeader />
                      <tbody className="divide-y divide-gray-100">
                        {sortedFailed.map(Row)}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Passed Section */}
              {sortedPassed.length > 0 && (
                <div className="glass rounded-[32px] overflow-hidden shadow-2xl border-white/50 border-t-emerald-500 border-t-8">
                  <div className="px-8 py-6 bg-emerald-50/50 flex items-center justify-between border-b border-emerald-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Trophy size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-emerald-700">Passed Successfully</h3>
                        <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest mt-0.5">Cleared Semester Exams</p>
                      </div>
                    </div>
                    <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-lg">
                      {sortedPassed.length} STUDENTS
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <TableHeader />
                      <tbody className="divide-y divide-gray-100">
                        {sortedPassed.map(Row)}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatBox({ icon: Icon, label, value, color }) {
  const colors = {
    blue:    'bg-blue-50 text-blue-600',
    gold:    'bg-yellow-50 text-yellow-600',
    indigo:  'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <div className="glass rounded-[24px] p-6 shadow-lg border-white/50 flex items-center space-x-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-2xl font-black text-[#272A6F]">{value}</p>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      </div>
    </div>
  )
}
