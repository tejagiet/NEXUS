import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  ClipboardList, Clock, CheckCircle2, TrendingUp, 
  Calendar, BookOpen, Loader2, ArrowRight 
} from 'lucide-react'

const SLOT_TIMES = {
  1: '09:30 - 10:15',
  2: '10:15 - 11:00',
  3: '11:00 - 11:45',
  4: '11:45 - 12:30',
  5: '01:15 - 02:15',
  6: '02:15 - 03:15',
  7: '03:15 - 04:15',
}

export default function FacultyDashboard({ profile, setTab }) {
  const [schedule, setSchedule] = useState([])
  const [metrics, setMetrics] = useState({
    avgAtt: 0,
    classesToday: 0,
    syllabusProgress: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFacultyData()
  }, [])

  async function fetchFacultyData() {
    setLoading(true)
    try {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
      
      // 1. Fetch Subjects assigned to this faculty
      const { data: mySubjects } = await supabase.from('subjects').select('id, name').eq('faculty_id', profile.id)
      const subIds = mySubjects?.map(s => s.id) || []

      // 2. Fetch Today's Schedule
      const { data: ttData } = await supabase.from('timetable_slots')
        .select('*, subjects(name, code)')
        .in('subject_id', subIds)
        .eq('day', today)
        .order('slot', { ascending: true })
      
      setSchedule(ttData || [])

      // 3. Fetch Metrics (Avg Attendance across all my subjects)
      const { data: attendRes } = await supabase.from('attendance')
        .select('status')
        .in('subject_id', subIds)
      
      const presentCount = attendRes?.filter(a => a.status === 'present').length || 0
      const totalCount = attendRes?.length || 0
      
      // Fetch Syllabus Progress 
      const { data: curriculum } = await supabase.from('curriculum')
        .select('is_completed')
        .in('subject_id', subIds)
      
      const completed = curriculum?.filter(c => c.is_completed).length || 0
      const prog = curriculum?.length ? Math.round((completed / curriculum.length) * 100) : 0

      setMetrics({
        avgAtt: totalCount ? Math.round((presentCount / totalCount) * 100) : 0,
        classesToday: ttData?.length || 0,
        syllabusProgress: prog
      })

    } catch (err) {
      console.error("Faculty Dashboard Error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="animate-spin text-[#272A6F]" size={40} />
    </div>
  )

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#272A6F]">Faculty Command</h2>
          <p className="text-gray-500 mt-1 capitalize font-medium">Welcome back, Prof. {profile.full_name?.split(' ')[0]}</p>
        </div>
        <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
           <Calendar size={16} className="text-blue-600" />
           <span className="text-xs font-black text-blue-700 uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </header>

      {/* Stats Pulse Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FacultyStatCard label="Live Class Avg" value={`${metrics.avgAtt}%`} icon={TrendingUp} color="blue" />
        <FacultyStatCard label="Today's Sessions" value={metrics.classesToday} icon={Clock} color="gold" />
        <FacultyStatCard label="Syllabus Bloom" value={`${metrics.syllabusProgress}%`} icon={BookOpen} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Agenda */}
        <div className="glass rounded-[2.5rem] p-8 shadow-xl bg-white border border-gray-100">
           <h3 className="font-bold text-[#272A6F] mb-6 flex items-center space-x-2">
             <Calendar size={20} className="text-[#EFBE33]" />
             <span>Today's Sessions</span>
           </h3>
           
           {schedule.length === 0 ? (
             <div className="py-12 text-center text-gray-400">
                <Clock size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium italic">No classes scheduled for today.</p>
             </div>
           ) : (
             <div className="space-y-4">
                {schedule.map(slot => (
                  <div key={slot.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl group hover:bg-[#272A6F] hover:text-white transition-all cursor-pointer"
                    onClick={() => setTab && setTab('register')}>
                     <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm group-hover:bg-white/10">
                           <span className="text-[10px] font-black group-hover:text-white/70">SLOT</span>
                           <span className="text-lg font-black text-[#272A6F] group-hover:text-white leading-none">{slot.slot}</span>
                        </div>
                        <div>
                           <h4 className="font-bold text-sm leading-tight">{slot.subjects?.name}</h4>
                           <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">
                             {slot.branch}-{slot.section} · {SLOT_TIMES[slot.slot]}
                           </p>
                        </div>
                     </div>
                     <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-all mr-2" />
                  </div>
                ))}
             </div>
           )}
        </div>

        {/* Quick Links / Tasks */}
        <div className="space-y-6">
           <div className="glass bg-gradient-to-br from-[#272A6F] to-[#404491] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
              <h3 className="text-xl font-black mb-4">Quick Mark</h3>
              <p className="text-white/60 text-xs mb-6 leading-relaxed">
                 Fast-track your daily duties. Click below to jump directly to the Digital Register to mark today's attendance.
              </p>
              <button onClick={() => setTab && setTab('register')}
                className="bg-[#EFBE33] text-[#272A6F] px-6 py-3 rounded-2xl font-black text-sm hover:shadow-xl transition-all active:scale-95">
                Go to Register
              </button>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
           </div>

           <div className="glass bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
              <h3 className="font-bold text-[#272A6F] mb-6 flex items-center space-x-2">
                 <CheckCircle2 size={20} className="text-[#EFBE33]" />
                 <span>Teaching Checklist</span>
              </h3>
              <div className="space-y-4">
                 <TeachingTask label="Mark attendance for morning slots" checked={metrics.classesToday > 0} />
                 <TeachingTask label="Upload resource for pending topics" checked={metrics.syllabusProgress > 50} />
                 <TeachingTask label="Update weekly syllabus progress" checked={true} />
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

function FacultyStatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    gold:   'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600'
  }
  return (
    <div className="glass bg-white p-6 rounded-[2rem] border border-gray-100 hover:shadow-xl transition-all group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors[color]} group-hover:scale-110 transition-transform`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-black text-[#272A6F] tracking-tight">{value}</p>
      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{label}</p>
    </div>
  )
}

function TeachingTask({ label, checked }) {
  return (
    <div className="flex items-center space-x-3 group cursor-pointer">
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${checked ? 'bg-[#272A6F] border-[#272A6F]' : 'border-gray-200 group-hover:border-[#272A6F]'}`}>
         {checked && <CheckCircle2 size={12} className="text-white" />}
      </div>
      <span className={`text-xs font-bold ${checked ? 'text-gray-400 line-through' : 'text-[#272A6F]'}`}>{label}</span>
    </div>
  )
}
