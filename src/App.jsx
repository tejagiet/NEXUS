import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import StudentDashboard from './components/StudentDashboard'
import StaffDashboard from './components/StaffDashboard'
import FacultyDashboard from './components/FacultyDashboard'
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
import AcademicCalendar from './components/AcademicCalendar'
import NoticeBoard from './components/NoticeBoard'
import CommunityHub from './components/CommunityHub'
import {
  LayoutDashboard, LogOut, User, ClipboardList, Wallet, Camera,
  GraduationCap, BookOpen, ShieldCheck, Settings, Menu, X, MessageSquare, Calendar, Layers, Megaphone, Users
} from 'lucide-react'

const MENU = {
  student: [
    { id: 'dashboard', label: 'My Dashboard',  icon: LayoutDashboard },
    { id: 'timetable', label: 'Timetable',     icon: Calendar },
    { id: 'calendar',  label: 'Academic Cal',  icon: ClipboardList },
    { id: 'notices',   label: 'Circulars',     icon: Megaphone },
    { id: 'social',    label: 'Community Hub', icon: Users },
    { id: 'sbtet',     label: 'SBTET Results', icon: GraduationCap },
    { id: 'fees',      label: 'Finance',        icon: Wallet },
    { id: 'lms',       label: 'Resources',      icon: BookOpen },
    { id: 'mgmt',      label: 'Feedback',        icon: MessageSquare },
    { id: 'profile',   label: 'My Profile',      icon: User },
  ],
  faculty: [
    { id: 'dashboard',  label: 'My Nexus',       icon: LayoutDashboard },
    { id: 'register',  label: 'Digital Register', icon: ClipboardList },
    { id: 'timetable', label: 'Class Timetable', icon: Calendar },
    { id: 'calendar',  label: 'Calendar',        icon: ClipboardList },
    { id: 'notices',   label: 'Circulars',       icon: Megaphone },
    { id: 'social',    label: 'Community Hub',   icon: Users },
    { id: 'classresults', label: 'Class Results', icon: GraduationCap },
    { id: 'lms',       label: 'Upload Resources', icon: BookOpen },
    { id: 'fees',      label: 'My Finance',       icon: Wallet },
    { id: 'batchfees',    label: 'Finance Batch',  icon: Layers },
    { id: 'mgmt',      label: 'Management',       icon: Settings },
    { id: 'mfa',       label: 'Security (2FA)',    icon: ShieldCheck },
    { id: 'profile',   label: 'My Profile',        icon: User },
  ],
  admin: [
    { id: 'dashboard',    label: 'Overview',       icon: LayoutDashboard },
    { id: 'timetable',    label: 'Global Schedule',icon: Calendar },
    { id: 'register',     label: 'Attendance',     icon: ClipboardList },
    { id: 'calendar',     label: 'Academic Cal',   icon: ClipboardList },
    { id: 'notices',      label: 'Broadcast',       icon: Megaphone },
    { id: 'social',       label: 'Nexus Social',    icon: Users },
    { id: 'classresults', label: 'Class Results',  icon: GraduationCap },
    { id: 'batchfees',    label: 'Finance Batch',  icon: Wallet },
    { id: 'cctv',         label: 'CCTV Monitor',   icon: Camera },
    { id: 'mgmt',         label: 'Management',     icon: Settings },
    { id: 'lms',          label: 'Resources',      icon: BookOpen },
    { id: 'mfa',          label: 'Security (2FA)',   icon: ShieldCheck },
    { id: 'profile',      label: 'My Profile',       icon: User },
  ],
}

// 🏛️ Map Institutional Roles to Base Menus
MENU.principal = MENU.admin
MENU.vice_principal = MENU.admin
MENU.hod = MENU.admin
MENU.class_teacher = MENU.faculty

function RoleView({ tab, profile, prefill, onPrefillClear, setTab }) {
  const userRoles = profile?.roles || [profile?.role] || []
  const isFaculty = userRoles.some(r => r === 'faculty' || r === 'class_teacher')
  const isAdmin = userRoles.some(r => ['admin', 'principal', 'vice_principal', 'hod'].includes(r))

  switch (tab) {
    case 'dashboard':    
      if (isAdmin) return <StaffDashboard profile={profile} />
      if (isFaculty) return <FacultyDashboard profile={profile} setTab={setTab} />
      return <StudentDashboard profile={profile} setTab={setTab} />
    case 'sbtet':        return <SBTETResults profile={profile} />
    case 'fees':         return <FinanceBridge profile={profile} />
    case 'register':     return <FacultyRegister profile={profile} prefill={prefill} onPrefillClear={onPrefillClear} />
    case 'classresults': return <ClassResults profile={profile} />
    case 'batchfees':    return <BatchFees profile={profile} />
    case 'lms':          return <LMSPortal profile={profile} />
    case 'cctv':         return <CCTVMonitor profile={profile} />
    case 'mfa':          return <MFASetup profile={profile} />
    case 'mgmt':         return <ManagementSuite profile={profile} prefill={prefill} onPrefillClear={onPrefillClear} />
    case 'profile':      return <ManagementSuite profile={profile} prefill={{ tab: 'profiles' }} onPrefillClear={onPrefillClear} />
    case 'timetable':    return <SmartTimetable profile={profile} onMarkAttendance={(subId) => onPrefillClear(subId)} />
    case 'calendar':     return <AcademicCalendar profile={profile} />
    case 'notices':      return <NoticeBoard profile={profile} />
    case 'social':       return <CommunityHub profile={profile} />
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

  // 🏛️ Multi-Role Menu Aggregation
  const userRoles = profile?.roles || [profile?.role] || []
  const aggregatedMenu = []
  const seenIds = new Set()

  userRoles.forEach(role => {
    (MENU[role] || []).forEach(item => {
      if (!seenIds.has(item.id)) {
        aggregatedMenu.push(item)
        seenIds.add(item.id)
      }
    })
  })

  // Sort by original priority if needed, but here we just keep the order of roles
  const menu = aggregatedMenu.length > 0 ? aggregatedMenu : (MENU.student) // Fallback

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
        <div className="p-8 border-b border-white/10 text-center">
          <h1 className="text-2xl font-black tracking-tighter">NEXUS <span className="text-[#EFBE33]">GIET</span></h1>
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mt-1">Institutional Intelligence</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] text-white/30 uppercase tracking-widest px-3 mb-3">
            {profile?.roles?.join(' & ') || profile?.role || 'Loading'} Portal
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
                if (p && typeof p === 'object') { 
                  setPrefill(p)
                  setActiveTab('register')
                } else if (typeof p === 'string') {
                  setPrefill({ subjectId: p })
                  setActiveTab('register')
                } else {
                  setPrefill(null)
                }
              }}
              setTab={setActiveTab}
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
