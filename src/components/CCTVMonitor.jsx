import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Camera, AlertTriangle, Monitor, Globe, Activity, Loader2 } from 'lucide-react'

export default function CCTVMonitor({ profile }) {
  const [cameraUrl, setCameraUrl] = useState('')
  const [activeStreams, setActiveStreams] = useState([
    { id: 1, name: 'Main Gate', url: 'https://images.unsplash.com/photo-1557597774-9d2739f85a76?auto=format&fit=crop&q=80&w=800', isMotion: false },
    { id: 2, name: 'Block A Hallway', url: 'https://images.unsplash.com/photo-1566041510639-8d057239c630?auto=format&fit=crop&q=80&w=800', isMotion: false },
  ])
  const [motionActive, setMotionActive] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    // Real-time Motion Detection Listener
    const channel = supabase
      .channel('cctv_nodes')
      .on('broadcast', { event: 'motion_detected' }, (payload) => {
        console.log('MOTION DETECTED!', payload)
        setMotionActive(true)
        setTimeout(() => setMotionActive(false), 3000) // Pulse for 3 seconds
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const addNode = (e) => {
    e.preventDefault()
    if (!cameraUrl) return
    const newNode = {
      id: Date.now(),
      name: `Remote Node ${activeStreams.length + 1}`,
      url: cameraUrl,
      isMotion: false
    }
    setActiveStreams([...activeStreams, newNode])
    setCameraUrl('')
    setIsAdding(false)
  }

  return (
    <div className={`space-y-8 transition-colors duration-500 ${motionActive ? 'bg-red-500/10 -m-8 p-8' : ''}`}>
      <header className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold transition-colors ${motionActive ? 'text-red-600' : 'text-[#272A6F]'}`}>
            CCTV Monitor Node
          </h2>
          <p className="text-gray-500">Real-time surveillance monitoring and motion alerts.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-[#272A6F] text-white px-4 py-2 rounded-xl font-bold flex items-center space-x-2 hover:shadow-lg transition-all"
        >
          <Camera className="w-4 h-4" />
          <span>Add Node</span>
        </button>
      </header>

      {motionActive && (
        <div className="bg-red-500 text-white px-6 py-4 rounded-2xl flex items-center justify-between animate-pulse shadow-xl shadow-red-500/20">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6" />
            <span className="font-bold text-lg uppercase tracking-wider">Motion Detected - Check Feed Stability</span>
          </div>
          <Activity className="w-6 h-6" />
        </div>
      )}

      {isAdding && (
        <div className="glass p-6 rounded-2xl border-2 border-dashed border-[#272A6F]/20 animate-in zoom-in-95 duration-200">
          <form onSubmit={addNode} className="flex gap-4">
            <input 
              type="url" 
              placeholder="Enter IP Camera Stream URL (rtsp/m3u8/jpeg)..."
              value={cameraUrl}
              onChange={(e) => setCameraUrl(e.target.value)}
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#272A6F] outline-none"
              required
            />
            <button type="submit" className="bg-[#EFBE33] text-[#272A6F] px-6 py-2 rounded-xl font-bold">Link Stream</button>
            <button type="button" onClick={() => setIsAdding(false)} className="text-gray-500 px-4">Cancel</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {activeStreams.map(stream => (
          <div key={stream.id} className="group relative glass rounded-3xl overflow-hidden shadow-2xl transition-all hover:scale-[1.02]">
            {/* Stream View */}
            <div className="aspect-video bg-black relative">
              <img 
                src={stream.url} 
                alt={stream.name} 
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live</span>
              </div>
              <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl">
                <p className="text-white font-bold text-sm tracking-tight">{stream.name}</p>
                <div className="flex items-center text-[10px] text-white/60 space-x-2">
                  <Globe className="w-3 h-3" />
                  <span>Node ID: {stream.id}</span>
                </div>
              </div>
            </div>

            {/* Controls Overlay (Simulated) */}
            <div className="p-6 bg-white flex items-center justify-between border-t border-gray-100">
              <div className="flex space-x-3">
                <button className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <Monitor className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <Activity className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="text-[10px] font-bold font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
                BITRATE: 4.2 Mbps
              </div>
            </div>

            {/* Motion Overlay */}
            {motionActive && (
              <div className="absolute inset-0 border-4 border-red-500 rounded-3xl pointer-events-none animate-pulse" />
            )}
          </div>
        ))}
        
        {/* Placeholder node */}
        <div className="aspect-video glass rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
          <Camera className="w-12 h-12 mb-2 opacity-10" />
          <p className="text-sm font-medium">Add remote node for monitoring</p>
        </div>
      </div>
    </div>
  )
}
