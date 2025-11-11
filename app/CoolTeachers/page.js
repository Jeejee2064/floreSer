'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, Save, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function CoolTeachersPage() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [isEdited, setIsEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState('');

  // 🌴 Check if we already have a session
  useEffect(() => {
    const storedAuth = localStorage.getItem('teacher_authenticated');
    if (storedAuth === 'true') {
      setAuthenticated(true);
    }
  }, []);

  // 🌴 Check password
  const checkPassword = () => {
    if (inputPassword.trim() === 'floreserbocasdeltoro') {
      setAuthenticated(true);
      localStorage.setItem('teacher_authenticated', 'true'); // ✅ save session locally
    } else {
      alert('❌ Wrong password! Try again.');
      setInputPassword('');
    }
  };

  // 🌴 Fetch data after unlock
  useEffect(() => {
    if (!authenticated) return;

    const fetchInitialData = async () => {
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .order('full_name', { ascending: true });

      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true });

      setStudents(studentsData || []);
      setSubjects(subjectsData || []);
    };

    fetchInitialData();
  }, [authenticated]);

  // 🌴 Password Screen Overlay
  if (!authenticated) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-200 via-lime-100 to-amber-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-emerald-300 text-center w-80">
          <Lock className="mx-auto mb-4 text-emerald-600 w-12 h-12" />
          <h1 className="text-2xl font-bold text-emerald-800 mb-3">
            🌺 Teacher Access
          </h1>
          <p className="text-emerald-700 mb-4">Enter password to continue</p>
          <input
            type="password"
            value={inputPassword}
            onChange={(e) => setInputPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && checkPassword()}
            className="w-full p-2 mb-4 border rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="•••••••••••••••"
          />
          <button
            onClick={checkPassword}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-lg transition"
          >
            Unlock
          </button>
        </div>
        <p className="mt-6 text-sm text-emerald-700 italic">
          🌴 Authorized teachers only
        </p>
      </div>
    );
  }

  // 🌴 Student Selection + Data Logic
  const handleSelectStudent = async (index) => {
    if (isEdited) {
      const confirmLeave = confirm('You have unsaved changes. Leave anyway?');
      if (!confirmLeave) return;
    }

    const student = students[index];
    setSelectedStudentIndex(index);
    setIsEdited(false);

    const { data: progress } = await supabase
      .from('progress')
      .select('*, subject_id')
      .eq('student_id', student.id);

    const merged = subjects.map((subj) => {
      const existing = progress?.find((p) => p.subject_id === subj.id);
      return {
        id: existing?.id || null,
        subject_id: subj.id,
        subject_name: subj.name,
        content: existing?.content || '',
        progression: existing?.progression || '',
        comment: existing?.comment || '',
      };
    });

    setProgressData(merged);
  };

  const handleChange = (subjectId, field, value) => {
    setProgressData((prev) =>
      prev.map((row) =>
        row.subject_id === subjectId ? { ...row, [field]: value } : row
      )
    );
    setIsEdited(true);
  };

  const handleSaveAll = async () => {
    if (!progressData.length) return;
    setLoading(true);
    const student = students[selectedStudentIndex];

    try {
      for (const row of progressData) {
        if (row.id) {
          await supabase
            .from('progress')
            .update({
              content: row.content,
              progression: row.progression,
              comment: row.comment,
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.id);
        } else {
          const { data, error } = await supabase
            .from('progress')
            .insert({
              student_id: student.id,
              subject_id: row.subject_id,
              content: row.content,
              progression: row.progression,
              comment: row.comment,
            })
            .select()
            .single();

          if (!error && data) row.id = data.id;
        }
      }

      alert('✅ All changes saved successfully!');
      setIsEdited(false);
    } catch (error) {
      alert('❌ Error saving: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const goBackToList = () => {
    if (isEdited) {
      const confirmLeave = confirm('You have unsaved changes. Leave anyway?');
      if (!confirmLeave) return;
    }
    setSelectedStudentIndex(null);
    setProgressData([]);
  };

  const nextStudent = () => {
    if (selectedStudentIndex < students.length - 1)
      handleSelectStudent(selectedStudentIndex + 1);
  };

  const prevStudent = () => {
    if (selectedStudentIndex > 0)
      handleSelectStudent(selectedStudentIndex - 1);
  };

  const currentStudent =
    selectedStudentIndex !== null ? students[selectedStudentIndex] : null;

  // 🌴 STUDENT LIST
  if (selectedStudentIndex === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-100 via-lime-100 to-amber-100 p-8">
        <h1 className="text-4xl font-extrabold text-center mb-8 text-emerald-800 drop-shadow-sm">
          🏝️ Floreser Teacher Dashboard 🏝️
        </h1>
        <div className="flex flex-wrap justify-center gap-6">
          {students.map((student, index) => (
            <button
              key={student.id}
              onClick={() => handleSelectStudent(index)}
              className="relative bg-white hover:bg-emerald-50 border border-emerald-300 shadow-md rounded-2xl p-4 text-center w-52 transition-all"
            >
              <img
                src="https://cdn-icons-png.freepik.com/256/3251/3251252.png?semt=ais_white_label"
                alt="sloth face"
                className="mx-auto w-16 mb-2"
              />
              <p className="font-bold text-emerald-800">{student.full_name}</p>
              <p className="text-sm text-emerald-600 italic">Tap to open</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 🌴 STUDENT DETAIL
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-lime-50 to-emerald-100 p-4 sm:p-6">
      {/* 🌿 Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3 sm:gap-0">
        {/* Back button */}
        <button
          onClick={goBackToList}
          className="flex items-center text-emerald-700 hover:text-emerald-900 transition self-start"
        >
          <ArrowLeft className="mr-1 w-5 h-5" />
          <span className="text-sm sm:text-base">Back to list</span>
        </button>

        {/* Student navigation */}
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          <button
            onClick={prevStudent}
            disabled={selectedStudentIndex === 0}
            className="p-2 bg-emerald-200 rounded-full hover:bg-emerald-300 disabled:opacity-40 active:scale-95 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <img
              src="https://cdn-icons-png.freepik.com/256/3251/3251252.png?semt=ais_white_label"
              alt="sloth face"
              className="mx-auto w-14 sm:w-16"
            />
            <h2 className="text-lg sm:text-xl font-bold text-emerald-800 mt-1">
              {currentStudent?.full_name}
            </h2>
          </div>

          <button
            onClick={nextStudent}
            disabled={selectedStudentIndex === students.length - 1}
            className="p-2 bg-emerald-200 rounded-full hover:bg-emerald-300 disabled:opacity-40 active:scale-95 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Save button */}
        <div className="sm:self-end">
          <button
            onClick={handleSaveAll}
            disabled={loading || !isEdited}
            className={`flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 rounded-lg font-semibold transition text-sm sm:text-base ${isEdited
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md active:scale-95'
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      {/* 🌿 Table or Card layout */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-emerald-200">
        {/* On mobile, stack each subject as a card */}
        <div className="block sm:hidden space-y-4">
          {progressData.map((subject) => (
            <div
              key={subject.subject_id}
              className="border border-emerald-100 rounded-lg p-3 bg-emerald-50"
            >
              <h3 className="font-semibold text-emerald-800 mb-2">
                {subject.subject_name}
              </h3>

              <label className="block text-xs font-semibold text-emerald-700 mb-1">
                Content
              </label>
              <textarea
                value={subject.content || ''}
                onChange={(e) =>
                  handleChange(subject.subject_id, 'content', e.target.value)
                }
                className="w-full p-2 border rounded-lg bg-white text-gray-700 text-sm mb-2"
                rows={2}
              />

              <label className="block text-xs font-semibold text-emerald-700 mb-1">
                Progression
              </label>
              <textarea
                value={subject.progression || ''}
                onChange={(e) =>
                  handleChange(subject.subject_id, 'progression', e.target.value)
                }
                className="w-full p-2 border rounded-lg bg-white text-gray-700 text-sm mb-2"
                rows={2}
              />

              <label className="block text-xs font-semibold text-emerald-700 mb-1">
                Comment
              </label>
              <textarea
                value={subject.comment || ''}
                onChange={(e) =>
                  handleChange(subject.subject_id, 'comment', e.target.value)
                }
                className="w-full p-2 border rounded-lg bg-white text-gray-700 text-sm"
                rows={2}
              />
            </div>
          ))}
        </div>

        {/* On desktop, keep the table layout */}
        <table className="hidden sm:table min-w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-emerald-100 text-emerald-900">
              <th className="p-3 w-1/5">Discipline</th>
              <th className="p-3 w-1/3">Content</th>
              <th className="p-3 w-1/3">Progression</th>
              <th className="p-3 w-1/3">Comment</th>
            </tr>
          </thead>
          <tbody>
            {progressData.map((subject) => (
              <tr
                key={subject.subject_id}
                className="border-b hover:bg-emerald-50 transition"
              >
                <td className="p-3 font-semibold text-emerald-800">
                  {subject.subject_name}
                </td>
                <td className="p-2">
                  <textarea
                    value={subject.content || ''}
                    onChange={(e) =>
                      handleChange(subject.subject_id, 'content', e.target.value)
                    }
                    className="w-full p-2 border rounded-lg text-gray-700 bg-emerald-50"
                    rows={2}
                  />
                </td>
                <td className="p-2">
                  <textarea
                    value={subject.progression || ''}
                    onChange={(e) =>
                      handleChange(subject.subject_id, 'progression', e.target.value)
                    }
                    className="w-full p-2 border rounded-lg text-gray-700 bg-emerald-50"
                    rows={2}
                  />
                </td>
                <td className="p-2">
                  <textarea
                    value={subject.comment || ''}
                    onChange={(e) =>
                      handleChange(subject.subject_id, 'comment', e.target.value)
                    }
                    className="w-full p-2 border rounded-lg text-gray-700 bg-emerald-50"
                    rows={2}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      <div className="mt-6 text-center text-sm text-emerald-700 italic">
        🥥 Floreser Bocas del Toro
      </div>
    </div>
  );
}
