import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ToggleLeft, ToggleRight, Save, User2, MessageSquarePlus, Inbox, Loader2, CheckCircle2, Phone, KeyRound, Send, UserPlus, Mail, Lock, BadgeCheck, Trash2, AlertCircle, BookOpen, BookMarked, Layers, FileSpreadsheet, Download, Upload, ShieldCheck, AlertTriangle, Users, MessageSquare, User } from 'lucide-react'

const BRANCHES = ['CME', 'ECE', 'EEE', 'ME', 'CIVIL', 'AI', 'IT', 'CSE']
const SECTIONS = ['A', 'B', 'C', 'D']
const ROLES = ['student', 'faculty', 'admin', 'principal', 'vice_principal', 'hod', 'class_teacher']

const TABS = [
  { id: 'users', label: 'User Creator', icon: UserPlus, roles: ['admin', 'hod', 'principal'] },
  { id: 'subjects', label: 'Subject Manager', icon: BookMarked, roles: ['admin', 'hod', 'principal', 'vice_principal'] },
  { id: 'roles', label: 'Role Manager', icon: ShieldCheck, roles: ['admin'] },
  { id: 'curriculum', label: 'Curriculum', icon: Layers, roles: ['admin', 'hod', 'principal', 'vice_principal'] },
  { id: 'profiles', label: 'Profiles', icon: User, roles: ['admin', 'hod', 'principal', 'faculty', 'class_teacher', 'vice_principal', 'student'], studentOnly: true },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, roles: ['admin', 'hod', 'principal', 'faculty', 'class_teacher', 'vice_principal', 'student'] },
]

export default function ManagementSuite({ profile, prefill, onPrefillClear }) {
  const [activeTab, setActiveTab] = useState(profile?.role === 'student' ? 'profiles' : 'users') // Default to 'users' for non-students, 'profiles' for students
  const [databaseSyncError, setDatabaseSyncError] = useState(null)

  useEffect(() => {
    // Default to the first allowed tab based on role
    if (!activeTab || !TABS.find(t => t.id === activeTab)) {
      const allowed = TABS.filter(t => t.roles.includes(profile?.role))
      if (allowed.length > 0) setActiveTab(allowed[0].id)
    }
  }, [profile, activeTab])

  // Students see a feedback submit tab instead of admin tabs
  // No more hard redirect. Students get a focused Management Suite.

  const isStudent = profile?.role === 'student'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#272A6F] flex items-center gap-3">
            <ShieldCheck size={28} className="text-[#EFBE33]" />
            Management Suite
            <span className="text-[10px] bg-[#272A6F]/10 text-[#272A6F]/40 px-1.5 py-0.5 rounded-md font-mono">v3</span>
          </h2>
          <p className="text-gray-500 text-sm font-medium">Control center for students, subjects, and system health.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-inner">
          {TABS.filter(t => t.roles.includes(profile?.role)).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === t.id
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
            case 'users': return <AdminUserCreator setDatabaseSyncError={setDatabaseSyncError} />
            case 'subjects': return <SubjectManager profile={profile} setDatabaseSyncError={setDatabaseSyncError} />
            case 'roles': return <RoleManager setDatabaseSyncError={setDatabaseSyncError} />
            case 'curriculum': return <CurriculumManager profile={profile} setDatabaseSyncError={setDatabaseSyncError} />
            case 'profiles': return <ProfileEditor profile={profile} setDatabaseSyncError={setDatabaseSyncError} />
            case 'feedback': return isStudent ? <StudentFeedback profile={profile} /> : <FeedbackInbox profile={profile} />
            default: return null
          }
        })()}
      </div>
    </div>
  )
}

