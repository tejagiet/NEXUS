import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ToggleLeft, ToggleRight, Save, User2, MessageSquarePlus, Inbox, Loader2, CheckCircle2, Phone, KeyRound, Send, UserPlus, Mail, Lock, BadgeCheck, Trash2, AlertCircle, BookOpen, BookMarked, Layers, FileSpreadsheet, Download, Upload, CloudUpload, ShieldCheck, AlertTriangle, Users, MessageSquare, User, TrendingUp, Info } from 'lucide-react'

const BRANCHES = ['CME', 'ECE', 'EEE', 'ME', 'CIVIL', 'AI', 'IT', 'CSE']
const SECTIONS = ['A', 'B', 'C', 'D']
const ROLES = ['student', 'faculty', 'admin', 'principal', 'vice_principal', 'hod', 'class_teacher']

const TABS = [
  { id: 'users', label: 'User Creator', icon: UserPlus, roles: ['admin'] },
  { id: 'subjects', label: 'Subject Manager', icon: BookMarked, roles: ['admin', 'hod', 'principal', 'vice_principal'] },
  { id: 'roles', label: 'Role Manager', icon: ShieldCheck, roles: ['admin'] },
  { id: 'curriculum', label: 'Curriculum', icon: Layers, roles: ['admin', 'hod', 'principal', 'vice_principal'] },
  { id: 'promotion', label: 'Promotion', icon: TrendingUp, roles: ['admin', 'hod', 'principal', 'vice_principal'] },
  { id: 'profiles', label: 'Profiles', icon: User, roles: ['admin', 'hod', 'principal', 'faculty', 'class_teacher', 'vice_principal', 'student'], studentOnly: true },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, roles: ['admin', 'hod', 'principal', 'faculty', 'class_teacher', 'vice_principal', 'student'] },
]

