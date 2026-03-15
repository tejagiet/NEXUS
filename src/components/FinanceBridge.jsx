import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  ExternalLink, CreditCard, ShieldCheck, AlertCircle, Loader2, 
  TrendingDown, CheckCircle2, RefreshCw, Calendar, IndianRupee, History
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function FinanceBridge({ profile }) {
  const [fee, setFee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const fetchFeeData = async () => {
    const { data } = await supabase.from('fees').select('*').eq('student_id', profile.id).maybeSingle()
    if (data) setFee(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchFeeData()
  }, [])

  const handleSync = async () => {
    if (!profile?.pin_number) return
    setSyncing(true)
    try {
      const { data, error } = await supabase.functions.invoke('fee-sync', {
        body: { pin: profile.pin_number }
      })
      if (error) throw error
      await fetchFeeData()
    } catch (err) {
      console.error("Sync Error:", err)
      alert("Failed to sync dues. Please try again later.")
    } finally {
      setSyncing(false)
    }
  }

  const campxUrl = `https://giet.campx.in/gier/payment-portal/`
  const pct = fee ? Math.round((fee.paid_fee / fee.total_fee) * 100) : 0
  const outstanding = fee ? (fee.total_fee - fee.paid_fee) : 0

  const STATUS = {
    paid:    { label: 'CLEARED', bg: 'bg-green-100 text-green-700 border-green-300' },
    partial: { label: 'PARTIAL', bg: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    pending: { label: 'PENDING', bg: 'bg-red-100 text-red-700 border-red-300' },
  }
  const s = STATUS[fee?.status] || STATUS.pending

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-[#272A6F]">Finance Hub</h2>
          <p className="text-gray-500 mt-1">Smart fee summary synchronized with GIET CampX portal.</p>
        </div>
        <button 
          onClick={handleSync}
          disabled={syncing || !profile?.pin_number}
          className="flex items-center gap-3 px-6 py-3 bg-[#272A6F]/5 hover:bg-[#272A6F]/10 text-[#272A6F] rounded-2xl font-black transition-all active:scale-95 disabled:opacity-50"
        >
          {syncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          <span>SYNC DUES</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Summary Card */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass rounded-[2.5rem] p-10 relative overflow-hidden">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-2xl">
                  <IndianRupee size={24} className="text-[#272A6F]" />
                </div>
                <h3 className="font-bold text-[#272A6F] text-xl">Consolidated Fee Ledger</h3>
              </div>
              {fee && (
                <span className={`text-[10px] font-black px-4 py-1.5 rounded-full border tracking-widest ${s.bg}`}>{s.label}</span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-[#272A6F]" size={40} />
              </div>
            ) : fee ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Total Dues (CampX)</p>
                    <p className="text-5xl font-black text-[#272A6F]">₹{fee.total_fee.toLocaleString('en-IN')}</p>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-gray-500 font-bold uppercase mb-3">
                      <span>Clearance Progress</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden p-1 shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-[#272A6F] to-[#EFBE33] shadow-lg shadow-[#272A6F]/20"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <History size={16} className="text-gray-400" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Last Sync: {fee.last_synced_at ? new Date(fee.last_synced_at).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Academic Breakdown</p>
                  {[
                    { label: 'Year 1 Dues', val: fee.year_1_due },
                    { label: 'Year 2 Dues', val: fee.year_2_due },
                    { label: 'Year 3 Dues', val: fee.year_3_due },
                    { label: 'Year 4 Dues', val: fee.year_4_due },
                  ].map((row, i) => row.val > 0 && (
                    <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">{row.label}</span>
                      <span className="font-black text-[#272A6F] font-mono">₹{row.val.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  {(!fee.year_1_due && !fee.year_2_due && !fee.year_3_due && !fee.year_4_due) && (
                    <p className="text-xs italic text-gray-400 py-4">Pulling breakdown from CampX SOC...</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center opacity-30">
                <CreditCard size={60} className="mb-4" />
                <p className="font-black text-sm uppercase tracking-[0.2em]">No Synchronized Records</p>
                <button onClick={handleSync} className="mt-4 text-xs font-bold underline">Trigger Initial Sync</button>
              </div>
            )}
          </div>
        </div>

        {/* CampX Portal Gateway */}
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-[#272A6F] to-[#1e2159] rounded-[2.5rem] p-8 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#EFBE33] rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" />
            <div className="relative z-10">
              <div className="w-14 h-14 bg-[#EFBE33] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <CreditCard size={28} className="text-[#272A6F]" />
              </div>
              <h3 className="text-2xl font-black mb-2">Payment Portal</h3>
              <p className="text-white/60 text-xs leading-relaxed mb-6 font-medium">
                Redirect to GIET's official billing ecosystem to complete transactions. 
              </p>
              <div className="bg-white/10 rounded-2xl px-5 py-4 mb-6 border border-white/20 backdrop-blur-md">
                <p className="text-[10px] text-white/40 mb-1 font-bold uppercase tracking-widest">Authorized PIN</p>
                <p className="font-mono font-bold tracking-widest text-[#EFBE33]">{profile?.pin_number || 'REQUIRED'}</p>
              </div>
            </div>
            <a href={campxUrl} target="_blank" rel="noopener noreferrer"
              className="relative z-10 w-full bg-[#EFBE33] text-[#272A6F] py-5 rounded-2xl font-black flex items-center justify-center space-x-2 hover:bg-yellow-300 transition-all shadow-xl shadow-[#EFBE33]/10 active:scale-95">
              <span>Pay via CampX Portal</span>
              <ExternalLink size={18} />
            </a>
            <div className="mt-6 flex items-center justify-center space-x-2 text-white/30 text-[9px] font-bold uppercase tracking-widest">
              <ShieldCheck size={12} />
              <span>Secure Gateway Interface</span>
            </div>
          </div>

          <div className="glass rounded-[2.5rem] p-8 border-2 border-dashed border-[#272A6F]/10">
            <h4 className="font-black text-[#272A6F] uppercase text-[10px] tracking-[0.2em] mb-4 flex items-center gap-2">
              <Calendar size={14} className="text-[#EFBE33]" />
              Academic Deadlines
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-red-700 uppercase">Exam Fee Due: 15 OCT 2026</span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium px-2">
                * Fee records are updated every 24 hours. Use the SYNC button for instant updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
