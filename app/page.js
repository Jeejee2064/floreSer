'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'

export default function Home() {
  const [password, setPassword] = useState('')
  const [student, setStudent] = useState(null)
  const [progress, setProgress] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    setLoading(true)

    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('password', password.trim())
      .single()

    if (studentError || !studentData) {
      setError('Invalid password. Please try again.')
      setLoading(false)
      return
    }

    const { data: progressData, error: progressError } = await supabase
      .from('progress')
      .select(`
        content,
        progression,
        comment,
        subjects ( name )
      `)
      .eq('student_id', studentData.id)

    if (progressError) {
      setError('Error fetching progress.')
      setLoading(false)
      return
    }

    setStudent(studentData)
    setProgress(progressData)
    setLoading(false)
  }

  const handleLogout = () => {
    setStudent(null)
    setPassword('')
    setProgress([])
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-sky-200 flex items-center justify-center p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-4xl bg-white shadow-2xl rounded-3xl p-6 sm:p-8 md:p-10 border-4 border-yellow-200">
        {!student ? (
          <div className="text-center space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-sky-700">
              🌴 Welcome to FloreSer School Portal 🌺
            </h1>
            <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto">
              Please enter your secret password to see your class report card.
            </p>

            <div className="flex flex-col items-center gap-4">
              <input
                type="text"
                placeholder="e.g. blue-toucan"
                className="border-2 border-sky-300 rounded-xl p-3 w-64 sm:w-72 md:w-80 text-center text-base sm:text-lg focus:outline-none focus:ring-4 focus:ring-sky-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                onClick={handleLogin}
                disabled={loading}
                className="bg-yellow-400 text-sky-800 font-bold px-8 py-3 rounded-xl hover:bg-yellow-300 transition-all disabled:opacity-50 shadow-md text-base sm:text-lg"
              >
                {loading ? 'Loading...' : 'Enter'}
              </button>
            </div>

            {error && <p className="text-red-600 font-semibold">{error}</p>}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key="student"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 text-center sm:text-left">
                <h2 className="text-xl sm:text-2xl font-bold text-sky-800">
                  🌺 Hello, {student.full_name}!
                </h2>
                <button
                  onClick={handleLogout}
                  className="text-sm sm:text-base text-gray-500 underline hover:text-sky-700 mt-2 sm:mt-0"
                >
                  Log out
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-sky-100 shadow-md">
                <table className="w-full text-sm sm:text-base border-collapse">
                  <thead className="bg-sky-100 text-sky-800">
                    <tr>
                      <th className="text-left p-2 sm:p-3 font-semibold">📘 Subject</th>
                      <th className="text-left p-2 sm:p-3 font-semibold">📖 Content</th>
                      <th className="text-left p-2 sm:p-3 font-semibold">📈 Progress</th>
                      <th className="text-left p-2 sm:p-3 font-semibold">💬 Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.map((p, i) => (
                      <tr
                        key={i}
                        className={`${
                          i % 2 === 0 ? 'bg-yellow-50' : 'bg-sky-50'
                        } hover:bg-sky-100 transition`}
                      >
                        <td className="p-2 sm:p-3 font-medium text-sky-900 whitespace-nowrap">
                          {p.subjects.name}
                        </td>
                        <td className="p-2 sm:p-3 text-gray-700">{p.content}</td>
                        <td className="p-2 sm:p-3 text-gray-700">
                          {p.progression || 'In Progress'}
                        </td>
                        <td className="p-2 sm:p-3 text-gray-600 italic">
                          {p.comment ? `"${p.comment}"` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-center pt-4 text-gray-500 text-sm sm:text-base">
                🌈 Keep learning and having fun!
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
