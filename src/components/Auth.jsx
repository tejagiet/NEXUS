import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { LogIn, UserPlus, Loader2, Eye, EyeOff, ShieldCheck, ChevronDown } from 'lucide-react'

const BRANCHES = ['CME', 'ECE', 'EEE', 'ME', 'CIVIL', 'AI', 'OTHER']

const INPUT = "w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm placeholder-white/30 focus:outline-none focus:border-[#EFBE33] focus:ring-1 focus:ring-[#EFBE33] transition-all"

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Sign-in fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Sign-up extra fields
  const [fullName, setFullName] = useState('')
  const [pin, setPin] = useState('')
  const [branch, setBranch] = useState('CME')
  const [mobile, setMobile] = useState('')
  const [role, setRole] = useState('student')

  async function handleAuth(e) {
    e.preventDefault()
    setLoading(true); setError(null); setSuccess(null)

    try {
      if (isSignUp) {
        // 1. Create auth account
        const { data, error: signUpErr } = await supabase.auth.signUp({ email, password })
        if (signUpErr) throw signUpErr

        // 2. Upsert profile with all collected data
        if (data.user) {
          const { error: profileErr } = await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName.trim(),
            pin_number: pin.trim().toUpperCase(),
            branch: branch,
            mobile: mobile.trim(),
            role: role,
          }, { onConflict: 'id' })
          if (profileErr) throw profileErr
        }

        setSuccess('Account created! Check your email to confirm, then sign in.')
        // Switch to sign-in after a moment
        setTimeout(() => { setIsSignUp(false); setSuccess(null) }, 4000)

      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function signInWithGoogle() {
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) {
      if (error.message.includes('missing OAuth secret')) {
        setError('Google Login is not configured in Supabase. Please add your Client ID and Secret in the Supabase Dashboard.')
      } else {
        setError(error.message)
      }
    }
    setLoading(false)
  }

  function switchMode() {
    setIsSignUp(s => !s)
    setError(null); setSuccess(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #272A6F 0%, #1a1d4e 50%, #272A6F 100%)' }}>

      {/* Decorative blobs */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#EFBE33] rounded-full blur-[160px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#EFBE33] rounded-full blur-[160px] opacity-5 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#EFBE33] rounded-2xl shadow-2xl shadow-[#EFBE33]/30 mb-4">
            <span className="text-[#272A6F] font-black text-3xl">NG</span>
          </div>
          <h1 className="text-white font-black text-4xl tracking-tight">Nexus GIET</h1>
          <p className="text-white/40 text-sm mt-1 tracking-widest uppercase">Polytechnic ERP Platform</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8 shadow-2xl border border-white/10"
          style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)' }}>

          <h2 className="text-white text-xl font-bold mb-1">
            {isSignUp ? 'Create Your Account' : 'Welcome Back'}
          </h2>
          <p className="text-white/40 text-sm mb-6">
            {isSignUp ? 'Fill in your GIET details below' : 'Sign in with your GIET email'}
          </p>

          {error && <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300 text-sm">{success}</div>}

          <form onSubmit={handleAuth} className="space-y-3">

            {/* ── Extra fields only on sign-up ─────────────────── */}
            {isSignUp && (
              <>
                {/* Full Name */}
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">Full Name</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                    className={INPUT} placeholder="e.g. MOLLETI TEJA YESWANTH" />
                </div>

                {/* PIN Number */}
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">
                    PIN / Hall Ticket No.
                  </label>
                  <input type="text" value={pin} onChange={e => setPin(e.target.value)} required
                    className={INPUT} placeholder="e.g. 24295-AI-038" />
                </div>

                {/* Branch + Role in a row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">Branch</label>
                    <div className="relative">
                      <select value={branch} onChange={e => setBranch(e.target.value)}
                        className={INPUT + ' appearance-none pr-8 cursor-pointer'}>
                        {BRANCHES.map(b => <option key={b} className="text-gray-800 bg-white">{b}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">Role</label>
                    <div className="relative">
                      <select value={role} onChange={e => setRole(e.target.value)}
                        className={INPUT + ' appearance-none pr-8 cursor-pointer'}>
                        <option value="student" className="text-gray-800 bg-white">Student</option>
                        <option value="faculty" className="text-gray-800 bg-white">Faculty</option>
                        <option value="admin" className="text-gray-800 bg-white">Admin</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">Mobile Number</label>
                  <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} maxLength={10}
                    className={INPUT} placeholder="10-digit mobile number" />
                </div>

                <div className="border-t border-white/10 pt-1" />
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className={INPUT} placeholder="id@giet.ac.in" />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  minLength={6}
                  className={INPUT + ' pr-11'} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full bg-[#EFBE33] hover:bg-[#d9ab2e] text-[#272A6F] font-black py-3.5 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#EFBE33]/20 active:scale-95 mt-1 disabled:opacity-70">
              {loading ? <Loader2 className="animate-spin" size={20} />
                : isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />}
              <span>{loading ? 'Please wait...' : isSignUp ? 'Register to Nexus' : 'Launch Portal'}</span>
            </button>

            {!isSignUp && (
              <>
                <div className="flex items-center my-4">
                  <div className="flex-1 border-t border-white/10" />
                  <span className="px-3 text-[10px] text-white/20 font-black uppercase tracking-widest">Or continue with</span>
                  <div className="flex-1 border-t border-white/10" />
                </div>

                <button type="button" onClick={signInWithGoogle} disabled={loading}
                  className="w-full bg-white text-gray-800 font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-3 shadow-md hover:bg-gray-50 active:scale-95 disabled:opacity-50">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  <span>Sign in with Google</span>
                </button>
              </>
            )}
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col items-center space-y-2">
            <button onClick={switchMode} className="text-white/40 hover:text-white text-sm transition-colors">
              {isSignUp ? 'Already registered? Sign In →' : 'New to Nexus? Create Account →'}
            </button>
            <div className="flex items-center space-x-1.5 text-white/20 text-xs">
              <ShieldCheck size={12} />
              <span>Protected by Supabase Auth + Row Level Security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
