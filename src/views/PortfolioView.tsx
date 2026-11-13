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
import { PagedList } from '../components/PagedList';

interface PortfolioViewProps {
  portfolioItems: PortfolioItem[];
  students: Student[];
  currentUser: AuthUser | null;
  lang: AppLanguage;
  onAddPortfolioItem: (item: PortfolioItem) => void;
  onOpenProfile?: () => void;
  academicYear?: string;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  portfolioItems,
  students,
  currentUser,
  lang,
  onAddPortfolioItem,
  onOpenProfile,
  academicYear = '2569 (2026)',
}) => {
  const [activeRoleTab, setActiveRoleTab] = useState<'student' | 'teacher'>('student');
  const [portfolioStep, setPortfolioStep] = useState<0 | 1>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormStep, setAddFormStep] = useState<0 | 1 | 2>(0);

  // New Item Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<PortfolioItem['category']>('competition');
  const [newYear, setNewYear] = useState(academicYear);
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
    setAddFormStep(0);
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
            <p className="text-slate-100 text-xs max-w-2xl leading-relaxed">
              {lang === 'th'
                ? 'รวบรวมชิ้นงาน เกียรติบัตร โครงงาน และเหรียญรางวัลจากเกม EduVerse เพื่อใช้ยื่นศึกษาต่อระดับมหาวิทยาลัย (TCAS 1 Portfolio) และแฟ้ม ว.PA พัฒนาวิทยฐานะของครูอาจารย์'
                : 'Centralized repository of academic projects, certificates, and gamification credentials for TCAS University applications and teacher performance evaluation.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenProfile && (
              <button
                onClick={onOpenProfile}
                className="px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'โปรไฟล์ของฉัน' : 'My Profile'}</span>
              </button>
            )}

            <button
              onClick={handlePrintPortfolio}
              className="px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-900/80 border border-white/25 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'พิมพ์ PDF' : 'Print PDF'}</span>
            </button>

            <button
              onClick={() => {
                setAddFormStep(0);
                setShowAddModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-700 to-rose-700 hover:from-amber-800 hover:to-rose-800 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'เพิ่มผลงานใหม่' : 'Add Work'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Target Selector: Student TCAS vs Teacher ว.PA */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveRoleTab('student');
              setSelectedCategory('all');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeRoleTab === 'student'
                ? 'bg-indigo-700 text-white shadow-md'
                : 'bg-[var(--color-card)] text-[var(--color-text-title)] border border-[var(--color-border)] hover:bg-[var(--color-card-subtle)]'
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
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeRoleTab === 'teacher'
                ? 'bg-purple-700 text-white shadow-md'
                : 'bg-[var(--color-card)] text-[var(--color-text-title)] border border-[var(--color-border)] hover:bg-[var(--color-card-subtle)]'
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
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-700 text-white border-indigo-700 shadow-xs'
                      : 'bg-[var(--color-card)] text-[var(--color-text-title)] border-[var(--color-border)] hover:bg-[var(--color-card-subtle)]'
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
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                      : 'bg-[var(--color-card)] text-[var(--color-text-title)] border-[var(--color-border)] hover:bg-[var(--color-card-subtle)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setPortfolioStep(0)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${portfolioStep === 0 ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-[var(--color-card)] text-[var(--color-text-title)] border-[var(--color-border)] hover:bg-[var(--color-card-subtle)]'}`}>{lang === 'th' ? 'โปรไฟล์' : 'Profile'}</button>
        <button type="button" onClick={() => setPortfolioStep(1)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${portfolioStep === 1 ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-[var(--color-card)] text-[var(--color-text-title)] border-[var(--color-border)] hover:bg-[var(--color-card-subtle)]'}`}>{lang === 'th' ? `ผลงาน (${filteredItems.length})` : `Portfolio Items (${filteredItems.length})`}</button>
      </div>
      {/* Role Profile Header Preview Card */}
      {portfolioStep === 0 && (
      activeRoleTab === 'student' ? (
        <div className="p-6 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] grid grid-cols-1 md:grid-cols-3 gap-6 items-center shadow-xs">
          <div className="flex items-center gap-4 md:col-span-2">
            <img 
              src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80" 
              alt="Student"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-[var(--color-primary)] shadow-md shrink-0"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-[var(--color-text-title)]">นายธนาธร สมชาย (STU-6901)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 font-semibold border border-emerald-300 dark:border-emerald-700">
                  เกรดเฉลี่ยสะสม GPAX: 3.94
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-body)]">
                โรงเรียนเอ็ดดูเวิร์สวิทยานุสรณ์ • แผนการเรียนวิทยาศาสตร์-คณิตศาสตร์-คอมพิวเตอร์
              </p>
              <div className="text-xs text-[var(--color-primary-text)] font-semibold flex items-center gap-1.5 pt-1">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>เป้าหมาย TCAS: คณะวิศวกรรมศาสตร์ (คอมพิวเตอร์และปัญญาประดิษฐ์)</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2 text-xs">
            <div className="font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-600 dark:text-amber-300" />
              <span>EduVerse Gamification Credentials</span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-text-body)] text-[11px]">
              <span>Academic Top Scorer Badge</span>
              <span className="text-emerald-800 dark:text-emerald-300 font-bold">ผ่านการรับรอง ✓</span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-text-body)] text-[11px]">
              <span>Grandmaster Battle Rank</span>
              <span className="text-amber-800 dark:text-amber-300 font-bold">4,850 EXP</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] grid grid-cols-1 md:grid-cols-3 gap-6 items-center shadow-xs">
          <div className="flex items-center gap-4 md:col-span-2">
            <img 
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80" 
              alt="Teacher"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-600 shadow-md shrink-0"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-[var(--color-text-title)]">อ.ดร.ประเสริฐ ถาวร</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 font-semibold border border-purple-300 dark:border-purple-700">
                  วิทยฐานะ: ครูชำนาญการพิเศษ
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-body)]">
                กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี • หัวหน้ากลุ่มงานนวัตกรรมการเรียนรู้
              </p>
              <div className="text-xs text-purple-800 dark:text-purple-300 font-semibold flex items-center gap-1.5 pt-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>ประเด็นท้าทาย ว.PA: การใช้ Gamification และ AI เพื่อยกระดับผลสัมฤทธิ์ทางการเรียนรู้</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2 text-xs">
            <div className="font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
              <span>ความก้าวหน้าข้อตกลง PA ({academicYear})</span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-text-body)] text-[11px]">
              <span>ด้านการจัดการเรียนรู้</span>
              <span className="text-emerald-800 dark:text-emerald-300 font-bold">100% ผ่านเกณฑ์</span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-text-body)] text-[11px]">
              <span>สื่อนวัตกรรมในระบบ</span>
              <span className="text-amber-800 dark:text-amber-300 font-bold">5 สื่อการสอน</span>
            </div>
          </div>
        </div>
      )
      )}

      {/* Portfolio Items Grid */}
      {portfolioStep === 1 && <div>
        <PagedList
          items={filteredItems}
          pageSize={1}
          emptyState={<p className="text-sm text-[var(--color-text-muted)] font-medium">{lang === 'th' ? 'ยังไม่มีผลงานในหมวดนี้' : 'No portfolio items in this category.'}</p>}
          renderItem={(item) => (
          <div 
            key={item.id}
            className="rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden flex flex-col justify-between hover:border-[var(--color-primary)] transition-all group shadow-xs"
          >
            {item.imageUrl && (
              <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                <img 
                  src={item.imageUrl} 
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-[10px] font-bold text-white border border-white/25">
                  {item.year}
                </div>
                {item.certifiedBySchool && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-700 text-[10px] font-bold text-white flex items-center gap-1 shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>โรงเรียนรับรองผลงาน</span>
                  </div>
                )}
              </div>
            )}

            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)]">
                    {item.category}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">เจ้าของ: {item.ownerName}</span>
                </div>

                <h4 className="text-base font-bold text-[var(--color-text-title)] leading-snug group-hover:text-[var(--color-primary-text)] transition-colors">
                  {item.title}
                </h4>

                <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
                {/* Skills Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {item.skills.map((skill, sIdx) => (
                    <span 
                      key={sIdx}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border border-[var(--color-border)] flex items-center gap-1"
                    >
                      <Tag className="w-2.5 h-2.5 text-[var(--color-primary-text)]" />
                      <span>{skill}</span>
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1">
                    <Award className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                    <span>โบนัสคะแนน: +{item.scoreBonus || 100} แต้ม</span>
                  </span>

                  <button 
                    onClick={handlePrintPortfolio}
                    className="text-[var(--color-primary-text)] hover:underline font-bold flex items-center gap-1 text-xs cursor-pointer"
                  >
                    <span>ดูเอกสาร / ใบประกาศ</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        />
      </div>}
      </div>

      {/* Add New Portfolio Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-4 sm:p-6 max-w-xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <h3 className="text-lg font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[var(--color-primary-text)]" />
                <span>
                  {activeRoleTab === 'student' ? 'เพิ่มผลงาน TCAS Portfolio' : 'เพิ่มผลงานแฟ้ม ว.PA ครู'}
                </span>
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddFormStep(0);
                }}
                className="w-8 h-8 rounded-lg bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:text-[var(--color-text-title)] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <p className="text-[11px] text-[var(--color-text-muted)] font-semibold">{addFormStep + 1} / 3</p>
              {addFormStep === 0 && <>
              <div>
                <label className="text-xs font-bold text-[var(--color-text-title)] block mb-1">ชื่อผลงาน / โครงงาน / รางวัล</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น ชนะเลิศการแข่งขันหุ่นยนต์กู้ภัยระดับประเทศ"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--color-text-title)] block mb-1">หมวดหมู่</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)]"
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
                  <label className="text-xs font-bold text-[var(--color-text-title)] block mb-1">ปีการศึกษาที่ได้รับ</label>
                  <input
                    type="text"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)]"
                    required
                  />
                </div>
              </div>
              </>}
              {addFormStep === 1 && <>
              <div>
                <label className="text-xs font-bold text-[var(--color-text-title)] block mb-1">รายละเอียดและบทเรียนที่ได้รับ</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="อธิบายการนำไปใช้ ความสำคัญ และผลลัพธ์ของผลงานนี้..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)]"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--color-text-title)] block mb-1">ทักษะที่เกี่ยวข้อง (คั่นด้วยจุลภาค)</label>
                <input
                  type="text"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  placeholder="เช่น Python, Machine Learning, Leadership"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)]"
                />
              </div>
              </>}
              {addFormStep === 2 && <>
              <div>
                <label className="text-xs font-bold text-[var(--color-text-title)] block mb-1">ลิงก์รูปภาพประกอบผลงาน (Image URL)</label>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-title)]"
                />
              </div>
              </>}
              <div className="pt-4 flex items-center justify-between gap-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => addFormStep > 0 ? setAddFormStep((step) => (step - 1) as 0 | 1 | 2) : setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-title)] cursor-pointer"
                >
                  {addFormStep > 0 ? 'ย้อนกลับ' : 'ยกเลิก'}
                </button>
                {addFormStep < 2 ? (
                  <button
                    type="button"
                    onClick={() => setAddFormStep((step) => (step + 1) as 0 | 1 | 2)}
                    className="px-6 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-xs font-bold text-white shadow-sm cursor-pointer"
                  >
                    ถัดไป
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-xs font-bold text-white shadow-sm cursor-pointer"
                  >
                    บันทึกผลงานลง Portfolio
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
