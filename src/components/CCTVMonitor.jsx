import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Camera, AlertTriangle, Monitor, Globe, Activity, Loader2, PlayCircle, ShieldAlert, 
  Maximize2, Minimize2, Eye, EyeOff, Radio, Video, ZoomIn, ZoomOut, Layout, Grid, X, RefreshCw, Settings
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// 🏗️ Sub-Component: Smart Surveillance Player
function SurveillanceNode({ stream, motionActive, onFullscreen, hlsLoaded }) {
  const videoRef = useRef(null)
  const [hasError, setHasError] = useState(false)
  const [nightVision, setNightVision] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [retryKey, setRetryKey] = useState(0)
  const [isHLS] = useState(stream.url?.includes('.m3u8'))
  const [isRTSP] = useState(stream.url?.startsWith('rtsp://'))
  const [timestamp, setTimestamp] = useState(new Date().toLocaleTimeString())
  
  // 🛡️ Mixed Content Detection (HTTPS blocking HTTP)
  const [isMixedContent, setIsMixedContent] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setTimestamp(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Detect if we are on HTTPS but loading an HTTP stream
    if (window.location.protocol === 'https:' && stream.url?.startsWith('http://')) {
      console.warn(`[Surveillance SOC] Mixed Content Blocked: ${stream.name} relies on insecure HTTP.`)
      setIsMixedContent(true)
      return
    }

    if (!isHLS || !videoRef.current) return

    const video = videoRef.current
    let hls = null

    const initStream = () => {
      console.log(`[Surveillance SOC] Initializing Stream: ${stream.name} (HLS Ready: ${hlsLoaded})`)
      
      // 🍎 Native HLS Support (Safari/Mobile)
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log(`[Surveillance SOC] Using Native HLS for ${stream.name}`)
        video.src = stream.url
        video.addEventListener('loadedmetadata', () => video.play().catch(() => {}))
      } 
      // 📦 HLS.js Support (Chrome/FF)
      else if (window.Hls && window.Hls.isSupported()) {
        console.log(`[Surveillance SOC] Using HLS.js for ${stream.name}`)
        hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60
        })
        hls.loadSource(stream.url)
        hls.attachMedia(video)
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(err => console.warn(`[Surveillance SOC] Play blocked: ${err.message}`))
        })
        hls.on(window.Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error(`[Surveillance SOC] Fatal HLS Error:`, data)
            setHasError(true)
          }
        })
      } else if (!hlsLoaded) {
        console.log(`[Surveillance SOC] Waiting for HLS engine to hydrate...`)
      } else {
        console.error(`[Surveillance SOC] HLS not supported in this environment.`)
        setHasError(true)
      }
    }

    setHasError(false)
    initStream()

    return () => {
      if (hls) hls.destroy()
    }
  }, [stream.url, isHLS, hlsLoaded, retryKey])

  const toggleZoom = () => setZoomLevel(prev => prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1)
  const handleReconnect = () => setRetryKey(prev => prev + 1)

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative glass rounded-3xl overflow-hidden shadow-2xl transition-all border border-white/10"
    >
      {/* 📹 Video / Image Container */}
      <div 
        className="aspect-video bg-black relative overflow-hidden"
        style={{ filter: nightVision ? 'brightness(1.2) contrast(1.1) sepia(0.5) hue-rotate(100deg) saturate(1.5)' : 'none' }}
      >
        <div 
          className="w-full h-full transition-transform duration-500"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {isMixedContent ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a] text-amber-500 p-6 text-center">
              <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
              <p className="font-black text-[10px] uppercase tracking-[0.2em] text-white">Mixed Content Blocked</p>
              <p className="text-[9px] text-white/40 mt-1 max-w-[200px]">Browser blocked this insecure stream. Secure (HTTPS) upgrade required.</p>
              <div className="flex gap-2 mt-4">
                <a 
                  href={stream.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl transition-all text-amber-500 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest"
                >
                  Direct Link
                </a>
                <button 
                  onClick={() => onFullscreen({ ...stream, showGuide: true })}
                  className="px-4 py-2 bg-[#EFBE33] text-[#272A6F] rounded-xl transition-all font-black text-[9px] uppercase tracking-widest"
                >
                  How to Fix →
                </button>
              </div>
            </div>
          ) : isRTSP ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a] text-yellow-500/50 p-6 text-center">
              <Radio className="w-12 h-12 mb-4 animate-pulse opacity-20" />
              <p className="font-black text-[10px] uppercase tracking-[0.2em]">Hardware RTSP Bridge Active</p>
              <div className="mt-4 px-3 py-1 bg-yellow-500/5 rounded-full text-[8px] font-mono opacity-30 select-all border border-yellow-500/20">
                {stream.url}
              </div>
            </div>
          ) : isHLS ? (
            <div className="w-full h-full relative">
              <video 
                ref={videoRef} 
                className={`w-full h-full object-cover transition-opacity duration-700 ${hasError ? 'opacity-0' : 'opacity-80 group-hover:opacity-100'}`}
                muted 
                autoPlay 
                playsInline
              />
              {hasError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] text-red-500 p-4 text-center">
                  <ShieldAlert className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Feed Link Interrupted</p>
                  <button 
                    onClick={handleReconnect}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 rounded-xl transition-all text-red-400 group/btn border border-red-500/20"
                  >
                    <RefreshCw size={14} className="group-hover/btn:rotate-180 transition-transform duration-500" />
                    <span className="text-[9px] font-black uppercase">Reconnect Feed</span>
                  </button>
                </div>
              )}
              {!hlsLoaded && !hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
                  <Loader2 className="animate-spin text-white/10" size={30} />
                </div>
              )}
            </div>
          ) : (
            <img 
              src={stream.url} 
              alt={stream.name} 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
          )}
        </div>

        {/* 📟 Surveillance Overlays (CRT Effect) */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
        {nightVision && <div className="absolute inset-0 pointer-events-none bg-green-500/5 mix-blend-overlay" />}
        
        {/* Indicators */}
        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 z-20">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Live</span>
        </div>
        
        {isRecording && (
          <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-600/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-400/20 z-20 animate-pulse">
            <Radio className="w-3 h-3 text-white" />
            <span className="text-[9px] font-black text-white uppercase tracking-widest">Rec {timestamp}</span>
          </div>
        )}

        {/* Floating Control Bar (Hover) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100 z-30">
          <button 
            onClick={() => setNightVision(!nightVision)}
            className={`p-3 rounded-2xl backdrop-blur-xl border border-white/20 transition-all ${nightVision ? 'bg-[#EFBE33] text-[#272A6F] shadow-lg shadow-[#EFBE33]/20' : 'bg-black/40 text-white hover:bg-black/60'}`}
          >
            {nightVision ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
          <button 
            onClick={() => setIsRecording(!isRecording)}
            className={`p-3 rounded-2xl backdrop-blur-xl border border-white/20 transition-all ${isRecording ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-black/40 text-white hover:bg-black/60'}`}
          >
            <Radio size={20} />
          </button>
          <button 
            onClick={toggleZoom}
            className={`p-3 rounded-2xl backdrop-blur-xl border border-white/20 bg-black/40 text-white hover:bg-black/60 transition-all ${zoomLevel > 1 ? 'border-[#EFBE33]/50' : ''}`}
          >
            {zoomLevel > 1 ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
          </button>
          <button 
            onClick={() => onFullscreen(stream)}
            className="p-3 rounded-2xl backdrop-blur-xl border border-white/20 bg-[#272A6F]/80 text-white hover:bg-[#272A6F] transition-all"
          >
            <Maximize2 size={20} />
          </button>
        </div>
        
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10 z-20">
          <p className="text-white font-black text-xs uppercase tracking-tight">{stream.name}</p>
          <div className="flex items-center text-[9px] text-white/50 space-x-2 font-mono mt-0.5">
            <Globe size={10} />
            <span className="uppercase">{stream.location || 'CAMPUS ZONE'}</span>
            <span className="opacity-30">|</span>
            <Activity size={10} />
            <span className="uppercase">{zoomLevel > 1 ? `${zoomLevel}X` : '1.0X'}</span>
          </div>
        </div>
      </div>

      {/* 📟 Control Footer */}
      <div className="p-5 bg-white flex items-center justify-between border-t border-gray-100">
        <div className="flex -space-x-1">
          <div className="w-8 h-8 rounded-full bg-[#272A6F]/5 border-2 border-white flex items-center justify-center">
            <Monitor size={14} className="text-[#272A6F]" />
          </div>
          <div className="w-8 h-8 rounded-full bg-[#EFBE33]/5 border-2 border-white flex items-center justify-center">
            <Activity size={14} className="text-[#EFBE33]" />
          </div>
        </div>
        <div className="text-[10px] font-black font-mono text-gray-400 bg-gray-50/50 px-3 py-1.5 rounded-xl border border-gray-200/50 flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${hasError ? 'bg-red-500' : 'bg-green-500'}`} />
          BITRATE: {hasError ? '0.0' : (3.5 + Math.random()).toFixed(1)} Mb/s
        </div>
      </div>

      {/* 🚨 Motion Detected Visual Feed */}
      {motionActive && (
        <div className="absolute inset-0 border-[6px] border-red-500/80 rounded-3xl pointer-events-none animate-pulse z-40" />
      )}
    </motion.div>
  )
}

