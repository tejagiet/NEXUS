import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ToggleLeft, ToggleRight, Save, User2, MessageSquarePlus, Inbox, Loader2, CheckCircle2, Phone, KeyRound, Send, UserPlus, Mail, Lock, BadgeCheck, Trash2, AlertCircle, BookOpen, BookMarked, Layers } from 'lucide-react'

export default function ManagementSuite({ profile }) {
  const [activeTab, setActiveTab] = useState('register')
  const tabs = [
    { id: 'register', label: 'Digital Register', icon: ToggleRight },
    { id: 'profiles', label: 'Profile Editor',   icon: User2 },
    { id: 'feedback', label: 'Nexus Inbox',       icon: Inbox },
    ...(profile?.role === 'admin' ? [
      { id: 'users', label: 'User Creator', icon: UserPlus },
      { id: 'subjects', label: 'Subject Manager', icon: BookMarked }
    ] : []),
  ]
  // Students see a feedback submit tab instead of admin tabs
  if (profile?.role === 'student') {
    return <StudentFeedback profile={profile} />
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-black text-[#272A6F]">Management Suite</h2>
        <p className="text-gray-500 mt-1">Digital register, student profiles, and feedback inbox.</p>
      </header>
      <div className="flex space-x-2 border-b border-gray-200 pb-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center space-x-2 px-5 py-3 text-sm font-bold rounded-t-xl transition-all
              ${activeTab === t.id ? 'bg-white text-[#272A6F] border border-b-0 border-gray-200 -mb-px' : 'text-gray-400 hover:text-gray-600'}`}>
            <t.icon size={16} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="bg-white rounded-b-3xl rounded-tr-3xl border border-gray-200 p-6">
        {activeTab === 'register' && <DigitalRegister profile={profile} />}
        {activeTab === 'profiles' && <ProfileEditor profile={profile} />}
        {activeTab === 'feedback' && <FeedbackInbox profile={profile} />}
        {activeTab === 'users'    && <AdminUserCreator profile={profile} />}
        {activeTab === 'subjects' && <SubjectManager profile={profile} />}
      </div>
    </div>
  )
}

/* ── Digital Register ─────────────────────────────── */
function DigitalRegister({ profile }) {
  const [students,   setStudents]   = useState([])
  const [subjects,   setSubjects]   = useState([])
  const [subject,    setSubject]    = useState('')
  const [section,    setSection]    = useState('A')
  const [marks,      setMarks]      = useState({}) // { studentId: 'present'|'absent' }
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: stu }, { data: sub }] = await Promise.all([
        supabase.from('students').select('id,full_name,pin_number,section,branch').order('pin_number', { ascending: true }),
        supabase.from('subjects').select('*')
      ])
      setStudents(stu || [])
      setSubjects(sub || [])
      if (sub?.length) setSubject(sub[0].id)
      setLoading(false)
    }
    load()

    // 🔄 Auto-Refresh
    const c1 = supabase.channel('reg_stu').on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => load()).subscribe()
    const c2 = supabase.channel('reg_sub').on('postgres_changes', { event: '*', schema: 'public', table: 'subjects' }, () => load()).subscribe()
    
    return () => { supabase.removeChannel(c1); supabase.removeChannel(c2) }
  }, [])

  function toggle(id) {
    setMarks(m => ({ ...m, [id]: m[id] === 'present' ? 'absent' : 'present' }))
  }
  function markAll(status) {
    const all = {}; students.forEach(s => { all[s.id] = status }); setMarks(all)
  }

  async function save() {
    setSaving(true); setSaved(false)
    const rows = Object.entries(marks).map(([student_id, status]) => ({
      student_id, subject_id: subject, status,
      marked_by: profile.id, date: new Date().toISOString().split('T')[0]
    }))
    await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,subject_id,date' })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#272A6F]" /></div>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex space-x-2">
          <select value={subject} onChange={e => setSubject(e.target.value)}
            className="border bg-white border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#272A6F]">
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={section} onChange={e => setSection(e.target.value)}
            className="border bg-white border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#272A6F]">
            {['A', 'B', 'C'].map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => markAll('present')} className="px-3 py-2 text-xs font-bold bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors">All Present</button>
          <button onClick={() => markAll('absent')} className="px-3 py-2 text-xs font-bold bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors">All Absent</button>
        </div>
      </div>
      <div className="space-y-2">
        {(() => {
          const selectedSub = subjects.find(s => s.id === subject)
          const filtered = students.filter(s => s.section === section && s.branch === selectedSub?.branch)
          
          if (filtered.length === 0) return (
            <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
              <p className="text-sm font-bold">No students found in {selectedSub?.branch || ''} Section {section}</p>
            </div>
          )

          return filtered.map(s => {
            const present = marks[s.id] === 'present'
            const absent  = marks[s.id] === 'absent'
            return (
              <div key={s.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${present ? 'bg-green-50 border-green-200' : absent ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                {/* ... existing card content ... */}
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#272A6F]/10 rounded-full flex items-center justify-center text-xs font-bold text-[#272A6F]">
                    {s.full_name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-800">{s.full_name}</p>
                    <p className="font-mono text-xs text-gray-400">{s.pin_number}</p>
                  </div>
                </div>
                <button onClick={() => toggle(s.id)} className="transition-all">
                  {present
                    ? <ToggleRight size={36} className="text-green-500" />
                    : <ToggleLeft  size={36} className={absent ? 'text-red-400' : 'text-gray-300'} />}
                </button>
              </div>
            )
          })
        })()}
      </div>
      <button onClick={save} disabled={saving || Object.keys(marks).length === 0}
        className="w-full flex items-center justify-center space-x-2 bg-[#272A6F] text-white py-3.5 rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50">
        {saving ? <Loader2 className="animate-spin" size={18} /> : saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
        <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Upload Attendance'}</span>
      </button>
    </div>
  )
}

/* ── Profile Editor ───────────────────────────────── */
function ProfileEditor({ profile }) {
  const [students,  setStudents]  = useState([])
  const [selected,  setSelected]  = useState(null)
  const [mobile,    setMobile]    = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('role','student').then(({ data }) => setStudents(data || []))
  }, [])

  function selectStudent(s) {
    setSelected(s); setMobile(s.mobile || '');
  }

  async function saveProfile() {
    if (!selected) return
    setSaving(true)
    await supabase.from('profiles').update({ mobile }).eq('id', selected.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {students.map(s => (
          <button key={s.id} onClick={() => selectStudent(s)}
            className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.id === s.id ? 'bg-[#272A6F] text-white border-[#272A6F]' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'}`}>
            <p className="font-bold text-sm">{s.full_name}</p>
            <p className={`text-xs font-mono ${selected?.id === s.id ? 'text-white/60' : 'text-gray-400'}`}>{s.pin_number}</p>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="space-y-4">
          <h4 className="font-bold text-[#272A6F]">Edit: {selected.full_name}</h4>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mobile Number</label>
            <div className="flex items-center space-x-2">
              <Phone size={16} className="text-gray-400" />
              <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} maxLength={10}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#272A6F]" />
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving}
            className="w-full flex items-center justify-center space-x-2 bg-[#272A6F] text-white py-2.5 rounded-xl font-bold text-sm hover:shadow-lg transition-all">
            {saving ? <Loader2 className="animate-spin" size={16} /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
            <span>{saved ? 'Saved!' : 'Save Changes'}</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center text-gray-300">
          <p>Select a student to edit</p>
        </div>
      )}
    </div>
  )
}

