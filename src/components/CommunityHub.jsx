import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { MessageSquare, Users, Send, Loader2, Hash, Shield, Info, Star, Trash2, Plus } from 'lucide-react'

export default function CommunityHub({ profile }) {
  const [tab, setTab] = useState('chat') // 'chat' | 'clubs' | 'events'
  const [rooms, setRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef()

  useEffect(() => {
    fetchRooms()
  }, [])

  useEffect(() => {
    if (activeRoom) {
      fetchMessages(activeRoom.id)
      const channel = supabase.channel(`room-${activeRoom.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${activeRoom.id}` }, 
          payload => setMessages(prev => [...prev, payload.new]))
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [activeRoom])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchRooms() {
    setLoading(true)
    const { data } = await supabase.from('chat_rooms').select('*, subjects(name)')
      .or(`branch.eq.${profile.branch},branch.eq.ALL`)
    setRooms(data || [])
    if (data?.length) setActiveRoom(data[0])
    setLoading(false)
  }

  async function createRoom(roomData) {
    const { error } = await supabase.from('chat_rooms').insert({
      ...roomData,
      created_by: profile.id
    })
    if (error) alert(error.message)
    else fetchRooms()
  }

  async function fetchMessages(roomId) {
    const { data } = await supabase.from('chat_messages').select('*, profiles(full_name, role)').eq('room_id', roomId).order('created_at', { ascending: true })
    setMessages(data || [])
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!newMessage.trim() || !activeRoom) return
    const msg = { room_id: activeRoom.id, sender_id: profile.id, content: newMessage }
    setNewMessage('')
    const { error } = await supabase.from('chat_messages').insert(msg)
    if (error) alert(error.message)
  }

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#272A6F] rounded-xl flex items-center justify-center text-white shadow-lg">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#272A6F]">Community Hub</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Connect, Chat & Collaborate</p>
          </div>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {['chat', 'clubs', 'events'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-white text-[#272A6F] shadow-sm' : 'text-gray-400'}`}>
              {t}
            </button>
          ))}
        </div>
      </header>

      {tab === 'chat' && (
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Side: Rooms */}
          <div className="w-64 bg-white rounded-3xl border border-gray-100 p-4 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 px-2">
              <p className="text-[10px] font-black uppercase text-gray-400">Channels</p>
              {['admin', 'faculty', 'hod', 'principal'].includes(profile.role) && (
                <button onClick={() => {
                  const name = prompt("Room Name:")
                  const sec = prompt("Section (A/B/C):", "A")
                  if (name) createRoom({ name, section: sec, branch: profile.branch || 'ALL' })
                }} className="text-[#272A6F] hover:text-[#EFBE33] transition-colors"><Plus size={14} /></button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {rooms.map(r => (
                <button key={r.id} onClick={() => setActiveRoom(r)}
                  className={`w-full text-left p-3 rounded-2xl flex items-center space-x-3 transition-all ${activeRoom?.id === r.id ? 'bg-[#272A6F] text-white shadow-lg' : 'hover:bg-gray-50 text-[#272A6F]'}`}>
                  <div className={`p-2 rounded-lg ${activeRoom?.id === r.id ? 'bg-white/10' : 'bg-gray-100'}`}><Hash size={14} /></div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate">{r.name}</p>
                    <p className={`text-[9px] ${activeRoom?.id === r.id ? 'text-white/50' : 'text-gray-400'}`}>{r.branch} Sec {r.section}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main: Chat Area */}
          <div className="flex-1 bg-white rounded-3xl border border-gray-100 flex flex-col overflow-hidden shadow-2xl shadow-[#272A6F]/5">
            <div className="p-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Hash className="text-[#EFBE33]" />
                <h3 className="font-black text-[#272A6F]">{activeRoom?.name}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Online</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, i) => {
                const isMe = m.sender_id === profile.id
                return (
                  <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-4 rounded-2xl relative ${isMe ? 'bg-[#272A6F] text-white rounded-tr-none' : 'bg-gray-100 text-[#272A6F] rounded-tl-none'}`}>
                      {!isMe && <p className="text-[9px] font-black text-blue-500 mb-1">{m.profiles?.full_name}</p>}
                      <p className="text-sm font-medium">{m.content}</p>
                      <p className={`text-[8px] mt-1 ${isMe ? 'text-white/40' : 'text-gray-400'}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={scrollRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 bg-gray-50 border-t border-gray-100">
              <div className="flex space-x-3">
                <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  placeholder={`Message #${activeRoom?.name || 'room'}...`}
                  className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#272A6F]" />
                <button type="submit" className="w-12 h-12 bg-[#272A6F] text-white rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all">
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'clubs' && <ClubsView profile={profile} />}
      {tab === 'events' && <EventsRegistration profile={profile} />}
    </div>
  )
}

function ClubsView({ profile }) {
  const [clubs, setClubs] = useState([])
  useEffect(() => {
    supabase.from('clubs').select('*').then(({ data }) => setClubs(data || []))
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
      {clubs.map(c => (
        <div key={c.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-[#272A6F]/5 hover:-translate-y-2 transition-all group">
          <div className="w-16 h-16 bg-[#272A6F]/5 rounded-3xl flex items-center justify-center text-[#272A6F] mb-6 group-hover:bg-[#EFBE33]/20 transition-colors">
            <Star size={32} />
          </div>
          <h3 className="text-xl font-black text-[#272A6F] mb-2">{c.name}</h3>
          <p className="text-sm text-gray-500 line-clamp-3 mb-6">{c.description}</p>
          <button className="w-full py-3 bg-gray-50 text-[#272A6F] rounded-2xl text-xs font-black group-hover:bg-[#272A6F] group-hover:text-white transition-all">Join Club</button>
        </div>
      ))}
      <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center">
        <Info size={40} className="text-gray-200 mb-4" />
        <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">More Clubs Coming Soon</p>
      </div>
    </div>
  )
}

function EventsRegistration({ profile }) {
  const events = [
    { id: 1, name: 'Nexus Tech Fest 2026', date: 'Oct 15, 2026', type: 'Tech' },
    { id: 2, name: 'Cultural Night - Maitri', date: 'Nov 20, 2026', type: 'Cultural' }
  ]

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map(e => (
          <div key={e.id} className="bg-[#272A6F] rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <Star size={120} />
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest">{e.type}</span>
              <h3 className="text-3xl font-black mt-4 mb-2">{e.name}</h3>
              <p className="text-white/60 font-medium mb-8">Happening on {e.date} · College Ground</p>
              <button className="px-8 py-3 bg-[#EFBE33] text-[#272A6F] rounded-2xl font-black text-sm shadow-xl hover:shadow-[#EFBE33]/20 transition-all active:scale-95">Register Now</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
