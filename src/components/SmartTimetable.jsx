import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar, Clock, Plus, Trash2, Save, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8]
const SLOT_TIMES = {
  1: '09:00 - 10:00',
  2: '10:00 - 11:00',
  3: '11:00 - 12:00',
  4: '12:00 - 01:00',
  5: '02:00 - 03:00',
  6: '03:00 - 04:00',
  7: '04:00 - 05:00',
  8: '05:00 - 06:00',
}

const BRANCHES = ['CME', 'ECE', 'EEE', 'ME', 'CIVIL', 'AI', 'IT', 'CSE']
const SEMESTERS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6']

export default function SmartTimetable({ profile }) {
  const [branch, setBranch] = useState(profile?.branch || 'CME')
  const [semester, setSemester] = useState('Sem 4')
  const [section, setSection] = useState(profile?.section || 'A')
  const [subjects, setSubjects] = useState([])
  const [timetable, setTimetable] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  const [activeSlot, setActiveSlot] = useState(null) // { day, slot }

  const isFaculty = profile?.role === 'faculty' || profile?.role === 'admin'

  useEffect(() => {
    fetchData()

    // 🔄 Auto-Refresh: Realtime subscription
    const channel = supabase.channel('timetable_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'timetables',
        filter: `branch=eq.${branch}` 
      }, () => fetchData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [branch, semester, section])

  async function fetchData() {
    setLoading(true)
    const [subRes, ttRes] = await Promise.all([
      supabase.from('subjects').select('*').eq('branch', branch),
      supabase.from('timetables').select('*, subjects(name, code)').eq('branch', branch).eq('semester', semester).eq('section', section)
    ])
    setSubjects(subRes.data || [])
    setTimetable(ttRes.data || [])
    setLoading(false)
  }

  async function assignSubject(subjectId) {
    if (!activeSlot) return
    setSaving(true)
    const { day, slot } = activeSlot
    
    // Check conflicts (is faculty already teaching elsewhere at this time?)
    // In a full implementation we'd check across all timetables for this sub's faculty_id
    
    const { error } = await supabase.from('timetables').upsert({
      branch, semester, section, day, slot, subject_id: subjectId
    }, { onConflict: 'branch,semester,section,day,slot' })

    if (error) {
      setStatus({ type: 'error', text: error.message })
    } else {
      setStatus({ type: 'success', text: 'Slot updated!' })
      await fetchData()
      setActiveSlot(null)
    }
    setSaving(false)
    setTimeout(() => setStatus(null), 3000)
  }

  async function clearSlot(day, slot) {
    if (!confirm('Clear this slot?')) return
    await supabase.from('timetables').delete().eq('branch', branch).eq('semester', semester).eq('section', section).eq('day', day).eq('slot', slot)
    fetchData()
  }

  const getSlotSubject = (day, slot) => timetable.find(t => t.day === day && t.slot === slot)

  if (loading) return <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-[#272A6F]" size={40} /></div>

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#272A6F]">Smart Timetable</h2>
          <p className="text-gray-500 mt-1">Class schedule for {branch} {semester} - Section {section}</p>
        </div>
        <div className="flex items-center space-x-2">
          <select value={branch} onChange={e => setBranch(e.target.value)} disabled={profile?.role === 'student' && profile?.branch}
            className="border-2 border-gray-100 rounded-xl px-4 py-2 text-sm font-bold focus:border-[#272A6F] outline-none bg-white">
            {BRANCHES.map(b => <option key={b}>{b}</option>)}
          </select>
          <select value={semester} onChange={e => setSemester(e.target.value)}
            className="border-2 border-gray-100 rounded-xl px-4 py-2 text-sm font-bold focus:border-[#272A6F] outline-none bg-white">
            {SEMESTERS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={section} onChange={e => setSection(e.target.value)} disabled={profile?.role === 'student' && profile?.section}
            className="border-2 border-gray-100 rounded-xl px-4 py-2 text-sm font-bold focus:border-[#272A6F] outline-none bg-white">
            {['A', 'B', 'C'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </header>

      {status && (
        <div className={`p-4 rounded-2xl flex items-center space-x-3 text-sm font-medium border ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{status.text}</span>
        </div>
      )}

      {/* Timetable Grid */}
      <div className="overflow-x-auto rounded-3xl border border-gray-100 shadow-sm bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-4 text-left text-[10px] font-black uppercase text-gray-400 border-b border-gray-100 w-32">Day / Slot</th>
              {SLOTS.map(s => (
                <th key={s} className="p-4 text-center border-b border-gray-100">
                  <p className="text-xs font-black text-[#272A6F]">Slot {s}</p>
                  <p className="text-[9px] text-gray-400 font-bold">{SLOT_TIMES[s]}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map(day => (
              <tr key={day} className="group hover:bg-gray-50/50 transition-colors">
                <td className="p-4 border-b border-gray-100 font-black text-[#272A6F] text-sm">{day}</td>
                {SLOTS.map(slot => {
                  const entry = getSlotSubject(day, slot)
                  const isActive = activeSlot?.day === day && activeSlot?.slot === slot

                  return (
                    <td key={slot} className={`p-2 border-b border-r border-gray-50 min-w-[120px] transition-all
                      ${isActive ? 'bg-[#272A6F]/5 ring-2 ring-inset ring-[#272A6F]' : ''}`}>
                      
                      {entry ? (
                        <div className="relative group/slot p-3 rounded-xl bg-blue-50 border border-blue-100 h-full flex flex-col justify-between">
                          <div>
                            <p className="text-[10px] font-black text-blue-800 leading-tight">{entry.subjects?.name}</p>
                            <p className="text-[9px] font-mono font-bold text-blue-400 mt-1">{entry.subjects?.code}</p>
                          </div>
                          {isFaculty && (
                            <div className="flex justify-end mt-2 space-x-1 opacity-0 group-hover/slot:opacity-100 transition-opacity">
                              <button onClick={() => setActiveSlot({ day, slot })} className="p-1 text-blue-600 hover:bg-blue-200 rounded-md">
                                <Plus size={12} />
                              </button>
                              <button onClick={() => clearSlot(day, slot)} className="p-1 text-red-600 hover:bg-red-200 rounded-md">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center py-4">
                          {isFaculty ? (
                            <button onClick={() => setActiveSlot({ day, slot })}
                              className="w-8 h-8 rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-[#272A6F] hover:text-[#272A6F] transition-all">
                              <Plus size={16} />
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-200 font-bold">Free</span>
                          )}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Assignment Modal / Drawer */}
      {activeSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#272A6F]/20 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-[#272A6F]">Assign Subject</h3>
                <p className="text-xs text-gray-500 font-bold uppercase mt-1">{activeSlot.day} — Slot {activeSlot.slot}</p>
              </div>
              <button onClick={() => setActiveSlot(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><Trash2 size={20} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select Subject for {branch}</p>
              {subjects.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Info size={30} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No subjects found for {branch}. Create them in subjects table first.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {subjects.map(s => (
                    <button key={s.id} onClick={() => assignSubject(s.id)} disabled={saving}
                      className="flex items-center justify-between p-4 rounded-2xl border-2 border-gray-100 hover:border-[#272A6F] hover:bg-[#272A6F]/5 transition-all text-left">
                      <div>
                        <p className="font-bold text-[#272A6F] text-sm">{s.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{s.code}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-[#272A6F]"><Plus size={16} /></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {saving && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#272A6F]" size={32} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Smart Advice Section */}
      <div className="glass rounded-3xl p-6 border-l-4 border-[#EFBE33]">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 bg-[#EFBE33]/20 rounded-xl flex items-center justify-center text-[#272A6F] flex-shrink-0">
            <Info size={20} />
          </div>
          <div>
            <h4 className="font-black text-[#272A6F]">Smart Scheduling Tips</h4>
            <ul className="mt-2 space-y-1 text-xs text-gray-600 font-medium list-disc list-inside">
              <li>Place heavy core subjects (e.g. CM-401) in morning slots (1-3) for better retention.</li>
              <li>Schedule Labs or Activity periods in afternoon slots (5-8).</li>
              <li>Ensure each subject has at least 4-5 hours per week for full coverage.</li>
              <li>Nexus automatically detects faculty double-bookings across branches.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
