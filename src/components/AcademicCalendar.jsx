import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Info, Trash2, Loader2, Tent, GraduationCap, PartyPopper } from 'lucide-react'

export default function AcademicCalendar({ profile }) {
  const [date, setDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newEntry, setNewEntry] = useState({ date: '', title: '', type: 'holiday', description: '' })
  
  const isAdmin = ['admin', 'principal'].includes(profile?.role)

  useEffect(() => {
    fetchEvents()
  }, [])

  async function fetchEvents() {
    setLoading(true)
    const { data, error } = await supabase.from('academic_calendar').select('*').order('date')
    if (error) console.error(error)
    else setEvents(data || [])
    setLoading(false)
  }

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()
  const firstDayOfMonth = (y, m) => new Date(y, m, 1).getDay()

  const currentYear = date.getFullYear()
  const currentMonth = date.getMonth()
  const monthName = date.toLocaleString('default', { month: 'long' })

  const prevMonth = () => setDate(new Date(currentYear, currentMonth - 1, 1))
  const nextMonth = () => setDate(new Date(currentYear, currentMonth + 1, 1))

  const calendarDays = []
  const startDay = firstDayOfMonth(currentYear, currentMonth)
  const totalDays = daysInMonth(currentYear, currentMonth)

  // Fill empty slots before the first day
  for (let i = 0; i < startDay; i++) calendarDays.push(null)
  for (let i = 1; i <= totalDays; i++) calendarDays.push(i)

  const getEventsForDay = (day) => {
    if (!day) return []
    const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.date === dStr)
  }

  async function addEntry() {
    if (!newEntry.date || !newEntry.title) return
    const { error } = await supabase.from('academic_calendar').insert(newEntry)
    if (error) alert(error.message)
    else {
      setShowAdd(false); setNewEntry({ date: '', title: '', type: 'holiday', description: '' }); fetchEvents()
    }
  }

  async function deleteEntry(id) {
    if (!confirm('Delete this event?')) return
    await supabase.from('academic_calendar').delete().eq('id', id)
    fetchEvents()
  }

  const typeIcons = {
    holiday: <Tent size={14} className="text-orange-500" />,
    exam: <GraduationCap size={14} className="text-red-500" />,
    event: <PartyPopper size={14} className="text-blue-500" />,
    academic_day: <Info size={14} className="text-gray-500" />
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#272A6F] rounded-xl flex items-center justify-center text-white shadow-lg">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#272A6F]">Academic Calendar</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Holidays, Exams & Events</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(!showAdd)} 
            className="flex items-center space-x-2 px-4 py-2 bg-[#272A6F] text-white rounded-xl text-xs font-black hover:shadow-xl transition-all">
            <Plus size={14} />
            <span>Add Event</span>
          </button>
        )}
      </header>

      {showAdd && (
        <div className="glass rounded-3xl p-6 border-2 border-dashed border-[#272A6F]/10 space-y-4 animate-in slide-in-from-top duration-300">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#272A6F]">New Calendar Entry</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input type="date" value={newEntry.date} onChange={e => setNewEntry({ ...newEntry, date: e.target.value })}
              className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-[#272A6F] outline-none" />
            <input type="text" placeholder="Event Title" value={newEntry.title} onChange={e => setNewEntry({ ...newEntry, title: e.target.value })}
              className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-[#272A6F] outline-none" />
            <select value={newEntry.type} onChange={e => setNewEntry({ ...newEntry, type: e.target.value })}
              className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-[#272A6F] outline-none">
              <option value="holiday">Holiday</option>
              <option value="exam">Exam</option>
              <option value="event">Event</option>
              <option value="academic_day">Academic Day</option>
            </select>
            <button onClick={addEntry} className="bg-[#272A6F] text-white rounded-xl font-black text-xs hover:shadow-lg transition-all h-full min-h-[40px]">Save Event</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Calendar View */}
        <div className="lg:col-span-3 bg-white rounded-[2.5rem] p-6 shadow-xl shadow-[#272A6F]/5 border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-[#272A6F]">{monthName} {currentYear}</h3>
            <div className="flex space-x-2">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={20} /></button>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={20} /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase py-2">{d}</div>
            ))}
            {calendarDays.map((day, i) => {
              const dayEvents = getEventsForDay(day)
              const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear()
              
              return (
                <div key={i} className={`min-h-[100px] border border-gray-50 p-2 transition-all hover:bg-gray-50/50 rounded-xl relative
                  ${day === null ? 'bg-transparent border-none' : ''}
                  ${isToday ? 'bg-blue-50/50 ring-1 ring-inset ring-blue-100' : ''}`}>
                  {day && (
                    <>
                      <span className={`text-xs font-black ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>{day}</span>
                      <div className="mt-1 space-y-1">
                        {dayEvents.map(e => (
                          <div key={e.id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center space-x-1 truncate
                            ${e.type === 'holiday' ? 'bg-orange-100 text-orange-700' : e.type === 'exam' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            <span>{e.title}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend & Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-lg shadow-[#272A6F]/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Legend</p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600"><Tent size={14} /></div>
                <div><p className="text-xs font-bold text-gray-700">Holiday</p><p className="text-[9px] text-gray-400">No classes</p></div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600"><GraduationCap size={14} /></div>
                <div><p className="text-xs font-bold text-gray-700">Examinations</p><p className="text-[9px] text-gray-400">SBTET / Internals</p></div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600"><PartyPopper size={14} /></div>
                <div><p className="text-xs font-bold text-gray-700">Events</p><p className="text-[9px] text-gray-400">College Fests / Workshops</p></div>
              </div>
            </div>
          </div>

          <div className="bg-[#272A6F] rounded-3xl p-6 text-white shadow-xl">
            <h4 className="font-black text-sm mb-4">Upcoming This Month</h4>
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <div className="space-y-4">
                {events.filter(e => {
                  const d = new Date(e.date)
                  return d.getMonth() === currentMonth && d.getFullYear() === currentYear
                }).length === 0 ? (
                  <p className="text-xs text-white/50 italic">No events scheduled.</p>
                ) : (
                  events.filter(e => {
                    const d = new Date(e.date)
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
                  }).map(e => (
                    <div key={e.id} className="flex justify-between items-start border-l-2 border-white/20 pl-3">
                      <div>
                        <p className="text-[10px] font-bold text-white/60 mb-1">{new Date(e.date).toLocaleDateString()}</p>
                        <p className="text-xs font-black">{e.title}</p>
                      </div>
                      {isAdmin && <button onClick={() => deleteEntry(e.id)} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
