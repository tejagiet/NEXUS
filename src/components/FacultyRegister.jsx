import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle2, XCircle, Save, Loader2, Users, AlertCircle } from 'lucide-react'

export default function FacultyRegister({ profile }) {
  const [students,        setStudents]        = useState([])
  const [subjects,        setSubjects]        = useState([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [attendanceData,  setAttendanceData]  = useState({})
  const [loading,         setLoading]         = useState(false)
  const [fetching,        setFetching]        = useState(true)
  const [toast,           setToast]           = useState(null) // { type, msg }

  useEffect(() => { fetchInitialData() }, [])

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  async function fetchInitialData() {
    setFetching(true)
    // Fetch all subjects (or filter by faculty_id if subjects are assigned)
    const { data: subData } = await supabase.from('subjects').select('*')
    setSubjects(subData || [])
    if (subData?.length > 0) setSelectedSubject(subData[0].id)

    const { data: stuData } = await supabase.from('students').select('*').order('pin_number', { ascending: true })
    setStudents(stuData || [])
    setFetching(false)
  }

  const toggleAttendance = (studentId, status) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }))
  }

  const markAll = (status) => {
    const newData = {}
    students.forEach(s => newData[s.id] = status)
    setAttendanceData(newData)
  }

  const saveAttendance = async () => {
    if (!selectedSubject) { showToast('error', 'Select a subject first.'); return }
    if (Object.keys(attendanceData).length === 0) {
      showToast('error', 'Mark at least one student before saving.')
      return
    }
    setLoading(true)
    const updates = Object.entries(attendanceData).map(([studentId, status]) => ({
      student_id: studentId,
      subject_id: selectedSubject,
      status,
      marked_by: profile.id,
      date: new Date().toISOString().split('T')[0]
    }))

    const { error } = await supabase
      .from('attendance')
      .upsert(updates, { onConflict: 'student_id,subject_id,date' })

    if (error) showToast('error', 'Error saving: ' + error.message)
    else showToast('success', `Attendance saved for ${updates.length} students! ✓`)
    setLoading(false)
  }

  if (fetching) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-[#272A6F]" size={32} />
    </div>
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#272A6F]">Digital Register</h2>
          <p className="text-gray-500">Mark daily attendance for GIET cadets in real-time.</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => markAll('present')}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-bold hover:bg-green-200 transition-colors">
            All Present
          </button>
          <button onClick={() => markAll('absent')}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-bold hover:bg-red-200 transition-colors">
            All Absent
          </button>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center space-x-3 p-4 rounded-2xl border font-medium text-sm
          ${toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'}`}>
          {toast.type === 'success'
            ? <CheckCircle2 size={18} />
            : <AlertCircle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Subject selector + student count */}
      <div className="glass overflow-hidden rounded-2xl shadow-xl">
        <div className="p-4 bg-white/50 border-b border-white/20 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <Users size={18} className="text-[#272A6F]" />
            <span className="font-bold text-[#272A6F]">
              {students.length} Students
            </span>
            <span className="text-sm text-gray-400">
              · {Object.values(attendanceData).filter(v => v === 'present').length} marked present
            </span>
          </div>
          <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#272A6F]">
            {subjects.length === 0 && <option>No subjects found</option>}
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </select>
        </div>

        {/* Student table */}
        <div className="overflow-x-auto">
          {students.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-20" />
              <p>No students found. Students register via the Nexus portal.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-[#272A6F]/5 text-[#272A6F] text-xs uppercase font-bold">
                <tr>
                  <th className="px-6 py-4">PIN</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Branch</th>
                  <th className="px-6 py-4 text-center">Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map(student => {
                  const status = attendanceData[student.id]
                  return (
                    <tr key={student.id} className={`transition-colors ${
                      status === 'present' ? 'bg-green-50' :
                      status === 'absent'  ? 'bg-red-50'   : 'hover:bg-white/40'}`}>
                      <td className="px-6 py-3 font-mono text-sm text-gray-500">
                        {student.pin_number || '—'}
                      </td>
                      <td className="px-6 py-3 font-bold text-gray-800">{student.full_name}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{student.branch || '—'}</td>
                      <td className="px-6 py-3">
                        <div className="flex justify-center space-x-3">
                          <button onClick={() => toggleAttendance(student.id, 'present')}
                            className={`p-2 rounded-full transition-all ${
                              status === 'present'
                                ? 'bg-green-500 text-white shadow-lg scale-110'
                                : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'}`}>
                            <CheckCircle2 size={20} />
                          </button>
                          <button onClick={() => toggleAttendance(student.id, 'absent')}
                            className={`p-2 rounded-full transition-all ${
                              status === 'absent'
                                ? 'bg-red-500 text-white shadow-lg scale-110'
                                : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'}`}>
                            <XCircle size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button onClick={saveAttendance} disabled={loading || students.length === 0}
          className="flex items-center space-x-2 bg-[#272A6F] text-white px-8 py-3 rounded-xl font-bold hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          <span>{loading ? 'Saving...' : 'Upload Register'}</span>
        </button>
      </div>
    </div>
  )
}
