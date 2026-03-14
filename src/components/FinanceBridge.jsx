import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ExternalLink, CreditCard, ShieldCheck, AlertCircle, Loader2, TrendingDown, CheckCircle2 } from 'lucide-react'

export default function FinanceBridge({ profile }) {
  const [fee,     setFee]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('fees').select('*').eq('student_id', profile.id).maybeSingle()
      .then(({ data }) => { setFee(data); setLoading(false) })
  }, [])

  const campxUrl = `https://giet.campx.in/gier/payment-portal/login`
  const pct = fee ? Math.round((fee.paid_fee / fee.total_fee) * 100) : 0
  const outstanding = fee ? fee.total_fee - fee.paid_fee : 0

  const STATUS = {
    paid:    { label: 'CLEARED', bg: 'bg-green-100 text-green-700 border-green-300' },
    partial: { label: 'PARTIAL', bg: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    pending: { label: 'PENDING', bg: 'bg-red-100 text-red-700 border-red-300' },
  }
  const s = STATUS[fee?.status] || STATUS.pending

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-black text-[#272A6F]">Finance Hub</h2>
        <p className="text-gray-500 mt-1">Your fee summary and secure gateway to GIET CampX portal.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Fee Summary Card */}
        <div className="glass rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-[#272A6F] text-lg">Fee Summary</h3>
            {fee && (
              <span className={`text-xs font-black px-3 py-1 rounded-full border ${s.bg}`}>{s.label}</span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#272A6F]" /></div>
          ) : fee ? (
            <div className="space-y-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Annual Fee</p>
                <p className="text-4xl font-black text-[#272A6F]">₹{fee.total_fee.toLocaleString('en-IN')}</p>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>Paid</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-[#272A6F] to-[#EFBE33]"
                    style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                  <div className="flex items-center space-x-1.5 mb-1">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <p className="text-xs text-green-600 font-medium">Paid</p>
                  </div>
                  <p className="text-xl font-black text-green-700">₹{fee.paid_fee.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                  <div className="flex items-center space-x-1.5 mb-1">
                    <TrendingDown size={14} className="text-red-500" />
                    <p className="text-xs text-red-600 font-medium">Outstanding</p>
                  </div>
                  <p className="text-xl font-black text-red-700">₹{outstanding.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {fee.status !== 'paid' && (
                <div className="flex items-start space-x-2 bg-yellow-50 border border-yellow-200 p-3 rounded-xl">
                  <AlertCircle size={14} className="text-yellow-600 mt-0.5" />
                  <p className="text-xs text-yellow-700">Please pay the outstanding fee to avoid academic restrictions.</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 italic py-4">No fee record found. Contact admin.</p>
          )}
        </div>

        {/* CampX Portal Gateway */}
        <div className="bg-gradient-to-br from-[#272A6F] to-[#1e2159] rounded-3xl p-8 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#EFBE33] rounded-full blur-3xl opacity-10" />
          <div className="relative z-10">
            <div className="w-14 h-14 bg-[#EFBE33] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <CreditCard size={28} className="text-[#272A6F]" />
            </div>
            <h3 className="text-2xl font-black mb-2">CampX Payment Portal</h3>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              GIET's official fee payment gateway. Click below to securely pay your dues.
              Your PIN is auto-filled for convenience.
            </p>
            <div className="bg-white/10 rounded-xl px-4 py-2 mb-6 border border-white/20">
              <p className="text-xs text-white/40 mb-0.5">Your PIN (pre-filled)</p>
              <p className="font-mono font-bold tracking-widest">{profile?.pin_number || '—'}</p>
            </div>
          </div>
          <a href={campxUrl} target="_blank" rel="noopener noreferrer"
            className="relative z-10 w-full bg-[#EFBE33] text-[#272A6F] py-4 rounded-2xl font-black flex items-center justify-center space-x-2 hover:bg-yellow-300 transition-all shadow-lg shadow-[#EFBE33]/20 active:scale-95">
            <span>Pay via CampX Portal</span>
            <ExternalLink size={18} />
          </a>
          <div className="mt-4 flex items-center justify-center space-x-2 text-white/30 text-xs relative z-10">
            <ShieldCheck size={12} />
            <span>Redirects to official GIET portal — no data stored locally</span>
          </div>
        </div>
      </div>
    </div>
  )
}