/* ── Feedback Inbox ───────────────────────────────── */
function FeedbackInbox({ profile }) {
  const [feedbacks, setFeedbacks] = useState([])
  const [loading,   setLoading]   = useState(true)

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
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState(null)

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
            {['Academic Concern','Faculty Feedback','Facility Issue','Hostel Complaint','General Suggestion','Other'].map(o =>
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
    </div>
  )
}

/* ── Admin User Creator ─────────────────────────── */
function AdminUserCreator() {
  const ROLES    = ['student', 'faculty', 'admin']
  const BRANCHES = ['CME','ECE','EEE','ME','CIVIL','AI','IT','CSE']
  const SECTIONS = ['A', 'B', 'C']
  const blank    = { full_name: '', email: '', pin_number: '', branch: 'CME', role: 'student', password: '', section: 'A' }

  const [form,    setForm]    = useState(blank)
  const [users,   setUsers]   = useState([])
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { 
    fetchUsers()
    const channel = supabase.channel('user_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchUsers()).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('id,full_name,email,role,pin_number,branch,section').order('created_at', { ascending: false }).limit(80)
    setUsers(data || [])
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
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email.trim(), password: form.password,
        options: { data: { full_name: form.full_name, role: form.role } }
      })
      if (authErr) throw authErr
      const userId = authData.user?.id
      if (userId) {
        await supabase.from('profiles').upsert({
          id: userId, full_name: form.full_name.trim(), email: form.email.trim(),
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
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Full Name *</label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)} required placeholder="e.g. MOLLETI TEJA" autoComplete="off"
              className="w-full h-11 bg-white border-2 border-gray-100 rounded-xl px-4 text-sm font-bold focus:outline-none focus:border-[#272A6F] transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Email *</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={form.email} onChange={e => set('email', e.target.value)} required type="email" placeholder="user@giet.ac.in" autoComplete="off"
                className="w-full h-11 bg-white border-2 border-gray-100 rounded-xl pl-9 pr-4 text-sm font-bold focus:outline-none focus:border-[#272A6F] transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Hall Ticket / PIN</label>
            <input value={form.pin_number} onChange={e => set('pin_number', e.target.value)} placeholder="e.g. 24295-AI-001" autoComplete="off"
              className="w-full h-11 bg-white border-2 border-gray-100 rounded-xl px-4 font-mono text-sm font-bold focus:outline-none focus:border-[#272A6F] transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Temporary Password *</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={form.password} onChange={e => set('password', e.target.value)} required type="password" placeholder="Min. 6 characters" autoComplete="new-password"
                className="w-full h-11 bg-white border-2 border-gray-100 rounded-xl pl-9 pr-4 text-sm font-bold focus:outline-none focus:border-[#272A6F] transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Role *</label>
            <select value={form.role} onChange={e => set('role', e.target.value)}
              className="w-full h-11 border-2 border-gray-100 rounded-xl px-4 text-sm font-bold focus:outline-none focus:border-[#272A6F] bg-white transition-all">
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Branch</label>
            <select value={form.branch} onChange={e => set('branch', e.target.value)}
              className="w-full h-11 border-2 border-gray-100 rounded-xl px-4 text-sm font-bold focus:outline-none focus:border-[#272A6F] bg-white transition-all">
              {BRANCHES.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          {form.role === 'student' && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Section</label>
              <select value={form.section} onChange={e => set('section', e.target.value)}
                className="w-full h-11 border-2 border-gray-100 rounded-xl px-4 text-sm font-bold focus:outline-none focus:border-[#272A6F] bg-white transition-all">
                {SECTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
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
function SubjectManager() {
  const BRANCHES = ['CME','ECE','EEE','ME','CIVIL','AI','IT','CSE']
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
    const [subRes, facRes] = await Promise.all([
      supabase.from('subjects').select('*, profiles(full_name)').order('branch', { ascending: true }),
      supabase.from('profiles').select('id, full_name').eq('role', 'faculty')
    ])
    setSubjects(subRes.data || [])
    setFaculty(facRes.data || [])
    setLoading(false)
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
