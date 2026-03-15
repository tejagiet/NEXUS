import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, Download, FileText, Film, Loader2, Trash2, FolderOpen, BookOpen, AlertCircle, BarChart2 } from 'lucide-react'

const BRANCHES = ['CME', 'ECE', 'EEE', 'ME', 'CIVIL', 'AI', 'ALL']
const FILE_ICONS = { pdf: FileText, mp4: Film, mkv: Film, avi: Film, pptx: FileText, docx: FileText }
const SEMS = ['sem1', 'sem2', 'sem3', 'sem4', 'sem5', 'sem6']

export default function LMSPortal({ profile }) {
  const [tab, setTab] = useState('resources') // 'resources' | 'assignments' | 'attendance' | 'results'
  const [files, setFiles] = useState([])
  const [assignments, setAssignments] = useState([])
  const [attendanceData, setAttendanceData] = useState([])
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
  useEffect(() => { if (tab === 'assignments') fetchAssignments() }, [tab])
  useEffect(() => { if (tab === 'attendance') fetchAttendanceStats() }, [tab])

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

  async function fetchAssignments() {
    setLoading(true)
    const { data, error } = await supabase.from('assignments').select('*, subjects(name, code), submissions(*)').order('created_at', { ascending: false })
    if (!error) setAssignments(data || [])
    setLoading(false)
  }

  async function fetchAttendanceStats() {
    setLoading(true)
    const { data, error } = await supabase.from('attendance').select('*, subjects(name, code)').eq('student_id', profile.id)
    if (!error) setAttendanceData(data || [])
    setLoading(false)
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
  const isStaff = ['admin', 'principal', 'hod', 'faculty', 'class_teacher', 'vice_principal'].includes(profile?.role)

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#272A6F]">Resource Library</h2>
          <p className="text-gray-500 mt-1">{isFaculty ? 'Upload materials & browse class result archives.' : 'Browse your branch resources and class results.'}</p>
        </div>
        {/* Tab Switcher */}
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1 overflow-x-auto">
          {[
            { id: 'resources', label: 'Resources', icon: BookOpen },
            { id: 'assignments', label: 'Tasks', icon: ClipboardList },
            { id: 'attendance', label: 'Attendance', icon: BarChart2 },
            { id: 'results', label: 'Class Results', icon: BarChart2 },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${tab === t.id ? 'bg-white text-[#272A6F] shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>
              <t.icon size={14} /><span>{t.label}</span>
            </button>
          ))}
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

      {/* ── ASSIGNMENTS TAB ─────────────────────────────────────── */}
      {tab === 'assignments' && (
        <AssignmentsHub profile={profile} assignments={assignments} refresh={fetchAssignments} />
      )}

      {/* ── ATTENDANCE TAB ────────────────────────────────────────── */}
      {tab === 'attendance' && (
        isStaff ? <AttendanceSheet profile={profile} /> : <AttendanceStats profile={profile} data={attendanceData} />
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

/* ── Sub-Components ────────────────────────────────────────── */

function AssignmentsHub({ profile, assignments, refresh }) {
  const [showCreate, setShowCreate] = useState(false)
  const isAdmin = ['admin', 'principal', 'faculty', 'hod', 'class_teacher'].includes(profile.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-[#272A6F]">Tasks & Projects</h3>
        {isAdmin && (
          <button onClick={() => setShowCreate(!showCreate)} className="bg-[#272A6F] text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg">
            {showCreate ? 'Close' : 'Create Task'}
          </button>
        )}
      </div>

      {showCreate && <CreateAssignment profile={profile} onCreated={refresh} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {assignments.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
            <p className="text-gray-400 font-bold">No assignments posted yet.</p>
          </div>
        ) : (
          assignments.map(a => (
            <AssignmentCard key={a.id} assignment={a} profile={profile} refresh={refresh} />
          ))
        )}
      </div>
    </div>
  )
}

function CreateAssignment({ profile, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', subject_id: '', due_date: '', max_points: 10 })
  const [subjects, setSubjects] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('subjects').select('*').then(({ data }) => setSubjects(data || []))
  }, [])

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('assignments').insert({ ...form, created_by: profile.id })
    if (error) alert(error.message)
    else { onCreated(); setForm({ title: '', description: '', subject_id: '', due_date: '', max_points: 10 }) }
    setSaving(false)
  }

  return (
    <div className="glass rounded-3xl p-6 space-y-4 border-2 border-dashed border-[#272A6F]/10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input placeholder="Assignment Title" className="w-full h-11 border border-gray-100 rounded-xl px-4 text-sm font-bold" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
        <select className="w-full h-11 border border-gray-100 rounded-xl px-4 text-sm font-bold" value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})}>
          <option value="">Select Subject</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
        </select>
        <input type="datetime-local" className="w-full h-11 border border-gray-100 rounded-xl px-4 text-sm font-bold" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
        <button onClick={save} disabled={saving} className="bg-[#272A6F] text-white rounded-xl font-black text-xs h-11">Assign to Class</button>
      </div>
      <textarea placeholder="Instructions & Description..." className="w-full border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
    </div>
  )
}

