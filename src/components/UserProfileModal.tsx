import React, { useState, useEffect } from 'react';
import { 
  User, 
  GraduationCap, 
  Briefcase, 
  Award, 
  Sparkles, 
  Save, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Heart, 
  AlertCircle, 
  FileText, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ExternalLink, 
  BookOpen, 
  Camera, 
  Printer, 
  Globe, 
  Target, 
  ShieldCheck, 
  Building2,
  Tag
} from 'lucide-react';
import { AuthUser, PortfolioItem, AppLanguage } from '../types';
import { ImageCaptureUploadModal } from './ImageCaptureUploadModal';

interface UserProfileModalProps {
  currentUser: AuthUser;
  portfolioItems: PortfolioItem[];
  lang: AppLanguage;
  onSaveProfile: (updatedUser: AuthUser) => void;
  onAddPortfolioItem: (item: PortfolioItem) => void;
  onDeletePortfolioItem?: (itemId: string) => void;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  currentUser,
  portfolioItems,
  lang,
  onSaveProfile,
  onAddPortfolioItem,
  onDeletePortfolioItem,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'personal' | 'academic' | 'portfolio' | 'preview_book'>('personal');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Editable Form State - Cloned from currentUser
  const [formData, setFormData] = useState<AuthUser>({ ...currentUser });

  // Custom Skills / Tags input helpers
  const [newSkillInput, setNewSkillInput] = useState('');
  const [newSubjectInput, setNewSubjectInput] = useState('');

  // New Portfolio Item Form State (in Portfolio Tab)
  const [showAddWorkModal, setShowAddWorkModal] = useState(false);
  const [workTitle, setWorkTitle] = useState('');
  const [workCategory, setWorkCategory] = useState<PortfolioItem['category']>('competition');
  const [workYear, setWorkYear] = useState('2569 (2026)');
  const [workDescription, setWorkDescription] = useState('');
  const [workSkills, setWorkSkills] = useState('');
  const [workImageUrl, setWorkImageUrl] = useState('https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600');

