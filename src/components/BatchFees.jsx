import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Wallet, RefreshCw, Loader2, AlertCircle, ChevronUp, ChevronDown, 
  Download, Users, TrendingUp, Hash, Layers, PieChart, Info
} from 'lucide-react'

export default function BatchFees({ profile }) {
  const [results,   setResults]   = useState([])
  const [fetching,  setFetching]  = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [current,   setCurrent]   = useState('')
  const [useRange,  setUseRange]  = useState(true)
  
  // Range Inputs
  const [prefix,    setPrefix]    = useState('24295-AI-')
  const [startNum,  setStartNum]  = useState('001')
  const [endNum,    setEndNum]    = useState('066')
  
  const [sortKey,   setSortKey]   = useState('total_fee')
  const [sortAsc,   setSortAsc]   = useState(false)
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
        pinList.push({ pin: `${pfx}${numStr}` })
      }
    } else {
      const { data } = await supabase.from('profiles').select('pin_number').eq('role', 'student')
      pinList = (data || []).map(s => ({ pin: s.pin_number }))
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
        const { data, error } = await supabase.functions.invoke('fee-sync', {
          body: { pin: st.pin }
        })
        
        if (!error && data?.success) {
          collected.push({
            pin: st.pin,
            name: data.student || 'Unknown',
            total_fee: data.breakdown.total,
            college_due: data.breakdown.college,
            transport_due: data.breakdown.transport,
            y1: data.breakdown.y1,
            y2: data.breakdown.y2,
            y3: data.breakdown.y3,
            y4: data.breakdown.y4,
          })
        }
      } catch (err) {
        console.error(`[Batch Fees] Error for ${st.pin}:`, err)
      }

      // Throttling to avoid overwhelming the portal
      await new Promise(r => setTimeout(r, 800))
    }

    setResults(collected)
    setFetching(false)
    setProgress(100)
    setCurrent('')
  }

  function stopFetch() { abortRef.current = true; setFetching(false) }

  const sort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const sortedResults = [...results].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey]
    if (typeof av === 'number') return sortAsc ? av - bv : bv - av
    return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
  })

  const totalDues = results.reduce((s, r) => s + r.total_fee, 0)
  const highDebtors = results.filter(r => r.total_fee > 50000).length

  function downloadCSV() {
    const header = ['PIN', 'Name', 'Total Due', 'College Due', 'Transport Due', 'Year 1', 'Year 2', 'Year 3', 'Year 4']
    const rows = sortedResults.map(r => [r.pin, r.name, r.total_fee, r.college_due, r.transport_due, r.y1, r.y2, r.y3, r.y4])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `Batch_Fee_Report_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#272A6F]">Batch Fee Hub</h2>
          <p className="text-gray-500 mt-1">Bulk synchronize and audit student fee records from CampX.</p>
        </div>
        <div className="flex items-center gap-3">
          {results.length > 0 && (
            <button onClick={downloadCSV}
              className="flex items-center space-x-2 bg-white border-2 border-gray-100 text-gray-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:border-[#272A6F] hover:text-[#272A6F] transition-all">
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          )}
          {fetching
            ? <button onClick={stopFetch} className="flex items-center space-x-2 bg-red-500 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-red-600 transition-all shadow-lg">
                <span>Stop Sync</span>
              </button>
            : <button onClick={fetchAll} className="flex items-center space-x-2 bg-[#272A6F] text-white px-6 py-2.5 rounded-xl font-black hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg">
                <RefreshCw size={16} />
                <span>Start Batch Sync</span>
              </button>
          }
        </div>
      </header>

      {/* Config */}
      {!fetching && results.length === 0 && (
        <div className="bg-white rounded-[32px] p-8 shadow-xl border border-gray-100">
          <div className="flex items-center space-x-4 mb-8">
            <button onClick={() => setUseRange(true)}
              className={`flex-1 py-4 rounded-2xl font-black flex items-center justify-center space-x-2 transition-all ${useRange ? 'bg-[#272A6F] text-white' : 'bg-gray-50 text-gray-400'}`}>
              <Hash size={20} />
              <span>PIN Range</span>
            </button>
            <button onClick={() => setUseRange(false)}
              className={`flex-1 py-4 rounded-2xl font-black flex items-center justify-center space-x-2 transition-all ${!useRange ? 'bg-[#272A6F] text-white' : 'bg-gray-50 text-gray-400'}`}>
              <Layers size={20} />
              <span>Registered Only</span>
            </button>
          </div>

          {useRange && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400">Prefix</label>
                <input type="text" value={prefix} onChange={e => setPrefix(e.target.value)} className="w-full h-12 border-2 border-gray-100 rounded-xl px-4 font-mono font-bold text-[#272A6F]" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400">Start</label>
                <input type="text" value={startNum} onChange={e => setStartNum(e.target.value)} className="w-full h-12 border-2 border-gray-100 rounded-xl px-4 font-mono font-bold text-[#272A6F]" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400">End</label>
                <input type="text" value={endNum} onChange={e => setEndNum(e.target.value)} className="w-full h-12 border-2 border-gray-100 rounded-xl px-4 font-mono font-bold text-[#272A6F]" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      {fetching && (
        <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Loader2 className="animate-spin text-[#272A6F]" size={24} />
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Syncing PIN</p>
                <p className="text-lg font-black text-[#272A6F]">{current}</p>
              </div>
            </div>
            <p className="text-4xl font-black text-[#272A6F]">{progress}%</p>
          </div>
          <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#272A6F] to-[#EFBE33] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Stats */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatBox icon={Users} label="Students Audited" value={results.length} color="blue" />
          <StatBox icon={TrendingUp} label="Total Outstanding" value={`₹${totalDues.toLocaleString()}`} color="gold" />
          <StatBox icon={AlertCircle} label="High Debtors (>50k)" value={highDebtors} color="red" />
        </div>
      )}

      {/* Table */}
      {results.length > 0 && (
        <div className="bg-white rounded-[32px] overflow-hidden shadow-xl border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-[#272A6F] text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4 text-left cursor-pointer whitespace-nowrap" onClick={() => sort('pin')}>PIN</th>
                  <th className="px-6 py-4 text-left cursor-pointer whitespace-nowrap" onClick={() => sort('name')}>Name</th>
                  <th className="px-6 py-4 text-center cursor-pointer whitespace-nowrap" onClick={() => sort('total_fee')}>Total Due</th>
                  <th className="px-6 py-4 text-center cursor-pointer whitespace-nowrap" onClick={() => sort('college_due')}>College</th>
                  <th className="px-6 py-4 text-center cursor-pointer whitespace-nowrap" onClick={() => sort('transport_due')}>Transport</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">Y1</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">Y2</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">Y3</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedResults.map(r => (
                  <tr key={r.pin} className="hover:bg-gray-50 transition-colors text-xs font-semibold">
                    <td className="px-6 py-4 font-mono text-gray-400">{r.pin}</td>
                    <td className="px-6 py-4 text-[#272A6F]">{r.name}</td>
                    <td className="px-6 py-4 text-center font-black text-red-600">₹{r.total_fee.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center text-indigo-600 font-bold">₹{(r.college_due || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-center text-amber-600 font-bold">₹{(r.transport_due || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-center text-gray-400">₹{r.y1.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center text-gray-400">₹{r.y2.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center text-gray-400">₹{r.y3.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    gold: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 flex items-center space-x-4">
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
