'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Calendar, User, BookOpen, GraduationCap } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
    '9:15am-10:15am',
    '11:00am-11:45am',
    '11:45am-12:30pm',
    '1:00pm-3:00pm'
];

// Teacher/Subject color mapping
const TEACHER_COLORS = {
    'Jerome': 'bg-yellow-50 border-yellow-400 text-yellow-900',
    'Jo': 'bg-blue-50 border-blue-400 text-blue-900',
    'Sarah': 'bg-green-50 border-green-400 text-green-900',
    'Emily': 'bg-red-50 border-red-400 text-red-900',
    'Laurie': 'bg-orange-50 border-orange-400 text-orange-900',
    'Nadir': 'bg-purple-50 border-purple-400 text-purple-900',
    'Lucia': 'bg-pink-50 border-pink-400 text-pink-900',
    'Ana': 'bg-indigo-50 border-indigo-400 text-indigo-900',
    'Lucia/Ana': 'bg-pink-50 border-pink-400 text-pink-900',
};

export default function StudentSchedulePage() {
    const [students, setStudents] = useState([]);
    const [scheduleData, setScheduleData] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [studentSchedule, setStudentSchedule] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedStudent) {
            generateStudentSchedule();
        }
    }, [selectedStudent, scheduleData]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch students
            const { data: studentsData, error: studentsError } = await supabase
                .from('students')
                .select('full_name')
                .order('full_name', { ascending: true });

            if (studentsError) throw studentsError;

            // Fetch schedule
            const { data: scheduleDataFetch, error: scheduleError } = await supabase
                .from('schedule')
                .select('*')
                .order('day', { ascending: true })
                .order('time', { ascending: true });

            if (scheduleError) throw scheduleError;

            setStudents(studentsData || []);
            setScheduleData(scheduleDataFetch || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('❌ Error loading data');
        } finally {
            setLoading(false);
        }
    };

