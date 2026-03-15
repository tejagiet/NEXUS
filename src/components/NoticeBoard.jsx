import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Bell, Plus, Trash2, Mail, Users, Filter, Loader2, Megaphone, FileText, Send, X } from 'lucide-react'

export default function NoticeBoard({ profile }) {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newNotice, setNewNotice] = useState({ title: '', content: '', target_role: 'ALL', target_branch: 'ALL' })
  const [saving, setSaving] = useState(false)

  const canPost = ['admin', 'principal', 'hod', 'faculty'].includes(profile?.role)

  useEffect(() => {
    fetchNotices()
  }, [])

  async function fetchNotices() {
    setLoading(true)
    const { data, error } = await supabase.from('notices').select('*, profiles(full_name, role)').order('created_at', { ascending: false })
    if (error) console.error(error)
    else setNotices(data || [])
    setLoading(false)
  }

  async function postNotice(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('notices').insert({
      ...newNotice,
      author_id: profile.id
    })
    if (error) alert(error.message)
    else {
      setShowAdd(false); setNewNotice({ title: '', content: '', target_role: 'ALL', target_branch: 'ALL' }); fetchNotices()
    }
    setSaving(false)
  }

  async function deleteNotice(id) {
    if (!confirm('Delete this notice?')) return
    await supabase.from('notices').delete().eq('id', id)
    fetchNotices()
  }

  // Filter notices for students
  const filteredNotices = notices.filter(n => {
    if (profile.role === 'admin' || profile.role === 'principal') return true
    if (n.target_role !== 'ALL' && n.target_role !== profile.role) return false
    if (n.target_branch !== 'ALL' && n.target_branch !== profile.branch) return false
    return true
  })

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#272A6F] rounded-xl flex items-center justify-center text-white shadow-lg">
            <Megaphone size={20} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-[#272A6F]">Official Notices</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest px-1">Campus Announcements & Circulars</p>
          </div>
        </div>
        {canPost && (
          <button onClick={() => setShowAdd(!showAdd)} 
            className="flex items-center space-x-2 px-6 py-3 bg-[#272A6F] text-white rounded-2xl text-sm font-black hover:shadow-2xl transition-all active:scale-95">
            {showAdd ? <X size={18} /> : <Plus size={18} />}
            <span>{showAdd ? 'Close' : 'Post New Notice'}</span>
          </button>
        )}
      </header>

      {showAdd && (
        <form onSubmit={postNotice} className="glass rounded-[2rem] p-8 space-y-6 border-2 border-dashed border-[#272A6F]/20 animate-in slide-in-from-top duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Notice Title</label>
                <input required value={newNotice.title} onChange={e => setNewNotice({ ...newNotice, title: e.target.value })}
                  placeholder="e.g. Mid-Term Exam Rescheduled"
                  className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:border-[#272A6F] outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Target Role</label>
                  <select value={newNotice.target_role} onChange={e => setNewNotice({ ...newNotice, target_role: e.target.value })}
                    className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#272A6F]">
                    <option value="ALL">All Users</option>
                    <option value="student">Students Only</option>
                    <option value="faculty">Faculty Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Target Branch</label>
                  <select value={newNotice.target_branch} onChange={e => setNewNotice({ ...newNotice, target_branch: e.target.value })}
                    className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#272A6F]">
                    <option value="ALL">All Branches</option>
                    {['CME','ECE','EEE','ME','CIVIL','AI','IT','CSE'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Notice Content</label>
              <textarea required value={newNotice.content} onChange={e => setNewNotice({ ...newNotice, content: e.target.value })}
                placeholder="Write detailed notice here..." rows={6}
                className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:border-[#272A6F] outline-none transition-all resize-none" />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full h-14 bg-[#272A6F] text-white rounded-2xl font-black text-sm flex items-center justify-center space-x-2 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50">
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            <span>Broadcast Notice</span>
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#272A6F]" size={40} /></div>
      ) : filteredNotices.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
          <Bell size={48} className="mx-auto mb-4 text-gray-100" />
          <p className="text-gray-400 font-black text-lg">No active notices for you.</p>
          <p className="text-gray-300 text-sm">Official announcements will appear here once posted.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
          {filteredNotices.map(n => (
            <div key={n.id} className="group relative bg-white border-2 border-gray-50 rounded-[2.5rem] p-8 hover:border-[#272A6F]/20 transition-all hover:shadow-2xl hover:shadow-[#272A6F]/5">
              <div className="flex justify-between items-start mb-6">
                <div className="flex space-x-2">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${n.target_role === 'student' ? 'bg-blue-100 text-blue-700' : n.target_role === 'faculty' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>
                    {n.target_role}
                  </span>
                  <span className="text-[10px] font-black px-3 py-1 rounded-full bg-gray-50 text-gray-400 uppercase tracking-widest border border-gray-100">
                    {n.target_branch}
                  </span>
                </div>
                { (profile.id === n.author_id || profile.role === 'admin') && (
                  <button onClick={() => deleteNotice(n.id)} className="p-2 text-gray-200 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              
              <h3 className="text-xl font-black text-[#272A6F] mb-4 leading-tight group-hover:text-blue-600 transition-colors">{n.title}</h3>
              <p className="text-sm text-gray-600 font-medium leading-relaxed whitespace-pre-wrap">{n.content}</p>
              
              <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-[#272A6F]/5 flex items-center justify-center text-[#272A6F] font-black text-[10px]">
                    {n.profiles?.full_name?.[0] || 'A'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700">{n.profiles?.full_name}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">{n.profiles?.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono font-bold text-gray-300">
                    {new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