function AssignmentCard({ assignment, profile, refresh }) {
  const [submitting, setSubmitting] = useState(false)
  const isStudent = profile.role === 'student'
  const submission = assignment.submissions?.find(s => s.student_id === profile.id)

  async function submitWork() {
    const url = prompt("Enter your project link (Google Drive/GitHub):")
    if (!url) return
    setSubmitting(true)
    const { error } = await supabase.from('submissions').upsert({ assignment_id: assignment.id, student_id: profile.id, file_url: url })
    if (error) alert(error.message)
    else refresh()
    setSubmitting(false)
  }

  return (
    <div className="bg-white border-2 border-gray-50 rounded-[2.5rem] p-6 hover:shadow-xl transition-all border-l-4 border-l-[#272A6F]">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black bg-[#272A6F]/5 text-[#272A6F] px-3 py-1 rounded-full uppercase tracking-widest">{assignment.subjects?.code}</span>
        <span className="text-[10px] font-mono font-bold text-red-400">Due: {new Date(assignment.due_date).toLocaleString()}</span>
      </div>
      <h4 className="text-lg font-black text-[#272A6F] mb-2">{assignment.title}</h4>
      <p className="text-xs text-gray-500 line-clamp-2 mb-6">{assignment.description}</p>
      
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
        {isStudent ? (
          <div className="flex items-center justify-between w-full">
            {submission ? (
              <span className="text-xs font-black text-emerald-500 flex items-center gap-1">
                <BarChart2 size={14} /> Submitted ({submission.status})
              </span>
            ) : (
              <button onClick={submitWork} disabled={submitting} className="bg-[#272A6F] text-white px-4 py-2 rounded-xl text-[10px] font-black hover:shadow-lg transition-all">
                Submit Project
              </button>
            )}
            {submission?.grade && <span className="text-xs font-black text-[#EFBE33]">Grade: {submission.grade}/{assignment.max_points}</span>}
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-black text-gray-400">{assignment.submissions?.length || 0} Submissions</span>
            <button className="text-[#272A6F] text-xs font-black hover:underline px-2 py-1">View & Grade</button>
          </div>
        )}
      </div>
    </div>
  )
}

function AttendanceStats({ profile, data }) {
  // Group by subject and calculate %
  const stats = data.reduce((acc, curr) => {
    const sub = curr.subjects?.name || 'Unknown'
    if (!acc[sub]) acc[sub] = { present: 0, total: 0, code: curr.subjects?.code }
    acc[sub].total++
    if (curr.status === 'present') acc[sub].present++
    return acc
  }, {})

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Object.entries(stats).map(([name, s]) => {
        const perc = Math.round((s.present / s.total) * 100)
        return (
          <div key={name} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-[#272A6F]/5">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#272A6F]/5 flex items-center justify-center text-[#272A6F]">
                <BarChart2 size={24} />
              </div>
              <span className={`text-xs font-black px-3 py-1 rounded-full ${perc >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {perc}%
              </span>
            </div>
            <h4 className="font-black text-[#272A6F] mb-1 leading-tight">{name}</h4>
            <p className="text-xs font-mono font-bold text-gray-300 mb-6">{s.code}</p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-1000 ${perc >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${perc}%` }} />
            </div>
            <div className="flex justify-between mt-3 text-[10px] font-black text-gray-400">
              <span>{s.present} Present</span>
              <span>{s.total} Total Classes</span>
            </div>
          </div>
        )
      })}
      {Object.keys(stats).length === 0 && (
        <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
          <p className="text-gray-400 font-bold">No attendance records found.</p>
        </div>
      )}
    </div>
  )
}

function AttendanceSheet({ profile }) {
  const [subjects, setSubjects] = useState([])
  const [selectedSub, setSelectedSub] = useState('')
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('subjects').select('*').then(({ data }) => {
      setSubjects(data || [])
      if (data?.length) setSelectedSub(data[0].id)
    })
  }, [])

  useEffect(() => {
    if (selectedSub) fetchSheet()
  }, [selectedSub])

  async function fetchSheet() {
    setLoading(true)
    const { data: sub } = await supabase.from('subjects').select('branch').eq('id', selectedSub).single()
    const { data: stus } = await supabase.from('profiles').select('*').eq('role', 'student').eq('branch', sub.branch)
    const { data: att } = await supabase.from('attendance').select('*').eq('subject_id', selectedSub)
    
    setStudents(stus || [])
    setAttendance(att || [])
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-[#272A6F]">Detailed Attendance Sheet</h3>
        <select value={selectedSub} onChange={e => setSelectedSub(e.target.value)}
          className="bg-white border-2 border-gray-100 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-[#272A6F]">
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
        </select>
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#272A6F]" /></div> : (
        <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-4 text-[10px] font-black uppercase text-gray-400">Student Name</th>
                  <th className="p-4 text-[10px] font-black uppercase text-gray-400">Roll No</th>
                  <th className="p-4 text-[10px] font-black uppercase text-gray-400 text-center">Classes</th>
                  <th className="p-4 text-[10px] font-black uppercase text-gray-400 text-center">Present</th>
                  <th className="p-4 text-[10px] font-black uppercase text-gray-400 text-center">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const sAtt = attendance.filter(a => a.student_id === s.id)
                  const present = sAtt.filter(a => a.status === 'present').length
                  const total = sAtt.length
                  const perc = total > 0 ? Math.round((present / total) * 100) : 0
                  return (
                    <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="p-4 font-bold text-sm text-[#272A6F]">{s.full_name}</td>
                      <td className="p-4 font-mono text-xs text-gray-400">{s.id.slice(0, 8)}</td>
                      <td className="p-4 text-center font-bold text-gray-500">{total}</td>
                      <td className="p-4 text-center font-bold text-emerald-500">{present}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${perc >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {perc}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
