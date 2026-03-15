import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import StudentDashboard from './components/StudentDashboard'
import FacultyRegister from './components/FacultyRegister'
import FinanceBridge from './components/FinanceBridge'
import CCTVMonitor from './components/CCTVMonitor'
import SBTETResults from './components/SBTETResults'
import ClassResults from './components/ClassResults'
import LMSPortal from './components/LMSPortal'
import MFASetup from './components/MFASetup'
import ProjectStatus from './components/ProjectStatus'
import MFAVerify from './components/MFAVerify'
import ManagementSuite from './components/ManagementSuite'
import SmartTimetable from './components/SmartTimetable'
import BatchFees from './components/BatchFees'
import {
  LayoutDashboard, LogOut, User, ClipboardList, Wallet, Camera,
  GraduationCap, BookOpen, ShieldCheck, Settings, Menu, X, MessageSquare, Calendar
} from 'lucide-react'

const MENU = {
  student: [
    { id: 'dashboard', label: 'My Dashboard',  icon: LayoutDashboard },
    { id: 'timetable', label: 'Timetable',     icon: Calendar },
    { id: 'sbtet',     label: 'SBTET Results', icon: GraduationCap },
    { id: 'fees',      label: 'Finance',        icon: Wallet },
    { id: 'lms',       label: 'Resources',      icon: BookOpen },
    { id: 'mgmt',      label: 'Feedback',        icon: MessageSquare },
  ],
  faculty: [
    { id: 'register',  label: 'Digital Register', icon: ClipboardList },
    { id: 'timetable', label: 'Class Timetable', icon: Calendar },
    { id: 'classresults', label: 'Class Results', icon: GraduationCap },
    { id: 'lms',       label: 'Upload Resources', icon: BookOpen },
    { id: 'mgmt',      label: 'Management',       icon: Settings },
    { id: 'mfa',       label: 'Security (2FA)',    icon: ShieldCheck },
  ],
  admin: [
    { id: 'dashboard',    label: 'Overview',       icon: LayoutDashboard },
    { id: 'timetable',    label: 'Global Schedule',icon: Calendar },
    { id: 'register',     label: 'Attendance',     icon: ClipboardList },
    { id: 'classresults', label: 'Class Results',  icon: GraduationCap },
    { id: 'batchfees',    label: 'Finance Batch',  icon: Wallet },
    { id: 'cctv',         label: 'CCTV Monitor',   icon: Camera },
    { id: 'mgmt',         label: 'Management',     icon: Settings },
    { id: 'lms',          label: 'Resources',      icon: BookOpen },
    { id: 'mfa',          label: 'Security (2FA)',   icon: ShieldCheck },
  ],
}

function RoleView({ tab, profile, prefill, onPrefillClear }) {
  const isStaff = profile?.role === 'faculty' || profile?.role === 'admin'
  switch (tab) {
    case 'dashboard':    return isStaff ? <ProjectStatus /> : <StudentDashboard profile={profile} />
    case 'sbtet':        return <SBTETResults profile={profile} />
    case 'fees':         return <FinanceBridge profile={profile} />
    case 'register':     return <FacultyRegister profile={profile} prefill={prefill} onPrefillClear={onPrefillClear} />
    case 'classresults': return <ClassResults profile={profile} />
    case 'batchfees':    return <BatchFees profile={profile} />
    case 'lms':          return <LMSPortal profile={profile} />
    case 'cctv':         return <CCTVMonitor profile={profile} />
    case 'mfa':          return <MFASetup profile={profile} />
    case 'mgmt':         return <ManagementSuite profile={profile} prefill={prefill} onPrefillClear={onPrefillClear} />
    case 'timetable':    return <SmartTimetable profile={profile} onMarkAttendance={(subId) => onPrefillClear(subId)} />
    default:             return null
  }
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(localStorage.getItem('nexus_active_tab'))
  const [needsMFA, setNeedsMFA] = useState(false)
  const [prefill, setPrefill] = useState(null) // { subjectId }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setProfile(null); setNeedsMFA(false); return }
    
    // 🛡️ Security Check: MFA Enforcement
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      if (data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2') {
        setNeedsMFA(true)
      }
    })

    supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => {
        setProfile(data)
        if (!activeTab) {
          const initial = data?.role === 'student' ? 'dashboard' : 'dashboard'
          setActiveTab(initial)
        }
      })
  }, [session])

  useEffect(() => {
    if (activeTab) localStorage.setItem('nexus_active_tab', activeTab)
  }, [activeTab])

  if (!session) return <Auth />
  if (needsMFA) return <MFAVerify onVerify={() => setNeedsMFA(false)} />

  const menu = MENU[profile?.role] || []

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile toggle */}
      <button
        onClick={() => setSidebarOpen(o => !o)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#272A6F] text-white rounded-xl shadow-lg"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col
        bg-gradient-to-b from-[#272A6F] to-[#1e2159] text-white shadow-2xl
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>

        {/* Brand */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#EFBE33] rounded-xl flex items-center justify-center font-black text-[#272A6F] text-lg shadow-lg">
              NG
            </div>
            <div>
              <h1 className="font-black text-lg leading-none">Nexus GIET</h1>
              <p className="text-[10px] text-white/50 tracking-widest uppercase mt-0.5">Polytechnic ERP</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] text-white/30 uppercase tracking-widest px-3 mb-3">
            {profile?.role || 'Loading'} Portal
          </p>
          {menu.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false) }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${activeTab === item.id
                  ? 'bg-[#EFBE33] text-[#272A6F] shadow-lg shadow-[#EFBE33]/20 font-bold'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Profile */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <User size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{profile?.full_name || session.user.email}</p>
              <p className="text-[11px] text-[#EFBE33] capitalize font-medium">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 lg:ml-64 min-h-screen p-4 lg:p-10">
        <div className="max-w-6xl mx-auto">
          {profile && activeTab && (
            <RoleView 
              tab={activeTab} 
              profile={profile} 
              prefill={prefill}
              onPrefillClear={(p) => {
                if (typeof p === 'string') { // Jumping TO Attendance
                  setPrefill({ subjectId: p })
                  setActiveTab(profile.role === 'admin' ? 'register' : 'register') // register is correct for both
                } else {
                  setPrefill(null)
                }
              }}
            />
          )}
          {!profile && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#272A6F] border-t-[#EFBE33] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading your profile...</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