/* ── Profile Editor ───────────────────────────────── */
function ProfileEditor({ profile, isAdmin }) {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(isAdmin ? null : profile)
  const [formData, setFormData] = useState({ 
    full_name: selected?.full_name || '', 
    mobile: selected?.mobile || '', 
    email: selected?.email || '' 
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (isAdmin) {
      supabase.from('profiles').select('*').eq('role', 'student')
        .order('full_name', { ascending: true })
        .then(({ data }) => setStudents(data || []))
    }
  }, [isAdmin])

  useEffect(() => {
    if (selected) {
      setFormData({
        full_name: selected.full_name || '',
        mobile: selected.mobile || '',
        email: selected.email || ''
      })
    }
  }, [selected])

  async function saveProfile() {
    if (!selected) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: formData.full_name,
      mobile: formData.mobile,
      email: formData.email
    }).eq('id', selected.id)

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
      {isAdmin && (
        <div className="lg:col-span-1 space-y-4">
          <p className="text-[10px] font-black uppercase text-gray-400">Select Student</p>
          <div className="relative">
            <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..."
              className="w-full h-10 pl-9 pr-4 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#272A6F] outline-none" />
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {filtered.map(s => (
              <button key={s.id} onClick={() => setSelected(s)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${selected?.id === s.id ? 'bg-[#272A6F] text-white border-[#272A6F] shadow-lg scale-[1.02]' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-100'}`}>
                <p className="font-bold text-sm leading-tight">{s.full_name}</p>
                <p className={`text-[10px] font-mono mt-1 ${selected?.id === s.id ? 'text-white/60' : 'text-gray-400'}`}>{s.pin_number}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`${isAdmin ? 'lg:col-span-2' : 'col-span-full'} space-y-6 pt-6 lg:pt-0`}>
        {selected ? (
          <div className="glass rounded-[2.5rem] p-8 border-2 border-dashed border-[#272A6F]/10">
            <div className="flex items-center space-x-6 mb-8 pb-8 border-b border-gray-100">
              <div className="w-20 h-20 bg-[#272A6F] rounded-[2rem] flex items-center justify-center text-white text-3xl font-black shadow-xl">
                {formData.full_name?.[0] || '?'}
              </div>
              <div>
                <h3 className="text-2xl font-black text-[#272A6F]">{formData.full_name}</h3>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{selected.role} • {selected.pin_number || 'STAFF'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  <User2 size={12} /><span>Full Name</span>
                </label>
                <input value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full h-11 bg-white border-2 border-gray-50 rounded-xl px-4 text-sm font-bold focus:border-[#272A6F] outline-none transition-all" />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  <Mail size={12} /><span>Email Address</span>
                </label>
                <input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-11 bg-white border-2 border-gray-50 rounded-xl px-4 text-sm font-bold focus:border-[#272A6F] outline-none transition-all" />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  <Phone size={12} /><span>Mobile Number</span>
                </label>
                <input value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} maxLength={10}
                  placeholder="e.g. 9876543210"
                  className="w-full h-11 bg-white border-2 border-gray-50 rounded-xl px-4 text-sm font-bold focus:border-[#272A6F] outline-none transition-all" />
              </div>

              <div className="space-y-2 opacity-50 cursor-not-allowed">
                <label className="flex items-center space-x-2 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  <Lock size={12} /><span>PIN Number</span>
                </label>
                <input disabled value={selected.pin_number || 'N/A'}
                  className="w-full h-11 bg-gray-100 border-2 border-gray-100 rounded-xl px-4 text-sm font-bold outline-none" />
              </div>
            </div>

            <button onClick={saveProfile} disabled={saving}
              className="w-full h-14 flex items-center justify-center space-x-3 bg-[#272A6F] text-white rounded-2xl font-black text-sm hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={20} /> : saved ? <BadgeCheck size={20} /> : <Save size={20} />}
              <span>{saved ? 'Profile Updated Successfully!' : 'Commit Changes to Nexus'}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
            <User2 size={48} className="text-gray-200 mb-4" />
            <p className="text-gray-400 font-bold">Select a student profile from the left directory to begin maintenance.</p>
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
  const ROLES = ['student', 'faculty', 'admin']
  const BRANCHES = ['CME', 'ECE', 'EEE', 'ME', 'CIVIL', 'AI', 'IT', 'CSE']
  const SECTIONS = ['A', 'B', 'C']
  const blank = { full_name: '', email: '', pin_number: '', branch: 'CME', role: 'student', password: '', section: 'A' }

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

      if (profile?.role === 'hod') query = query.eq('branch', profile.branch)
      
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
      const cleanPin = form.pin_number.trim().toLowerCase()
      const finalEmail = form.email.trim().toLowerCase() || `${cleanPin || Date.now()}@nexusgiet.edu.in`
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: finalEmail, password: form.password,
        options: { data: { full_name: form.full_name, role: form.role, pin_number: form.pin_number, branch: form.branch } }
      })
      if (authErr) throw authErr
      const userId = authData.user?.id
      if (userId) {
        await supabase.from('profiles').upsert({
          id: userId, full_name: form.full_name.trim(), email: finalEmail,
          pin_number: form.pin_number.trim(), branch: form.branch, role: form.role,
          section: form.role === 'student' ? form.section : null
        }, { onConflict: 'id' })

        // 🔗 NEW: Sync to students table for attendance tracking
        if (form.role === 'student') {
          await supabase.from('students').upsert({
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
            <select value={form.role} onChange={e => set('role', e.target.value)}
              className="w-full h-11 border-2 border-gray-100 rounded-xl px-4 text-sm font-bold focus:outline-none focus:border-[#272A6F] bg-white transition-all">
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
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
          <span>{saving ? 'Creating Account...' : `Create ${form.role.charAt(0).toUpperCase() + form.role.slice(1)} Account`}</span>
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
      if (profile?.role === 'hod') subQuery = subQuery.eq('branch', profile.branch)

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
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center space-x-2">
                  <User2 size={12} className="text-gray-300" />
                  <p className="text-[11px] font-bold text-gray-500 truncate">
                    {s.profiles?.full_name || 'No Faculty Assigned'}
                  </p>
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
      .select('id, full_name, role, pin_number, email')
      .order('full_name', { ascending: true })
    if (error) setDatabaseSyncError(error.message)
    else setUsers(data || [])
    setLoading(false)
  }

  async function updateRole(userId, newRole) {
    setUpdating(userId)
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      alert("Failed to update role: " + error.message)
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
    setUpdating(null)
  }

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.pin_number?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

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

      <div className="relative">
        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by Name, PIN or Email..."
          className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-[#272A6F] transition-all"
        />
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
                <div className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${roleColors[u.role] || 'bg-gray-100 text-gray-500'}`}>
                  {u.role?.replace('_', ' ')}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Change Institutional Role</label>
                <div className="flex items-center space-x-2">
                  <select
                    value={u.role}
                    disabled={updating === u.id}
                    onChange={(e) => updateRole(u.id, e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#272A6F] disabled:opacity-50"
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                  {updating === u.id && <Loader2 className="animate-spin text-[#272A6F]" size={16} />}
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
  const [newTopic, setNewTopic] = useState({ title: '', description: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedSub) fetchTopics(selectedSub)
  }, [selectedSub])

  async function fetchData() {
    let query = supabase.from('subjects').select('*').order('name')
    if (profile?.role === 'hod') query = query.eq('branch', profile.branch)
    
    const { data, error } = await query
    if (error) setDatabaseSyncError(error.message)
    else {
      setSubjects(data || [])
      if (data?.length) setSelectedSub(data[0].id)
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

  async function toggleComplete(id, current) {
    await supabase.from('curriculum').update({ is_completed: !current }).eq('id', id)
    setTopics(t => t.map(x => x.id === id ? { ...x, is_completed: !current } : x))
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#272A6F]" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-[#272A6F] rounded-xl flex items-center justify-center text-white shadow-lg">
          <Layers size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-[#272A6F]">Curriculum Manager</h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Define subject syllabi and track completion</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Select Subject</label>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
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
                    <div>
                      <h5 className={`font-bold text-sm ${t.is_completed ? 'text-green-700' : 'text-[#272A6F]'}`}>{t.title}</h5>
                      <p className="text-xs text-gray-400">{t.description}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleComplete(t.id, t.is_completed)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${t.is_completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
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