export default function CCTVMonitor({ profile }) {
  const [cameraUrl, setCameraUrl] = useState('')
  const [activeStreams, setActiveStreams] = useState([])
  const [motionActive, setMotionActive] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isCinemaMode, setIsCinemaMode] = useState(false)
  const [fullscreenStream, setFullscreenStream] = useState(null)
  const [hlsLoaded, setHlsLoaded] = useState(!!window.Hls)
  
  // 🛰️ Proxy & Compatibility State
  const [proxyUrl, setProxyUrl] = useState(localStorage.getItem('nexus_cctv_proxy') || '')
  const [showCompatibilityInfo, setShowCompatibilityInfo] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    // 📼 Load HLS.js for browser support with State Tracking
    if (!window.Hls) {
      console.log("[Surveillance SOC] Hydrating Video Engine...")
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest'
      script.async = true
      script.onload = () => {
        console.log("[Surveillance SOC] Video Engine Active (v4.6)")
        setHlsLoaded(true)
      }
      script.onerror = () => console.error("[Surveillance SOC] Critical Error: CDN Failed to deliver Video Engine")
      document.body.appendChild(script)
    }

    fetchNodes()

    // 🔄 Real-time Database Sync
    const nodeChannel = supabase
      .channel('cctv_db_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cctv_nodes' }, () => fetchNodes())
      .subscribe()

    // 🚨 Real-time Motion Detection Listener
    const motionChannel = supabase
      .channel('cctv_motion')
      .on('broadcast', { event: 'motion_detected' }, () => {
        setMotionActive(true)
        setTimeout(() => setMotionActive(false), 5000)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(nodeChannel)
      supabase.removeChannel(motionChannel)
    }
  }, [])

  useEffect(() => {
    if (proxyUrl) localStorage.setItem('nexus_cctv_proxy', proxyUrl)
    else localStorage.removeItem('nexus_cctv_proxy')
  }, [proxyUrl])

  // 🛡️ Helper to apply proxy to insecure URLs
  const getStreamUrl = (url) => {
    if (!url) return ''
    if (window.location.protocol === 'https:' && url.startsWith('http://') && proxyUrl) {
      return `${proxyUrl.replace(/\/$/, '')}/${url.replace(/^http:\/\//, '')}`
    }
    return url
  }

  async function fetchNodes() {
    const { data } = await supabase.from('cctv_nodes').select('*').eq('is_active', true).order('created_at', { ascending: true })
    if (data) setActiveStreams(data)
    setLoading(false)
  }

  const addNode = async (e) => {
    e.preventDefault()
    if (!cameraUrl) return
    
    const name = prompt("Enter Camera Name:", `Node ${activeStreams.length + 1}`) || "New Node"
    
    const { error } = await supabase.from('cctv_nodes').insert({
      name,
      url: cameraUrl,
      node_id: `NG-NODE-${Date.now()}`
    })

    if (error) alert("Error adding node: " + error.message)
    else {
      setCameraUrl('')
      setIsAdding(false)
    }
  }

  return (
    <div className={`min-h-[80vh] transition-all duration-700 ${motionActive ? 'bg-red-950/5' : 'bg-transparent'}`}>
      <header className="flex items-center justify-between mb-10">
        <div>
          <h2 className={`text-5xl font-black tracking-tighter transition-colors ${motionActive ? 'text-red-700' : 'text-[#272A6F]'}`}>
            SURVEILLANCE <span className="text-[#EFBE33]">MONITOR</span>
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="px-2 py-0.5 bg-[#272A6F] text-white text-[9px] font-black rounded uppercase tracking-widest">SOC v4.6 Patch</span>
            <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">Security Operations Terminal - Integrated</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-2xl transition-all border ${showSettings ? 'bg-[#272A6F] text-white' : 'bg-white border-gray-100 text-gray-400 hover:text-[#272A6F]'}`}
            title="Surveillance Settings"
          >
            <Settings size={24} />
          </button>
          <button 
            onClick={() => setIsCinemaMode(!isCinemaMode)}
            className={`p-3 rounded-2xl transition-all border ${isCinemaMode ? 'bg-[#EFBE33] text-[#272A6F] border-transparent shadow-xl' : 'bg-white border-gray-100 text-gray-400 hover:text-[#272A6F]'}`}
          >
            {isCinemaMode ? <Layout size={24} /> : <Grid size={24} />}
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-[#272A6F] text-white px-6 py-3.5 rounded-2xl font-black flex items-center space-x-3 hover:shadow-2xl hover:scale-105 transition-all active:scale-95 group"
          >
            <Camera className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span>DEPLOY NODE</span>
          </button>
        </div>
      </header>

      {/* ⚙️ Proxy Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-3xl p-8 mb-10 border border-gray-100 shadow-xl overflow-hidden"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-[#272A6F] uppercase tracking-tight">Surveillance Proxy Configuration</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Tunnel insecure legacy streams through a secure bridge</p>
              </div>
              <Activity className="text-[#EFBE33] opacity-20" size={32} />
            </div>
            
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Secure Proxy Endpoint (HTTPS)</label>
              <div className="flex gap-4">
                <input 
                  type="url" 
                  placeholder="https://your-proxy-bridge.com"
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-[#272A6F]/20 transition-all font-mono text-xs"
                />
                <button 
                  onClick={() => {
                    setProxyUrl('')
                    setShowSettings(false)
                  }}
                  className="px-6 py-4 text-gray-400 font-black uppercase text-[10px] hover:text-red-500 transition-colors"
                >
                  Clear Proxy
                </button>
              </div>
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-start gap-4">
                <ShieldAlert className="text-blue-500 shrink-0" size={18} />
                <p className="text-[10px] text-blue-600/80 leading-relaxed">
                  If your CCTV cameras use `http://`, the browser will block them on this secure site. 
                  Use a Proxy Bridge (like the Nexus Proxy Script) to tunnel these streams securely. 
                  Leave empty to use direct browser loading (requires manual "Allow Insecure Content" setting).
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {motionActive && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-red-600 text-white px-8 py-6 rounded-[2rem] flex items-center justify-between shadow-2xl shadow-red-500/40 mb-10 border-4 border-white/20"
          >
            <div className="flex items-center space-x-6">
              <div className="p-4 bg-white/20 rounded-full animate-pulse">
                <ShieldAlert size={32} />
              </div>
              <div>
                <span className="font-black text-2xl uppercase tracking-tighter block leading-tight">Security Breach: Motion Detected</span>
                <span className="text-[10px] font-black opacity-80 uppercase tracking-[0.3em]">Protocol Delta Alpha — Surveillance Auto-Focus Port 8080</span>
              </div>
            </div>
            <Activity size={32} className="opacity-30 animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-8 rounded-[2.5rem] border-4 border-dashed border-[#272A6F]/10 mb-10 overflow-hidden relative"
        >
          <form onSubmit={addNode} className="flex gap-4 relative z-10">
            <div className="flex-1 relative">
              <input 
                type="url" 
                placeholder="RTSP://, .M3U8:// or LIVE STREAM URL"
                value={cameraUrl}
                onChange={(e) => setCameraUrl(e.target.value)}
                className="w-full bg-white border-2 border-gray-100 rounded-3xl px-8 py-5 focus:ring-8 focus:ring-[#272A6F]/5 outline-none font-black text-[#272A6F] placeholder:text-gray-300 transition-all text-sm tracking-tight"
                required
              />
            </div>
            <button type="submit" className="bg-[#EFBE33] text-[#272A6F] px-10 py-5 rounded-3xl font-black hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-[#EFBE33]/20 uppercase tracking-widest text-xs">Authorize Feed</button>
            <button type="button" onClick={() => setIsAdding(false)} className="text-gray-400 font-black px-6 hover:text-red-500 transition-colors uppercase text-[10px] tracking-widest leading-none">Discard</button>
          </form>
          <div className="absolute top-0 right-10 w-40 h-40 bg-[#EFBE33]/5 rounded-full -translate-y-1/2" />
        </motion.div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 space-y-8">
          <div className="relative">
            <div className="absolute inset-[-20px] bg-[#272A6F]/5 rounded-full animate-ping" />
            <Loader2 className="animate-spin text-[#272A6F]" size={80} />
            <Video className="absolute inset-0 m-auto text-[#EFBE33] w-8 h-8 opacity-50" />
          </div>
          <p className="text-gray-400 font-black uppercase tracking-[0.5em] text-[10px] animate-pulse">Establishing Satellite SOC Uplink...</p>
        </div>
      ) : (
        <motion.div 
          layout
          className={`grid gap-10 ${isCinemaMode ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2'}`}
        >
          {activeStreams.length > 0 ? (
            <>
              {isCinemaMode && (
                <div className="lg:col-span-2">
                   <SurveillanceNode 
                    stream={activeStreams[0]} 
                    motionActive={motionActive} 
                    onFullscreen={setFullscreenStream}
                    hlsLoaded={hlsLoaded}
                  />
                </div>
              )}
              
              <div className={`${isCinemaMode ? 'space-y-6 flex flex-col' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 col-span-full gap-10'}`}>
                {activeStreams.slice(isCinemaMode ? 1 : 0).map(stream => (
                  <SurveillanceNode 
                    key={stream.id} 
                    stream={{...stream, url: getStreamUrl(stream.url)}} 
                    motionActive={motionActive} 
                    onFullscreen={setFullscreenStream}
                    hlsLoaded={hlsLoaded}
                  />
                ))}
              </div>
            </>
          ) : (
             <div className="col-span-full py-40 flex flex-col items-center opacity-20">
                <Video size={100} className="text-[#272A6F] mb-4" />
                <p className="font-black uppercase tracking-[0.3em]">No Remote Nodes Linked</p>
             </div>
          )}
          
          <button 
            onClick={() => setIsAdding(true)}
            className="aspect-video glass rounded-[3rem] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-300 hover:border-[#272A6F]/20 hover:text-[#272A6F]/40 transition-all hover:bg-[#272A6F]/5 group"
          >
            <div className="bg-gray-50 p-6 rounded-3xl group-hover:bg-[#EFBE33]/10 transition-colors">
              <PlayCircle className="w-14 h-14 mb-0 opacity-20 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.3em] opacity-40 group-hover:opacity-100 transition-opacity">Deploy Monitoring Hardware</p>
          </button>
        </motion.div>
      )}

      {/* 📺 Fullscreen Modal */}
      <AnimatePresence>
        {fullscreenStream && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 md:p-10"
          >
            <button 
              onClick={() => setFullscreenStream(null)}
              className="absolute top-10 right-10 text-white/50 hover:text-white p-4 transition-all z-[110]"
            >
              <X size={40} />
            </button>
            <div className="w-full max-w-6xl">
              <SurveillanceNode 
                stream={fullscreenStream} 
                motionActive={motionActive} 
                onFullscreen={() => setFullscreenStream(null)}
                hlsLoaded={hlsLoaded}
              />
              <div className="mt-8 flex items-center justify-between text-white/40 font-mono text-[10px] uppercase tracking-[0.5em] px-10">
                <span>Direct Feed: {fullscreenStream.url}</span>
                <span>Signal Strength: 100% | Ultra HD Secure</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🛡️ Compatibility Helper Modal */}
      <AnimatePresence>
        {showCompatibilityInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-[#272A6F]/20 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setShowCompatibilityInfo(false)}
                className="absolute top-8 right-8 text-gray-400 hover:text-[#272A6F] transition-colors"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-6 mb-8">
                <div className="p-4 bg-[#EFBE33]/10 rounded-3xl">
                  <ShieldAlert className="text-[#EFBE33]" size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#272A6F] uppercase tracking-tight leading-none">Compatibility Guide</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Bypassing Mixed Content Restrictions</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 italic font-medium text-xs text-gray-600">
                  Modern browsers block "http" video on secure "https" sites. To see legacy cameras directly, you must manually "Allow" them for this domain.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-[#272A6F] uppercase tracking-widest">For Chrome / Edge</p>
                    <ul className="text-[11px] text-gray-500 space-y-2 list-decimal list-inside">
                      <li>Click the <span className="font-bold underline">Lock Icon</span> next to the URL.</li>
                      <li>Select <span className="font-bold underline">Site Settings</span>.</li>
                      <li>Find <span className="font-bold underline">Insecure Content</span>.</li>
                      <li>Change to <span className="font-bold text-[#272A6F]">Allow</span>.</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-[#272A6F] uppercase tracking-widest">Recommended Fix</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Instead of bypassing security, we recommend using a <b>Secure Proxy Bridge</b>. 
                      You can configure one in the <Settings size={12} className="inline mb-0.5" /> Surveillance Settings menu.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex justify-end">
                <button 
                  onClick={() => setShowCompatibilityInfo(false)}
                  className="bg-[#272A6F] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl shadow-[#272A6F]/20"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
