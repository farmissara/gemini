import React from 'react';
import { createRoot } from 'react-dom/client';
import { TimetableScheduleView } from './src/views/TimetableScheduleView';
import {
  INITIAL_COURSES,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_TIMETABLE_SLOTS,
} from './src/data/mockData';
import { DEFAULT_SCHOOL_PERIODS } from './src/lib/schoolPeriods';
import './src/index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Preview root element was not found.');
}

createRoot(root).render(
  <div className="h-screen p-3">
    <TimetableScheduleView
      slots={INITIAL_TIMETABLE_SLOTS}
      courses={INITIAL_COURSES}
      teachers={INITIAL_TEACHERS}
      students={INITIAL_STUDENTS}
      onAddSlot={async () => undefined}
      onDeleteSlot={async () => undefined}
      schoolPeriods={DEFAULT_SCHOOL_PERIODS}
      onSaveSchoolPeriods={async () => undefined}
      lang="th"
      currentRole="admin"
      schoolName="โรงเรียนตัวอย่าง"
      academicYear="2569 (2026)"
      currentSemester="2"
      semesterOptions={['1', '2', 'ภาคฤดูร้อน']}
    />
  </div>,
);
