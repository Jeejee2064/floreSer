'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Calendar, Clock, User, BookOpen, Grid, List, Table } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
    '9:15am-10:15am',
    '11:00am-11:45am',
    '11:45am-12:30pm',
    '1:00pm-3:00pm'
];

// Teacher color mapping
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

export default function SchedulePage() {
    const [scheduleData, setScheduleData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [filterTeacher, setFilterTeacher] = useState('All');
    const [teachers, setTeachers] = useState([]);
    const [viewMode, setViewMode] = useState('day'); // 'day', 'teacher-week', 'grid'

    useEffect(() => {
        fetchSchedule();
    }, []);

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('schedule')
                .select('*')
                .order('day', { ascending: true })
                .order('time', { ascending: true });

            if (error) throw error;

            setScheduleData(data || []);

            const uniqueTeachers = [...new Set(data?.map(item => item.teacher).filter(Boolean))];
            setTeachers(uniqueTeachers.sort());
        } catch (error) {
            console.error('Error fetching schedule:', error);
            alert('❌ Error loading schedule');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredSchedule = () => {
        let filtered = scheduleData.filter(item => item.day === selectedDay);

        if (filterTeacher !== 'All') {
            filtered = filtered.filter(item => item.teacher === filterTeacher);
        }

        return filtered;
    };

    const getTeacherWeekSchedule = (teacher) => {
        return scheduleData.filter(item => item.teacher === teacher);
    };

    const groupByTimeSlot = (data) => {
        const grouped = {};
        TIME_SLOTS.forEach(slot => {
            grouped[slot] = data.filter(item => item.time === slot);
        });
        return grouped;
    };

    const groupByDay = (data) => {
        const grouped = {};
        DAYS.forEach(day => {
            grouped[day] = data.filter(item => item.day === day);
        });
        return grouped;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-cyan-100 via-lime-100 to-amber-100 flex items-center justify-center">
                <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-cyan-600 animate-bounce" />
                    <p className="text-lg font-semibold text-cyan-800">Loading schedule...</p>
                </div>
            </div>
        );
    }

// DAY VIEW
if (viewMode === 'day') {
  const filteredSchedule = getFilteredSchedule();
  const groupedByTime = groupByTimeSlot(filteredSchedule);

  // Get teachers appearing that day
  const teachersForDay = [...new Set(filteredSchedule.map(c => c.teacher))].sort();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-100 via-lime-100 to-amber-100 p-3 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center mb-4"
      >
        <h1 className="text-2xl sm:text-3xl font-extrabold text-cyan-800 mb-1">
          🗓️ {selectedDay} Schedule
        </h1>
        <p className="text-turquoise-500 text-sm">Floreser Bocas del Toro 2025-2026</p>
      </motion.div>

      {/* Controls */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="mb-4 bg-white rounded-xl shadow-md p-3 border border-cyan-200"
      >
        <div className="flex flex-wrap gap-2 mb-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setViewMode('day')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-semibold bg-cyan-500 text-white shadow-md"
          >
            <Calendar className="w-3 h-3" /> Day View
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setViewMode('teacher-week')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-semibold bg-cyan-100 text-turquoise-500 hover:bg-cyan-200"
          >
            <User className="w-3 h-3" /> Teacher Week
          </motion.button>

        </div>

        {/* Day Selector */}
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((day, idx) => (
            <motion.button
              key={day}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05, ease: "easeOut" }}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${
                selectedDay === day
                  ? 'bg-cyan-500 text-white shadow-md scale-105'
                  : 'bg-cyan-100 text-turquoise-500 hover:bg-cyan-200'
              }`}
            >
              {day}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Schedule Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="bg-white rounded-xl shadow-lg overflow-x-auto border border-cyan-200"
      >
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-cyan-600 text-white">
              <th className="p-2 sticky left-0 bg-cyan-600 z-10 border-r border-cyan-500 w-32">Time</th>
              {teachersForDay.map((teacher, idx) => (
                <motion.th 
                  key={teacher} 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + idx * 0.05, ease: "easeOut" }}
                  className="p-2 border-l border-cyan-500 text-center"
                >
                  {teacher}
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

                {teachersForDay.map((teacher, teacherIdx) => {
                  const classItem = groupedByTime[slot]?.find((c) => c.teacher === teacher);
                  const color = TEACHER_COLORS[teacher] || 'bg-gray-50 border-gray-400 text-gray-900';

                  return (
                    <td key={`${slot}-${teacher}`} className="p-1 border-l border-cyan-100">
                      {classItem ? (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ 
                            duration: 0.3, 
                            delay: 0.5 + slotIdx * 0.08 + teacherIdx * 0.03,
                            ease: "easeOut"
                          }}
                          whileHover={{ scale: 1.02, y: -2 }}
                          className={`rounded-lg p-2 border text-[9px] leading-tight ${color}`}
                        >
                          <div className="font-bold text-xs mb-1">{classItem.subject}</div>
                          {classItem.students && (
                            <div className="text-[9px] leading-snug">{classItem.students}</div>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.3 }}
                          transition={{ duration: 0.3, delay: 0.5 + slotIdx * 0.08 }}
                          className="min-h-[60px] bg-gray-50 bg-opacity-30 rounded" 
                        />
                      )}
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

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


    // TEACHER WEEK VIEW
    if (viewMode === 'teacher-week') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-cyan-100 via-lime-100 to-amber-100 p-3 sm:p-6">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="text-center mb-4"
                >
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-cyan-800 mb-1">
                        👨‍🏫 Teacher Weekly Schedules
                    </h1>
                    <p className="text-turquoise-500 text-sm">Floreser Bocas del Toro 2025-2026</p>
                </motion.div>

                {/* View Mode Selector */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                    className="mb-4 bg-white rounded-xl shadow-md p-3 border border-cyan-200"
                >
                    <div className="flex flex-wrap gap-2">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setViewMode('day')}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-semibold bg-cyan-100 text-turquoise-500 hover:bg-cyan-200 transition-all"
                        >
                            <Calendar className="w-3 h-3" />
                            Day View
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setViewMode('teacher-week')}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-semibold bg-cyan-500 text-white shadow-md"
                        >
                            <User className="w-3 h-3" />
                            Teacher Week
                        </motion.button>
           
                    </div>
                </motion.div>

                {/* Teachers Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {teachers
                        .filter((teacher) => scheduleData.filter(item => item.teacher === teacher).length > 1)
                        .map((teacher, teacherIdx) => {
                            const teacherSchedule = getTeacherWeekSchedule(teacher);
                            const groupedByDay = groupByDay(teacherSchedule);
                            const teacherColor = TEACHER_COLORS[teacher] || 'bg-gray-50 border-gray-400 text-gray-900';

                            return (
                                <motion.div 
                                    key={teacher} 
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ 
                                        duration: 0.4, 
                                        delay: 0.2 + teacherIdx * 0.08,
                                        ease: "easeOut"
                                    }}
                                    whileHover={{ scale: 1.02, y: -4 }}
                                    className={`rounded-xl p-3 border-2 shadow-lg ${teacherColor}`}
                                >
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-current border-opacity-30">
                                        <User className="w-5 h-5" />
                                        <h2 className="text-lg font-bold">{teacher}</h2>
                                    </div>

                                    <div className="space-y-2">
                                        {DAYS.map((day, dayIdx) => {
                                            const dayClasses = groupedByDay[day];
                                            if (!dayClasses || dayClasses.length === 0) return null;

                                            return (
                                                <motion.div 
                                                    key={day} 
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ 
                                                        duration: 0.3, 
                                                        delay: 0.3 + teacherIdx * 0.08 + dayIdx * 0.05,
                                                        ease: "easeOut"
                                                    }}
                                                    className="bg-white bg-opacity-60 rounded-lg p-2"
                                                >
                                                    <h3 className="text-xs font-bold mb-1.5 text-blue-800">{day}</h3>
                                                    <div className="space-y-1">
                                                        {dayClasses.map((classItem, idx) => (
                                                            <motion.div 
                                                                key={idx} 
                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ 
                                                                    duration: 0.2, 
                                                                    delay: 0.4 + teacherIdx * 0.08 + dayIdx * 0.05 + idx * 0.03,
                                                                    ease: "easeOut"
                                                                }}
                                                                whileHover={{ scale: 1.02, x: 2 }}
                                                                className="text-[10px] leading-relaxed bg-white bg-opacity-80 rounded p-1.5"
                                                            >
                                                                <div className="font-semibold">{classItem.time}</div>
                                                                <div className="flex items-start gap-1">
                                                                    <BookOpen className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                                                                    <span className="font-medium">{classItem.subject}</span>
                                                                </div>
                                                                {classItem.students && (
                                                                    <div className="mt-0.5 opacity-80">{classItem.students}</div>
                                                                )}
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            );
                        })}

                </div>

                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="mt-4 text-center text-xs text-turquoise-500 italic"
                >
                    🥥 Floreser Bocas del Toro
                </motion.div>
            </div>
        );
    }


}