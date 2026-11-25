import React, { useEffect, useRef, useState } from 'react';
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
  Loader2,
  User, 
  AlertTriangle,
  FileText,
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
import { getModuleTone } from '../lib/moduleTheme';
import { postLearningAi } from '../lib/learningAiClient';

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

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
  currentUserName = 'นักเรียน',
  initialFocusTopic = null,
  onClearFocusTopic,
}) => {
  const canViewTeacherInsights = currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'super_admin';
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
  const [focusSubject, setFocusSubject] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  // Teacher Insights State
  const [insights] = useState<TeacherStruggleInsight[]>(INITIAL_TEACHER_INSIGHTS);
  const [selectedInsight, setSelectedInsight] = useState<TeacherStruggleInsight | null>(INITIAL_TEACHER_INSIGHTS[0]);
  const [generatedTalkingPoints, setGeneratedTalkingPoints] = useState<string | null>(null);
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false);
  const [recapError, setRecapError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!initialFocusTopic) return;
    setActiveTab('tutor_chat');
    const scoreText =
      typeof initialFocusTopic.score === 'number'
        ? ` (คะแนนปัจจุบัน ${initialFocusTopic.score}/100)`
        : '';
    const focusTitle = initialFocusTopic.subjectName || initialFocusTopic.subject;
    setFocusSubject(focusTitle);
    const focusMsg: SocraticChatMessage = {
      id: `focus-${Date.now()}`,
      sender: 'socratic_tutor',
      textTh: `ยินดีต้อนรับสู่โหมดซ่อมเสริมเจาะจงสำหรับวิชา "${focusTitle}"${scoreText}${initialFocusTopic.studentName ? ` · นักเรียน: ${initialFocusTopic.studentName}` : ''}`,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      scaffoldingHint: 'ระบุหัวข้อหรือบทที่รู้สึกสับสน แล้วมาช่วยกันไล่ทีละขั้นตอนโดยไม่ข้ามขั้นครับ',
      followUpPrompt: `ในวิชา ${focusTitle} เรื่องใดที่อยากทบทวนก่อนเป็นอันดับแรก?`,
    };
    setMessages((prev) => [...prev, focusMsg]);
    setInputText(`ขอทบทวนเนื้อหาพื้นฐานวิชา ${focusTitle} เพื่อเตรียมซ่อมเสริม`);
    onClearFocusTopic?.();
  }, [initialFocusTopic, onClearFocusTopic]);

  // Send message to real Gemini Socratic Tutor
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    const newStudentMsg: SocraticChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'student',
      textTh: text,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };

    const nextHistory = [...messages, newStudentMsg];
    setMessages(nextHistory);
    setInputText('');
    setAiError(null);
    setIsSending(true);

    try {
      const data = await postLearningAi<{
        reply: {
          replyTh: string;
          scaffoldingHint?: string;
          followUpPrompt?: string;
        };
      }>('/api/learning-ai/socratic-chat', {
        message: text,
        subjectContext: focusSubject || undefined,
        studentName: currentUserName,
        lang,
        chatHistory: nextHistory.slice(-10).map((m) => ({
          sender: m.sender,
          text: m.textTh,
        })),
      });

      const newAiMsg: SocraticChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'socratic_tutor',
        textTh: data.reply.replyTh,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        scaffoldingHint: data.reply.scaffoldingHint,
        followUpPrompt: data.reply.followUpPrompt,
      };
      setMessages((prev) => [...prev, newAiMsg]);
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : lang === 'th'
          ? 'ไม่สามารถติดต่อพี่รหัส AI ได้ในขณะนี้'
          : 'Unable to reach AI Tutor right now.'
      );
    } finally {
      setIsSending(false);
    }
  };

  // Real Web Speech API Voice Input
  const handleToggleMic = () => {
    setVoiceNotice(null);
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (typeof window === 'undefined') return;
    const SpeechRecCtor =
      (window as unknown as { SpeechRecognition?: new () => BrowserSpeechRecognition; webkitSpeechRecognition?: new () => BrowserSpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => BrowserSpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecCtor) {
      setVoiceNotice(
        lang === 'th'
          ? 'เบราว์เซอร์นี้ยังไม่รองรับการพิมพ์ด้วยเสียง กรุณาพิมพ์คำถามลงในช่องข้อความ'
          : 'Voice dictation is not supported in this browser. Please type your question.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecCtor();
      recognition.lang = lang === 'th' ? 'th-TH' : 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognition.onerror = () => {
        setIsRecording(false);
        setVoiceNotice(
          lang === 'th'
            ? 'ไม่สามารถรับเสียงจากไมโครโฟนได้ กรุณาตรวจสอบสิทธิ์ไมโครโฟนของเบราว์เซอร์'
            : 'Microphone capture failed. Please check browser microphone permissions.'
        );
      };
      recognition.onend = () => {
        setIsRecording(false);
      };
      recognitionRef.current = recognition;
      setIsRecording(true);
      recognition.start();
    } catch {
      setIsRecording(false);
      setVoiceNotice(
        lang === 'th'
          ? 'ไม่สามารถเริ่มรับเสียงจากไมโครโฟนได้'
          : 'Could not start voice recognition.'
      );
    }
  };

  // Real Web SpeechSynthesis TTS
  const handleToggleSpeak = (msg: SocraticChatMessage) => {
    setVoiceNotice(null);
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceNotice(
        lang === 'th'
          ? 'เบราว์เซอร์นี้ไม่รองรับการอ่านออกเสียง'
          : 'Speech synthesis is not supported in this browser.'
      );
      return;
    }

    window.speechSynthesis.cancel();
    if (isSpeakingId === msg.id) {
      setIsSpeakingId(null);
      return;
    }

    const spokenText = [msg.textTh, msg.scaffoldingHint, msg.followUpPrompt].filter(Boolean).join('. ');
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = lang === 'th' ? 'th-TH' : 'en-US';
    utterance.rate = 1;
    utterance.onend = () => setIsSpeakingId(null);
    utterance.onerror = () => setIsSpeakingId(null);
    setIsSpeakingId(msg.id);
    window.speechSynthesis.speak(utterance);
  };

  // Teacher Generate Recap via real Gemini API
  const handleGenerateRecapPoints = async (insight: TeacherStruggleInsight) => {
    if (isGeneratingRecap) return;
    setIsGeneratingRecap(true);
    setRecapError(null);

    try {
      const data = await postLearningAi<{ microRecapPlanTh: string }>(
        '/api/learning-ai/socratic-talking-points',
        {
          subject: insight.subject,
          topicTh: insight.topicTh,
          commonMisconceptionTh: insight.commonMisconceptionTh,
          suggestedLessonPlanTh: insight.suggestedLessonPlanTh,
          strugglePercent: insight.studentStrugglePercent,
          lang,
        }
      );
      setGeneratedTalkingPoints(data.microRecapPlanTh);
    } catch (error) {
      setRecapError(
        error instanceof Error
          ? error.message
          : lang === 'th'
          ? 'ไม่สามารถสร้างสคริปต์สอนสรุปได้'
          : 'Failed to generate lesson recap script.'
      );
    } finally {
      setIsGeneratingRecap(false);
    }
  };

  return (
    <div className={`h-full flex flex-col min-h-0 overflow-hidden space-y-2.5 ${getModuleTone('socratic_tutor')}`}>
      {/* Top Banner Header */}
      <div className="shrink-0 app-page-header p-3.5 sm:p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 max-w-xl">
            <div className="w-10 h-10 rounded-xl tone-chip shrink-0 mt-0.5">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[var(--tone-soft)] border border-[var(--color-border)] text-[var(--tone)] text-[11px] font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'ติวเตอร์พี่รหัส AI ชวนคิด (Socratic Tutor) & แดชบอร์ดวิเคราะห์ครู' : 'Socratic AI Tutor & Teacher Insight'}</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-[var(--color-text-title)]">
                <span>{lang === 'th' ? 'AI Socratic Tutor & Teacher Insights' : 'AI Socratic Tutor'}</span>
              </h1>
              <p className="text-[var(--color-text-body)] text-xs leading-relaxed">
                {lang === 'th'
                  ? 'ถาม-ตอบชวนคิดทีละขั้นด้วย Gemini ระดับโรงเรียน พร้อมสคริปต์สอนซ้ำ 2 นาทีสำหรับครูผู้สอน'
                  : 'Step-by-step Socratic tutoring powered by your school Gemini AI key with 2-minute micro-recap generation.'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="seg-tab-group shrink-0">
            <button
              type="button"
              data-active={activeTab === 'tutor_chat'}
              onClick={() => setActiveTab('tutor_chat')}
              className="seg-tab-btn"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'ห้องแชทติวเตอร์ AI' : 'Student AI Chat'}</span>
            </button>

            {canViewTeacherInsights && (
              <button
                type="button"
                data-active={activeTab === 'teacher_insights'}
                onClick={() => setActiveTab('teacher_insights')}
                className="seg-tab-btn"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'แดชบอร์ดคุณครู' : 'Teacher Insights'}</span>
              </button>
            )}
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
                            onClick={() => handleToggleSpeak(msg)}
                            className="text-teal-800 dark:text-teal-300 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>{isSpeakingId === msg.id ? (lang === 'th' ? 'กำลังอ่าน (กดหยุด)' : 'Speaking (Stop)') : (lang === 'th' ? 'ฟังเสียง' : 'Listen')}</span>
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
            <div className="pt-4 border-t border-[var(--color-border)] space-y-2">
              {aiError && (
                <div role="alert" className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-300 shrink-0 mt-0.5" />
                  <span>{aiError}</span>
                </div>
              )}

              {voiceNotice && (
                <div role="status" className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 text-xs">
                  {voiceNotice}
                </div>
              )}

              {isRecording && (
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100 text-xs flex items-center gap-2 animate-pulse">
                  <Mic className="w-4 h-4 text-rose-700 dark:text-rose-300" />
                  <span>{lang === 'th' ? 'กำลังรับฟังเสียงพูดของคุณ... (พูดคำถามได้เลยครับ)' : 'Listening to your voice query...'}</span>
                </div>
              )}

              {isSending && (
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-100 text-xs flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-700 dark:text-teal-300" />
                  <span>{lang === 'th' ? 'พี่รหัส AI กำลังคิดคำใบ้ชวนวิเคราะห์...' : 'AI Tutor is crafting a Socratic hint...'}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMic}
                  disabled={isSending}
                  className={`p-3 rounded-xl border transition cursor-pointer disabled:opacity-50 ${
                    isRecording 
                      ? 'bg-rose-700 border-rose-700 text-white animate-bounce' 
                      : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] text-[var(--color-text-title)] hover:opacity-90'
                  }`}
                  title={lang === 'th' ? 'พิมพ์คำถามด้วยเสียง' : 'Voice Input'}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <input
                  type="text"
                  value={inputText}
                  disabled={isSending}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleSendMessage()}
                  placeholder={lang === 'th' ? 'พิมพ์คำถาม หรือกดไมค์เพื่อพูดคุยกับพี่รหัส AI...' : 'Ask a question or use voice mic...'}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs sm:text-sm text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
                />

                <button
                  type="button"
                  disabled={isSending || !inputText.trim()}
                  onClick={() => void handleSendMessage()}
                  className="p-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 disabled:opacity-50 text-slate-950 font-bold transition shadow-xs cursor-pointer"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
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
                    disabled={isGeneratingRecap}
                    onClick={() => void handleGenerateRecapPoints(selectedInsight)}
                    className="w-full py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    {isGeneratingRecap ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-yellow-300" />
                    )}
                    <span>
                      {isGeneratingRecap
                        ? lang === 'th'
                          ? 'กำลังสร้างสคริปต์ด้วย Gemini...'
                          : 'Generating script...'
                        : lang === 'th'
                        ? 'สร้างสคริปต์สอนสรุป 2 นาทีด้วย AI'
                        : 'Generate 2-Min Lecture Script'}
                    </span>
                  </button>

                  {recapError && (
                    <div role="alert" className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100 text-xs">
                      {recapError}
                    </div>
                  )}

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
