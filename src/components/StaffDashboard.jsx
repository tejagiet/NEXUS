import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Users, UserCheck, Wallet, Activity, TrendingUp, 
  BarChart, PieChart, Loader2, ArrowUpRight, GraduationCap 
} from 'lucide-react'
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'

export default function StaffDashboard({ profile }) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    avgAttendance: 0,
    pendingFees: 0
  })
  const [branchData, setBranchData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGlobalStats()
  }, [])

  async function fetchGlobalStats() {
    setLoading(true)
    try {
      const [students, faculty, attendance, fees] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'faculty'),
        supabase.from('attendance').select('status'),
        supabase.from('profiles').select('transport_fee, academic_fee_paid, transport_fee_paid').eq('role', 'student')
      ])

      const attend = attendance.data || []
      const presentCount = attend.filter(a => a.status === 'present').length
      const avgAtt = attend.length ? Math.round((presentCount / attend.length) * 100) : 0

      const feeData = fees.data || []
      const totalPending = feeData.reduce((acc, s) => acc + (s.transport_fee || 0) - (s.transport_fee_paid || 0), 0)

      setStats({
        totalStudents: students.count || 0,
        totalFaculty: faculty.count || 0,
        avgAttendance: avgAtt,
        pendingFees: totalPending
      })

      // Fetch Branch Distribution for chart
      const { data: branchDist } = await supabase.rpc('get_branch_distribution') 
      // Fallback if RPC doesn't exist yet
      if (!branchDist) {
        const { data: allStudents } = await supabase.from('profiles').select('branch').eq('role', 'student')
        const counts = {}
        allStudents?.forEach(s => {
          if (s.branch) counts[s.branch] = (counts[s.branch] || 0) + 1
        })
        setBranchData(Object.entries(counts).map(([name, value]) => ({ name, value })))
      } else {
        setBranchData(branchDist)
      }

    } catch (err) {
      console.error("Staff Dashboard Fetch Error:", err)
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black text-[#272A6F]">Institutional Overview</h2>
        <p className="text-gray-500 mt-1 uppercase text-[10px] font-black tracking-widest">
          {(profile?.roles || [profile?.role]).filter(Boolean).map(r => r.replace('_', ' ')).join(' & ') || 'Admin'} Command Center
        </p>
      </header>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlobalStatCard label="Total Students" value={stats.totalStudents} icon={Users} color="blue" />
        <GlobalStatCard label="Active Faculty" value={stats.totalFaculty} icon={UserCheck} color="purple" />
        <GlobalStatCard label="Campus Attendance" value={`${stats.avgAttendance}%`} icon={Activity} color="green" />
        <GlobalStatCard label="Revenue Outlook" value={`₹${(stats.pendingFees/100000).toFixed(1)}L`} icon={Wallet} color="gold" sub="Pending Collection" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Branch Distribution Chart */}
        <div className="lg:col-span-2 glass rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-[#272A6F] flex items-center space-x-2">
              <BarChart size={20} className="text-[#EFBE33]" />
              <span>Student Distribution by Branch</span>
            </h3>
            <button onClick={fetchGlobalStats} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
              <ArrowUpRight size={18} className="text-gray-400" />
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={branchData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(39,42,111,0.05)', radius: 10 }}
                  contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={40}>
                  {branchData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#272A6F' : '#EFBE33'} />
                  ))}
                </Bar>
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions / Role Alerts */}
        <div className="space-y-6">
          <div className="glass bg-[#272A6F] text-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <GraduationCap className="mb-4 text-[#EFBE33]" size={32} />
              <h4 className="text-xl font-black mb-2">Academic Integrity</h4>
              <p className="text-white/60 text-xs leading-relaxed">
                Nexus Intelligence is currently monitoring {stats.avgAttendance}% daily attendance across all departments.
              </p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 blur-[50px] group-hover:bg-white/20 transition-all" />
          </div>

          <div className="glass rounded-[2.5rem] p-6 border-l-4 border-[#EFBE33] bg-white shadow-lg">
             <h4 className="font-bold text-[#272A6F] text-sm mb-4">Urgent Actions</h4>
             <div className="space-y-3">
                <ActionItem icon={TrendingUp} label="Review Attendance Shortage" color="red" />
                <ActionItem icon={Wallet} label="Approve Batch Invoices" color="gold" />
                <ActionItem icon={Users} label="Faculty Load Distribution" color="blue" />
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GlobalStatCard({ label, value, icon: Icon, color, sub }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    purple: 'bg-indigo-50 text-indigo-600',
    green:  'bg-emerald-50 text-emerald-600',
    gold:   'bg-amber-50 text-amber-600'
  }
  return (
    <div className="glass bg-white p-6 rounded-[2rem] border border-gray-100 hover:shadow-2xl transition-all group">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${colors[color] || colors.blue} transition-transform group-hover:scale-110`}>
        <Icon size={24} />
      </div>
      <p className="text-3xl font-black text-[#272A6F] tracking-tight">{value}</p>
      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{label}</p>
      {sub && <p className="text-[10px] text-[#EFBE33] font-black mt-2 uppercase">{sub}</p>}
    </div>
  )
}

function ActionItem({ icon: Icon, label, color }) {
  const colors = {
    red: 'bg-red-50 text-red-500',
    gold: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600'
  }
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer group">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={16} />
        </div>
        <span className="text-xs font-bold text-[#272A6F] group-hover:translate-x-1 transition-transform">{label}</span>
      </div>
      <ArrowUpRight size={14} className="text-gray-300 group-hover:text-[#272A6F]" />
    </div>
  )
}
