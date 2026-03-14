import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ToggleLeft, ToggleRight, Save, User2, MessageSquarePlus, Inbox, Loader2, CheckCircle2, Phone, KeyRound, Send } from 'lucide-react'

export default function ManagementSuite({ profile }) {
  const [activeTab, setActiveTab] = useState('register')
  const tabs = [
    { id: 'register', label: 'Digital Register', icon: ToggleRight },
    { id: 'profiles', label: 'Profile Editor',   icon: User2 },
    { id: 'feedback', label: 'Nexus Inbox',       icon: Inbox },
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
      </div>
    </div>
  )
}

/* ── Digital Register ─────────────────────────────── */
function DigitalRegister({ profile }) {
  const [students,   setStudents]   = useState([])
  const [subjects,   setSubjects]   = useState([])
  const [subject,    setSubject]    = useState('')
  const [marks,      setMarks]      = useState({}) // { studentId: 'present'|'absent' }
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: stu }, { data: sub }] = await Promise.all([
        supabase.from('profiles').select('id,full_name,pin_number').eq('role', 'student'),
        supabase.from('subjects').select('*')
      ])
      setStudents(stu || [])
      setSubjects(sub || [])
      if (sub?.length) setSubject(sub[0].id)
      setLoading(false)
    }
    load()
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
        <select value={subject} onChange={e => setSubject(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#272A6F]">
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="flex space-x-2">
          <button onClick={() => markAll('present')} className="px-3 py-2 text-xs font-bold bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors">All Present</button>
          <button onClick={() => markAll('absent')} className="px-3 py-2 text-xs font-bold bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors">All Absent</button>
        </div>
      </div>
      <div className="space-y-2">
        {students.map(s => {
          const present = marks[s.id] === 'present'
          const absent  = marks[s.id] === 'absent'
          return (
            <div key={s.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${present ? 'bg-green-50 border-green-200' : absent ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
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
        })}
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