export default function ManagementSuite({ profile, prefill, onPrefillClear, isStandalone = false }) {
  const [activeTab, setActiveTab] = useState(isStandalone ? 'profiles' : (prefill?.tab || (profile?.role === 'student' ? 'profiles' : 'users')))
  const [databaseSyncError, setDatabaseSyncError] = useState(null)

  useEffect(() => {
    if (prefill?.tab) {
      setActiveTab(prefill.tab)
    }
  }, [prefill])

  useEffect(() => {
    // 🏛️ Multi-Role Tab Initialization & Permission Sync
    if (isStandalone) {
      setActiveTab('profiles')
      return
    }
    const userRoles = profile?.roles || [profile?.role] || ['student']
    const currentTab = TABS.find(t => t.id === activeTab)
    const isAllowed = currentTab?.roles.some(r => userRoles.includes(r))
    
    if (!activeTab || !currentTab || !isAllowed) {
      const allowed = TABS.filter(t => t.roles.some(r => userRoles.includes(r)))
      if (allowed.length > 0) setActiveTab(allowed[0].id)
    }
  }, [profile, activeTab, isStandalone])

  // Students see a feedback submit tab instead of admin tabs
  // No more hard redirect. Students get a focused Management Suite.

  const isStudent = (profile?.roles || [profile?.role]).includes('student')

  return (
    <div className="space-y-6">
      {!isStandalone && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-[#272A6F] flex items-center gap-3">
              <ShieldCheck size={28} className="text-[#EFBE33]" />
              Management Suite
              <span className="text-[10px] bg-[#272A6F]/10 text-[#272A6F]/40 px-1.5 py-0.5 rounded-md font-mono">v3</span>
            </h2>
            <p className="text-gray-500 text-sm font-medium">Control center for students, subjects, and system health.</p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-inner overflow-x-auto max-w-full">
            {TABS.filter(t => t.roles.some(r => (profile?.roles || [profile?.role]).includes(r))).map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === t.id
                    ? 'bg-white text-[#272A6F] shadow-lg scale-105'
                    : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <t.icon size={14} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {databaseSyncError && (
        <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-start space-x-3 text-amber-700 shadow-xl shadow-amber-900/5 animate-bounce-subtle">
          <AlertTriangle size={24} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-black text-sm uppercase tracking-wider mb-1">System Action Required</p>
            <p className="text-xs font-medium leading-relaxed">{databaseSyncError}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] p-4 lg:p-8 shadow-2xl shadow-[#272A6F]/5 border border-gray-100">
        {(() => {
          switch (activeTab) {
            case 'users': return <AdminUserCreator profile={profile} setDatabaseSyncError={setDatabaseSyncError} />
            case 'subjects': return <SubjectManager profile={profile} setDatabaseSyncError={setDatabaseSyncError} />
            case 'roles': return <RoleManager profile={profile} setDatabaseSyncError={setDatabaseSyncError} />
            case 'curriculum': return <CurriculumManager profile={profile} setDatabaseSyncError={setDatabaseSyncError} />
            case 'promotion': return <PromotionManager profile={profile} setDatabaseSyncError={setDatabaseSyncError} />
            case 'profiles': return <ProfileEditor profile={profile} setDatabaseSyncError={setDatabaseSyncError} isStandalone={isStandalone} />
            case 'feedback': return isStudent ? <StudentFeedback profile={profile} /> : <FeedbackInbox profile={profile} />
            default: return null
          }
        })()}
      </div>
    </div>
  )
}

/* ── Profile Editor ───────────────────────────────── */
function ProfileEditor({ profile, isStandalone = false }) {
  const userRoles = profile?.roles || [profile?.role] || []
  const isAdmin = userRoles.some(r => ['admin', 'principal', 'vice_principal', 'hod'].includes(r))
  const isFaculty = userRoles.some(r => r === 'faculty' || r === 'class_teacher')
  const isStaff = (isAdmin || isFaculty) && !isStandalone

  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(!isStaff ? profile : null)
  const [formData, setFormData] = useState({ 
    full_name: '', 
    mobile: '', 
    email: '',
    avatar_url: ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (isStaff) {
      supabase.from('profiles').select('*').eq('role', 'student')
        .order('full_name', { ascending: true })
        .then(({ data }) => setStudents(data || []))
    }
  }, [isStaff])

  useEffect(() => {
    if (selected) {
      setFormData({
        full_name: selected.full_name || '',
        mobile: selected.mobile || '',
        email: selected.email || '',
        avatar_url: selected.avatar_url || ''
      })
    } else if (!isStaff) {
      setSelected(profile)
    }
  }, [selected, isStaff, profile])

  async function handleAvatarUpload(e) {
    const file = e.target.files[0]
    if (!file || !selected) return
    
    // 🏛️ Enforce 1MB Limit
    if (file.size > 1024 * 1024) {
      alert("Institutional Policy: Profile pictures must be under 1MB.")
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${selected.id}/${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) {
        if (uploadError.statusCode === "400") throw new Error("Storage Bucket 'avatars' may be missing. Please run storage_repair.sql.")
        if (uploadError.message?.includes("row-level security")) throw new Error("Security Violation: You don't have permission to update this avatar. Ensure storage_repair.sql was run.")
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }))
      
      // Auto-save the URL to profile
      const { error: profileError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', selected.id)
      if (profileError) throw profileError

    } catch (err) {
      console.error("Institutional Asset Error:", err)
      alert("Institutional Upload Failed: " + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function saveProfile() {
    if (!selected) return
    setSaving(true)
    
    const updateData = {
      full_name: formData.full_name,
      mobile: formData.mobile,
      avatar_url: formData.avatar_url
    }

    // 🔒 Email Lock Logic: Only Staff can change emails
    if (isStaff) {
      updateData.email = formData.email
    }

    const { error } = await supabase.from('profiles').update(updateData).eq('id', selected.id)

    if (error) alert("Update failed: " + error.message)
    else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const filtered = students.filter(s => 
    s.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    s.pin_number?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {isStaff && (
        <div className="lg:col-span-1 space-y-4">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Student Directory</p>
          <div className="relative">
            <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find student..."
              className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-[#272A6F] outline-none" />
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {filtered.map(s => (
              <button key={s.id} onClick={() => setSelected(s)}
                className={`w-full text-left p-4 rounded-3xl border-2 transition-all ${selected?.id === s.id ? 'bg-[#272A6F] text-white border-[#272A6F] shadow-xl scale-[1.02]' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-100'}`}>
                <p className="font-bold text-sm leading-tight">{s.full_name}</p>
                <p className={`text-[10px] font-mono mt-1 ${selected?.id === s.id ? 'text-white/60' : 'text-gray-400'}`}>{s.pin_number}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`${isStaff ? 'lg:col-span-2' : 'col-span-full'} space-y-8`}>
        {isStandalone && (
          <div className="mb-10 animate-in slide-in-from-left duration-500">
             <h1 className="text-4xl font-black text-[#272A6F] mb-2">My Institutional Identity</h1>
             <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">Secure Profile & Configuration</p>
          </div>
        )}

        {selected ? (
          <div className="glass rounded-[2.5rem] p-8 border-2 border-[#272A6F]/5 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center md:items-start space-x-0 md:space-x-8 mb-10 pb-10 border-b border-gray-100">
              <div className="relative group mb-6 md:mb-0">
                <div className="w-28 h-28 bg-gradient-to-br from-[#272A6F] to-indigo-900 rounded-[2.5rem] flex items-center justify-center text-white text-4xl font-black shadow-2xl overflow-hidden ring-4 ring-white">
                  {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    formData.full_name?.[0] || '?'
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="animate-spin text-white" />
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#EFBE33] rounded-2xl flex items-center justify-center text-[#272A6F] shadow-lg cursor-pointer hover:scale-110 transition-all border-4 border-white">
                  <CloudUpload size={18} />
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>
              <div className="text-center md:text-left flex-1 py-2">
                <h3 className="text-3xl font-black text-[#272A6F]">{formData.full_name || 'Incomplete Profile'}</h3>
                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-2 flex items-center justify-center md:justify-start">
                  <span className="bg-[#272A6F]/10 text-[#272A6F] px-3 py-1 rounded-lg mr-2">
                    {(selected.roles || [selected.role]).filter(Boolean).map(r => r.replace('_', ' ')).join(' & ') || 'Student'}
                  </span>
                  {selected.pin_number || 'STAFF ACCOUNT'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
                  <User2 size={12} /><span>Full Name</span>
                </label>
                <input value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full h-12 bg-gray-50 border-2 border-transparent rounded-2xl px-5 text-sm font-bold focus:bg-white focus:border-[#272A6F] outline-none transition-all shadow-sm" />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
                  <Mail size={12} /><span>Institutional Email</span>
                </label>
                <div className="relative">
                  <input 
                    value={formData.email} 
                    onChange={e => setFormData({ ...formData, email: e.target.value })} 
                    disabled={!isStaff && profile?.role === 'student'}
                    placeholder="e.g. example@nexusgiet.edu.in"
                    className={`w-full h-12 border-2 rounded-2xl px-5 text-sm font-bold outline-none transition-all shadow-sm
                      ${!isStaff && profile?.role === 'student' ? 'bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 border-transparent focus:bg-white focus:border-[#272A6F]'}`} 
                  />
                  {!isStaff && profile?.role === 'student' && (
                    <Lock size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  )}
                </div>
                {!isStaff && profile?.role === 'student' && (
                  <p className="text-[9px] text-gray-400 font-bold mt-1 ml-1 uppercase">Contact Admin to change email</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
                  <Phone size={12} /><span>Mobile Connectivity</span>
                </label>
                <input value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} maxLength={10}
                  placeholder="10-digit primary number"
                  className="w-full h-12 bg-gray-50 border-2 border-transparent rounded-2xl px-5 text-sm font-bold focus:bg-white focus:border-[#272A6F] outline-none transition-all shadow-sm" />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
                  <BadgeCheck size={12} /><span>Official PIN / ID</span>
                </label>
                <input disabled value={selected.pin_number || 'ADMINISTRATOR'}
                  className="w-full h-12 bg-gray-100 border-2 border-gray-100 rounded-2xl px-5 text-sm font-bold text-gray-400 outline-none shadow-sm cursor-not-allowed" />
              </div>
            </div>

            <button onClick={saveProfile} disabled={saving}
              className="w-full h-16 flex items-center justify-center space-x-3 bg-[#272A6F] text-white rounded-[1.5rem] font-black text-sm hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-[#272A6F]/20 mb-8">
              {saving ? <Loader2 className="animate-spin" size={20} /> : saved ? <CheckCircle2 size={20} className="text-[#EFBE33]" /> : <Save size={20} />}
              <span className="uppercase tracking-[0.1em]">{saved ? 'Profile Vault Updated!' : 'Commit Changes to Nexus'}</span>
            </button>

            {isStandalone && (
              <div className="pt-10 border-t border-gray-100 animate-in fade-in slide-in-from-bottom duration-700">
                <div className="flex items-center space-x-2 mb-6">
                  <ShieldCheck size={18} className="text-[#EFBE33]" />
                  <h4 className="text-sm font-black text-[#272A6F] uppercase tracking-widest">Institutional Identity</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Primary Designation</p>
                    <p className="text-sm font-bold text-[#272A6F] capitalize">{profile?.role?.replace('_', ' ')}</p>
                  </div>
                  <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Department / Branch</p>
                    <p className="text-sm font-bold text-[#272A6F]">{profile?.branch || 'General Administration'}</p>
                  </div>
                  <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Assigned Multi-Roles</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile?.roles?.length > 0 ? profile.roles.map(r => (
                        <span key={r} className="px-2.5 py-1 bg-[#272A6F] text-white rounded-lg text-[9px] font-black uppercase tracking-wider">{r}</span>
                      )) : <span className="text-xs text-gray-400 font-medium italic">No secondary roles assigned</span>}
                    </div>
                  </div>
                  <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">System Identifier</p>
                    <p className="text-[10px] font-mono font-bold text-gray-300 break-all">{profile?.id}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-6">
               <User2 size={40} />
            </div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Awaiting Selection</p>
            <p className="text-gray-300 text-sm mt-1">Select a profile from the directory to begin maintenance.</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Feedback Inbox ───────────────────────────────── */
function FeedbackInbox({ profile }) {
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('feedback').select('*, profiles(full_name,pin_number)').order('created_at', { ascending: false })
      .then(({ data }) => { setFeedbacks(data || []); setLoading(false) })
  }, [])

  async function markRead(id) {
    await supabase.from('feedback').update({ read: true }).eq('id', id)
    setFeedbacks(f => f.map(x => x.id === id ? { ...x, read: true } : x))
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#272A6F]" /></div>
  if (feedbacks.length === 0) return <p className="text-center text-gray-400 py-8">Inbox is empty.</p>

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto">
      {feedbacks.map(f => (
        <div key={f.id} className={`p-4 rounded-2xl border transition-all ${f.read ? 'bg-gray-50 border-gray-100' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-sm text-[#272A6F]">{f.profiles?.full_name} <span className="font-mono text-xs text-gray-400">({f.profiles?.pin_number})</span></p>
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.read ? 'bg-gray-200 text-gray-500' : 'bg-blue-500 text-white'}`}>{f.read ? 'READ' : 'NEW'}</span>
              {!f.read && <button onClick={() => markRead(f.id)} className="text-xs text-blue-600 hover:underline">Mark Read</button>}
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{f.subject}</p>
          <p className="text-sm text-gray-700">{f.message}</p>
          <p className="text-xs text-gray-400 mt-2">{new Date(f.created_at).toLocaleString('en-IN')}</p>
        </div>
      ))}
    </div>
  )
}

/* ── Student Feedback Form ────────────────────────── */
function StudentFeedback({ profile }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function submitFeedback(e) {
    e.preventDefault()
    setSending(true); setError(null)
    const { error } = await supabase.from('feedback').insert({ student_id: profile.id, subject, message, read: false })
    if (error) { setError(error.message); setSending(false); return }
    setSent(true); setSending(false)
    setSubject(''); setMessage('')
    setTimeout(() => setSent(false), 4000)
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <header>
        <h2 className="text-3xl font-black text-[#272A6F]">Nexus Inbox</h2>
        <p className="text-gray-500 mt-1">Send feedback or complaints directly to the Principal.</p>
      </header>
      {sent && (
        <div className="flex items-center space-x-3 bg-green-50 border border-green-200 p-4 rounded-2xl text-green-700">
          <CheckCircle2 size={20} />
          <p className="font-medium text-sm">Your message has been delivered to the Principal's inbox.</p>
        </div>
      )}
      {error && (
        <div className="flex items-center space-x-3 bg-red-50 border border-red-200 p-4 rounded-2xl text-red-700">
          <MessageSquarePlus size={18} /><p className="text-sm">{error}</p>
        </div>
      )}
      <form onSubmit={submitFeedback} className="glass rounded-3xl p-8 space-y-5">
        <div>
          <label className="block text-sm text-gray-600 mb-1.5 font-medium">Subject</label>
          <select value={subject} onChange={e => setSubject(e.target.value)} required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#272A6F]">
            <option value="">Select a topic...</option>
            {['Academic Concern', 'Faculty Feedback', 'Facility Issue', 'Hostel Complaint', 'General Suggestion', 'Other'].map(o =>
              <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1.5 font-medium">Your Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={5}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#272A6F] resize-none"
            placeholder="Describe your concern or suggestion in detail..." />
        </div>
        <button type="submit" disabled={sending}
          className="w-full flex items-center justify-center space-x-2 bg-[#272A6F] text-white py-3.5 rounded-xl font-bold hover:shadow-xl transition-all active:scale-95 disabled:opacity-60">
          {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          <span>{sending ? 'Sending...' : 'Send to Principal'}</span>
        </button>
      </form>
      ```
    </div>
  )
}

/* ── Admin User Creator ─────────────────────────── */
function AdminUserCreator({ profile, setDatabaseSyncError }) {
  const ROLES = ['student', 'faculty', 'admin', 'principal', 'vice_principal', 'hod', 'class_teacher']
  const BRANCHES = ['CME', 'ECE', 'EEE', 'ME', 'CIVIL', 'AI', 'IT', 'CSE']
  const SECTIONS = ['A', 'B', 'C']
  const blank = { full_name: '', email: '', pin_number: '', branch: 'CME', roles: ['student'], password: '', section: 'A' }

  const [form, setForm] = useState(blank)
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const downloadTemplate = () => {
    const csv = "PIN,Name,branch,password\n22295-M-001,John Doe,CME,GIET@2026\n22295-M-002,Jane Smith,ECE,GIET@2026"
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'nexus_student_template.csv'
    a.click()
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setImporting(true)
    setError(null)
    setResults(null)

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target.result
        const rows = text.split('\n').filter(r => r.trim()).slice(1) // Skip header
        const rowContent = rows
          .map(row => {
            const cols = row.split(',').map(s => s?.trim())
            if (cols.length < 2) return null // Need at least PIN and Name

            const [pin, name, branch, password] = cols
            if (!pin || !name) return null

            const finalEmail = `${pin.toLowerCase()}@nexusgiet.edu.in`
            return {
              pin_number: pin,
              full_name: name,
              branch: branch || 'CME',
              password: password || 'GIET@2026',
              email: finalEmail
            }
          })
          .filter(Boolean)

        if (rowContent.length === 0) throw new Error("No valid student data found in CSV. Required format: PIN, Name, branch, password.")

        console.log("Invoking Edge Function with students:", rowContent.length)
        const { data, error: funcError } = await supabase.functions.invoke('batch-user-creator', {
          body: { students: rowContent }
        })

        if (funcError) {
          console.error("Edge Function Error details:", funcError)
          let errorMsg = funcError.message || "Request failed."

          if (errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
            errorMsg = "Unauthorized (401): Missing Service Role Key. Please add the 'SUPABASE_SERVICE_ROLE_KEY' secret in the Supabase Dashboard > Functions > Settings."
          } else if (errorMsg.includes("404")) {
            errorMsg = "404 Not Found: Edge Function not deployed. Run 'supabase functions deploy batch-user-creator' in your terminal."
          }

          throw new Error(`Edge Function: ${errorMsg}`)
        }
        setResults(data.results)
      } catch (err) {
        setError(err.message)
      } finally {
        setImporting(false)
      }
    }
    reader.readAsText(file)
  }

  useEffect(() => {
    fetchUsers()
    const channel = supabase.channel('user_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchUsers()).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // 📧 Real-time email derivation from PIN
  useEffect(() => {
    if (form.role === 'student' && form.pin_number && !form.email) {
      const derived = `${form.pin_number.trim().toLowerCase()}@nexusgiet.edu.in`
      setForm(f => ({ ...f, email: derived }))
    }
  }, [form.pin_number, form.role])

  async function fetchUsers() {
    setLoading(true)
    try {
      let query = supabase
        .from('profiles')
        .select('id,full_name,email,role,pin_number,branch,section')
        .order('created_at', { ascending: false })
        .limit(80)

      if ((profile?.roles || [profile?.role]).includes('hod')) query = query.eq('branch', profile.branch)
      
      const { data, error: fetchErr } = await query

      if (fetchErr) throw fetchErr
      setUsers(data || [])
      setDatabaseSyncError(null)
    } catch (err) {
      console.error("Fetch Users Error:", err.message)

      // Notify user about missing columns specifically
      if (err.message.includes('email') || err.message.includes('section') || err.message.includes('400')) {
        setDatabaseSyncError("DATABASE OUT OF SYNC: You are missing columns (email/section) in your 'profiles' table. Please run the nexus_repair.sql script in Supabase SQL Editor.")
      }

      // Secondary attempt: fallback if email or section columns are missing
      try {
        const { data: fallbackData } = await supabase
          .from('profiles')
          .select('id,full_name,role,pin_number,branch')
          .order('created_at', { ascending: false })
          .limit(80)

        setUsers(fallbackData || [])
      } catch (fallbackErr) {
        setUsers([])
      }
    }
    setLoading(false)
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function createUser(e) {
    e.preventDefault()
    if (!form.email || !form.password || !form.full_name) {
      setMsg({ type: 'error', text: 'Name, email and password are required.' }); return
    }
    setSaving(true); setMsg(null)
    try {
      // 🕵️ Institutional Session Preservation
      const { data: { session: adminSession } } = await supabase.auth.getSession();

      const cleanPin = form.pin_number.trim().toLowerCase()
      const finalEmail = form.email.trim().toLowerCase() || `${cleanPin || Date.now()}@nexusgiet.edu.in`
      
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: finalEmail, password: form.password,
        options: { data: { full_name: form.full_name, roles: form.roles, pin_number: form.pin_number, branch: form.branch } }
      })

      // 🛡️ Immediate Administrative Restore to prevent auto-login to the new student account
      if (adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token
        });
      }

      if (authErr) throw authErr
      const userId = authData.user?.id
      if (userId) {
        // 1. Primary Profile Creation
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: userId, full_name: form.full_name.trim(), email: finalEmail,
          pin_number: form.pin_number.trim(), branch: form.branch, roles: form.roles,
          section: form.roles.includes('student') ? form.section : null
        }, { onConflict: 'id' })
        
        if (profileError) throw new Error(`Profile Sync Failed: ${profileError.message}`)

        // 2. Academic Record Synchronization (Students Table)
        if (form.roles.includes('student')) {
          const { error: studentError } = await supabase.from('students').upsert({
            full_name: form.full_name.trim(),
            pin_number: form.pin_number.trim(),
            branch: form.branch,
            section: form.section,
            auth_id: userId
          }, { onConflict: 'pin_number' })
        }
      }
      setMsg({ type: 'success', text: `✅ ${form.role} "${form.full_name}" created! They must verify email before logging in.` })
      setForm(blank)
      await fetchUsers()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function deleteUser(id, name) {
    if (!confirm(`Delete "${name}" from profiles? (Auth record remains)`)) return
    await supabase.from('profiles').delete().eq('id', id)
    setUsers(u => u.filter(x => x.id !== id))
  }

  const roleColors = { student: 'bg-blue-100 text-blue-700', faculty: 'bg-purple-100 text-purple-700', admin: 'bg-red-100 text-red-700' }

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-[#272A6F] rounded-xl flex items-center justify-center text-white shadow-lg">
          <UserPlus size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-[#272A6F]">User Creator</h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Register students, faculty and admins</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 glass rounded-[2.5rem] bg-indigo-50/30 border-indigo-100">
        <div>
          <h3 className="text-xl font-black text-indigo-900 flex items-center space-x-2">
            <FileSpreadsheet className="text-indigo-600" />
            <span>Batch Student Import</span>
          </h3>
          <p className="text-gray-500 text-sm mt-1">Upload CSV to create hundreds of accounts instantly.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={downloadTemplate} className="flex items-center space-x-2 px-4 py-2 bg-white text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all border border-indigo-100">
            <Download size={16} />
            <span>Template</span>
          </button>
          <label className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black cursor-pointer hover:shadow-xl transition-all shadow-indigo-600/20">
            <Upload size={16} />
            <span>{importing ? 'Importing...' : 'Upload CSV'}</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" disabled={importing} />
          </label>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-3 text-red-600 text-sm animate-shake">
          <AlertCircle size={18} />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {results && (
        <div className="glass rounded-[2rem] overflow-hidden border-green-200">
          <div className="p-4 bg-green-50 border-b border-green-100 flex items-center justify-between">
            <p className="text-sm font-bold text-green-700">Import Complete: {results.length} processed</p>
            <button onClick={() => setResults(null)} className="text-xs text-green-600 underline">Clear Results</button>
          </div>
          <div className="max-h-60 overflow-y-auto p-2 bg-white/50">
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg text-xs border-b border-gray-50 last:border-0">
                <span className="font-mono font-bold text-gray-400">{r.pin}</span>
                <span className={r.status === 'success' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                  {r.status === 'success' ? 'Created ✓' : r.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-px bg-gray-100" />

      {msg && (
        <div className={`flex items-start space-x-3 p-4 rounded-2xl border text-sm ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {msg.type === 'success' ? <BadgeCheck size={18} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />}
          <p>{msg.text}</p>
        </div>
      )}

      <form onSubmit={createUser} className="glass rounded-3xl p-6 space-y-5 border-2 border-dashed border-[#272A6F]/10 hover:border-[#272A6F]/20 transition-colors">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">New User Details</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Hall Ticket / PIN *</label>
            <input value={form.pin_number} onChange={e => set('pin_number', e.target.value)} required placeholder="e.g. 24295-AI-001" autoComplete="off"
              className="w-full h-11 bg-white border-2 border-gray-100 rounded-xl px-4 font-mono text-sm font-bold focus:outline-none focus:border-[#272A6F] transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Full Name *</label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)} required placeholder="e.g. MOLLETI TEJA" autoComplete="off"
              className="w-full h-11 bg-white border-2 border-gray-100 rounded-xl px-4 text-sm font-bold focus:outline-none focus:border-[#272A6F] transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Create Password *</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={form.password} onChange={e => set('password', e.target.value)} required type="password" placeholder="Min. 6 characters" autoComplete="new-password"
                className="w-full h-11 bg-white border-2 border-gray-100 rounded-xl pl-9 pr-4 text-sm font-bold focus:outline-none focus:border-[#272A6F] transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Branch</label>
            <select value={form.branch} onChange={e => set('branch', e.target.value)}
              className="w-full h-11 border-2 border-gray-100 rounded-xl px-4 text-sm font-bold focus:outline-none focus:border-[#272A6F] bg-white transition-all">
              {BRANCHES.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Section</label>
            <select value={form.section} onChange={e => set('section', e.target.value)}
              className="w-full h-11 border-2 border-gray-100 rounded-xl px-4 text-sm font-bold focus:outline-none focus:border-[#272A6F] bg-white transition-all">
              {SECTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Advanced: Role (Optional)</label>
            <select value={form.roles?.[0] || 'student'} onChange={e => set('roles', [e.target.value])}
              className="w-full h-11 border-2 border-gray-100 rounded-xl px-4 text-sm font-bold focus:outline-none focus:border-[#272A6F] bg-white transition-all">
              {ROLES.map(r => <option key={r} value={r}>{r?.charAt(0).toUpperCase() + r?.slice(1)}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Custom Email (Optional - Generated from PIN by default)</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={form.email} onChange={e => set('email', e.target.value)} type="email" placeholder="Leave blank to auto-generate" autoComplete="off"
                className="w-full h-11 bg-white border-2 border-gray-100 rounded-xl pl-9 pr-4 text-sm font-bold focus:outline-none focus:border-[#272A6F] transition-all" />
            </div>
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="w-full h-12 bg-[#272A6F] text-white rounded-xl font-black text-sm flex items-center justify-center space-x-2 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
          <span>
            {saving ? 'Creating Account...' : `Create ${(form.roles?.[0] || 'student').charAt(0).toUpperCase() + (form.roles?.[0] || 'student').slice(1)} Account`}
          </span>
        </button>
      </form>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Registered Users ({users.length})</p>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#272A6F]" size={24} /></div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-[#272A6F]/20 transition-all">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-[#272A6F]/10 rounded-full flex items-center justify-center text-xs font-black text-[#272A6F]">{u.full_name?.[0] || '?'}</div>
                  <div>
                    <p className="font-bold text-sm text-[#272A6F]">{u.full_name}</p>
                    <p className="text-xs text-gray-400 font-mono">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {u.pin_number && <span className="text-[10px] font-mono font-bold text-gray-400 hidden sm:block">{u.pin_number}</span>}
                  {u.role === 'student' && u.section && <span className="text-[10px] font-black text-[#272A6F] bg-[#272A6F]/5 px-2 py-1 rounded-md">Sec {u.section}</span>}
                  <span className={`text-[10px] font-black px-2 py-1 rounded-md ${roleColors[u.role] || 'bg-gray-100 text-gray-500'}`}>{u.role}</span>
                  <button onClick={() => deleteUser(u.id, u.full_name)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Subject Manager ───────────────────────────── */
function SubjectManager({ profile, setDatabaseSyncError }) {
  const blank = { name: '', code: '', branch: 'CME', faculty_id: '' }

  const [form, setForm] = useState(blank)
  const [subjects, setSubjects] = useState([])
  const [faculty, setFaculty] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    fetchData()
    const channel = supabase.channel('subject_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'subjects' }, () => fetchData()).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      let subQuery = supabase.from('subjects').select('*, profiles(full_name)').order('branch', { ascending: true })
      if ((profile?.roles || [profile?.role]).includes('hod')) subQuery = subQuery.eq('branch', profile.branch)

      const [{ data: sub, error: subErr }, { data: fac, error: facErr }] = await Promise.all([
        subQuery,
        supabase.from('profiles').select('id, full_name').eq('role', 'faculty')
      ])

      if (subErr || facErr) throw (subErr || facErr)

      setSubjects(sub || [])
      setFaculty(fac || [])
      setDatabaseSyncError(null)
    } catch (err) {
      console.error("Subject Manager Load Error:", err.message)
      if (err.message.includes('column') || err.message.includes('relation')) {
        setDatabaseSyncError("DATABASE OUT OF SYNC: Subjects or Profiles table missing columns. Please run the nexus_repair.sql script.")
      }
    } finally {
      setLoading(false)
    }
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function saveSubject(e) {
    e.preventDefault()
    if (!form.name || !form.code) {
      setMsg({ type: 'error', text: 'Name and Code are required.' }); return
    }
    setSaving(true); setMsg(null)
    try {
      const { error } = await supabase.from('subjects').upsert({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        branch: form.branch,
        faculty_id: form.faculty_id || null
      }, { onConflict: 'code' })

      if (error) throw error

      setMsg({ type: 'success', text: `✅ Subject "${form.name}" saved successfully!` })
      setForm(blank)
      await fetchData()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(null), 3000)
    }
  }

  async function deleteSubject(id, name) {
    if (!confirm(`Delete subject "${name}"? This might affect attendance records.`)) return
    setMsg(null)
    const { error } = await supabase.from('subjects').delete().eq('id', id)
    if (error) {
      setMsg({ type: 'error', text: `Failed to delete: ${error.message}` })
    } else {
      setMsg({ type: 'success', text: `Subject "${name}" deleted.` })
      setSubjects(s => s.filter(x => x.id !== id))
    }
    setTimeout(() => setMsg(null), 3000)
  }

  const branchColors = {
    CME: 'bg-orange-100 text-orange-700',
    AI: 'bg-indigo-100 text-indigo-700',
    ECE: 'bg-blue-100 text-blue-700',
    EEE: 'bg-yellow-100 text-yellow-700',
    ME: 'bg-gray-100 text-gray-700',
    CIVIL: 'bg-green-100 text-green-700'
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-[#272A6F] rounded-xl flex items-center justify-center text-white shadow-lg">
          <BookMarked size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-[#272A6F]">Subject Manager</h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Create subjects and assign faculty</p>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-2xl flex items-center space-x-3 text-sm font-medium border ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {msg.type === 'success' ? <BadgeCheck size={18} /> : <AlertCircle size={18} />}
          <span>{msg.text}</span>
        </div>
      )}

      <form onSubmit={saveSubject} className="glass rounded-3xl p-6 space-y-5 border-2 border-dashed border-[#272A6F]/10 hover:border-[#272A6F]/20 transition-all">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Subject Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Data Structures" autoComplete="off"
              className="w-full h-11 bg-white border-2 border-gray-100 rounded-xl px-4 text-sm font-bold focus:border-[#272A6F] outline-none transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Subject Code *</label>
            <input value={form.code} onChange={e => set('code', e.target.value)} required placeholder="e.g. CM-401" autoComplete="off"
              className="w-full h-11 bg-white border-2 border-gray-100 rounded-xl px-4 text-sm font-bold font-mono focus:border-[#272A6F] outline-none transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Branch</label>
            <select value={form.branch} onChange={e => set('branch', e.target.value)}
              className="w-full h-11 bg-white border-2 border-gray-100 rounded-xl px-4 text-sm font-bold focus:border-[#272A6F] outline-none transition-all">
              {BRANCHES.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Assign Faculty</label>
            <select value={form.faculty_id} onChange={e => set('faculty_id', e.target.value)}
              className="w-full h-11 bg-white border-2 border-gray-100 rounded-xl px-4 text-sm font-bold focus:border-[#272A6F] outline-none transition-all">
              <option value="">-- No Faculty --</option>
              {faculty.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="w-full h-12 bg-[#272A6F] text-white rounded-xl font-black text-sm flex items-center justify-center space-x-2 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          <span>{saving ? 'Saving Subject...' : 'Register New Subject'}</span>
        </button>
      </form>

      <div className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Manage Existing Subjects ({subjects.length})</p>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#272A6F]" size={24} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
            {subjects.map(s => (
              <div key={s.id} className="p-5 bg-white border-2 border-gray-100 rounded-3xl hover:border-[#272A6F]/20 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md ${branchColors[s.branch] || 'bg-gray-100 text-gray-500'}`}>{s.branch}</span>
                    <button onClick={() => deleteSubject(s.id, s.name)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h4 className="font-bold text-[#272A6F] text-sm leading-tight mb-1">{s.name}</h4>
                  <p className="text-xs font-mono font-bold text-gray-400">{s.code}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <User2 size={12} className="text-gray-300" />
                    <p className="text-[11px] font-black uppercase text-gray-400 tracking-wider">Faculty Assignment</p>
                  </div>
                  <select 
                    value={s.faculty_id || ''} 
                    onChange={async (e) => {
                      const newFac = e.target.value || null
                      const { error } = await supabase.from('subjects').update({ faculty_id: newFac }).eq('id', s.id)
                      if (error) alert(error.message)
                      else fetchData()
                    }}
                    className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-[11px] font-bold text-[#272A6F] focus:border-[#272A6F] outline-none"
                  >
                    <option value="">-- No Faculty --</option>
                    {faculty.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
/* ── Role Manager ─────────────────────────────────── */
function RoleManager({ profile, setDatabaseSyncError }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState(null) // userId being updated

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, roles, role, pin_number, email')
      .order('full_name', { ascending: true })
    if (error) setDatabaseSyncError(error.message)
    else setUsers(data || [])
    setLoading(false)
  }

  async function resetPassword(userId, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters."); return
    }
    if (!confirm("Are you sure you want to reset this user's password? This action cannot be undone.")) return;

    setUpdating(userId)
    const { error } = await supabase.rpc('admin_reset_password', { 
      target_user_id: userId, 
      new_password: newPassword 
    })

    if (error) {
      alert("Security Reset Failed: " + error.message)
    } else {
      alert("Password Reset Successful! User can now login with the new credentials.")
    }
    setUpdating(null)
  }

  async function updateRoles(userId, newRoles) {
    setUpdating(userId)
    const { error } = await supabase
      .from('profiles')
      .update({ roles: newRoles, role: newRoles[0] || 'student' }) // Maintain legacy role for compat
      .eq('id', userId)

    if (error) {
      alert("Failed to update roles: " + error.message)
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, roles: newRoles, role: newRoles[0] || 'student' } : u))
    }
    setUpdating(null)
  }

  async function syncEmail(userId, newEmail) {
    if (!confirm(`Are you sure you want to change this user's institutional login email to ${newEmail}?\n\nThis will update both their profile and their authentication login.`)) return;
    
    setUpdating(userId)
    const { error } = await supabase.rpc('sync_user_email', { 
      target_user_id: userId, 
      new_email: newEmail.trim().toLowerCase() 
    })

    if (error) {
      alert("Institutional Sync Failed: " + error.message)
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, email: newEmail.trim().toLowerCase() } : u))
      alert("Institutional Email Synced! User can now login with the new email.")
    }
    setUpdating(null)
  }

  const [roleFilter, setRoleFilter] = useState('all')

  const filtered = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.pin_number?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || u.roles?.includes(roleFilter) || u.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  const roleColors = {
    admin: 'bg-red-500 text-white',
    principal: 'bg-orange-600 text-white',
    vice_principal: 'bg-orange-500 text-white',
    hod: 'bg-purple-600 text-white',
    class_teacher: 'bg-blue-600 text-white',
    faculty: 'bg-blue-500 text-white',
    student: 'bg-gray-500 text-white'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#272A6F] rounded-xl flex items-center justify-center text-white shadow-lg">
            <KeyRound size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#272A6F]">Role Manager</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Manage staff and student permissions</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Name, PIN or Email..."
            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-[#272A6F] transition-all"
          />
        </div>
        <div className="flex items-center space-x-2 bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-2">
          <BadgeCheck size={18} className="text-gray-400" />
          <select 
            value={roleFilter} 
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-transparent text-sm font-bold text-gray-600 outline-none"
          >
            <option value="all">Every Role</option>
            {ROLES.map(r => (
              <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#272A6F]" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(u => (
            <div key={u.id} className="p-5 bg-white border-2 border-gray-100 rounded-3xl hover:border-[#272A6F]/20 transition-all flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xs font-black text-[#272A6F]">
                    {u.full_name?.[0] || '?'}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#272A6F] text-sm">{u.full_name}</h4>
                    <p className="text-[10px] font-mono font-bold text-gray-400">{u.pin_number || u.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(u.roles || [u.role]).map(r => (
                    <div key={r} className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${roleColors[r] || 'bg-gray-100 text-gray-500'}`}>
                      {r?.replace('_', ' ')}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-50">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Institutional Identity (Login Email)</label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="email" 
                      defaultValue={u.email}
                      onBlur={(e) => {
                        if (e.target.value !== u.email) syncEmail(u.id, e.target.value)
                      }}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#272A6F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Assign Additional Roles</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map(r => {
                      const active = (u.roles || [u.role]).includes(r)
                      return (
                        <button
                          key={r}
                          onClick={() => {
                            const current = u.roles || [u.role]
                            const next = active ? current.filter(x => x !== r) : [...current, r]
                            if (next.length === 0) return // Must have at least one
                            updateRoles(u.id, next)
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all border-2 flex items-center justify-between ${
                            active ? 'bg-[#272A6F] text-white border-[#272A6F]' : 'bg-white text-gray-400 border-gray-100'
                          }`}
                        >
                          <span>{r.replace('_', ' ')}</span>
                          {active && <BadgeCheck size={12} />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">Security Actions</label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="password"
                      placeholder="New Password..."
                      id={`pwd-${u.id}`}
                      className="flex-1 bg-red-50/30 border border-red-100 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={() => {
                        const val = document.getElementById(`pwd-${u.id}`).value
                        resetPassword(u.id, val)
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
/* ── Curriculum Manager ───────────────────────────── */
function CurriculumManager({ profile, setDatabaseSyncError }) {
  const [subjects, setSubjects] = useState([])
  const [topics, setTopics] = useState([])
  const [selectedSub, setSelectedSub] = useState('')
  const [selectedBranch, setSelectedBranch] = useState((profile?.roles || [profile?.role]).includes('hod') ? profile?.branch : 'CME')
  const [newTopic, setNewTopic] = useState({ title: '', description: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [selectedBranch])

  useEffect(() => {
    if (selectedSub) fetchTopics(selectedSub)
  }, [selectedSub])

  async function fetchData() {
    setLoading(true)
    let query = supabase.from('subjects').select('*').eq('branch', selectedBranch).order('name')
    
    const { data, error } = await query
    if (error) setDatabaseSyncError(error.message)
    else {
      setSubjects(data || [])
      if (data?.length) setSelectedSub(data[0].id)
      else setSelectedSub('')
    }
    setLoading(false)
  }

  async function fetchTopics(subId) {
    const { data, error } = await supabase.from('curriculum').select('*').eq('subject_id', subId).order('order_index')
    if (error) setDatabaseSyncError(error.message)
    else setTopics(data || [])
  }

  async function addTopic() {
    if (!newTopic.title) return
    setSaving(true)
    const { error } = await supabase.from('curriculum').insert({
      subject_id: selectedSub,
      title: newTopic.title,
      description: newTopic.description,
      order_index: topics.length
    })
    if (error) alert(error.message)
    else {
      setNewTopic({ title: '', description: '' })
      fetchTopics(selectedSub)
    }
    setSaving(false)
  }

  const downloadTemplate = () => {
    const csv = "Subject Code,Subject Name,Topic Title,Topic Description,Order\nCM-401,Data Structures,Introduction to Linked Lists,Basics of Nodes and Pointers,1\nCM-401,Data Structures,Stack Implementation,LIFO principles,2"
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'nexus_curriculum_template.csv'
    a.click()
  }

  async function handleCsvUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target.result
        const rows = text.split('\n').filter(r => r.trim()).slice(1)
        
        // Subject Code, Subject Name, Topic Title, Topic Description, Order
        const data = rows.map(r => r.split(',').map(s => s.trim()))
        
        const branch = selectedBranch || profile.branch || 'CME'
        
        // Group by subject
        const subjectsMap = {}
        data.forEach(([code, name, title, desc, order]) => {
          if (!code || !name) return
          if (!subjectsMap[code]) subjectsMap[code] = { name, topics: [] }
          if (title) subjectsMap[code].topics.push({ title, description: desc, order_index: parseInt(order) || 0 })
        })

        for (const code in subjectsMap) {
          // 1. Upsert Subject
          const { data: subData, error: subErr } = await supabase.from('subjects').upsert({
            code: code.toUpperCase(),
            name: subjectsMap[code].name,
            branch: branch
          }, { onConflict: 'code' }).select().single()

          if (subErr) throw subErr

          // 2. Clear & Replace Topics
          await supabase.from('curriculum').delete().eq('subject_id', subData.id)
          
          if (subjectsMap[code].topics.length > 0) {
            const topicsToInsert = subjectsMap[code].topics.map(t => ({ ...t, subject_id: subData.id }))
            const { error: topicErr } = await supabase.from('curriculum').insert(topicsToInsert)
            if (topicErr) throw topicErr
          }
        }

        alert("Batch Curriculum Processed Successfully!")
        await fetchData()
      } catch (err) {
        alert("Import Error: " + err.message)
      } finally {
        setImporting(false)
      }
    }
    reader.readAsText(file)
  }

  async function toggleComplete(id, current) {
    await supabase.from('curriculum').update({ is_completed: !current }).eq('id', id)
    setTopics(t => t.map(x => x.id === id ? { ...x, is_completed: !current } : x))
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#272A6F]" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#272A6F] rounded-xl flex items-center justify-center text-white shadow-lg">
            <Layers size={20} />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-[#272A6F]">Curriculum Manager</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Define subject syllabi and track completion</p>
            </div>
            
            <div className="h-10 px-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Branch:</span>
              <select 
                value={selectedBranch} 
                onChange={e => setSelectedBranch(e.target.value)}
                disabled={(profile?.roles || [profile?.role]).includes('hod')}
                className="bg-transparent text-indigo-700 font-black text-[10px] uppercase tracking-widest outline-none cursor-pointer"
              >
                {['CME', 'ECE', 'EEE', 'ME', 'CIVIL', 'AI', 'IT', 'CSE'].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
           <button onClick={downloadTemplate} className="flex items-center space-x-2 px-4 py-2 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all border border-indigo-100">
             <Download size={14} />
             <span>Template</span>
           </button>
           <label className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-indigo-100 transition-all border border-indigo-100">
             <CloudUpload size={14} />
             <span>{importing ? 'Processing...' : 'Upload CSV'}</span>
             <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" disabled={importing} />
           </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Select Subject</label>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {subjects.map(s => (
              <button key={s.id} onClick={() => setSelectedSub(s.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedSub === s.id ? 'bg-[#272A6F] text-white border-[#272A6F] shadow-lg scale-[1.02]' : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'}`}>
                <p className="font-bold text-sm leading-tight">{s.name}</p>
                <p className={`text-[10px] font-mono mt-1 ${selectedSub === s.id ? 'text-white/60' : 'text-gray-400'}`}>{s.code}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="glass rounded-3xl p-6 space-y-4 border-2 border-dashed border-[#272A6F]/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Add New Topic</p>
            <div className="grid grid-cols-1 gap-4">
              <input value={newTopic.title} onChange={e => setNewTopic({ ...newTopic, title: e.target.value })}
                placeholder="Topic Title (e.g. Unit 1: Introduction)"
                className="w-full h-11 bg-white border-2 border-gray-100 rounded-xl px-4 text-sm font-bold focus:border-[#272A6F] outline-none transition-all" />
              <textarea value={newTopic.description} onChange={e => setNewTopic({ ...newTopic, description: e.target.value })}
                placeholder="Brief description or objectives..." rows={2}
                className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-2 text-sm font-bold focus:border-[#272A6F] outline-none transition-all resize-none" />
            </div>
            <button onClick={addTopic} disabled={saving || !newTopic.title}
              className="w-full h-11 bg-[#272A6F] text-white rounded-xl font-black text-xs flex items-center justify-center space-x-2 hover:shadow-lg transition-all disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Add to Syllabus</span>
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Syllabus Overview ({topics.length} topics)</p>
            {topics.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                <p className="text-gray-400 text-sm font-bold">No topics added yet for this subject.</p>
              </div>
            ) : (
              topics.map((t, idx) => (
                <div key={t.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${t.is_completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${t.is_completed ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <h5 className={`font-bold text-sm ${t.is_completed ? 'text-green-700' : 'text-[#272A6F]'}`}>{t.title}</h5>
                      <p className="text-xs text-gray-400 line-clamp-1">{t.description}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleComplete(t.id, t.is_completed)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${t.is_completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                    {t.is_completed ? 'Done ✓' : 'Mark Done'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Promotion Manager (HOD SPECIAL) ───────────── */
function PromotionManager({ profile, setDatabaseSyncError }) {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [promoting, setPromoting] = useState(null) // branch-section tag

  const BRANCHES = ['CME', 'ECE', 'EEE', 'ME', 'CIVIL', 'AI', 'IT', 'CSE']
  const targetBranch = (profile?.roles || [profile?.role]).includes('hod') ? profile?.branch : 'ALL'

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    setLoading(true)
    try {
      let query = supabase.from('profiles').select('branch, semester, section').eq('role', 'student')
      if (targetBranch !== 'ALL') query = query.eq('branch', targetBranch)
      
      const { data, error } = await query
      if (error) throw error

      // Group: CME-Sem 4-A: 60 students
      const grouped = data.reduce((acc, s) => {
        const key = `${s.branch}|${s.semester || 'Sem 1'}|${s.section || 'A'}`
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})

      const finalStats = Object.entries(grouped).map(([key, count]) => {
        const [branch, sem, sec] = key.split('|')
        return { branch, sem, sec, count }
      }).sort((a,b) => a.branch.localeCompare(b.branch) || a.sem.localeCompare(b.sem))

      setStats(finalStats)
    } catch (err) {
      setDatabaseSyncError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function promote(branch, currentSem, section) {
    const semNum = parseInt(currentSem.split(' ')[1])
    if (semNum >= 8) {
      alert("Institutional Cap: Students are already at the final semester (Sem 8).")
      return
    }
    const nextSem = `Sem ${semNum + 1}`
    
    if (!confirm(`Are you sure you want to PROMOTE all students in ${branch} ${currentSem} Section ${section} to ${nextSem}?`)) return

    setPromoting(`${branch}-${section}`)
    try {
      const { error } = await supabase.from('profiles')
        .update({ semester: nextSem })
        .eq('branch', branch)
        .eq('semester', currentSem)
        .eq('section', section)
        .eq('role', 'student')
      
      if (error) throw error
      alert(`Success! ${branch} ${section} promoted to ${nextSem}.`)
      await fetchStats()
    } catch (err) {
      alert("Promotion Failed: " + err.message)
    } finally {
      setPromoting(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          <TrendingUp size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-[#272A6F]">Promotion Manager</h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">HOD Special: Transition sections to the next semester</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#272A6F]" size={40} /></div>
      ) : stats.length === 0 ? (
        <div className="text-center py-32 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100">
           <Users size={40} className="mx-auto mb-4 opacity-10" />
           <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No students found in {targetBranch}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((s, idx) => (
            <div key={idx} className="glass rounded-[2rem] p-6 border-2 border-gray-100 hover:border-indigo-200 transition-all group relative overflow-hidden">
               <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                     <span className="font-black text-xs uppercase tracking-tighter">{s.branch}</span>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Strength</p>
                     <p className="text-xl font-black text-[#272A6F]">{s.count}</p>
                  </div>
               </div>
               <div className="mb-8">
                  <h4 className="text-2xl font-black text-[#272A6F]">{s.sem}</h4>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Section {s.sec}</p>
               </div>
               <button 
                 disabled={promoting === `${s.branch}-${s.sec}`}
                 onClick={() => promote(s.branch, s.sem, s.sec)}
                 className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#272A6F] hover:shadow-xl hover:-translate-y-1 transition-all active:scale-[0.98] disabled:opacity-50">
                 {promoting === `${s.branch}-${s.sec}` ? 'Promoting...' : 'Promote to Next Sem'}
               </button>
               {/* Aesthetic Accent */}
               <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
            </div>
          ))}
        </div>
      )}

      <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-start space-x-4">
         <Info size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
         <div className="text-xs text-amber-800 font-medium leading-relaxed">
            <p className="font-black uppercase tracking-widest mb-1">HOD Advisory</p>
            Promotion is a permanent administrative action. Ensure that all final examinations for the current semester are completed and graded before transitioning the section.
         </div>
      </div>
    </div>
  )
}
