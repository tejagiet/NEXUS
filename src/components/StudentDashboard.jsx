import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts'
import { TrendingUp, AlertCircle, CalendarCheck, BookOpen, Loader2, Zap } from 'lucide-react'

export default function StudentDashboard({ profile }) {
  const [attendance, setAttendance]  = useState([])
  const [loading,    setLoading]     = useState(true)
  const [pulse,      setPulse]       = useState(false)

  useEffect(() => {
    fetchAttendance()

    // Antigravity: Real-time listener — bar grows when faculty marks present
    const channel = supabase.channel('rt-attendance')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'attendance',
        filter: `student_id=eq.${profile.id}`
      }, () => {
        setPulse(true)
        setTimeout(() => setPulse(false), 2000)
        fetchAttendance()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile.id])

  async function fetchAttendance() {
    const { data } = await supabase
      .from('attendance')
      .select('status, subjects(name)')
      .eq('student_id', profile.id)

    if (data) {
      const grouped = {}
      data.forEach(r => {
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
    setLoading(false)
  }

  const overall = attendance.length
    ? Math.round(attendance.reduce((a, b) => a + b.percentage, 0) / attendance.length)
    : 0
  const shortage = attendance.filter(s => s.percentage < 75)

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
    <div className={`space-y-8 transition-all duration-300 ${pulse ? 'scale-[1.005]' : ''}`}>
      {/* Real-time pulse banner */}
      {pulse && (
        <div className="flex items-center space-x-3 bg-[#EFBE33] text-[#272A6F] px-5 py-3 rounded-2xl font-bold animate-pulse shadow-lg shadow-[#EFBE33]/30">
          <Zap size={18} />
          <span className="text-sm">⚡ Attendance just updated in real-time!</span>
        </div>
      )}

      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-[#272A6F]">My Dashboard</h2>
          <p className="text-gray-500 mt-1">Good evening, {profile.full_name?.split(' ')[0] || 'Cadet'}</p>
        </div>
        <span className="hidden md:block font-mono bg-[#272A6F]/10 text-[#272A6F] text-sm font-bold px-4 py-2 rounded-xl">
          {profile.pin_number || 'PIN N/A'}
        </span>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Overall Attendance" value={`${overall}%`} icon={TrendingUp}
          alert={overall < 75} color="blue" />
        <StatCard label="Subjects" value={attendance.length} icon={BookOpen} color="purple" />
        <StatCard label="Classes Today" value="—" icon={CalendarCheck} color="gold" />
        <StatCard label="Shortage Alert" value={shortage.length} icon={AlertCircle}
          alert={shortage.length > 0} color="red" />
      </div>

      {/* Shortage Warning */}
      {shortage.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3">
          <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-red-700 text-sm">Attendance Shortage Warning</p>
            <p className="text-red-600 text-xs mt-1">
              {shortage.map(s => `${s.name} (${s.percentage}%)`).join(' · ')} — below 75% threshold
            </p>
          </div>
        </div>
      )}

      {/* Bar Chart */}
      <div className="glass rounded-3xl p-6 md:p-8 shadow-xl">
        <h3 className="font-bold text-[#272A6F] mb-6 flex items-center space-x-2">
          <BarChart size={20} className="text-[#EFBE33]" />
          <span>Subject-Wise Attendance</span>
          <span className="ml-auto text-xs font-normal text-gray-400">Live via Supabase Realtime</span>
        </h3>
        {attendance.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-300">
            <div className="text-center">
              <BarChart size={48} className="mx-auto mb-2 opacity-30" />
              <p>No attendance records yet</p>
            </div>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendance} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v.split(' ').slice(-1)[0]} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(39,42,111,0.04)', radius: 8 }} />
                <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '75%', position: 'right', fontSize: 10, fill: '#ef4444' }} />
                <Bar dataKey="percentage" radius={[10, 10, 0, 0]} barSize={48}>
                  {attendance.map((entry, i) => (
                    <Cell key={i} fill={entry.percentage >= 75 ? '#272A6F' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
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
