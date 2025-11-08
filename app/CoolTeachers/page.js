'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChevronLeft, ChevronRight, ArrowLeft, Save } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CoolTeachersPage() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [isEdited, setIsEdited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
  }, []);

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
          🏝️ Tropical Teacher Dashboard
        </h1>
        <div className="flex flex-wrap justify-center gap-6">
          {students.map((student, index) => (
            <button
              key={student.id}
              onClick={() => handleSelectStudent(index)}
              className="relative bg-white hover:bg-emerald-50 border border-emerald-300 shadow-md rounded-2xl p-4 text-center w-52 transition-all"
            >
              <img
                src="https://imgs.search.brave.com/MeoIKPzrmiX_R419xGKeULzGQ8j65l2J0JsyXcAiELQ/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4t/aWNvbnMtcG5nLmZy/ZWVwaWsuY29tLzI1/Ni8zMjUxLzMyNTEy/NTIucG5nP3NlbXQ9/YWlzX3doaXRlX2xh/YmVs"
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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-lime-50 to-emerald-100 p-6">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={goBackToList}
          className="flex items-center text-emerald-700 hover:text-emerald-900 transition"
        >
          <ArrowLeft className="mr-1 w-5 h-5" />
          Back to list
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={prevStudent}
            disabled={selectedStudentIndex === 0}
            className="p-2 bg-emerald-200 rounded-full hover:bg-emerald-300 disabled:opacity-40"
          >
            <ChevronLeft />
          </button>

          <div className="text-center">
            <img
                src="https://imgs.search.brave.com/MeoIKPzrmiX_R419xGKeULzGQ8j65l2J0JsyXcAiELQ/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4t/aWNvbnMtcG5nLmZy/ZWVwaWsuY29tLzI1/Ni8zMjUxLzMyNTEy/NTIucG5nP3NlbXQ9/YWlzX3doaXRlX2xh/YmVs"
              alt="sloth face"
              className="mx-auto w-16"
            />
            <h2 className="text-xl font-bold text-emerald-800">
              {currentStudent?.full_name}
            </h2>
          </div>

          <button
            onClick={nextStudent}
            disabled={selectedStudentIndex === students.length - 1}
            className="p-2 bg-emerald-200 rounded-full hover:bg-emerald-300 disabled:opacity-40"
          >
            <ChevronRight />
          </button>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={loading || !isEdited}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
            isEdited
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md'
              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save All'}
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl shadow-lg p-4 border border-emerald-200">
        <table className="min-w-full text-sm text-left border-collapse">
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
              <tr key={subject.subject_id} className="border-b hover:bg-emerald-50">
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
        🥥 Keep calm, stay fresh and teach with a smile!
      </div>
    </div>
  );
}
