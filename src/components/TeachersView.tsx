import React, { useState } from 'react';
import { Teacher, AppLanguage, UserRole, TeacherPortfolioWork } from '../types';
import { 
  GraduationCap, 
  Search, 
  Filter, 
  Plus, 
  Mail, 
  Phone, 
  Award, 
  BookOpen, 
  ShieldCheck, 
  Edit3, 
  Trash2, 
  Download, 
  CheckCircle2, 
  MessageSquare,
  X,
  UserCheck,
  Building2,
  Camera,
  Sparkles,
  TrendingUp,
  FileCheck2,
  FileText,
  BrainCircuit,
  ExternalLink,
  Target,
  BarChart3,
  Calendar,
  Tag
} from 'lucide-react';
import { ImageCaptureUploadModal } from './ImageCaptureUploadModal';

interface TeachersViewProps {
  teachers: Teacher[];
  lang: AppLanguage;
  currentRole: UserRole;
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onOpenImportExport?: () => void;
}

export const TeachersView: React.FC<TeachersViewProps> = ({
  teachers,
  lang,
  currentRole,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onOpenImportExport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState<Teacher | null>(null);
  const [detailTab, setDetailTab] = useState<'profile' | 'pa_portfolio' | 'teaching_analytics'>('profile');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Image Capture / Upload Modal State
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<'form' | 'detail'>('form');

  // New PA Portfolio Work state in detail modal
  const [showAddPaModal, setShowAddPaModal] = useState(false);
  const [paTitle, setPaTitle] = useState('');
  const [paCategory, setPaCategory] = useState<TeacherPortfolioWork['category']>('pa_agreement');
  const [paAspect, setPaAspect] = useState<TeacherPortfolioWork['paAspect']>('ด้านที่ 1 การจัดการเรียนรู้');
  const [paYear, setPaYear] = useState('2569');
  const [paDescription, setPaDescription] = useState('');
  const [paEvidenceType, setPaEvidenceType] = useState<TeacherPortfolioWork['evidenceType']>('pdf');
  const [paFileUrl, setPaFileUrl] = useState('');

  // Form state for adding/editing
  const [formData, setFormData] = useState<Partial<Teacher>>({
    teacherIdNumber: `TCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    fullNameTh: '',
    fullNameEn: '',
    gender: 'male',
    email: '',
    phone: '',
    academicDegree: 'ปริญญาตรี กศ.บ. การศึกษาศาสตร์',
    major: 'การสอนและพัฒนาหลักสูตร',
    minor: 'เทคโนโลยีสารสนเทศและการสื่อสาร (ICT)',
    academicStanding: 'ครูชำนาญการ (คศ.2)',
    department: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
    teacherLicenseNo: 'คส. 63109000' + Math.floor(1000 + Math.random() * 9000),
    teachingSubjects: [],
    homeroomClasses: [],
    teachingGrades: ['มัธยมศึกษาปีที่ 4 (M.4)'],
    isSchoolAdmin: false,
    lineLinked: true,
    teachingExperienceYears: 5,
    otherSkills: ['Active Learning', 'การใช้สื่อดิจิทัลเพื่อการศึกษา'],
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  });

  const [subjectInput, setSubjectInput] = useState('');
  const [homeroomInput, setHomeroomInput] = useState('');
  const [newSkillInput, setNewSkillInput] = useState('');

  const departments = [
    'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
    'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
    'กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ',
    'กลุ่มสาระการเรียนรู้ภาษาไทย',
    'กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม',
    'กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา',
    'กลุ่มสาระการเรียนรู้ศิลปะ',
    'กลุ่มสาระการเรียนรู้การงานอาชีพ',
  ];

  const academicStandings = [
    'ครูผู้ช่วย',
    'ครู คศ.1',
    'ครูชำนาญการ (คศ.2)',
    'ครูชำนาญการพิเศษ (คศ.3)',
    'ครูเชี่ยวชาญ (คศ.4)',
    'ครูเชี่ยวชาญพิเศษ (คศ.5)',
  ];

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.fullNameTh.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.fullNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.teacherIdNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.major.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.minor && t.minor.toLowerCase().includes(searchTerm.toLowerCase())) ||
      t.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.teachingSubjects.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.otherSkills && t.otherSkills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesDept = departmentFilter === 'all' || t.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const handleOpenAdd = () => {
    setFormData({
      teacherIdNumber: `TCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      fullNameTh: '',
      fullNameEn: '',
      gender: 'male',
      email: '',
      phone: '',
      academicDegree: 'ปริญญาตรี กศ.บ. การศึกษาศาสตร์',
      major: 'การสอนและนวัตกรรมการศึกษา',
      minor: 'เทคโนโลยีสารสนเทศและการสื่อสาร',
      academicStanding: 'ครูชำนาญการ (คศ.2)',
      department: departments[0],
      teacherLicenseNo: 'คส. 63109000' + Math.floor(1000 + Math.random() * 9000),
      teachingSubjects: ['คณิตศาสตร์พื้นฐาน ม.4'],
      homeroomClasses: ['ห้อง 401'],
      teachingGrades: ['มัธยมศึกษาปีที่ 4 (M.4)'],
      isSchoolAdmin: false,
      lineLinked: true,
      teachingExperienceYears: 6,
      otherSkills: ['Active Learning', 'Canva for Education', 'AI for Teachers'],
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    });
    setEditingTeacher(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      ...teacher,
    });
    setShowAddModal(true);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullNameTh || !formData.email) return;

    if (editingTeacher) {
      const updated: Teacher = {
        ...editingTeacher,
        ...(formData as Teacher),
      };
      onUpdateTeacher(updated);
      if (selectedTeacherForDetail && selectedTeacherForDetail.id === updated.id) {
        setSelectedTeacherForDetail(updated);
      }
    } else {
      const newTeacher: Teacher = {
        id: `tch-${Date.now()}`,
        teacherIdNumber: formData.teacherIdNumber || `TCH-${Date.now()}`,
        fullNameTh: formData.fullNameTh || '',
        fullNameEn: formData.fullNameEn || formData.fullNameTh || '',
        gender: formData.gender || 'male',
        email: formData.email || '',
        phone: formData.phone || '',
        avatarUrl: formData.avatarUrl || (formData.gender === 'female'
          ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80'),
        academicDegree: formData.academicDegree || 'ปริญญาตรี',
        major: formData.major || 'การศึกษา',
        minor: formData.minor || 'ทั่วไป',
        academicStanding: formData.academicStanding || 'ครูชำนาญการ (คศ.2)',
        department: formData.department || departments[0],
        teacherLicenseNo: formData.teacherLicenseNo || 'คส. 631090001234',
        teachingSubjects: formData.teachingSubjects || [],
        homeroomClasses: formData.homeroomClasses || [],
        teachingGrades: formData.teachingGrades || ['มัธยมศึกษาปีที่ 4 (M.4)'],
        isSchoolAdmin: Boolean(formData.isSchoolAdmin),
        lineLinked: true,
        teachingExperienceYears: Number(formData.teachingExperienceYears) || 1,
        otherSkills: formData.otherSkills || ['Active Learning'],
        paScore: 85.0,
        paPortfolio: [],
      };
      onAddTeacher(newTeacher);
    }

    setShowAddModal(false);
    setEditingTeacher(null);
  };

  // Handle Photo selection from camera or upload
  const handlePhotoSelected = (newAvatarUrl: string) => {
    if (photoTarget === 'form') {
      setFormData((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));
    } else if (photoTarget === 'detail' && selectedTeacherForDetail) {
      const updated = {
        ...selectedTeacherForDetail,
        avatarUrl: newAvatarUrl,
      };
      setSelectedTeacherForDetail(updated);
      onUpdateTeacher(updated);
    }
  };

  // Handle Adding PA Portfolio item to selected teacher
  const handleAddPaItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherForDetail || !paTitle.trim()) return;

    const newPaWork: TeacherPortfolioWork = {
      id: `pa-${Date.now()}`,
      title: paTitle.trim(),
      category: paCategory,
      paAspect: paAspect,
      academicYear: paYear,
      description: paDescription.trim(),
      evidenceType: paEvidenceType,
      fileUrl: paFileUrl.trim() || undefined,
      verifiedStatus: 'approved',
      dateSubmitted: new Date().toISOString().split('T')[0],
      targetStanding: selectedTeacherForDetail.academicStanding,
    };

    const updatedPortfolio = [
      ...(selectedTeacherForDetail.paPortfolio || []),
      newPaWork,
    ];

    const updatedTeacher: Teacher = {
      ...selectedTeacherForDetail,
      paPortfolio: updatedPortfolio,
      paScore: Math.min(100, Math.round(((selectedTeacherForDetail.paScore || 85) + 2) * 10) / 10),
    };

    setSelectedTeacherForDetail(updatedTeacher);
    onUpdateTeacher(updatedTeacher);

    // Reset PA form
    setPaTitle('');
    setPaDescription('');
    setPaFileUrl('');
    setShowAddPaModal(false);
  };

  const handleExportCSV = () => {
    const headers = ['รหัสครู', 'ชื่อ-สกุล (ไทย)', 'Name (English)', 'กลุ่มสาระ', 'วิทยฐานะ', 'วุฒิการศึกษา', 'วิชาเอก', 'วิชาโท', 'ประสบการณ์ (ปี)', 'ความสามารถพิเศษ', 'วิชาที่สอน', 'เบอร์โทร', 'อีเมล', 'สิทธิ์แอดมิน'];
    const rows = filteredTeachers.map((t) => [
      `"${t.teacherIdNumber}"`,
      `"${t.fullNameTh}"`,
      `"${t.fullNameEn}"`,
      `"${t.department}"`,
      `"${t.academicStanding}"`,
      `"${t.academicDegree}"`,
      `"${t.major}"`,
      `"${t.minor || '-'}"`,
      `"${t.teachingExperienceYears || '-'}"`,
      `"${(t.otherSkills || []).join('; ')}"`,
      `"${t.teachingSubjects.join(', ')}"`,
      `"${t.phone}"`,
      `"${t.email}"`,
      t.isSchoolAdmin ? '"ใช่"' : '"ไม่ใช่"',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EduVerse_Teachers_Full_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const canManage = currentRole === 'admin' || currentRole === 'super_admin';

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            {lang === 'th' ? 'ทำเนียบคณาจารย์และแฟ้มวิทยฐานะ (PA)' : 'Faculty & Staff Directory (PA Hub)'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'th'
              ? 'ระบบทะเบียนครูครบวงจร จัดเก็บวิชาเอก-โท แฟ้มผลงานเลื่อนวิทยฐานะ (ว.PA) และวิเคราะห์ศักยภาพการสอน'
              : 'Comprehensive faculty database with major/minor specialties, PA portfolio artifacts, and teaching analytics.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenImportExport && (
            <button
              type="button"
              onClick={onOpenImportExport}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer"
            >
              นำเข้า/ส่งออก Excel
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'ดาวน์โหลด CSV' : 'Export CSV'}</span>
          </button>

          {canManage && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'th' ? 'เพิ่มครู/บุคลากร' : 'Add Teacher'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === 'th' ? 'ค้นหาชื่อครู, รหัส, วิชาเอก, วิชาโท, ทักษะ, หรือวิชาที่สอน...' : 'Search by name, ID, major, minor, skills, subjects...'}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative w-56 hidden md:block">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{lang === 'th' ? 'ทุกกลุ่มสาระการเรียนรู้' : 'All Departments'}</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept.replace('กลุ่มสาระการเรียนรู้', '')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`p-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              viewMode === 'cards'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            การ์ดโปรไฟล์
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            ตารางรายชื่อ
          </button>
        </div>
      </div>

      {/* Teachers Cards View */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeachers.map((teacher) => (
            <div
              key={teacher.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={teacher.avatarUrl}
                        alt={teacher.fullNameTh}
                        className="w-13 h-13 rounded-2xl object-cover border-2 border-blue-500/30 shadow-sm"
                      />
                      {teacher.isSchoolAdmin && (
                        <span className="absolute -bottom-1 -right-1 p-0.5 bg-amber-500 text-white rounded-full shadow" title="School Admin">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                        {teacher.fullNameTh}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{teacher.fullNameEn}</p>
                      <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                        {teacher.academicStanding}
                      </span>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(teacher)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 text-slate-500 transition cursor-pointer"
                        title="แก้ไขข้อมูลครู"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`คุณต้องการลบข้อมูลอาจารย์ "${teacher.fullNameTh}" หรือไม่?`)) {
                            onDeleteTeacher(teacher.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition cursor-pointer"
                        title="ลบข้อมูลครู"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3.5 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{teacher.department.replace('กลุ่มสาระการเรียนรู้', '')}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">วิชาเอก:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">{teacher.major}</span>
                    </div>
                    {teacher.minor && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">วิชาโท:</span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[170px]">{teacher.minor}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">ประสบการณ์:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{teacher.teachingExperienceYears || 1} ปี</span>
                    </div>
                  </div>

                  {/* Other skills badge preview */}
                  {teacher.otherSkills && teacher.otherSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {teacher.otherSkills.slice(0, 3).map((skill, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                          ⚡ {skill}
                        </span>
                      ))}
                      {teacher.otherSkills.length > 3 && (
                        <span className="text-[10px] text-slate-400">+{teacher.otherSkills.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>ผลงาน PA: <strong>{teacher.paPortfolio?.length || 0}</strong> ชิ้น</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeacherForDetail(teacher);
                    setDetailTab('profile');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>ดูแฟ้มประวัติ & ว.PA</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">ครูผู้สอน</th>
                  <th className="px-4 py-3">กลุ่มสาระ</th>
                  <th className="px-4 py-3">วิชาเอก / โท</th>
                  <th className="px-4 py-3">วิทยฐานะ (ว.PA)</th>
                  <th className="px-4 py-3">ประสบการณ์</th>
                  <th className="px-4 py-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={teacher.avatarUrl}
                          alt={teacher.fullNameTh}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{teacher.fullNameTh}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{teacher.teacherIdNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {teacher.department.replace('กลุ่มสาระการเรียนรู้', '')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{teacher.major}</div>
                      {teacher.minor && <div className="text-[10px] text-indigo-500">โท: {teacher.minor}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold text-[10px]">
                        {teacher.academicStanding}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                      {teacher.teachingExperienceYears || 1} ปี
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTeacherForDetail(teacher);
                            setDetailTab('profile');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                        >
                          รายละเอียด
                        </button>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(teacher)}
                              className="p-1 rounded-lg hover:bg-blue-50 text-blue-600 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`คุณต้องการลบข้อมูล "${teacher.fullNameTh}" หรือไม่?`)) {
                                  onDeleteTeacher(teacher.id);
                                }
                              }}
                              className="p-1 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TEACHER DETAIL & PA PORTFOLIO & TEACHING ANALYTICS MODAL */}
      {/* ======================================================== */}
      {selectedTeacherForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div 
                  onClick={() => {
                    setPhotoTarget('detail');
                    setShowPhotoModal(true);
                  }}
                  className="relative group cursor-pointer"
                  title="แตะเพื่อถ่ายรูป หรืออัปโหลดรูปภาพใหม่"
                >
                  <img
                    src={selectedTeacherForDetail.avatarUrl}
                    alt={selectedTeacherForDetail.fullNameTh}
                    className="w-13 h-13 rounded-2xl object-cover border-2 border-blue-400 shadow-md group-hover:ring-2 group-hover:ring-blue-300 transition"
                  />
                  <span className="absolute -bottom-1 -right-1 p-1 bg-blue-600 group-hover:bg-blue-500 rounded-full text-white shadow transition">
                    <Camera className="w-3 h-3" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-extrabold text-base sm:text-lg tracking-tight">
                      {selectedTeacherForDetail.fullNameTh}
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase font-bold">
                      {selectedTeacherForDetail.academicStanding}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    {selectedTeacherForDetail.teacherIdNumber} • {selectedTeacherForDetail.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTeacherForDetail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-6 pt-3 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDetailTab('profile')}
                className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  detailTab === 'profile'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>ประวัติ & คุณวุฒิครู</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('pa_portfolio')}
                className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  detailTab === 'pa_portfolio'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileCheck2 className="w-4 h-4 text-emerald-500" />
                <span>แฟ้มผลงานเพิ่มวิทยฐานะ (ว.PA)</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {selectedTeacherForDetail.paPortfolio?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('teaching_analytics')}
                className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  detailTab === 'teaching_analytics'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <BrainCircuit className="w-4 h-4 text-indigo-500" />
                <span>วิเคราะห์การสอน & ID Plan</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: PROFILE & QUALIFICATIONS */}
              {detailTab === 'profile' && (
                <div className="space-y-6 text-xs">
                  {/* Quick Highlight Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase block">วิชาเอก (Major)</span>
                      <p className="font-extrabold text-slate-900 dark:text-white mt-1 leading-snug">{selectedTeacherForDetail.major}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900">
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase block">วิชาโท (Minor)</span>
                      <p className="font-extrabold text-slate-900 dark:text-white mt-1 leading-snug">{selectedTeacherForDetail.minor || 'ทั่วไป/บูรณาการ'}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase block">ประสบการณ์สอน</span>
                      <p className="font-extrabold text-slate-900 dark:text-white mt-1 leading-snug">{selectedTeacherForDetail.teachingExperienceYears || 1} ปี</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block">คะแนนประเมิน PA</span>
                      <p className="font-extrabold text-slate-900 dark:text-white mt-1 leading-snug">{selectedTeacherForDetail.paScore || 88.5}/100</p>
                    </div>
                  </div>

                  {/* General Qualifications Grid */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                      คุณวุฒิการศึกษาและการรับรองวิชาชีพ
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-500 block">วุฒิการศึกษาสูงสุด:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedTeacherForDetail.academicDegree}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">เลขที่ใบอนุญาตประกอบวิชาชีพครู:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{selectedTeacherForDetail.teacherLicenseNo}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">กลุ่มสาระการเรียนรู้:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedTeacherForDetail.department}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">เบอร์โทรศัพท์และอีเมล:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{selectedTeacherForDetail.phone} • {selectedTeacherForDetail.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Other Skills & Talents */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>ความสามารถพิเศษและทักษะอื่นๆ (Other Competencies & Talents)</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTeacherForDetail.otherSkills && selectedTeacherForDetail.otherSkills.length > 0 ? (
                        selectedTeacherForDetail.otherSkills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-900 font-semibold"
                          >
                            ⭐ {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-slate-400">ยังไม่มีการบันทึกทักษะเพิ่มเติม</p>
                      )}
                    </div>
                  </div>

                  {/* Teaching Subjects & Homerooms */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      <span>ภาระงานสอนและห้องที่ปรึกษา (Teaching Load)</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTeacherForDetail.teachingSubjects.map((sub, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-900 font-semibold"
                        >
                          📖 {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PA PORTFOLIO & EVIDENCE (ว.PA ก.ค.ศ.) */}
              {detailTab === 'pa_portfolio' && (
                <div className="space-y-6 text-xs">
                  {/* PA Header Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900 to-emerald-950/30 border border-emerald-500/30 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileCheck2 className="w-5 h-5 text-emerald-400" />
                        <h4 className="font-extrabold text-sm text-emerald-300">
                          แฟ้มสะสมผลงานข้อตกลงในการพัฒนางาน (ว.PA / PA Agreement)
                        </h4>
                      </div>
                      <p className="text-slate-300 mt-1">
                        รองรับเกณฑ์ ก.ค.ศ. ว9/2564 สำหรับการประเมินเพื่อขอมีหรือเลื่อนวิทยฐานะ: <strong>{selectedTeacherForDetail.academicStanding}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddPaModal(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>เพิ่มผลงาน ว.PA</span>
                    </button>
                  </div>

                  {/* PA Works List */}
                  {selectedTeacherForDetail.paPortfolio && selectedTeacherForDetail.paPortfolio.length > 0 ? (
                    <div className="space-y-3">
                      {selectedTeacherForDetail.paPortfolio.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2 hover:border-emerald-500/50 transition"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                                  {item.paAspect}
                                </span>
                                <span className="text-slate-400 font-mono text-[11px]">
                                  ปีการศึกษา {item.academicYear}
                                </span>
                              </div>
                              <h5 className="font-bold text-slate-900 dark:text-white mt-1 text-sm">
                                {item.title}
                              </h5>
                            </div>

                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>รับรองผลงานแล้ว</span>
                            </span>
                          </div>

                          <p className="text-slate-600 dark:text-slate-300 text-xs">
                            {item.description}
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-400">
                            <span>หมวด: {item.category === 'pa_agreement' ? 'ข้อตกลง PA' : item.category === 'classroom_research' ? 'วิจัยในชั้นเรียน' : item.category === 'lesson_plan' ? 'แผนการสอน Active Learning' : item.category === 'teaching_media' ? 'สื่อนวัตกรรมดิจิทัล' : 'ผลงานรางวัล'}</span>
                            <span className="font-mono">วันที่ส่ง: {item.dateSubmitted}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                      <p className="font-bold text-slate-700 dark:text-slate-300">ยังไม่มีการบันทึกผลงาน PA สำหรับอาจารย์ท่านนี้</p>
                      <p className="text-slate-500 mt-1">กดปุ่ม "เพิ่มผลงาน ว.PA" เพื่อบันทึกงานวิจัย สื่อนวัตกรรม หรือแผนการสอน</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TEACHING ANALYTICS & AI INSIGHTS */}
              {detailTab === 'teaching_analytics' && (
                <div className="space-y-6 text-xs">
                  {/* Analysis Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-500/30 text-white space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-indigo-400" />
                        <h4 className="font-extrabold text-sm text-indigo-300">
                          การวิเคราะห์ศักยภาพและการจัดการเรียนรู้เชิงลึก (Teaching Analytics)
                        </h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        Alignment Score: 96%
                      </span>
                    </div>
                    <p className="text-slate-300">
                      ระบบประมวลผลความสอดคล้องของวิชาเอก ({selectedTeacherForDetail.major}) และวิชาโท ({selectedTeacherForDetail.minor || 'ทั่วไป'}) ร่วมกับทักษะพิเศษ เพื่อวิเคราะห์ประสิทธิภาพการสอนตามหลักสูตร
                    </p>
                  </div>

                  {/* 3 Analytics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Alignment */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                        <Target className="w-4 h-4" />
                        <h5>ความตรงของสายวิชาที่สอน</h5>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">
                        วิชาที่รับผิดชอบสอนตรงตาม <strong>วิชาเอก 100%</strong> ช่วยให้นักเรียนได้รับเนื้อหาที่ลึกซึ้งและถูกต้องตามหลักสูตร
                      </p>
                    </div>

                    {/* 2. Skills Synergy */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                        <Sparkles className="w-4 h-4" />
                        <h5>การประยุกต์ทักษะพิเศษ</h5>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">
                        นำความสามารถด้าน <strong>{selectedTeacherForDetail.otherSkills?.slice(0, 2).join(', ') || 'Active Learning'}</strong> มาบูรณาการในวิชาหลัก ส่งผลให้ผู้เรียนมีส่วนร่วมสูง
                      </p>
                    </div>

                    {/* 3. Next Rank Readiness */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                        <TrendingUp className="w-4 h-4" />
                        <h5>ความพร้อมเลื่อนวิทยฐานะ</h5>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">
                        มีเอกสารผลงานและคะแนน PA สะสมพร้อมสำหรับการขอรับการประเมินในระดับถัดไป คิดเป็น <strong>92%</strong>
                      </p>
                    </div>
                  </div>

                  {/* ID Plan Guidance */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-500" />
                      <span>แผนพัฒนาตนเองรายบุคคล (Individual Development Plan: ID Plan)</span>
                    </h5>
                    <p className="text-slate-600 dark:text-slate-300">
                      {selectedTeacherForDetail.selfDevelopmentPlan ||
                        'มุ่งเน้นการจัดทำวิจัยปฏิบัติการในชั้นเรียน การพัฒนาสื่อนวัตกรรมดิจิทัล 3D และการสร้างเครือข่าย PLC เพื่อยกระดับผลสัมฤทธิ์ของผู้เรียน'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setPhotoTarget('detail');
                  setShowPhotoModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
              >
                <Camera className="w-4 h-4 text-blue-600" />
                <span>ถ่ายรูป/เปลี่ยนรูปโปรไฟล์ครู</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTeacherForDetail(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ADD / EDIT TEACHER MODAL (With Major, Minor, Skills, Photo) */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">
                  {editingTeacher ? 'แก้ไขข้อมูลคณาจารย์ & วิทยฐานะ' : 'เพิ่มข้อมูลคณาจารย์ใหม่'}
                </h3>
                <p className="text-xs text-blue-200">ระบุข้อมูลวิชาเอก วิชาโท ประสบการณ์ และถ่ายรูปโปรไฟล์</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Photo Upload / Capture preview */}
              <div className="flex items-center gap-4 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <img
                  src={formData.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'}
                  alt="Teacher Avatar"
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-500 shadow-sm"
                />
                <div className="flex-1 space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">รูปถ่ายอาจารย์ผู้สอน</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoTarget('form');
                      setShowPhotoModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>ถ่ายรูปจากกล้อง / อัปโหลดไฟล์</span>
                  </button>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    ชื่อ-สกุล (ภาษาไทย) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullNameTh || ''}
                    onChange={(e) => setFormData({ ...formData, fullNameTh: e.target.value })}
                    placeholder="เช่น ดร.ประเสริฐ ถาวร"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Full Name (English)
                  </label>
                  <input
                    type="text"
                    value={formData.fullNameEn || ''}
                    onChange={(e) => setFormData({ ...formData, fullNameEn: e.target.value })}
                    placeholder="e.g. Dr. Prasert Thaworn"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Contact Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">อีเมลติดต่อ *</label>
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="teacher@eduverse.ac.th"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="08X-XXX-XXXX"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">ประสบการณ์สอน (ปี)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.teachingExperienceYears || 1}
                    onChange={(e) => setFormData({ ...formData, teachingExperienceYears: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Major & Minor Fields (Requirement 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">วิชาเอก (Major) *</label>
                  <input
                    type="text"
                    required
                    value={formData.major || ''}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    placeholder="เช่น วิทยาการคำนวณและเทคโนโลยีศึกษา"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">วิชาโท (Minor)</label>
                  <input
                    type="text"
                    value={formData.minor || ''}
                    onChange={(e) => setFormData({ ...formData, minor: e.target.value })}
                    placeholder="เช่น ปัญญาประดิษฐ์ประยุกต์ / ภาษาอังกฤษ"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Academic Standing & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    วิทยฐานะ (มาตรฐาน ว.PA)
                  </label>
                  <select
                    value={formData.academicStanding}
                    onChange={(e) => setFormData({ ...formData, academicStanding: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  >
                    {academicStandings.map((std) => (
                      <option key={std} value={std}>
                        {std}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">กลุ่มสาระการเรียนรู้</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Other Skills (Requirement 2) */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  ความสามารถพิเศษอื่นๆ (เช่น Python, หุ่นยนต์, ดนตรี, ภาษาอังกฤษ, AI)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newSkillInput.trim()) {
                          setFormData({
                            ...formData,
                            otherSkills: [...(formData.otherSkills || []), newSkillInput.trim()],
                          });
                          setNewSkillInput('');
                        }
                      }
                    }}
                    placeholder="พิมพ์ความสามารถแล้วกด Enter หรือ เพิ่ม..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSkillInput.trim()) {
                        setFormData({
                          ...formData,
                          otherSkills: [...(formData.otherSkills || []), newSkillInput.trim()],
                        });
                        setNewSkillInput('');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold"
                  >
                    เพิ่ม
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(formData.otherSkills || []).map((skill, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-semibold">
                      ⭐ {skill}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            otherSkills: (formData.otherSkills || []).filter((_, i) => i !== idx),
                          });
                        }}
                        className="hover:text-rose-600 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Teaching Subjects */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">รายวิชาที่สอน</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    placeholder="เช่น ว30101 วิทยาการคำนวณ"
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (subjectInput.trim()) {
                        setFormData({
                          ...formData,
                          teachingSubjects: [...(formData.teachingSubjects || []), subjectInput.trim()],
                        });
                        setSubjectInput('');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-semibold"
                  >
                    เพิ่ม
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(formData.teachingSubjects || []).map((sub, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px]">
                      {sub}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            teachingSubjects: (formData.teachingSubjects || []).filter((_, i) => i !== idx),
                          });
                        }}
                        className="hover:text-rose-600 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20"
                >
                  {editingTeacher ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลอาจารย์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ADD PA PORTFOLIO ITEM MODAL */}
      {/* ======================================================== */}
      {showAddPaModal && selectedTeacherForDetail && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-500" />
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">เพิ่มชิ้นงานข้อตกลงพัฒนางาน (ว.PA)</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPaModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPaItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  ชื่อผลงาน / นวัตกรรมการสอน *
                </label>
                <input
                  type="text"
                  required
                  value={paTitle}
                  onChange={(e) => setPaTitle(e.target.value)}
                  placeholder="เช่น การพัฒนาชุดกิจกรรม Active Learning เพื่อยกระดับผลสัมฤทธิ์..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">หมวดผลงาน</label>
                  <select
                    value={paCategory}
                    onChange={(e) => setPaCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="pa_agreement">ข้อตกลง PA ประจำปี</option>
                    <option value="classroom_research">งานวิจัยในชั้นเรียน</option>
                    <option value="lesson_plan">แผนการจัดการเรียนรู้</option>
                    <option value="teaching_media">สื่อนวัตกรรมการสอนดิจิทัล</option>
                    <option value="award_honor">รางวัลเกียรติยศ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">ปีการศึกษา</label>
                  <input
                    type="text"
                    value={paYear}
                    onChange={(e) => setPaYear(e.target.value)}
                    placeholder="2569"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">ด้านตามเกณฑ์ ก.ค.ศ.</label>
                <select
                  value={paAspect}
                  onChange={(e) => setPaAspect(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="ด้านที่ 1 การจัดการเรียนรู้">ด้านที่ 1 การจัดการเรียนรู้</option>
                  <option value="ด้านที่ 2 การส่งเสริมสนับสนุน">ด้านที่ 2 การส่งเสริมสนับสนุน</option>
                  <option value="ด้านที่ 3 การพัฒนาตนเองและวิชาชีพ">ด้านที่ 3 การพัฒนาตนเองและวิชาชีพ</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">คำอธิบายรายละเอียดผลลัพธ์</label>
                <textarea
                  rows={2}
                  value={paDescription}
                  onChange={(e) => setPaDescription(e.target.value)}
                  placeholder="อธิบายกระบวนการพัฒนาและผลการเรียนรู้ของผู้เรียน..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPaModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  บันทึกผลงาน PA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Image Capture & Upload Modal */}
      <ImageCaptureUploadModal
        isOpen={showPhotoModal}
        currentImageUrl={photoTarget === 'form' ? formData.avatarUrl : selectedTeacherForDetail?.avatarUrl}
        title="ถ่ายรูปสดหรืออัปโหลดรูปภาพครูผู้สอน"
        onSelectImage={handlePhotoSelected}
        onClose={() => setShowPhotoModal(false)}
      />
    </div>
  );
};