const generatePDF = async (studentName, schedule) => {
  if (!schedule.length) {
    alert('No schedule to export.');
    return;
  }

  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const { saveAs } = await import('file-saver');

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 landscape
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const textFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 🎨 Match Tailwind color palettes to rgb()
  const COLORS = {
    'Jerome': rgb(1.0, 0.992, 0.878), // yellow-50
    'Jo': rgb(0.93, 0.97, 1.0),       // blue-50
    'Sarah': rgb(0.945, 0.992, 0.945), // green-50
    'Emily': rgb(1.0, 0.945, 0.945),   // red-50
    'Laurie': rgb(1.0, 0.972, 0.93),   // orange-50
    'Nadir': rgb(0.97, 0.95, 1.0),     // purple-50
    'Lucia': rgb(1.0, 0.95, 0.98),     // pink-50
    'Ana': rgb(0.945, 0.945, 0.992),   // indigo-50
    'Lucia/Ana': rgb(1.0, 0.95, 0.98), // pink-50 again
  };

  const grouped = groupByDayAndTime(schedule);

  // === Header ===
  page.drawText('Floreser Bocas del Toro 2025-2026', {
    x: 40,
    y: 100,
    size: 14,
    font,
    color: rgb(0.1, 0.5, 0.7),
  });

  page.drawText(`${studentName}'s Weekly Schedule`, {
    x: 40,
    y: 140,
    size: 24,
    font,
    color: rgb(0.1, 0.3, 0.5),
  });

  // === Table grid ===
  const tableTop = height - 100;
  const tableLeft = 40;
  const colWidth = (width - tableLeft - 40) / (DAYS.length + 1);
  const rowHeight = 70;

  // Header Row - Draw background first, then text
  page.drawRectangle({
    x: tableLeft,
    y: tableTop,
    width: colWidth,
    height: rowHeight,
    color: rgb(0.85, 0.97, 1),
  });
  
  page.drawText('Time', {
    x: tableLeft + colWidth / 2 - 15, // Center the text
    y: tableTop + rowHeight / 2 - 5,
    size: 11,
    font,
    color: rgb(0, 0.3, 0.5),
  });

  DAYS.forEach((day, i) => {
    const x = tableLeft + (i + 1) * colWidth;
    
    // Draw background first
    page.drawRectangle({
      x,
      y: tableTop,
      width: colWidth,
      height: rowHeight,
      color: rgb(0.1, 0.6, 0.8),
    });
    
    // Then draw text on top
    page.drawText(day, {
      x: x + colWidth / 2 - 15, // Center the text
      y: tableTop + rowHeight / 2 - 5,
      size: 11,
      font,
      color: rgb(1, 1, 1),
    });
  });

  // Rows
  TIME_SLOTS.forEach((slot, rIdx) => {
    const y = tableTop - (rIdx + 1) * rowHeight;

    // Time column - background first
    page.drawRectangle({
      x: tableLeft,
      y,
      width: colWidth,
      height: rowHeight,
      color: rgb(0.93, 0.98, 1),
    });
    
    // Then text
    page.drawText(slot, {
      x: tableLeft + 10,
      y: y + rowHeight / 2 - 5,
      size: 10,
      font: textFont,
      color: rgb(0, 0.3, 0.5),
    });

    // Each day
    DAYS.forEach((day, cIdx) => {
      const x = tableLeft + (cIdx + 1) * colWidth;
      const classItem = grouped[day][slot];

      const bgColor = classItem
        ? COLORS[classItem.teacher] || rgb(0.97, 0.97, 0.97)
        : rgb(0.98, 0.98, 0.98);

      // Background cell - draw first
      page.drawRectangle({
        x,
        y,
        width: colWidth,
        height: rowHeight,
        color: bgColor,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.5,
      });

      if (classItem) {
        // Subject text - on top of background
        const subjectText = classItem.subject || '';
        const maxSubjectWidth = colWidth - 16; // Padding on both sides
        
        // Truncate long subject names
        let displaySubject = subjectText;
        if (subjectText.length > 20) {
          displaySubject = subjectText.substring(0, 17) + '...';
        }
        
        page.drawText(displaySubject, {
          x: x + 8,
          y: y + rowHeight - 25,
          size: 10,
          font,
          color: rgb(0.1, 0.1, 0.1),
          maxWidth: maxSubjectWidth,
        });

        // Teacher text
        page.drawText(`${classItem.teacher}`, {
          x: x + 8,
          y: y + 15,
          size: 9,
          font: textFont,
          color: rgb(0.25, 0.25, 0.25),
          maxWidth: colWidth - 16,
        });
      }
    });
  });



  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  saveAs(blob, `${studentName.replace(/\s+/g, '_')}_Schedule.pdf`);
};


    const generateStudentSchedule = () => {
        if (!selectedStudent) return;

        // Find all classes where the student appears in the students field
        const studentClasses = scheduleData.filter(classItem => {
            if (!classItem.students) return false;
            
            // Check if student name appears in the students string
            const studentsInClass = classItem.students.toLowerCase();
            const studentNameLower = selectedStudent.toLowerCase();
            
            return studentsInClass.includes(studentNameLower);
        });

        setStudentSchedule(studentClasses);
    };

    const groupByDay = (data) => {
        const grouped = {};
        DAYS.forEach(day => {
            grouped[day] = data.filter(item => item.day === day);
        });
        return grouped;
    };

    const groupByDayAndTime = (data) => {
        const grouped = {};
        DAYS.forEach(day => {
            grouped[day] = {};
            TIME_SLOTS.forEach(slot => {
                const classAtTime = data.find(item => item.day === day && item.time === slot);
                grouped[day][slot] = classAtTime || null;
            });
        });
        return grouped;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-cyan-100 via-lime-100 to-amber-100 flex items-center justify-center">
                <div className="text-center">
                    <GraduationCap className="w-12 h-12 mx-auto mb-3 text-cyan-600 animate-bounce" />
                    <p className="text-lg font-semibold text-cyan-800">Loading students...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-100 via-lime-100 to-amber-100 p-3 sm:p-6">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-center mb-4"
            >
                <h1 className="text-2xl sm:text-3xl font-extrabold text-cyan-800 mb-1">
                    🎒 My Personal Schedule
                </h1>
                <p className="text-turquoise-500 text-sm">Floreser Bocas del Toro 2025-2026</p>
            </motion.div>

            {/* Student Selector */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                className="mb-4 bg-white rounded-xl shadow-md p-4 border border-cyan-200"
            >
                <label className="block text-sm font-semibold text-cyan-800 mb-2">
                    Select Your Name:
                </label>
                <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-full max-w-400 px-4 py-2 text-sm border-2 border-cyan-300 rounded-lg focus:outline-none focus:border-cyan-500 bg-white text-cyan-900"
                >
                    <option value="">Choose a student...</option>
                    {students.map((student) => (
                        <option key={student.full_name} value={student.full_name}>
                            {student.full_name}
                        </option>
                    ))}
                </select>
            </motion.div>

            {/* Student Schedule */}
            {selectedStudent && studentSchedule.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                >
                    <div className="bg-white rounded-xl shadow-lg p-4 border border-cyan-200 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <User className="w-5 h-5 text-cyan-600" />
                            <h2 className="text-xl font-bold text-cyan-800">{selectedStudent}'s Weekly Schedule</h2>
                        </div>
                        <p className="text-sm text-cyan-600">
                            {studentSchedule.length} {studentSchedule.length === 1 ? 'class' : 'classes'} this week
                        </p>
                    </div>

                    {/* Schedule Grid */}
                    <div className="bg-white rounded-xl shadow-lg overflow-x-auto border border-cyan-200">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-cyan-600 text-white">
                                    <th className="p-2 sticky left-0 bg-cyan-600 z-10 border-r border-cyan-500 w-32">
                                        Time
                                    </th>
                                    {DAYS.map((day, idx) => (
                                        <motion.th
                                            key={day}
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: 0.3 + idx * 0.05, ease: "easeOut" }}
                                            className="p-2 border-l border-cyan-500 text-center min-w-[140px]"
                                        >
                                            {day}
                                        </motion.th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {TIME_SLOTS.map((slot, slotIdx) => (
                                    <motion.tr
                                        key={slot}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.4, delay: 0.4 + slotIdx * 0.08, ease: "easeOut" }}
                                        className="border-t border-cyan-200 align-top"
                                    >
                                        <td className="p-2 font-semibold bg-cyan-50 sticky left-0 border-r border-cyan-200 text-cyan-800 w-32">
                                            {slot}
                                        </td>

                                        {DAYS.map((day, dayIdx) => {
                                            const classItem = studentSchedule.find(
                                                item => item.day === day && item.time === slot
                                            );
                                            const color = classItem 
                                                ? TEACHER_COLORS[classItem.teacher] || 'bg-gray-50 border-gray-400 text-gray-900'
                                                : '';

                                            return (
                                                <td key={`${slot}-${day}`} className="p-1 border-l border-cyan-100">
                                                    {classItem ? (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{
                                                                duration: 0.3,
                                                                delay: 0.5 + slotIdx * 0.08 + dayIdx * 0.03,
                                                                ease: "easeOut"
                                                            }}
                                                            whileHover={{ scale: 1.03, y: -2 }}
                                                            className={`rounded-lg p-2 border-2 text-sm leading-tight ${color}`}
                                                        >
                                                            <div className="font-bold text-xs mb-1">
                                                                {classItem.subject}
                                                            </div>
                                                            <div className="flex items-center gap-1 opacity-80">
                                                                <User className="w-2.5 h-2.5" />
                                                                <span>{classItem.teacher}</span>
                                                            </div>
                                                        </motion.div>
                                                    ) : (
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 0.3 }}
                                                            transition={{ duration: 0.3, delay: 0.5 + slotIdx * 0.08 }}
                                                            className="min-h-[60px] bg-gray-50 bg-opacity-30 rounded flex items-center justify-center text-gray-400"
                                                        >
                                                            -
                                                        </motion.div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="text-center mt-4">
  <button
    onClick={() => generatePDF(selectedStudent, studentSchedule)}
    className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition"
  >
    📄 Download {selectedStudent}'s Schedule (PDF)
  </button>
</div>
                </motion.div>
            )}

            {selectedStudent && studentSchedule.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 text-center"
                >
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-yellow-600" />
                    <p className="text-yellow-800 font-semibold">
                        No classes found for {selectedStudent}
                    </p>
                    <p className="text-yellow-600 text-sm mt-2">
                        This student might not be enrolled in any classes yet.
                    </p>
                </motion.div>
            )}

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="mt-4 text-center text-xs text-turquoise-500 italic"
            >
                🥥 Floreser Bocas del Toro
            </motion.div>
        </div>
    );
}