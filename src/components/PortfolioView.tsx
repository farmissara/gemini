import React, { useState } from 'react';
import { 
  FolderGit2, 
  Award, 
  GraduationCap, 
  Briefcase, 
  Plus, 
  Printer, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink, 
  Tag, 
  Calendar,
  User,
  ShieldCheck,
  BookOpen,
  FileText
} from 'lucide-react';
import { PortfolioItem, Student, AuthUser, AppLanguage } from '../types';

interface PortfolioViewProps {
  portfolioItems: PortfolioItem[];
  students: Student[];
  currentUser: AuthUser | null;
  lang: AppLanguage;
  onAddPortfolioItem: (item: PortfolioItem) => void;
  onOpenProfile?: () => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  portfolioItems,
  students,
  currentUser,
  lang,
  onAddPortfolioItem,
  onOpenProfile,
}) => {
  const [activeRoleTab, setActiveRoleTab] = useState<'student' | 'teacher'>('student');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Item Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<PortfolioItem['category']>('competition');
  const [newYear, setNewYear] = useState('2569 (2026)');
  const [newDescription, setNewDescription] = useState('');
  const [newSkills, setNewSkills] = useState('Python, Computer Vision, AI');
  const [newImageUrl, setNewImageUrl] = useState('https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600');

  // Filter items
  const filteredItems = portfolioItems.filter(item => {
    const matchesRole = item.ownerRole === activeRoleTab;
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesRole && matchesCategory;
  });

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: PortfolioItem = {
      id: `port-${Date.now()}`,
      schoolId: currentUser?.schoolId,
      ownerId: currentUser?.id || 'usr-1',
      ownerRole: activeRoleTab,
      ownerName: currentUser?.fullNameTh || currentUser?.fullNameEn || (activeRoleTab === 'student' ? 'นายธนาธร สมชาย' : 'อ.ดร.ประเสริฐ ถาวร'),
      title: newTitle,
      category: newCategory,
      year: newYear,
      description: newDescription,
      imageUrl: newImageUrl,
      skills: newSkills.split(',').map(s => s.trim()).filter(Boolean),
      certifiedBySchool: true,
      scoreBonus: 100
    };

    onAddPortfolioItem(newItem);
    setShowAddModal(false);
    setNewTitle('');
    setNewDescription('');
  };

  const handlePrintPortfolio = () => {
    window.print();
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5">
      {/* Top Banner */}
      <div className="shrink-0 relative overflow-hidden rounded-2xl p-3.5 sm:p-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-md border border-white/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Digital Portfolio Platform • มาตรฐาน TCAS รอบที่ 1 &amp; ว.PA ครู</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black">
              {lang === 'th' ? 'แฟ้มสะสมผลงานดิจิทัล (Digital Portfolio)' : 'Digital Portfolio Showcase'}
            </h1>
            <p className="text-white/80 text-xs max-w-2xl leading-relaxed">
              {lang === 'th'
                ? 'รวบรวมชิ้นงาน เกียรติบัตร โครงงาน และเหรียญรางวัลจากเกม EduVerse เพื่อใช้ยื่นศึกษาต่อระดับมหาวิทยาลัย (TCAS 1 Portfolio) และแฟ้ม ว.PA พัฒนาวิทยฐานะของครูอาจารย์'
                : 'Centralized repository of academic projects, certificates, and gamification credentials for TCAS University applications and teacher performance evaluation.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenProfile && (
              <button
                onClick={onOpenProfile}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'โปรไฟล์ของฉัน' : 'My Profile'}</span>
              </button>
            )}

            <button
              onClick={handlePrintPortfolio}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'พิมพ์ PDF' : 'Print PDF'}</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'เพิ่มผลงานใหม่' : 'Add Work'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Target Selector: Student TCAS vs Teacher ว.PA */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveRoleTab('student');
              setSelectedCategory('all');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeRoleTab === 'student'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>{lang === 'th' ? 'แฟ้มผลงานนักเรียน (TCAS Portfolio ม.6)' : 'Student Portfolio (TCAS)'}</span>
          </button>

          <button
            onClick={() => {
              setActiveRoleTab('teacher');
              setSelectedCategory('all');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeRoleTab === 'teacher'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>{lang === 'th' ? 'แฟ้มผลงานครู (ว.PA วิทยฐานะชำนาญการ)' : 'Teacher Portfolio (ว.PA)'}</span>
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2">
          {activeRoleTab === 'student' ? (
            <div className="flex flex-wrap gap-1.5 text-xs">
              {[
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'competition', label: 'การแข่งขัน & รางวัล' },
                { id: 'academic', label: 'วิชาการ & โอลิมปิก' },
                { id: 'activity', label: 'กิจกรรม & จิตอาสา' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-slate-800/60 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 text-xs">
              {[
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'pa_research', label: 'วิจัยในชั้นเรียน (Action Research)' },
                { id: 'teaching_media', label: 'สื่อนวัตกรรม & เกม EduVerse' },
                { id: 'certificate', label: 'การอบรมและพัฒนาตนเอง' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-slate-800/60 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Portfolio Body */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
      {/* Role Profile Header Preview Card */}
      {activeRoleTab === 'student' ? (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex items-center gap-4 md:col-span-2">
            <img 
              src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80" 
              alt="Student"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-lg shrink-0"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">นายธนาธร สมชาย (STU-6901)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                  เกรดเฉลี่ยสะสม GPAX: 3.94
                </span>
              </div>
              <p className="text-xs text-slate-400">
                โรงเรียนเอ็ดดูเวิร์สวิทยานุสรณ์ • แผนการเรียนวิทยาศาสตร์-คณิตศาสตร์-คอมพิวเตอร์
              </p>
              <div className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5 pt-1">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>เป้าหมาย TCAS: คณะวิศวกรรมศาสตร์ (คอมพิวเตอร์และปัญญาประดิษฐ์)</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/30 space-y-2 text-xs">
            <div className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>EduVerse Gamification Credentials</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 text-[11px]">
              <span>Academic Top Scorer Badge</span>
              <span className="text-emerald-400 font-bold">ผ่านการรับรอง ✓</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 text-[11px]">
              <span>Grandmaster Battle Rank</span>
              <span className="text-amber-400 font-bold">4,850 EXP</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex items-center gap-4 md:col-span-2">
            <img 
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80" 
              alt="Teacher"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-500/40 shadow-lg shrink-0"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">อ.ดร.ประเสริฐ ถาวร</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                  วิทยฐานะ: ครูชำนาญการพิเศษ
                </span>
              </div>
              <p className="text-xs text-slate-400">
                กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี • หัวหน้ากลุ่มงานนวัตกรรมการเรียนรู้
              </p>
              <div className="text-xs text-purple-300 font-semibold flex items-center gap-1.5 pt-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>ประเด็นท้าทาย ว.PA: การใช้ Gamification และ AI เพื่อยกระดับผลสัมฤทธิ์ทางการเรียนรู้</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-800/30 space-y-2 text-xs">
            <div className="font-bold text-purple-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ความก้าวหน้าข้อตกลง PA (2569)</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 text-[11px]">
              <span>ด้านการจัดการเรียนรู้</span>
              <span className="text-emerald-400 font-bold">100% ผ่านเกณฑ์</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 text-[11px]">
              <span>สื่อนวัตกรรมในระบบ</span>
              <span className="text-amber-400 font-bold">5 สื่อการสอน</span>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredItems.map((item) => (
          <div 
            key={item.id}
            className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all group"
          >
            {item.imageUrl && (
              <div className="relative h-48 w-full overflow-hidden bg-slate-800">
                <img 
                  src={item.imageUrl} 
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/20">
                  {item.year}
                </div>
                {item.certifiedBySchool && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>โรงเรียนรับรองผลงาน</span>
                  </div>
                )}
              </div>
            )}

            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {item.category}
                  </span>
                  <span className="text-xs text-slate-400">เจ้าของ: {item.ownerName}</span>
                </div>

                <h4 className="text-base font-bold text-white leading-snug group-hover:text-indigo-300 transition-colors">
                  {item.title}
                </h4>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-800">
                {/* Skills Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {item.skills.map((skill, sIdx) => (
                    <span 
                      key={sIdx}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1"
                    >
                      <Tag className="w-2.5 h-2.5 text-indigo-400" />
                      <span>{skill}</span>
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>โบนัสคะแนน: +{item.scoreBonus || 100} แต้ม</span>
                  </span>

                  <button 
                    onClick={handlePrintPortfolio}
                    className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 text-xs"
                  >
                    <span>ดูเอกสาร / ใบประกาศ</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>

      {/* Add New Portfolio Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>
                  {activeRoleTab === 'student' ? 'เพิ่มผลงาน TCAS Portfolio' : 'เพิ่มผลงานแฟ้ม ว.PA ครู'}
                </span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">ชื่อผลงาน / โครงงาน / รางวัล</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น ชนะเลิศการแข่งขันหุ่นยนต์กู้ภัยระดับประเทศ"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">หมวดหมู่</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    {activeRoleTab === 'student' ? (
                      <>
                        <option value="competition">การแข่งขัน & รางวัล</option>
                        <option value="academic">วิชาการ & โครงงาน</option>
                        <option value="activity">กิจกรรมจิตอาสา</option>
                      </>
                    ) : (
                      <>
                        <option value="pa_research">งานวิจัยในชั้นเรียน (PA)</option>
                        <option value="teaching_media">สื่อนวัตกรรม & เกม</option>
                        <option value="certificate">การอบรมพัฒนาวิชาชีพ</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">ปีการศึกษาที่ได้รับ</label>
                  <input
                    type="text"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">รายละเอียดและบทเรียนที่ได้รับ</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="อธิบายการนำไปใช้ ความสำคัญ และผลลัพธ์ของผลงานนี้..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">ทักษะที่เกี่ยวข้อง (คั่นด้วยจุลภาค)</label>
                <input
                  type="text"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  placeholder="เช่น Python, Machine Learning, Leadership"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">ลิงก์รูปภาพประกอบผลงาน (Image URL)</label>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md shadow-indigo-600/30"
                >
                  บันทึกผลงานลง Portfolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
