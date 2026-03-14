import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, Download, FileText, Film, Loader2, Trash2, FolderOpen, BookOpen, AlertCircle, BarChart2 } from 'lucide-react'

const BRANCHES = ['CME', 'ECE', 'EEE', 'ME', 'CIVIL', 'AI', 'ALL']
const FILE_ICONS = { pdf: FileText, mp4: Film, mkv: Film, avi: Film, pptx: FileText, docx: FileText }
const SEMS = ['sem1', 'sem2', 'sem3', 'sem4', 'sem5', 'sem6']

export default function LMSPortal({ profile }) {
  const [tab, setTab] = useState('resources') // 'resources' | 'results'
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState(profile?.role === 'student' ? (profile?.branch || 'CME') : 'ALL')
  const [error, setError] = useState(null)
  const fileRef = useRef()

  // Results bucket state
  const [semFilter, setSemFilter] = useState('sem3')
  const [resultFiles, setResultFiles] = useState([])
  const [resultsLoading, setResultsLoading] = useState(false)

  const [uploadMeta, setUploadMeta] = useState({ title: '', branch: 'CME', type: 'Syllabus' })

  useEffect(() => { fetchFiles() }, [filter])
  useEffect(() => { if (tab === 'results') fetchResultFiles() }, [tab, semFilter])

  async function fetchFiles() {
    setLoading(true)
    let query = supabase.from('lms_files').select('*').order('created_at', { ascending: false })
    if (filter !== 'ALL') query = query.eq('branch', filter)
    const { data, error } = await query
    if (!error) setFiles(data || [])
    else setFiles([])
    setLoading(false)
  }

  async function fetchResultFiles() {
    setResultsLoading(true)
    const { data, error } = await supabase.storage.from('results').list(semFilter, { limit: 100, sortBy: { column: 'name', order: 'asc' } })
    setResultFiles(error ? [] : (data || []))
    setResultsLoading(false)
  }

  function getResultFileURL(fileName) {
    const { data } = supabase.storage.from('results').getPublicUrl(`${semFilter}/${fileName}`)
    return data.publicUrl
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!uploadMeta.title.trim()) { setError('Please enter a title for the file first.'); return }
    setUploading(true); setError(null)
    try {
      const ext = file.name.split('.').pop()
      const path = `${uploadMeta.branch}/${Date.now()}_${file.name}`
      const { error: uploadErr } = await supabase.storage.from('lms-files').upload(path, file)
      if (uploadErr) throw uploadErr
      const { data: { publicUrl } } = supabase.storage.from('lms-files').getPublicUrl(path)
      await supabase.from('lms_files').insert({
        title: uploadMeta.title, branch: uploadMeta.branch,
        file_type: uploadMeta.type, file_url: publicUrl,
        file_name: file.name, uploaded_by: profile.id
      })
      setUploadMeta(m => ({ ...m, title: '' }))
      await fetchFiles()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function deleteFile(fileId, fileUrl) {
    if (!confirm('Delete this resource?')) return
    const path = fileUrl.split('/lms-files/')[1]
    await supabase.storage.from('lms-files').remove([path])
    await supabase.from('lms_files').delete().eq('id', fileId)
    fetchFiles()
  }

  const isFaculty = profile?.role === 'faculty' || profile?.role === 'admin'

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#272A6F]">Resource Library</h2>
          <p className="text-gray-500 mt-1">{isFaculty ? 'Upload materials & browse class result archives.' : 'Browse your branch resources and class results.'}</p>
        </div>
        {/* Tab Switcher */}
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
          <button onClick={() => setTab('resources')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${tab === 'resources' ? 'bg-white text-[#272A6F] shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>
            <BookOpen size={16} /><span>Resources</span>
          </button>
          <button onClick={() => setTab('results')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${tab === 'results' ? 'bg-white text-[#272A6F] shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>
            <BarChart2 size={16} /><span>Class Results</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-center space-x-3 bg-red-50 border border-red-200 p-4 rounded-2xl text-red-700">
          <AlertCircle size={18} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* ── RESOURCES TAB ─────────────────────────────────────────── */}
      {tab === 'resources' && (
        <>
          {/* Faculty Upload Zone */}
          {isFaculty && (
            <div className="glass rounded-3xl p-6 border-2 border-dashed border-[#272A6F]/20 hover:border-[#EFBE33] transition-colors">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input type="text" placeholder="Resource title (e.g., Unit 1 Notes)"
                  value={uploadMeta.title} onChange={e => setUploadMeta(m => ({ ...m, title: e.target.value }))}
                  className="md:col-span-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#272A6F]" />
                <select value={uploadMeta.branch} onChange={e => setUploadMeta(m => ({ ...m, branch: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#272A6F]">
                  {BRANCHES.filter(b => b !== 'ALL').map(b => <option key={b}>{b}</option>)}
                </select>
                <select value={uploadMeta.type} onChange={e => setUploadMeta(m => ({ ...m, type: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#272A6F]">
                  {['Syllabus', 'Assignment', 'Notes', 'Video Lecture', 'Previous Papers'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <input type="file" ref={fileRef} className="hidden" onChange={handleUpload}
                accept=".pdf,.pptx,.docx,.mp4,.mkv" />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full flex items-center justify-center space-x-3 py-10 rounded-2xl bg-[#272A6F]/5 hover:bg-[#272A6F]/10 transition-colors">
                {uploading ? <Loader2 className="animate-spin text-[#272A6F]" size={24} /> : <Upload size={24} className="text-[#272A6F]" />}
                <span className="font-bold text-[#272A6F]">{uploading ? 'Uploading to Supabase Storage...' : 'Click or drag a file to upload (PDF, PPT, Video)'}</span>
              </button>
            </div>
          )}

          {/* Branch Filter */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {BRANCHES.map(b => (
              <button key={b} onClick={() => setFilter(b)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all
                  ${filter === b ? 'bg-[#272A6F] text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'}`}>
                {b}
              </button>
            ))}
          </div>

          {/* File List */}
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#272A6F]" size={32} /></div>
          ) : files.length === 0 ? (
            <div className="glass rounded-3xl p-16 text-center">
              <FolderOpen size={56} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 font-medium">No resources found for {filter} branch.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map(file => {
                const ext = file.file_name?.split('.').pop()?.toLowerCase()
                const FileIcon = FILE_ICONS[ext] || FileText
                const isVideo = ['mp4', 'mkv', 'avi'].includes(ext)
                return (
                  <div key={file.id} className="glass rounded-2xl p-5 flex flex-col group hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isVideo ? 'bg-purple-100' : 'bg-blue-100'}`}>
                      <FileIcon size={24} className={isVideo ? 'text-purple-600' : 'text-blue-600'} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-[#272A6F] text-sm mb-1 line-clamp-2">{file.title}</h4>
                      <p className="text-xs text-gray-400 mb-1">{file.file_type} — {file.branch}</p>
                      <p className="text-xs text-gray-300">{new Date(file.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <a href={file.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center space-x-1.5 text-[#272A6F] text-xs font-bold hover:text-[#EFBE33] transition-colors">
                        <Download size={14} />
                        <span>Download</span>
                      </a>
                      {isFaculty && (
                        <button onClick={() => deleteFile(file.id, file.file_url)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── CLASS RESULTS TAB ─────────────────────────────────────── */}
      {tab === 'results' && (
        <>
          {/* Semester filter */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {SEMS.map(s => (
              <button key={s} onClick={() => setSemFilter(s)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all uppercase
                  ${semFilter === s ? 'bg-[#272A6F] text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'}`}>
                {s.replace('sem', 'Sem ')}
              </button>
            ))}
          </div>

          {resultsLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#272A6F]" size={32} /></div>
          ) : resultFiles.length === 0 ? (
            <div className="glass rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
              <FolderOpen size={56} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 font-medium">No result files in {semFilter} yet.</p>
              <p className="text-gray-300 text-sm mt-1">Faculty can generate them from the Class Results hub.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resultFiles.map(f => {
                const isMaster = f.name.includes('Master')
                return (
                  <a key={f.id || f.name} href={getResultFileURL(f.name)} target="_blank" rel="noopener noreferrer"
                    className={`glass rounded-2xl p-5 flex items-center space-x-4 group hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer ${isMaster ? 'border-l-4 border-[#272A6F]' : 'border-l-4 border-emerald-400'}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isMaster ? 'bg-[#272A6F]/10' : 'bg-emerald-50'}`}>
                      <BarChart2 size={22} className={isMaster ? 'text-[#272A6F]' : 'text-emerald-600'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#272A6F] text-sm truncate">{f.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{isMaster ? 'Master Class Report' : 'Subject Report'} · CSV</p>
                    </div>
                    <Download size={16} className="text-gray-300 group-hover:text-[#272A6F] transition-colors flex-shrink-0" />
                  </a>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

