import React, { useState } from 'react';
import { Student } from '../types';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MessageSquare, 
  Award, 
  Phone, 
  Mail, 
  ExternalLink,
  CheckCircle,
  XCircle,
  FileText,
  UserCheck
} from 'lucide-react';

interface StudentsViewProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onOpenReportCard: (student: Student) => void;
  onToggleLineSync: (studentId: string) => void;
  onAddStudent: (newStudent: Student) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onSelectStudent,
  onOpenReportCard,
  onToggleLineSync,
  onAddStudent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New student form state
  const [formData, setFormData] = useState({
    firstNameEn: '',
    lastNameEn: '',
    firstNameTh: '',
    lastNameTh: '',
    studentIdNumber: `ED-${Math.floor(6900 + Math.random() * 90)}`,
    nationalId: '1-1002-00' + Math.floor(100 + Math.random() * 899) + '-44-1',
    gender: 'male' as 'male' | 'female' | 'other',
    dateOfBirth: '2008-05-10',
    gradeLevel: 'Grade 10 (M.4)',
    room: 'Room 401 (Sci-Math)',
    guardianName: '',
    guardianPhone: '081-',
    guardianEmail: '',
    gpa: 3.50,
  });

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.firstNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.lastNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.firstNameTh.includes(searchTerm) ||
      s.lastNameTh.includes(searchTerm) ||
      s.studentIdNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.room.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGrade = gradeFilter === 'all' || s.gradeLevel.includes(gradeFilter);

    return matchesSearch && matchesGrade;
  });

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstNameEn || !formData.lastNameEn || !formData.firstNameTh) return;

    const newStudent: Student = {
      id: `stu-${Date.now()}`,
      studentIdNumber: formData.studentIdNumber,
      nationalId: formData.nationalId,
      firstNameEn: formData.firstNameEn,
      lastNameEn: formData.lastNameEn,
      firstNameTh: formData.firstNameTh,
      lastNameTh: formData.lastNameTh,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth,
      gradeLevel: formData.gradeLevel,
      room: formData.room,
      status: 'active',
      avatarUrl: formData.gender === 'female' 
        ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
      gpa: Number(formData.gpa),
      guardianName: formData.guardianName || 'Parent / Guardian',
      guardianRelation: 'Guardian',
      guardianPhone: formData.guardianPhone || '081-000-0000',
      guardianEmail: formData.guardianEmail || 'guardian@email.com',
      lineLinked: false,
      lineNotifyEnabled: false,
      enrolledDate: '2026-05-15',
    };

    onAddStudent(newStudent);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Student Information System (SIS)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage student registrations, Thai/English identity, guardian contacts, and LINE OA notification status.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Student</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by ID, English name, or ชื่อภาษาไทย..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Grade Level:</span>
          </div>
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Grades</option>
            <option value="10">Grade 10 (M.4)</option>
            <option value="11">Grade 11 (M.5)</option>
            <option value="12">Grade 12 (M.6)</option>
          </select>

          <span className="text-xs text-slate-400 ml-auto">
            Showing <strong className="text-white">{filteredStudents.length}</strong> students
          </span>
        </div>
      </div>

      {/* Students Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-800/40">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Student</th>
              <th className="py-3.5 px-4">Thai Name</th>
              <th className="py-3.5 px-4">Class &amp; Room</th>
              <th className="py-3.5 px-4">GPA</th>
              <th className="py-3.5 px-4">Guardian / LINE OA</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-slate-800/60 transition-colors group">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={student.avatarUrl}
                      alt={student.firstNameEn}
                      className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                    <div>
                      <div className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {student.firstNameEn} {student.lastNameEn}
                      </div>
                      <div className="text-[11px] font-mono text-indigo-400">
                        {student.studentIdNumber}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <div className="text-slate-200 font-medium">
                    {student.firstNameTh} {student.lastNameTh}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    ID: {student.nationalId || 'N/A'}
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <div className="text-slate-200 font-medium">{student.gradeLevel}</div>
                  <div className="text-[11px] text-slate-400">{student.room}</div>
                </td>

                <td className="py-3.5 px-4">
                  <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs ${
                    student.gpa >= 3.5 
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                      : student.gpa >= 3.0 
                      ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {student.gpa.toFixed(2)}
                  </span>
                </td>

                <td className="py-3.5 px-4">
                  <div className="text-slate-300 font-medium">{student.guardianName} ({student.guardianRelation})</div>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => onToggleLineSync(student.id)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                        student.lineLinked
                          ? 'bg-[#06C755]/15 text-[#06C755] border border-[#06C755]/30 hover:bg-[#06C755]/25'
                          : 'bg-slate-700/60 text-slate-400 border border-slate-700 hover:text-slate-200'
                      }`}
                      title={student.lineLinked ? 'LINE Connected (Click to toggle)' : 'Not Connected to LINE (Click to link)'}
                    >
                      <MessageSquare className="w-2.5 h-2.5 fill-current" />
                      {student.lineLinked ? 'LINE Linked' : 'Connect LINE'}
                    </button>
                    <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                      <Phone className="w-2.5 h-2.5" /> {student.guardianPhone}
                    </span>
                  </div>
                </td>

                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onOpenReportCard(student)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center gap-1 transition-colors"
                      title="View Thai/English Transcript"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Report Card</span>
                    </button>

                    <button
                      onClick={() => onSelectStudent(student)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
                    >
                      Profile
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  Enroll New Student (เพิ่มนักเรียนใหม่)
                </h3>
                <p className="text-xs text-slate-400">Register student with bilingual Thai and English credentials.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">First Name (English)</label>
                  <input
                    type="text"
                    required
                    value={formData.firstNameEn}
                    onChange={(e) => setFormData({ ...formData, firstNameEn: e.target.value })}
                    placeholder="e.g. Chatri"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Last Name (English)</label>
                  <input
                    type="text"
                    required
                    value={formData.lastNameEn}
                    onChange={(e) => setFormData({ ...formData, lastNameEn: e.target.value })}
                    placeholder="e.g. Suksom"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">ชื่อจริง (ภาษาไทย)</label>
                  <input
                    type="text"
                    required
                    value={formData.firstNameTh}
                    onChange={(e) => setFormData({ ...formData, firstNameTh: e.target.value })}
                    placeholder="เช่น ชาตรี"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">นามสกุล (ภาษาไทย)</label>
                  <input
                    type="text"
                    required
                    value={formData.lastNameTh}
                    onChange={(e) => setFormData({ ...formData, lastNameTh: e.target.value })}
                    placeholder="เช่น สุขสม"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Student ID</label>
                  <input
                    type="text"
                    value={formData.studentIdNumber}
                    onChange={(e) => setFormData({ ...formData, studentIdNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-indigo-400 font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Grade Level</label>
                  <select
                    value={formData.gradeLevel}
                    onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Grade 10 (M.4)">Grade 10 (M.4)</option>
                    <option value="Grade 11 (M.5)">Grade 11 (M.5)</option>
                    <option value="Grade 12 (M.6)">Grade 12 (M.6)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Room / Program</label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Guardian Name</label>
                  <input
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    placeholder="e.g. Somsak Suksom"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Guardian Phone</label>
                  <input
                    type="text"
                    value={formData.guardianPhone}
                    onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                    placeholder="08X-XXX-XXXX"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30"
                >
                  Save &amp; Enroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
