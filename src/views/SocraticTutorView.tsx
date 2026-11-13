import React, { useEffect, useState } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  Mic, 
  MicOff, 
  Volume2, 
  Send, 
  HelpCircle, 
  Lightbulb, 
  BarChart3, 
  MessageSquare, 
  ArrowRight, 
  Clock, 
  User, 
  CheckCircle2, 
  Flame,
  FileText,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { 
  AdaptivePracticeTopic,
  SocraticChatMessage, 
  TeacherStruggleInsight, 
  AppLanguage, 
  UserRole 
} from '../types';
import { 
  INITIAL_SOCRATIC_MESSAGES, 
  INITIAL_TEACHER_INSIGHTS 
} from '../data/innovativeFeaturesData';
import { PagedList } from '../components/PagedList';

interface SocraticTutorViewProps {
  lang?: AppLanguage;
  currentRole?: UserRole;
  currentUserName?: string;
  initialFocusTopic?: AdaptivePracticeTopic | null;
  onClearFocusTopic?: () => void;
}

export const SocraticTutorView: React.FC<SocraticTutorViewProps> = ({
  lang = 'th',
  currentRole = 'student',
  currentUserName = 'ด.ช. ภูมิใจ รักเรียน',
  initialFocusTopic = null,
  onClearFocusTopic,
}) => {
  const canViewTeacherInsights = currentRole === 'teacher' || currentRole === 'admin';
  const [activeTab, setActiveTab] = useState<'tutor_chat' | 'teacher_insights'>(
    initialFocusTopic
      ? 'tutor_chat'
      : canViewTeacherInsights
      ? 'teacher_insights'
      : 'tutor_chat'
  );

  // Chat State
  const [messages, setMessages] = useState<SocraticChatMessage[]>(INITIAL_SOCRATIC_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);

  // Teacher Insights State
  const [insights, setInsights] = useState<TeacherStruggleInsight[]>(INITIAL_TEACHER_INSIGHTS);
  const [selectedInsight, setSelectedInsight] = useState<TeacherStruggleInsight | null>(INITIAL_TEACHER_INSIGHTS[0]);
  const [generatedTalkingPoints, setGeneratedTalkingPoints] = useState<string | null>(null);

  useEffect(() => {
    if (!initialFocusTopic) return;
    setActiveTab('tutor_chat');
    const scoreText =
      typeof initialFocusTopic.score === 'number'
        ? ` (คะแนนปัจจุบัน ${initialFocusTopic.score}/100)`
        : '';
    const focusSubject = initialFocusTopic.subjectName || initialFocusTopic.subject;
    const focusMsg: SocraticChatMessage = {
      id: `focus-${Date.now()}`,
      sender: 'socratic_tutor',
      textTh: `ยินดีต้อนรับสู่โหมดซ่อมเสริมเจาะจงสำหรับวิชา "${focusSubject}"${scoreText}${initialFocusTopic.studentName ? ` · นักเรียน: ${initialFocusTopic.studentName}` : ''}`,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      scaffoldingHint: 'ระบุหัวข้อหรือบทที่รู้สึกสับสน แล้วมาช่วยกันไล่ทีละขั้นตอนโดยไม่ข้ามขั้นครับ',
      followUpPrompt: `ในวิชา ${focusSubject} เรื่องใดที่อยากทบทวนก่อนเป็นอันดับแรก?`,
    };
    setMessages((prev) => [...prev, focusMsg]);
    setInputText(`ขอทบทวนเนื้อหาพื้นฐานวิชา ${focusSubject} เพื่อเตรียมซ่อมเสริม`);
    onClearFocusTopic?.();
  }, [initialFocusTopic]);

  // Send message in chat
  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const newStudentMsg: SocraticChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'student',
      textTh: text,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, newStudentMsg]);
    setInputText('');

    // Generate simulated Socratic AI response
    setTimeout(() => {
      let aiText = 'เป็นคำถามที่น่าสนใจมากครับน้องภูมิใจ! ลองค่อยๆ แยกแยะองค์ประกอบดูนะครับ 💡';
      let hint = 'ลองตรวจสอบตัวแปรที่โจทย์ให้มาว่ามีอะไรบ้าง';
      let followUp = 'ก. ความเร็ว หรือ ข. ความเร่ง?';

      if (text.includes('ตก') || text.includes('ฟิสิกส์') || text.includes('ความเร่ง')) {
        aiText = 'ทำไมวัตถุเบาและหนักถึงตกถึงพื้นพร้อมกันในสุญญากาศ? ลองนึกถึงกฎของนิวตัน $F = ma$ และ $F_g = mg$ ดูสิครับ';
        hint = 'มวล $m$ ปรากฏอยู่ทั้งสองข้างของสมการ สามารถตัดกันได้!';
        followUp = 'แปลว่าความเร่ง $a$ ขึ้นอยู่กับมวลของวัตถุหรือไม่?';
      } else if (text.includes('กรด') || text.includes('เบส') || text.includes('เคมี')) {
        aiText = 'หลักการสำคัญของกรด-เบสคือ การถ่ายโอนโปรตอน (H+) เมื่อกรดแก่แตกตัวหมด จะไม่มีการแย่ง H+ คืนกลับมา';
        hint = 'พิจารณาว่า HCl แตกตัวให้ H+ และ Cl- ในน้ำอย่างสมบูรณ์';
        followUp = 'สารละลายที่ได้จะมีค่า pH ต่ำกว่า 7 หรือเท่ากับ 7?';
      } else if (text.includes('either') || text.includes('neither') || text.includes('อังกฤษ')) {
        aiText = 'สำหรับโครงสร้าง "Either A or B" หรือ "Neither A nor B" ภาษาอังกฤษใช้หลัก Proximity Rule (ความใกล้ชิด)';
        hint = 'มองหากริยา แล้วถอยหลังกลับไปหาประธานตัวที่อยู่ติดกริยาที่สุด';
        followUp = 'ถ้าประธานตัวหลังเป็นเอกพจน์ กริยาต้องเติม -s หรือไม่?';
      }

      const newAiMsg: SocraticChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'socratic_tutor',
        textTh: aiText,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        scaffoldingHint: hint,
        followUpPrompt: followUp,
      };

      setMessages(prev => [...prev, newAiMsg]);
    }, 700);
  };

  // Mic Simulation
  const handleToggleMic = () => {
    if (!isRecording) {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        setInputText('พี่รหัส AI ครับ ทำไมวัตถุเบากับหนักถึงตกถึงพื้นพร้อมกัน?');
      }, 2500);
    } else {
      setIsRecording(false);
    }
  };

  // TTS Simulation
  const handleToggleSpeak = (msgId: string) => {
    if (isSpeakingId === msgId) {
      setIsSpeakingId(null);
    } else {
      setIsSpeakingId(msgId);
      setTimeout(() => setIsSpeakingId(null), 4000);
    }
  };

  // Teacher Generate Recap
  const handleGenerateRecapPoints = (insight: TeacherStruggleInsight) => {
    setGeneratedTalkingPoints(
      `📌 แผนสรุปจุดเข้าใจผิด 2 นาที (Micro-Recap) สำหรับคาบถัดไป:\n\n` +
      `1. [Hook 30 วินาที] ทักทายนักเรียนพร้อมชูบีกเกอร์หรือภาพ: "ใครจำได้บ้างว่าทำไมหยดฟีนอล์ฟทาลีนแล้วถึงไม่เปลี่ยนสีทันที?"\n` +
      `2. [Clarify 1 นาที] เน้นความต่าง: จุดสมมูล (โมลกรด = โมลเบส) VS จุดยุติ (สีเปลี่ยนเพราะอินดิเคเตอร์เปลี่ยนรูป)\n` +
      `3. [Check 30 วินาที] ถามเร็ว 1 คำถามเพื่อเช็กความเข้าใจ: "ถ้าไทเทรต HCl กับ NaOH จุดสมมูลคือ pH เท่าใด?" -> ให้นักเรียนชูนิ้ว 7 นิ้วพร้อมกัน`
    );
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5">
      {/* Top Banner Header */}
      <div className="shrink-0 bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-3.5 sm:p-4 shadow-md border border-teal-600/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-900/70 border border-teal-400/40 text-teal-100 text-[11px] font-semibold">
              <BrainCircuit className="w-3.5 h-3.5 text-teal-300" />
              <span>{lang === 'th' ? 'ติวเตอร์พี่รหัส AI ชวนคิด (Socratic Tutor) & แดชบอร์ดวิเคราะห์ข้อสงสัยครู' : 'Socratic AI Tutor & Teacher Insight'}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{lang === 'th' ? 'AI Socratic Voice Tutor & Teacher Insights' : 'AI Socratic Tutor'}</span>
            </h1>
            <p className="text-slate-200 text-xs leading-relaxed">
              {lang === 'th' 
                ? 'โหมดตัวอย่าง: บทสนทนาใช้คำตอบจำลอง ยังไม่ได้เชื่อม AI จริง ส่วนแดชบอร์ดครูแสดงข้อมูลตัวอย่าง'
                : 'Demo mode: responses are simulated, not connected to a live AI. Teacher insights use sample data.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950/50 p-1 rounded-2xl backdrop-blur-md border border-white/25 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('tutor_chat')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'tutor_chat'
                  ? 'bg-teal-400 text-slate-950 shadow-md font-black'
                  : 'text-white hover:bg-slate-800/70'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'ห้องแชทติวเตอร์ AI' : 'Student AI Chat'}</span>
            </button>

            {canViewTeacherInsights && <button
              type="button"
              onClick={() => setActiveTab('teacher_insights')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'teacher_insights'
                  ? 'bg-indigo-700 text-white shadow-md font-black'
                  : 'text-white hover:bg-slate-800/70'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'แดชบอร์ดคุณครู' : 'Teacher Insights'}</span>
            </button>}
          </div>
        </div>
      </div>

      {/* Mode 1: Student Socratic Voice & Chat Tutor */}
      {activeTab === 'tutor_chat' && (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-y-auto pb-1">
          {/* Main Chat Stream */}
          <div className="lg:col-span-8 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-3.5 sm:p-4 shadow-xs flex flex-col justify-between min-h-[340px]">
            {/* Chat Messages Log */}
            <div className="space-y-3 pr-2 flex-1 min-h-0 overflow-y-auto">
              <PagedList
                items={messages}
                pageSize={2}
                renderItem={(msg) => {
                const isStudent = msg.sender === 'student';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isStudent ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isStudent 
                        ? 'bg-indigo-700 text-white' 
                        : 'bg-teal-400 text-slate-950 shadow-sm'
                    }`}>
                      {isStudent ? <User className="w-4 h-4" /> : <BrainCircuit className="w-4 h-4" />}
                    </div>

                    <div className={`max-w-lg space-y-2 ${isStudent ? 'text-right' : ''}`}>
                      <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isStudent 
                          ? 'bg-indigo-700 text-white rounded-tr-none' 
                          : 'bg-[var(--color-card-subtle)] text-[var(--color-text-title)] rounded-tl-none border border-[var(--color-border)]'
                      }`}>
                        <p>{msg.textTh}</p>

                        {/* Socratic Scaffolding Box */}
                        {msg.scaffoldingHint && (
                          <div className="mt-3 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-100 text-xs font-medium space-y-1 text-left">
                            <p className="font-bold flex items-center gap-1.5 text-teal-800 dark:text-teal-300">
                              <Lightbulb className="w-3.5 h-3.5" />
                              <span>{lang === 'th' ? 'คำใบ้ชวนคิด:' : 'Scaffolding Hint:'}</span>
                            </p>
                            <p>{msg.scaffoldingHint}</p>
                          </div>
                        )}

                        {/* Follow up question */}
                        {msg.followUpPrompt && (
                          <div className="mt-2 text-left text-xs font-bold text-indigo-800 dark:text-indigo-300">
                            👉 {msg.followUpPrompt}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)] px-1">
                        <span>{msg.timestamp}</span>
                        {!isStudent && (
                          <button
                            type="button"
                            onClick={() => handleToggleSpeak(msg.id)}
                            className="text-teal-800 dark:text-teal-300 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>{isSpeakingId === msg.id ? (lang === 'th' ? 'กำลังอ่าน...' : 'Playing...') : (lang === 'th' ? 'ฟังเสียง' : 'Listen')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }}
              />
            </div>

            {/* Input Bar with Voice Button */}
            <div className="pt-4 border-t border-[var(--color-border)]">
              {isRecording && (
                <div className="mb-2 p-2 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100 text-xs flex items-center gap-2 animate-pulse">
                  <Mic className="w-4 h-4 text-rose-700 dark:text-rose-300" />
                  <span>{lang === 'th' ? 'กำลังรับฟังเสียงพูดของคุณ... (พูดคำถามได้เลยครับ)' : 'Listening to your voice query...'}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMic}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    isRecording 
                      ? 'bg-rose-700 border-rose-700 text-white animate-bounce' 
                      : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-title)] hover:opacity-90'
                  }`}
                  title="Voice Input"
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={lang === 'th' ? 'พิมพ์คำถาม หรือกดไมค์เพื่อพูดคุยกับพี่รหัส AI...' : 'Ask a question or use voice mic...'}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs sm:text-sm text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="p-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold transition shadow-xs cursor-pointer"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Preset Curiosity Questions & Socratic Guidelines */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Curiosity Starters */}
            <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{lang === 'th' ? 'คำถามชวนสงสัยยอดฮิต' : 'Curiosity Starters'}</span>
              </h3>

              <div className="space-y-2">
                {[
                  'ทำไมวัตถุเบากับหนักถึงตกถึงพื้นพร้อมกันในสุญญากาศ?',
                  'การหาจุดสะเทินกรด-เบส ข้อนี้ต้องเริ่มดูจากตรงไหน?',
                  'เทคนิคจำกฎ Proximity ของ Neither...nor ทำอย่างไร?',
                  'ทำไมมุมยิง 45 องศาถึงได้ระยะทางไกลที่สุด?',
                ].map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(q)}
                    className="w-full text-left p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-teal-500 text-xs text-[var(--color-text-title)] transition flex items-center justify-between cursor-pointer"
                  >
                    <span>{q}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Socratic Philosophy Card */}
            <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-700 text-xs text-teal-950 dark:text-teal-100 space-y-2">
              <p className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                <span>{lang === 'th' ? 'ทำไมพี่รหัส AI ถึงไม่บอกคำตอบตรงๆ?' : 'Why Socratic Method?'}</span>
              </p>
              <p className="leading-relaxed text-[11px]">
                {lang === 'th' 
                  ? 'การได้รับคำตอบสำเร็จรูปทำให้สมองหยุดคิด แต่การค่อยๆ ต่อจิ๊กซอว์ทางความคิดทีละก้าว จะสร้างเซลล์ประสาทความจำถาวร (Long-term retention) ทำให้น้องทำข้อสอบได้เองในห้องสอบจริง!' 
                  : 'Socratic dialogue promotes critical reasoning over rote memorization.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Teacher Struggle Insights Dashboard */}
      {canViewTeacherInsights && activeTab === 'teacher_insights' && (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-y-auto pb-1">
          {/* Top 5 Misconceptions List */}
          <div className="lg:col-span-7 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4 shadow-xs flex flex-col min-h-0 overflow-y-auto space-y-3">
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
                <span>{lang === 'th' ? 'Top หัวข้อที่นักเรียนแอบถาม AI บ่อยที่สุดในสัปดาห์นี้' : 'Top Student Struggle Topics'}</span>
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {lang === 'th' ? 'ประมวลผลจากคำถามแชทจริงของนักเรียนในห้องเรียน โดยไม่ระบุตัวตน' : 'Aggregated from anonymous student tutoring chats'}
              </p>
            </div>

            <div className="mt-4">
              <PagedList
                items={insights}
                pageSize={2}
                renderItem={(insight) => {
                const isSelected = selectedInsight?.id === insight.id;
                return (
                  <div
                    key={insight.id}
                    onClick={() => {
                      setSelectedInsight(insight);
                      setGeneratedTalkingPoints(null);
                    }}
                    className={`p-4 rounded-xl border transition cursor-pointer ${
                      isSelected 
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] shadow-xs' 
                        : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:border-[var(--color-primary)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
                            {insight.subject}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            {insight.generatedAt}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[var(--color-text-title)] mt-1">
                          {insight.topicTh}
                        </h4>
                      </div>

                      {/* Struggle Rate */}
                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                          {lang === 'th' ? 'สัดส่วนที่สงสัย' : 'Struggle Rate'}
                        </span>
                        <div className="text-xl font-black text-rose-700 dark:text-rose-300">
                          {insight.studentStrugglePercent}%
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-[var(--color-text-body)] mt-2 leading-relaxed">
                      {insight.commonMisconceptionTh}
                    </p>
                  </div>
                );
              }}
              />
            </div>
          </div>

          {/* Right Column: 1-Click Lesson Recap Generator */}
          <div className="lg:col-span-5 flex flex-col min-h-0 overflow-y-auto space-y-3">
            <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <span>{lang === 'th' ? 'สร้างบทสรุปสอนซ้ำ 2 นาที (Micro-Recap Generator)' : '2-Min Micro-Recap Generator'}</span>
              </h3>

              {selectedInsight ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3 rounded-xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-1">
                    <p className="font-bold text-indigo-800 dark:text-indigo-300">
                      {lang === 'th' ? 'หัวข้อที่เลือก:' : 'Selected Topic:'} {selectedInsight.topicTh}
                    </p>
                    <p className="text-[var(--color-text-body)]">
                      {selectedInsight.suggestedLessonPlanTh}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGenerateRecapPoints(selectedInsight)}
                    className="w-full py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span>{lang === 'th' ? 'สร้างสคริปต์สอนสรุป 2 นาทีทันที' : 'Generate 2-Min Lecture Script'}</span>
                  </button>

                  {/* Output script */}
                  {generatedTalkingPoints && (
                    <div className="p-4 rounded-xl bg-[var(--color-primary-light)] border border-[var(--color-primary)] text-[var(--color-text-title)] leading-relaxed font-mono whitespace-pre-line text-xs animate-fade-in">
                      {generatedTalkingPoints}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">
                  {lang === 'th' ? 'เลือกหัวข้อจากรายการทางซ้ายมือ' : 'Select a topic from the left matrix'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
