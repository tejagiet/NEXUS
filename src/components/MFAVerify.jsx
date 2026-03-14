import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ShieldCheck, Key, Loader2, AlertCircle, LogOut } from 'lucide-react'

export default function MFAVerify({ onVerify }) {
  const [totp, setTotp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleVerify(e) {
    if (e) e.preventDefault()
    if (totp.length !== 6) return
    
    setLoading(true)
    setError(null)
    
    try {
      const { data: factors, error: fe } = await supabase.auth.mfa.listFactors()
      if (fe) throw fe
      
      const factor = factors.totp.find(f => f.status === 'verified')
      if (!factor) {
        // No verified factor, should not be here, but let's bypass
        onVerify()
        return
      }

      const { data: challenge, error: ce } = await supabase.auth.mfa.challenge({ factorId: factor.id })
      if (ce) throw ce

      const { error: ve } = await supabase.auth.mfa.verify({ 
        factorId: factor.id, 
        challengeId: challenge.id, 
        code: totp 
      })
      if (ve) throw ve

      onVerify()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#272A6F]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} className="text-[#272A6F]" />
          </div>
          <h1 className="text-2xl font-black text-[#272A6F]">Security Shield</h1>
          <p className="text-gray-500 text-sm mt-1">Two-Factor Authentication Required</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-start space-x-3">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="space-y-2 text-center">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Enter Authenticator Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={totp}
              onChange={e => setTotp(e.target.value.replace(/\D/g, ''))}
              placeholder="000 000"
              className="w-full border-b-4 border-gray-100 focus:border-[#272A6F] text-center text-4xl font-mono font-black tracking-[0.4em] py-4 outline-none transition-all placeholder:text-gray-100"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || totp.length !== 6}
            className="w-full bg-[#272A6F] text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-[#272A6F]/20 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Verify & Enter'}
          </button>

          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center justify-center space-x-2 text-gray-400 hover:text-red-500 text-sm font-bold transition-colors py-2"
          >
            <LogOut size={16} />
            <span>Cancel and Sign Out</span>
          </button>
        </form>
      </div>
    </div>
  )
}
