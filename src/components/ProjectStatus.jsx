import React from 'react'
import { CheckCircle2, Zap, ShieldCheck, Database, Layout, Clock, BarChart3, Cloud, Filter, Lock } from 'lucide-react'

const PHASES = [
  { id: 1,  title: "Scraper Foundation", icon: Cloud, desc: "SBTET portal integration via Supabase Edge Functions." },
  { id: 2,  title: "Individual Result View", icon: BarChart3, desc: "Grade-wise breakdown and GPA calculation for single PINs." },
  { id: 3,  title: "Batch Result Hub", icon: Layout, desc: "Class-66 feature with PIN range fetching and stats." },
  { id: 4,  title: "Debugging & Hardening", icon: Zap, desc: "CORS fixes, 403/404 resolution, and error resilience." },
  { id: 5,  title: "Batch Registration", icon: Database, desc: "Automated student database creation from result data." },
  { id: 6,  title: "Faculty Dashboard", icon: Filter, desc: "Pass/Fail grouping and multi-level sorting for class hubs." },
  { id: 7,  title: "Data Perfection", icon: CheckCircle2, desc: "Internal/External breakdown and subject-wise accuracy." },
  { id: 8,  title: "Strict Result Logic", icon: ShieldCheck, desc: "Enforcing FAIL status for missing GPA entries." },
  { id: 9,  title: "Final Result Polish", icon: CheckCircle2, desc: "Handling 'P' and 'N' grades and finalized logic." },
  { id: 10, title: "Storage & Resources", icon: Database, desc: "Master CSV export and student resource buckets." },
  { id: 11, title: "User Management", icon: Layout, desc: "Admin User Creator and profile management." },
  { id: 12, title: "Subject Management", icon: Filter, desc: "Dynamic subject creation and assignment tools." },
  { id: 13, title: "Admin Role Fix", icon: ShieldCheck, desc: "Fixed dynamic role assignments and RLS recursion." },
  { id: 14, title: "Multi-Section Support", icon: Layout, desc: "A, B, C section filtering for students and timetables." },
  { id: 15, title: "Realtime & Google Auth", icon: Zap, desc: "Google OAuth integration and live data subscriptions." },
  { id: 16, title: "Admin 2FA Protection", icon: Lock, desc: "MFA enforcement with TOTP for administrative accounts." },
  { id: 17, title: "Attendance Linkage", icon: Clock, desc: "Connecting Timetable slots to Digital Register for 1-click marking." },
]

export default function ProjectStatus() {
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-black text-[#272A6F]">Nexus GIET Evolution</h2>
        <p className="text-gray-500 mt-1">Live project status and development timeline across 17 technical phases.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {PHASES.map((p) => {
          const Icon = p.icon
          return (
            <div key={p.id} className="group relative bg-white border border-indigo-100 p-6 rounded-[2.5rem] overflow-hidden transition-all hover:scale-[1.03] hover:shadow-[0_20px_50px_rgba(39,42,111,0.1)] cursor-default">
              {/* Background gradient effect */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/5 blur-[60px] group-hover:bg-indigo-500/15 transition-all" />
              
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <Icon className="text-indigo-400 group-hover:text-indigo-600 transition-colors" size={24} />
                </div>
                <span className="text-[10px] font-black tracking-widest text-[#272A6F]/20 uppercase">Phase {p.id.toString().padStart(2, '0')}</span>
              </div>

              <h4 className="text-lg font-bold text-[#272A6F] mb-2">{p.title}</h4>
              <p className="text-sm text-gray-400 leading-relaxed min-h-[3rem] line-clamp-2 italic">
                {p.desc}
              </p>

              <div className="mt-6 flex items-center space-x-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-green-600 uppercase tracking-tighter">Verified & Stable</span>
              </div>

              {/* Decorative accent */}
              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <CheckCircle2 size={16} className="text-indigo-600/20" />
              </div>
            </div>
          )
        })}
      </div>

      <div className="glass bg-white/5 border-white/10 p-8 rounded-[3rem] text-center mt-12">
        <h3 className="text-xl font-bold text-white mb-2">Build Integrity: 100%</h3>
        <p className="text-gray-400 text-sm max-w-lg mx-auto">
          All phases have been successfully deployed to the production environment on Supabase Cloud. 
          Real-time subscriptions are active for high-concurrency academic management.
        </p>
      </div>
    </div>
  )
}
