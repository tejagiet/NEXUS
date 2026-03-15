import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts'
import { TrendingUp, AlertCircle, CalendarCheck, BookOpen, Loader2, Zap } from 'lucide-react'

export default function StudentDashboard({ profile, setTab }) {
  const [attendance, setAttendance]  = useState([])
  const [loading,    setLoading]     = useState(true)
  const [pulse,      setPulse]       = useState(false)
  const [schedule,   setSchedule]    = useState([])
  const [feeStatus,  setFeeStatus]   = useState({ total: 0, paid: 0 })

  useEffect(() => {
    fetchDashboardData()

    const channel = supabase.channel('rt-attendance')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'attendance',
        filter: `student_id=eq.${profile.id}`
      }, () => {
        setPulse(true)
        setTimeout(() => setPulse(false), 2000)
        fetchDashboardData()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile.id])

  async function fetchDashboardData() {
    setLoading(true)
    try {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
      
      const [attendRes, ttRes, profileRes] = await Promise.all([
        supabase.from('attendance').select('status, subjects(name)').eq('student_id', profile.id),
        supabase.from('timetable_slots').select('*, subjects(name, code)')
          .eq('branch', profile.branch)
          .eq('semester', 'Sem 4') // Default sem for now
          .eq('section', profile.section)
          .eq('day', today)
          .order('slot', { ascending: true }),
        supabase.from('profiles').select('academic_fee, transport_fee, academic_fee_paid, transport_fee_paid').eq('id', profile.id).single()
      ])

      // Attendance Processing
      if (attendRes.data) {
        const grouped = {}
        attendRes.data.forEach(r => {
          const name = r.subjects?.name || 'Unknown'
          if (!grouped[name]) grouped[name] = { name, present: 0, total: 0 }
          grouped[name].total++
          if (r.status === 'present') grouped[name].present++
        })
        setAttendance(Object.values(grouped).map(g => ({
          ...g,
          percentage: g.total ? Math.round((g.present / g.total) * 100) : 0
        })))
      }

      setSchedule(ttRes.data || [])
      
      if (profileRes.data) {
        setFeeStatus({
          total: (profileRes.data.academic_fee || 0) + (profileRes.data.transport_fee || 0),
          paid: (profileRes.data.academic_fee_paid || 0) + (profileRes.data.transport_fee_paid || 0)
        })
      }

    } catch (err) {
      console.error("Dashboard Fetch Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const overall = attendance.length
    ? Math.round(attendance.reduce((a, b) => a + b.percentage, 0) / attendance.length)
    : 0
  const shortage = attendance.filter(s => s.percentage < 75)
  const balance = feeStatus.total - feeStatus.paid

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xl">
        <p className="font-bold text-[#272A6F] text-sm mb-1">{d.name}</p>
        <p className="text-2xl font-black" style={{ color: d.percentage >= 75 ? '#272A6F' : '#ef4444' }}>{d.percentage}%</p>
        <p className="text-xs text-gray-400">{d.present}/{d.total} classes attended</p>
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-[#272A6F] border-t-[#EFBE33] rounded-full animate-spin" />
    </div>
  )

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 ${pulse ? 'scale-[1.002]' : ''}`}>
      {/* Real-time pulse banner */}
      {pulse && (
        <div className="flex items-center space-x-3 bg-[#EFBE33] text-[#272A6F] px-5 py-3 rounded-2xl font-bold animate-pulse shadow-lg shadow-[#EFBE33]/30">
          <Zap size={18} />
          <span className="text-sm">⚡ Attendance just updated in real-time!</span>
        </div>
      )}

      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-[#272A6F]">My Nexus</h2>
          <p className="text-gray-500 mt-1 font-medium capitalize">Welcome back, {profile.full_name?.split(' ')[0]}</p>
        </div>
        <div className="hidden md:flex flex-col items-end">
          <span className="font-mono bg-[#272A6F]/10 text-[#272A6F] text-xs font-black px-4 py-2 rounded-xl">
            {profile.pin_number || 'PIN N/A'}
          </span>
          <p className="text-[10px] font-black text-[#EFBE33] uppercase mt-2 tracking-widest">{profile.branch} Department</p>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Live Attendance" value={`${overall}%`} icon={TrendingUp}
          alert={overall < 75} color="blue" />
        <StatCard label="Fee Balance" value={`₹${balance}`} icon={Wallet} 
          alert={balance > 0} color="gold" />
        <StatCard label="Classes Today" value={schedule.length} icon={CalendarCheck} color="purple" />
        <StatCard label="Course Pulse" value={`${attendance.length} Subs`} icon={BookOpen} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Attendance Chart */}
        <div className="lg:col-span-2 glass rounded-[2.5rem] p-6 md:p-8 shadow-xl bg-white">
          <h3 className="font-bold text-[#272A6F] mb-6 flex items-center space-x-2">
            <BarChart size={20} className="text-[#EFBE33]" />
            <span>Attendance Breakdown</span>
          </h3>
          {attendance.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-300">
              <div className="text-center">
                <BarChart size={48} className="mx-auto mb-2 opacity-30" />
                <p>No records found</p>
              </div>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v.length > 8 ? v.substring(0, 8) + '...' : v} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(39,42,111,0.03)', radius: 10 }} />
                  <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="3 3" />
                  <Bar dataKey="percentage" radius={[8, 8, 0, 0]} barSize={40}>
                    {attendance.map((entry, i) => (
                      <Cell key={i} fill={entry.percentage >= 75 ? '#272A6F' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Today's Agenda */}
        <div className="glass rounded-[2.5rem] p-6 md:p-8 shadow-xl bg-[#272A6F] text-white">
           <h3 className="font-bold mb-6 flex items-center space-x-2">
             <Clock size={20} className="text-[#EFBE33]" />
             <span>Today's Agenda</span>
           </h3>
           <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {schedule.length === 0 ? (
                <p className="text-white/40 text-xs italic">No classes for today</p>
              ) : (
                schedule.map((slot, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                     <div className="text-center">
                        <p className="text-[10px] font-black text-white/50">SLOT</p>
                        <p className="text-xl font-black text-[#EFBE33] leading-none">{slot.slot}</p>
                     </div>
                     <div className="flex-1">
                        <p className="text-xs font-bold leading-tight">{slot.subjects?.name}</p>
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-tighter mt-1">{SLOT_TIMES[slot.slot]}</p>
                     </div>
                  </div>
                ))
              )}
           </div>
           <button onClick={() => setTab && setTab('timetable')}
             className="w-full mt-6 py-3 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">
             Full Schedule
           </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, alert, color }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    gold:   { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
    red:    { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-200' },
  }
  const c = (alert && color === 'red') ? colors.red : colors[color] || colors.blue
  return (
    <div className={`glass border ${c.border} rounded-2xl p-4`}>
      <div className={`w-8 h-8 ${c.bg} rounded-lg flex items-center justify-center mb-3`}>
        <Icon size={16} className={c.text} />
      </div>
      <p className="text-xl font-black text-[#272A6F]">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}