  useEffect(() => {
    setFormData({ ...currentUser });
  }, [currentUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleChange = (field: keyof AuthUser, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddSkill = () => {
    if (!newSkillInput.trim()) return;
    const currentSkills = formData.skills || [];
    if (!currentSkills.includes(newSkillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), newSkillInput.trim()]
      }));
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: (prev.skills || []).filter(s => s !== skillToRemove)
    }));
  };

  const handleAddSubject = () => {
    if (!newSubjectInput.trim()) return;
    const currentSubs = formData.teachingSubjects || [];
    if (!currentSubs.includes(newSubjectInput.trim())) {
      setFormData(prev => ({
        ...prev,
        teachingSubjects: [...(prev.teachingSubjects || []), newSubjectInput.trim()]
      }));
    }
    setNewSubjectInput('');
  };

  const handleRemoveSubject = (subToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      teachingSubjects: (prev.teachingSubjects || []).filter(s => s !== subToRemove)
    }));
  };

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    showToast('✅ บันทึกข้อมูลโปรไฟล์และอัปเดตระบบเรียบร้อยแล้ว');
  };

  const handleCreatePortfolioWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workTitle.trim()) return;

    const newItem: PortfolioItem = {
      id: `port-${Date.now()}`,
      schoolId: currentUser.schoolId,
      ownerId: currentUser.id,
      ownerRole: currentUser.role === 'teacher' ? 'teacher' : 'student',
      ownerName: formData.fullNameTh || formData.fullNameEn,
      title: workTitle,
      category: workCategory,
      year: workYear,
      description: workDescription,
      imageUrl: workImageUrl,
      skills: workSkills.split(',').map(s => s.trim()).filter(Boolean),
      certifiedBySchool: true,
      scoreBonus: 100
    };

    onAddPortfolioItem(newItem);
    setShowAddWorkModal(false);
    setWorkTitle('');
    setWorkDescription('');
    setWorkSkills('');
    showToast('✨ เพิ่มผลงานใหม่เข้าแฟ้ม Portfolio ของคุณเรียบร้อยแล้ว');
  };

  // Filter portfolio works belonging to current user
  const myPortfolioItems = portfolioItems.filter(
    item => item.ownerId === currentUser.id || item.ownerName.includes(currentUser.fullNameTh.split(' ')[0])
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-3">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div 
              onClick={() => setShowImageModal(true)}
              className="relative group cursor-pointer"
              title="แตะเพื่อถ่ายรูป หรือเปลี่ยนรูปโปรไฟล์"
            >
              <img
                src={formData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                alt={formData.fullNameTh}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-white/40 shadow-md group-hover:ring-2 group-hover:ring-blue-400 transition"
              />
              <span className="absolute -bottom-1 -right-1 p-1 bg-blue-600 group-hover:bg-blue-500 rounded-full text-white shadow transition">
                <Camera className="w-3 h-3" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg tracking-tight">
                  {formData.fullNameTh || formData.fullNameEn}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase font-bold">
                  {currentUser.role === 'admin' ? 'School Admin' : currentUser.role === 'teacher' ? 'ครูผู้สอน' : currentUser.role === 'student' ? 'นักเรียน' : currentUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                {formData.email} • {currentUser.role === 'student' ? formData.studentIdNumber || 'STU-6901' : currentUser.role === 'teacher' ? formData.teacherIdNumber || 'TCH-2026' : 'ADMIN-REF'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'personal'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>ข้อมูลส่วนตัว & การติดต่อ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('academic')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'academic'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {currentUser.role === 'student' ? <GraduationCap className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
            <span>
              {currentUser.role === 'student' ? 'การศึกษา & เป้าหมาย TCAS' : currentUser.role === 'teacher' ? 'วิชาการ & วิทยฐานะ ว.PA' : 'การบริหาร & ภาระงาน'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'portfolio'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>คลังผลงาน Portfolio ({myPortfolioItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview_book')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'preview_book'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-indigo-600 hover:text-indigo-800'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>พรีวิวเล่ม Portfolio ดิจิทัล</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-800">
          
          {/* TAB 1: ข้อมูลส่วนตัว & การติดต่อ */}
          {activeTab === 'personal' && (
            <form onSubmit={handleSubmitProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Full Name Thai */}
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">ชื่อ - นามสกุล (ภาษาไทย) *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullNameTh || ''}
                    onChange={e => handleChange('fullNameTh', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    placeholder="เช่น นายธนาธร สมชาย"
                  />
                </div>

                {/* Full Name English */}
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Full Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullNameEn || ''}
                    onChange={e => handleChange('fullNameEn', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-sans"
                    placeholder="e.g. Thanatorn Somchai"
                  />
                </div>

                {/* Nickname & Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">ชื่อเล่น (Nickname)</label>
                    <input
                      type="text"
                      value={formData.nickname || ''}
                      onChange={e => handleChange('nickname', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      placeholder="เช่น ธันวา"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">เพศ (Gender)</label>
                    <select
                      value={formData.gender || 'male'}
                      onChange={e => handleChange('gender', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                    >
                      <option value="male">ชาย (Male)</option>
                      <option value="female">หญิง (Female)</option>
                      <option value="other">อื่นๆ (Other)</option>
                    </select>
                  </div>
                </div>

                {/* National ID / Citizen Card */}
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">เลขประจำตัวประชาชน (National ID)</label>
                  <input
                    type="text"
                    value={formData.nationalId || ''}
                    onChange={e => handleChange('nationalId', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                    placeholder="1-1002-00345-67-1"
                  />
                </div>

                {/* Date of Birth & Blood Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">วัน/เดือน/ปีเกิด</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth || '2008-05-14'}
                      onChange={e => handleChange('dateOfBirth', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">กรุ๊ปเลือด (Blood Type)</label>
                    <select
                      value={formData.bloodType || 'O'}
                      onChange={e => handleChange('bloodType', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white font-bold"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="O">O</option>
                    </select>
                  </div>
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">เบอร์โทรศัพท์มือถือ</label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={e => handleChange('phone', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                      placeholder="081-456-7890"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">อีเมลติดต่อ</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={e => handleChange('email', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                      placeholder="student@eduverse.school"
                    />
                  </div>
                </div>

                {/* Avatar URL & Camera Snap */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-600 block mb-1">รูปถ่ายโปรไฟล์ (ถ่ายรูปสด / อัปโหลด / ใส่ลิงก์ URL)</label>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <img
                      src={formData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                      alt="Avatar Preview"
                      className="w-12 h-12 rounded-xl object-cover border-2 border-indigo-400 shadow-sm"
                    />
                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setShowImageModal(true)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>ถ่ายรูปจากกล้อง / อัปโหลดรูปใหม่</span>
                        </button>
                      </div>
                      <input
                        type="url"
                        value={formData.avatarUrl || ''}
                        onChange={e => handleChange('avatarUrl', e.target.value)}
                        className="w-full px-2.5 py-1 text-[11px] rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500 font-mono text-slate-600"
                        placeholder="หรือระบุ URL รูปภาพโดยตรง..."
                      />
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">ผู้ติดต่อฉุกเฉิน (ชื่อ & ความสัมพันธ์)</label>
                  <input
                    type="text"
                    value={formData.emergencyContact || ''}
                    onChange={e => handleChange('emergencyContact', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    placeholder="เช่น นายประภาส สมชาย (บิดา)"
                  />
                </div>

                {/* Emergency Phone */}
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">เบอร์โทรติดต่อฉุกเฉิน</label>
                  <input
                    type="tel"
                    value={formData.emergencyPhone || ''}
                    onChange={e => handleChange('emergencyPhone', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                    placeholder="086-554-3322"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-600 block mb-1">ที่อยู่ปัจจุบันตามทะเบียนบ้าน / ติดต่อได้</label>
                  <textarea
                    rows={2}
                    value={formData.address || ''}
                    onChange={e => handleChange('address', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none"
                    placeholder="บ้านเลขที่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                  />
                </div>

                {/* Bio / About Me */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-600 block mb-1">ประวัติโดยย่อ / คติพจน์ประจำใจ (Bio)</label>
                  <textarea
                    rows={3}
                    value={formData.bio || ''}
                    onChange={e => handleChange('bio', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none"
                    placeholder="อธิบายตัวเอง ความมุ่งมั่น และเป้าหมายของคุณ..."
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกข้อมูลส่วนตัว</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ข้อมูลวิชาการ / ว.PA / การศึกษา */}
          {activeTab === 'academic' && (
            <form onSubmit={handleSubmitProfile} className="space-y-6">
              
              {/* STUDENT ACADEMIC PROFILE */}
              {currentUser.role === 'student' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-950 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm">ข้อมูลสำหรับจัดทำแฟ้มสะสมผลงาน TCAS รอบที่ 1</h4>
                      <p className="text-[11px] text-indigo-800 mt-0.5">
                        ข้อมูลในส่วนนี้จะถูกนำไปจัดหน้าปกและบทนำของเล่ม Portfolio ส่งตรงถึงคณะกรรมการคัดเลือกของมหาวิทยาลัย
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Student ID */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">รหัสประจำตัวนักเรียน</label>
                      <input
                        type="text"
                        value={formData.studentIdNumber || 'ED-6901'}
                        onChange={e => handleChange('studentIdNumber', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>

                    {/* Grade Level & Room */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">ระดับชั้น</label>
                        <input
                          type="text"
                          value={formData.gradeLevel || 'มัธยมศึกษาปีที่ 4 (M.4)'}
                          onChange={e => handleChange('gradeLevel', e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">ห้องเรียน</label>
                        <input
                          type="text"
                          value={formData.room || 'ห้อง 401'}
                          onChange={e => handleChange('room', e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Academic Track */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">แผนการเรียน (Academic Track)</label>
                      <input
                        type="text"
                        value={formData.academicTrack || 'วิทยาศาสตร์ - คณิตศาสตร์ (Gifted STEM)'}
                        onChange={e => handleChange('academicTrack', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                        placeholder="เช่น วิทย์-คณิต, ศิลป์-คำนวณ, ศิลป์-ภาษา"
                      />
                    </div>

                    {/* Advisor Name */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">ครูที่ปรึกษาประจำห้อง</label>
                      <input
                        type="text"
                        value={formData.advisorName || 'อ.ดร.ประเสริฐ ถาวร'}
                        onChange={e => handleChange('advisorName', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* GPAX */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">เกรดเฉลี่ยสะสม (GPAX)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="4.00"
                        value={formData.gpax ?? 3.92}
                        onChange={e => handleChange('gpax', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono font-bold text-blue-700"
                      />
                    </div>

                    {/* Dream Career */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">อาชีพในฝัน (Career Aspiration)</label>
                      <input
                        type="text"
                        value={formData.dreamCareer || ''}
                        onChange={e => handleChange('dreamCareer', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                        placeholder="เช่น Lead AI Research Scientist"
                      />
                    </div>

                    {/* Target University */}
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-600 block mb-1">มหาวิทยาลัยเป้าหมายในฝัน (Target University for TCAS)</label>
                      <input
                        type="text"
                        value={formData.targetUniversity || ''}
                        onChange={e => handleChange('targetUniversity', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                        placeholder="เช่น จุฬาลงกรณ์มหาวิทยาลัย, สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง"
                      />
                    </div>

                    {/* Target Faculty */}
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-600 block mb-1">คณะและสาขาวิชาที่ต้องการศึกษาต่อ (Target Faculty / Major)</label>
                      <input
                        type="text"
                        value={formData.targetFaculty || ''}
                        onChange={e => handleChange('targetFaculty', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                        placeholder="เช่น คณะวิศวกรรมศาสตร์ สาขาวิศวกรรมคอมพิวเตอร์และปัญญาประดิษฐ์"
                      />
                    </div>

                    {/* Special Skills / Competencies Tags */}
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-600 block mb-1">ทักษะและความสามารถพิเศษ (Skills & Competencies)</label>
                      <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 rounded-xl border border-slate-200 min-h-12 items-center">
                        {(formData.skills || []).map((skill, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-semibold">
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className="text-blue-500 hover:text-rose-600"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                        {(formData.skills || []).length === 0 && (
                          <span className="text-xs text-slate-400">ยังไม่มีทักษะที่บันทึก พิมพ์แล้วกดเพิ่มด้านล่าง</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSkillInput}
                          onChange={e => setNewSkillInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                          placeholder="พิมพ์ทักษะ เช่น Python, Robotics, IELTS 7.5, UI/UX แล้วกดเพิ่ม"
                          className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddSkill}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
                        >
                          + เพิ่มทักษะ
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TEACHER ACADEMIC PROFILE */}
              {currentUser.role === 'teacher' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-emerald-950 flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm">ข้อมูลวิทยฐานะ & ผลงานทางวิชาการ (ว.PA)</h4>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        สำหรับประเมินผลการปฏิบัติงานตามข้อตกลง ว.PA และการขอมี/เลื่อนวิทยฐานะของครูอาจารย์
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Teacher ID */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">รหัสประจำตัวครู (Teacher ID)</label>
                      <input
                        type="text"
                        value={formData.teacherIdNumber || 'TCH-2024-0012'}
                        onChange={e => handleChange('teacherIdNumber', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                      />
                    </div>

                    {/* Academic Standing (วิทยฐานะ) */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">วิทยฐานะปัจจุบัน</label>
                      <select
                        value={formData.academicStanding || 'ครูชำนาญการพิเศษ (คศ.3)'}
                        onChange={e => handleChange('academicStanding', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
                      >
                        <option value="ครูผู้ช่วย">ครูผู้ช่วย</option>
                        <option value="ครู (คศ.1)">ครู (คศ.1)</option>
                        <option value="ครูชำนาญการ (คศ.2)">ครูชำนาญการ (คศ.2)</option>
                        <option value="ครูชำนาญการพิเศษ (คศ.3)">ครูชำนาญการพิเศษ (คศ.3)</option>
                        <option value="ครูเชี่ยวชาญ (คศ.4)">ครูเชี่ยวชาญ (คศ.4)</option>
                        <option value="ครูเชี่ยวชาญพิเศษ (คศ.5)">ครูเชี่ยวชาญพิเศษ (คศ.5)</option>
                      </select>
                    </div>

                    {/* Highest Degree */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">วุฒิการศึกษาสูงสุด</label>
                      <input
                        type="text"
                        value={formData.academicDegree || ''}
                        onChange={e => handleChange('academicDegree', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                        placeholder="เช่น ปริญญาเอก ปร.ด. นวัตกรรมหลักสูตรและการสอน"
                      />
                    </div>

                    {/* Major */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">สาขาวิชาเอก / ความเชี่ยวชาญ</label>
                      <input
                        type="text"
                        value={formData.major || ''}
                        onChange={e => handleChange('major', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                        placeholder="เช่น วิทยาการคำนวณและเทคโนโลยีศึกษา"
                      />
                    </div>

                    {/* Department */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">กลุ่มสาระการเรียนรู้</label>
                      <input
                        type="text"
                        value={formData.department || ''}
                        onChange={e => handleChange('department', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                        placeholder="เช่น กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี"
                      />
                    </div>

                    {/* License No */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">เลขที่ใบอนุญาตประกอบวิชาชีพครู</label>
                      <input
                        type="text"
                        value={formData.teacherLicenseNo || ''}
                        onChange={e => handleChange('teacherLicenseNo', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                        placeholder="คส. 6110900045678"
                      />
                    </div>

                    {/* Teaching Subjects */}
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-600 block mb-1">รายวิชาที่รับผิดชอบสอน</label>
                      <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 rounded-xl border border-slate-200 min-h-12 items-center">
                        {(formData.teachingSubjects || []).map((sub, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold">
                            <span>{sub}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSubject(sub)}
                              className="text-emerald-500 hover:text-rose-600"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSubjectInput}
                          onChange={e => setNewSubjectInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubject(); } }}
                          placeholder="พิมพ์รหัสและชื่อวิชา เช่น ว30101 วิทยาการคำนวณ แล้วกดเพิ่ม"
                          className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddSubject}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold"
                        >
                          + เพิ่มวิชาที่สอน
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ADMIN PROFILE */}
              {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 text-amber-950 flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm">ข้อมูลฝ่ายบริหารและอำนวยการโรงเรียน</h4>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        ข้อมูลการบริหารงานสถานศึกษาและช่องทางการติดต่อราชการภายใน
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">ตำแหน่งการบริหารสถานศึกษา</label>
                      <input
                        type="text"
                        value={formData.adminPositionTitle || 'ผู้อำนวยการสถานศึกษา (Director & Principal)'}
                        onChange={e => handleChange('adminPositionTitle', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">ฝ่าย / สำนักที่สังกัด</label>
                      <input
                        type="text"
                        value={formData.adminDepartment || 'สำนักงานบริหารและอำนวยการสถานศึกษา'}
                        onChange={e => handleChange('adminDepartment', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">เบอร์โทรศัพท์สายตรงสำนักงาน</label>
                      <input
                        type="text"
                        value={formData.directOfficePhone || '02-555-1234 ต่อ 101'}
                        onChange={e => handleChange('directOfficePhone', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">ห้องทำงาน / อาคาร</label>
                      <input
                        type="text"
                        value={formData.officeRoom || 'ห้องบริหาร 101 อาคารเฉลิมพระเกียรติ'}
                        onChange={e => handleChange('officeRoom', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกข้อมูลวิชาการ</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: คลังผลงาน PORTFOLIO ของฉัน */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    ผลงาน โครงงาน และเกียรติบัตรที่บันทึกไว้ ({myPortfolioItems.length} รายการ)
                  </h3>
                  <p className="text-xs text-slate-500">
                    รวบรวมเพื่อจัดทำแฟ้มสะสมผลงานดิจิทัล ยื่นเข้าศึกษาต่อ TCAS รอบ 1 หรือประเมิน ว.PA
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview_book')}
                    className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>ดูรูปเล่ม Portfolio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddWorkModal(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มผลงานใหม่</span>
                  </button>
                </div>
              </div>

              {/* Add New Work Form Modal */}
              {showAddWorkModal && (
                <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs sm:text-sm text-blue-950 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>กรอกรายละเอียดผลงานใหม่เพื่อบรรจุลง Portfolio</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddWorkModal(false)}
                      className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                    >
                      ✕ ปิด
                    </button>
                  </div>

                  <form onSubmit={handleCreatePortfolioWork} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">ชื่อผลงาน / รางวัลที่ได้รับ *</label>
                        <input
                          type="text"
                          required
                          value={workTitle}
                          onChange={e => setWorkTitle(e.target.value)}
                          placeholder="เช่น รางวัลเหรียญทอง โอลิมปิกหุ่นยนต์ระดับชาติ"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">หมวดหมู่</label>
                          <select
                            value={workCategory}
                            onChange={e => setWorkCategory(e.target.value as any)}
                            className="w-full px-2 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
                          >
                            <option value="competition">การแข่งขัน / รางวัล</option>
                            <option value="academic">ผลงานทางวิชาการ</option>
                            <option value="activity">กิจกรรมบำเพ็ญประโยชน์</option>
                            <option value="certificate">เกียรติบัตร / สัมมนา</option>
                            <option value="pa_research">งานวิจัย ว.PA (ครู)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">ปีการศึกษา / ปีที่ได้</label>
                          <input
                            type="text"
                            value={workYear}
                            onChange={e => setWorkYear(e.target.value)}
                            placeholder="เช่น 2569"
                            className="w-full px-2 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">รายละเอียดชิ้นงาน และบทสะท้อนการเรียนรู้ (Reflection)</label>
                        <textarea
                          rows={2}
                          value={workDescription}
                          onChange={e => setWorkDescription(e.target.value)}
                          placeholder="อธิบายว่าผลงานนี้คืออะไร มีบทบาทอย่างไร ได้เรียนรู้อะไร และเชื่อมโยงกับสาขาที่อยากเข้าอย่างไร..."
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">ทักษะที่ใช้ (คั่นด้วยจุลภาค ,)</label>
                        <input
                          type="text"
                          value={workSkills}
                          onChange={e => setWorkSkills(e.target.value)}
                          placeholder="เช่น Python, Computer Vision, Leadership"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">ลิงก์รูปภาพผลงาน / รูปเกียรติบัตร</label>
                        <input
                          type="url"
                          value={workImageUrl}
                          onChange={e => setWorkImageUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddWorkModal(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-sm"
                      >
                        บันทึกผลงานลงแฟ้ม
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Works Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myPortfolioItems.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition-all shadow-xs hover:shadow-md overflow-hidden flex flex-col"
                  >
                    <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                      <img
                        src={item.imageUrl || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600'}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-[10px] text-amber-300 font-bold border border-white/20">
                        {item.category === 'competition' ? '🏆 การแข่งขัน' : item.category === 'academic' ? '📚 วิชาการ' : '📜 เกียรติบัตร'}
                      </span>
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-blue-600/90 text-white text-[10px] font-mono font-bold">
                        ปี {item.year}
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1">{item.title}</h4>
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-1">{item.description}</p>
                      </div>

                      <div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {item.skills.map((skill, sIdx) => (
                            <span key={sIdx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                              #{skill}
                            </span>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>รับรองโดยโรงเรียน</span>
                          </span>

                          {onDeletePortfolioItem && (
                            <button
                              type="button"
                              onClick={() => {
                                onDeletePortfolioItem(item.id);
                                showToast('ลบผลงานออกจากแฟ้มแล้ว');
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                              title="ลบผลงาน"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {myPortfolioItems.length === 0 && (
                  <div className="md:col-span-2 p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 space-y-2">
                    <Award className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">ยังไม่มีผลงานในแฟ้มสะสมของคุณ</p>
                    <p className="text-[11px]">กดปุ่ม "เพิ่มผลงานใหม่" ด้านบนเพื่อรวบรวมเกียรติบัตรและชิ้นงานของคุณได้ทันที</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: พรีวิวเล่ม PORTFOLIO ดิจิทัล (DIGITAL PORTFOLIO BOOK PREVIEW) */}
          {activeTab === 'preview_book' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>พรีวิวรูปเล่มแฟ้มสะสมผลงานดิจิทัล (Digital TCAS & Professional Book)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    จัดหน้าตามเกณฑ์การคัดเลือก TCAS รอบ 1 แฟ้มสะสมผลงาน และมาตรฐาน ก.ค.ศ. ว.PA
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ / บันทึก PDF (Export)</span>
                </button>
              </div>

              {/* Printable Portfolio Cover & Layout */}
              <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Cover Header */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-white/15 pb-8">
                  <img
                    src={formData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'}
                    alt={formData.fullNameTh}
                    className="w-32 h-32 rounded-3xl object-cover border-4 border-amber-400 shadow-2xl shrink-0"
                  />

                  <div className="text-center sm:text-left space-y-2 flex-1">
                    <span className="inline-block px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-black uppercase tracking-wider">
                      {currentUser.role === 'student' ? 'OFFICIAL TCAS 1 PORTFOLIO' : 'OFFICIAL TEACHER PA PORTFOLIO'}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {formData.fullNameTh}
                    </h1>
                    <p className="text-sm text-slate-300 font-serif italic">
                      {formData.fullNameEn} {formData.nickname && `(${formData.nickname})`}
                    </p>
                    <p className="text-xs text-cyan-300 font-mono">
                      {currentUser.role === 'student' ? `${formData.gradeLevel || 'ม.4'} • ${formData.room || 'ห้อง 401'} • ${formData.academicTrack || 'วิทย์-คณิต'}` : `${formData.academicStanding || 'ครูชำนาญการพิเศษ'} • ${formData.department || 'กลุ่มสาระวิทยาศาสตร์'}`}
                    </p>
                  </div>

                  {currentUser.role === 'student' && formData.gpax && (
                    <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center shrink-0">
                      <div className="text-[10px] uppercase font-bold text-slate-300">GPAX รวม</div>
                      <div className="text-2xl font-black text-amber-400 font-mono">{formData.gpax.toFixed(2)}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">รับรองความถูกต้อง</div>
                    </div>
                  )}
                </div>

                {/* Goals & Aspirations Banner */}
                {currentUser.role === 'student' && (formData.targetUniversity || formData.targetFaculty) && (
                  <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5">มหาวิทยาลัยเป้าหมาย</span>
                      <p className="font-bold text-white text-sm">{formData.targetUniversity || 'จุฬาลงกรณ์มหาวิทยาลัย'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-0.5">คณะ / สาขาวิชา</span>
                      <p className="font-bold text-white text-sm">{formData.targetFaculty || 'คณะวิศวกรรมศาสตร์ สาขาวิศวกรรมคอมพิวเตอร์'}</p>
                    </div>
                  </div>
                )}

                {/* Bio & Personal Statement */}
                {formData.bio && (
                  <div className="mt-6 space-y-1.5">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide">บทนำและแรงบันดาลใจ (Statement of Purpose)</h4>
                    <p className="text-xs text-slate-200 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/10">
                      "{formData.bio}"
                    </p>
                  </div>
                )}

                {/* Skills Showcase in Book */}
                {(formData.skills || []).length > 0 && (
                  <div className="mt-6 space-y-2">
                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wide">ทักษะและความสามารถเฉพาะทาง (Competencies)</h4>
                    <div className="flex flex-wrap gap-2">
                      {(formData.skills || []).map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-xl bg-white/10 text-white text-xs font-semibold border border-white/15">
                          ✓ {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Showcase Works in Book */}
                <div className="mt-8 pt-6 border-t border-white/15 space-y-4">
                  <h4 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>แกลเลอรีผลงานและเกียรติบัตรดีเด่น ({myPortfolioItems.length} รายการ)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {myPortfolioItems.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-white/5 border border-white/15 flex gap-3">
                        <img
                          src={item.imageUrl || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300'}
                          alt={item.title}
                          className="w-20 h-20 rounded-xl object-cover border border-white/20 shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-1 text-xs">
                          <span className="text-[10px] font-bold text-cyan-300 font-mono">[{item.year}] {item.category}</span>
                          <h5 className="font-bold text-white line-clamp-1">{item.title}</h5>
                          <p className="text-[11px] text-slate-300 line-clamp-2">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Official Certification Seal */}
                <div className="mt-10 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span>เอกสารแฟ้มสะสมผลงานดิจิทัลรับรองโดยสถานศึกษา EduVerse SIS</span>
                  </div>
                  <div className="font-mono text-[10px]">
                    ออกเอกสารวันที่: {new Date().toLocaleDateString('th-TH')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Image Capture & Upload Modal */}
      <ImageCaptureUploadModal
        isOpen={showImageModal}
        currentImageUrl={formData.avatarUrl}
        title="อัปเดตรูปถ่ายโปรไฟล์ของคุณ"
        onSelectImage={(newUrl) => handleChange('avatarUrl', newUrl)}
        onClose={() => setShowImageModal(false)}
      />
    </div>
  );
};
