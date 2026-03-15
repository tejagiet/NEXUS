import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ShieldCheck, QrCode, Key, CheckCircle2, Loader2, AlertCircle, Lock, Unlock } from 'lucide-react'

export default function MFASetup({ profile }) {
  const [factors,  setFactors]  = useState([])
  const [enrollData, setEnrollData] = useState(null)   // { qr, secret, factorId }
  const [totp,     setTotp]     = useState('')
  const [step,     setStep]     = useState('check')    // 'check'|'enroll'|'verify'|'done'
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  useEffect(() => { checkMFA() }, [])

  async function checkMFA() {
    setLoading(true)
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) { setError(error.message); setLoading(false); return }
    const verified = data?.totp?.filter(f => f.status === 'verified') || []
    setFactors(verified)
    setStep(verified.length > 0 ? 'done' : 'check')
    setLoading(false)
  }

  async function startEnroll() {
    setLoading(true); setError(null)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Nexus GIET' })
    if (error) { setError(error.message); setLoading(false); return }
    setEnrollData({ qr: data.totp.qr_code, secret: data.totp.secret, factorId: data.id })
    setStep('enroll')
    setLoading(false)
  }

  async function verifyTOTP() {
    if (!totp || totp.length !== 6) { setError('Enter the 6-digit code from your Authenticator app.'); return }
    setLoading(true); setError(null)
    const { data: challenge, error: ce } = await supabase.auth.mfa.challenge({ factorId: enrollData.factorId })
    if (ce) { setError(ce.message); setLoading(false); return }
    const { error: ve } = await supabase.auth.mfa.verify({ factorId: enrollData.factorId, challengeId: challenge.id, code: totp })
    if (ve) { setError(ve.message); setLoading(false); return }
    setStep('done'); setLoading(false)
  }

  async function unenroll(factorId) {
    setLoading(true)
    await supabase.auth.mfa.unenroll({ factorId })
    await checkMFA()
    setLoading(false)
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <header>
        <h2 className="text-3xl font-black text-[#272A6F]">Security & 2FA</h2>
        <p className="text-gray-500 mt-1">Protect your professional account with Google Authenticator (TOTP).</p>
      </header>

      {error && (
        <div className="flex items-center space-x-3 bg-red-50 border border-red-200 p-4 rounded-2xl text-red-700">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {loading && step === 'check' && (
        <div className="glass p-12 rounded-3xl flex items-center justify-center">
          <Loader2 className="animate-spin text-[#272A6F]" size={32} />
        </div>
      )}

      {/* Not enrolled */}
      {step === 'check' && !loading && (
        <div className="glass rounded-3xl p-8 border-2 border-dashed border-gray-200">
          <div className="text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Unlock size={32} className="text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Account Not fully Protected</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              Enable 2FA to secure your institution account. This adds an extra layer of security beyond just your email and password.
            </p>
            <button onClick={startEnroll}
              className="bg-[#272A6F] text-white px-8 py-3 rounded-xl font-bold hover:shadow-xl hover:-translate-y-0.5 transition-all">
              Enable 2FA Now
            </button>
          </div>
        </div>
      )}

      {/* QR Enroll step */}
      {step === 'enroll' && enrollData && (
        <div className="glass rounded-3xl p-8 space-y-6">
          <div className="flex items-center space-x-3 mb-2">
            <QrCode size={24} className="text-[#272A6F]" />
            <h3 className="text-xl font-bold text-[#272A6F]">Step 1: Scan QR Code</h3>
          </div>
          <p className="text-gray-600 text-sm">Open <strong>Google Authenticator</strong> or <strong>Authy</strong>, tap "+" and scan this code:</p>

          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-2xl shadow-inner border border-gray-100">
              <img src={enrollData.qr} alt="MFA QR Code" className="w-48 h-48" />
            </div>
          </div>

          <div className="bg-[#272A6F]/5 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1 font-medium">Or enter this secret manually:</p>
            <p className="font-mono text-sm text-[#272A6F] font-bold tracking-widest break-all">{enrollData.secret}</p>
          </div>

          <div>
            <p className="text-gray-600 text-sm mb-3"><strong>Step 2:</strong> Enter the 6-digit code from your authenticator:</p>
            <div className="flex space-x-3">
              <input
                type="text" maxLength={6} value={totp} onChange={e => setTotp(e.target.value.replace(/\D/g, ''))}
                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.5em] focus:outline-none focus:border-[#272A6F]"
                placeholder="000000"
              />
              <button onClick={verifyTOTP} disabled={loading}
                className="bg-[#272A6F] text-white px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all flex items-center space-x-2 disabled:opacity-60">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Key size={18} />}
                <span>Verify</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="glass rounded-3xl p-8 border-2 border-green-200">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={36} className="text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Account is 2FA Protected</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              Your professional account is secured with TOTP two-factor authentication. 
              {profile?.role === 'admin' 
                ? "As an admin, you can manage your security factors below."
                : "This security factor is now locked. Contact Admin for resets."}
            </p>
            <div className="inline-flex items-center space-x-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold mb-6">
              <CheckCircle2 size={16} />
              <span>TOTP Verified & Active</span>
            </div>
            
            {(profile?.role === 'admin' && factors.length > 0) && (
              <div className="border-t border-gray-100 pt-6 mt-2">
                <p className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest text-left">Active Factors (Admin Only)</p>
                {factors.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="text-left">
                      <p className="text-sm font-bold text-[#272A6F]">{f.friendly_name}</p>
                      <p className="text-[9px] text-gray-400 uppercase font-bold">Added {new Date(f.created_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => unenroll(f.id)} disabled={loading}
                      className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-black transition-all">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {profile?.role !== 'admin' && (
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <p className="text-[10px] text-blue-800 font-black uppercase tracking-widest">Institutional Lock Active</p>
                <p className="text-[10px] text-blue-600 font-medium mt-1">For your security, 2FA factors are managed by the institution. Please reach out to the IT department for assistance.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
