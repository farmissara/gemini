import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCheck,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Image as ImageIcon,
  Inbox,
  Mail,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  AdminCoordinationAttachment,
  AdminCoordinationMessage,
  AppLanguage,
  AuthUser,
  School,
  UserRole,
} from '../types';
import {
  fetchCoordinationMessages,
  formatFileSize,
  readFileAsCoordinationAttachment,
  sendCoordinationMessage,
  updateCoordinationMessageStatus,
} from '../lib/coordinationDesk';
import { MASTER_SYSTEM_EMAIL } from '../lib/authDb';

interface AdminSuperAdminDeskViewProps {
  currentUser: AuthUser | null;
  activeSchool: School;
  schools: School[];
  currentRole: UserRole;
  lang: AppLanguage;
  onUnreadCountChange?: (count: number) => void;
}

export const AdminSuperAdminDeskView: React.FC<AdminSuperAdminDeskViewProps> = ({
  currentUser,
  activeSchool,
  schools,
  currentRole,
  lang,
  onUnreadCountChange,
}) => {
  const isSuperAdmin = currentRole === 'super_admin';
  const [messages, setMessages] = useState<AdminCoordinationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(() =>
    isSuperAdmin ? 'all' : activeSchool.id
  );
  const [filterType, setFilterType] = useState<'all' | 'chat' | 'letter' | 'urgent'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Composer state
  const [channelType, setChannelType] = useState<'chat' | 'letter'>('chat');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'normal'>('urgent');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<AdminCoordinationAttachment[]>([]);
  const [composeSchoolId, setComposeSchoolId] = useState<string>(activeSchool.id);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isSuperAdmin) {
      setSelectedSchoolId(activeSchool.id);
      setComposeSchoolId(activeSchool.id);
    } else if (selectedSchoolId !== 'all') {
      setComposeSchoolId(selectedSchoolId);
    }
  }, [activeSchool.id, isSuperAdmin, selectedSchoolId]);

  const computeUnreadForRole = useCallback(
    (list: AdminCoordinationMessage[]) => {
      if (isSuperAdmin) {
        return list.filter((m) => m.senderRole === 'admin' && !m.readBySuperAdmin).length;
      }
      return list.filter(
        (m) => m.schoolId === activeSchool.id && m.senderRole === 'super_admin' && !m.readByAdmin
      ).length;
    },
    [activeSchool.id, isSuperAdmin]
  );

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const targetScope = isSuperAdmin ? undefined : activeSchool.id;
      const list = await fetchCoordinationMessages(targetScope);
      setMessages(list);
      onUnreadCountChange?.(computeUnreadForRole(list));
    } catch (error) {
      setMessages([]);
      setErrorMsg(error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อความประสานงานได้');
    } finally {
      setLoading(false);
    }
  }, [activeSchool.id, computeUnreadForRole, isSuperAdmin, onUnreadCountChange]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadMessages();
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [loadMessages]);

  // Mark incoming messages in active scope as read when opened
  useEffect(() => {
    if (messages.length === 0) return;
    const unreadIncoming = messages.filter((m) => {
      if (isSuperAdmin) {
        const matchesSchool = selectedSchoolId === 'all' || m.schoolId === selectedSchoolId;
        return matchesSchool && m.senderRole === 'admin' && !m.readBySuperAdmin;
      }
      return m.schoolId === activeSchool.id && m.senderRole === 'super_admin' && !m.readByAdmin;
    });

    if (unreadIncoming.length === 0) return;

    let cancelled = false;
    (async () => {
      let latest = messages;
      try {
        for (const item of unreadIncoming) {
          if (cancelled) break;
          await updateCoordinationMessageStatus(
            item.id,
            isSuperAdmin ? { readBySuperAdmin: true } : { readByAdmin: true }
          );
          latest = latest.map((message) =>
            message.id === item.id
              ? { ...message, ...(isSuperAdmin ? { readBySuperAdmin: true } : { readByAdmin: true }) }
              : message
          );
        }
        if (!cancelled) {
          const scoped = isSuperAdmin ? latest : latest.filter((m) => m.schoolId === activeSchool.id);
          setMessages(scoped);
          onUnreadCountChange?.(computeUnreadForRole(scoped));
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMsg(error instanceof Error ? error.message : 'ไม่สามารถอัปเดตสถานะการอ่านข้อความได้');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSchool.id, computeUnreadForRole, isSuperAdmin, messages, onUnreadCountChange, selectedSchoolId]);

  const schoolSummaries = useMemo(() => {
    return schools.map((school) => {
      const schoolMsgs = messages.filter((m) => m.schoolId === school.id);
      const unreadCount = isSuperAdmin
        ? schoolMsgs.filter((m) => m.senderRole === 'admin' && !m.readBySuperAdmin).length
        : schoolMsgs.filter((m) => m.senderRole === 'super_admin' && !m.readByAdmin).length;
      const openUrgent = schoolMsgs.filter((m) => m.priority === 'urgent' && m.status !== 'resolved').length;
      return {
        school,
        totalCount: schoolMsgs.length,
        unreadCount,
        openUrgent,
        latestAt: schoolMsgs[0]?.createdAt || '',
      };
    });
  }, [isSuperAdmin, messages, schools]);

  const visibleMessages = useMemo(() => {
    return messages
      .filter((m) => {
        if (isSuperAdmin && selectedSchoolId !== 'all' && m.schoolId !== selectedSchoolId) return false;
        if (!isSuperAdmin && m.schoolId !== activeSchool.id) return false;
        if (filterType === 'chat' && m.channelType !== 'chat') return false;
        if (filterType === 'letter' && m.channelType !== 'letter') return false;
        if (filterType === 'urgent' && m.priority !== 'urgent') return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            m.subject.toLowerCase().includes(q) ||
            m.body.toLowerCase().includes(q) ||
            m.schoolName.toLowerCase().includes(q) ||
            m.senderName.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activeSchool.id, filterType, isSuperAdmin, messages, searchQuery, selectedSchoolId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErrorMsg(null);
    const added: AdminCoordinationAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const att = await readFileAsCoordinationAttachment(files[i]);
        added.push(att);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถแนบไฟล์ได้');
      }
    }
    if (added.length > 0) {
      setAttachments((prev) => [...prev, ...added].slice(0, 5));
    }
    e.target.value = '';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setNoticeMsg(null);

    const trimmedBody = body.trim();
    const trimmedSubject = subject.trim();
    if (!trimmedBody && attachments.length === 0) {
      setErrorMsg(lang === 'th' ? 'กรุณากรอกข้อความหรือแนบไฟล์เอกสารก่อนส่ง' : 'Please enter a message or attach a file.');
      return;
    }
    if (channelType === 'letter' && !trimmedSubject) {
      setErrorMsg(lang === 'th' ? 'กรุณาระบุหัวเรื่องสำหรับจดหมายประสานงาน' : 'Please enter an official letter subject.');
      return;
    }

    const targetSchool = schools.find((s) => s.id === (isSuperAdmin ? composeSchoolId : activeSchool.id)) || activeSchool;

    const newMsg: AdminCoordinationMessage = {
      id: `coord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      schoolId: targetSchool.id,
      schoolName: targetSchool.nameTh,
      senderRole: isSuperAdmin ? 'super_admin' : 'admin',
      senderName: currentUser?.fullNameTh || currentUser?.fullNameEn || (isSuperAdmin ? 'Super Admin' : 'School Admin'),
      senderEmail: currentUser?.email || (isSuperAdmin ? MASTER_SYSTEM_EMAIL : targetSchool.email),
      channelType,
      priority,
      subject:
        trimmedSubject ||
        (channelType === 'chat'
          ? `ข้อความด่วนจาก ${isSuperAdmin ? 'Super Admin' : targetSchool.nameTh}`
          : 'หนังสือประสานงานด่วน'),
      body: trimmedBody || '(แนบไฟล์เอกสารประกอบ)',
      attachments,
      status: 'open',
      readByAdmin: !isSuperAdmin,
      readBySuperAdmin: isSuperAdmin,
      createdAt: new Date().toISOString(),
    };

    setSending(true);
    try {
      const savedMessage = await sendCoordinationMessage(newMsg);
      const updatedAll = [savedMessage, ...messages];
      const scoped = isSuperAdmin ? updatedAll : updatedAll.filter((m) => m.schoolId === activeSchool.id);
      setMessages(scoped);
      onUnreadCountChange?.(computeUnreadForRole(scoped));
      setSubject('');
      setBody('');
      setAttachments([]);
      setNoticeMsg(
        channelType === 'letter'
          ? `ส่งจดหมายประสานงานถึง ${isSuperAdmin ? targetSchool.nameTh : `Super Admin (${MASTER_SYSTEM_EMAIL})`} เรียบร้อยแล้ว`
          : 'ส่งข้อความประสานงานด่วนเรียบร้อยแล้ว'
      );
      setTimeout(() => setNoticeMsg(null), 4000);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'ไม่สามารถส่งข้อความประสานงานได้');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (msgId: string, nextStatus: AdminCoordinationMessage['status']) => {
    try {
      await updateCoordinationMessageStatus(msgId, {
        status: nextStatus,
        readByAdmin: true,
        readBySuperAdmin: true,
      });
      const updatedAll = messages.map((message) =>
        message.id === msgId
          ? { ...message, status: nextStatus, readByAdmin: true, readBySuperAdmin: true }
          : message
      );
      const scoped = isSuperAdmin ? updatedAll : updatedAll.filter((m) => m.schoolId === activeSchool.id);
      setMessages(scoped);
      onUnreadCountChange?.(computeUnreadForRole(scoped));
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'ไม่สามารถเปลี่ยนสถานะข้อความได้');
    }
  };

  const openCount = visibleMessages.filter((m) => m.status === 'open').length;
  const urgentCount = visibleMessages.filter((m) => m.priority === 'urgent' && m.status !== 'resolved').length;
  const resolvedCount = visibleMessages.filter((m) => m.status === 'resolved').length;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary-text)] text-[11px] font-bold border border-[var(--color-border)]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ช่องทางประสานงานตรง Admin โรงเรียน ↔ Super Admin</span>
            </span>
            <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
              Master: {MASTER_SYSTEM_EMAIL}
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-[var(--color-text-title)] tracking-tight">
            {isSuperAdmin
              ? 'ศูนย์รับเรื่อง & แชต/จดหมายประสานงานสถานศึกษา'
              : `แชต & จดหมายประสานงานด่วนถึง Super Admin (${activeSchool.nameTh})`}
          </h1>
          <p className="text-xs text-[var(--color-text-body)]">
            ส่งข้อความแชตด่วน หรือจดหมายราชการพร้อมแนบไฟล์เอกสาร PDF / Excel / รูปภาพ (สูงสุด 4 MB ต่อไฟล์) พร้อมติดตามสถานะการดำเนินการ
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-center min-w-[82px]">
            <div className="text-[10px] text-[var(--color-text-muted)] font-semibold">เรื่องใหม่</div>
            <div className="text-lg font-extrabold text-[var(--color-text-title)] tabular-nums">{openCount}</div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-center min-w-[82px]">
            <div className="text-[10px] text-rose-800 dark:text-rose-200 font-semibold">เร่งด่วนค้างอยู่</div>
            <div className="text-lg font-extrabold text-rose-700 dark:text-rose-200 tabular-nums">{urgentCount}</div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center min-w-[82px]">
            <div className="text-[10px] text-emerald-800 dark:text-emerald-200 font-semibold">ปิดเรื่องแล้ว</div>
            <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-200 tabular-nums">{resolvedCount}</div>
          </div>
          <button
            type="button"
            onClick={() => void loadMessages()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-xs font-bold text-[var(--color-text-title)] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className={`grid gap-4 ${isSuperAdmin ? 'lg:grid-cols-[280px_1fr]' : 'lg:grid-cols-[1.15fr_0.85fr]'}`}>
        {/* Left Column: SuperAdmin School List OR School Admin Composer */}
        {isSuperAdmin ? (
          <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-3 space-y-2 h-fit">
            <div className="flex items-center justify-between px-1 pb-2 border-b border-[var(--color-border)]">
              <span className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>โรงเรียนในเครือข่าย ({schools.length})</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedSchoolId('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                selectedSchoolId === 'all'
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)] hover:bg-[var(--color-primary-light)]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Inbox className="w-3.5 h-3.5" />
                <span>ทุกโรงเรียน (All Inbox)</span>
              </span>
              <span className="tabular-nums text-[11px] opacity-90">{messages.length}</span>
            </button>

            <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-0.5">
              {schoolSummaries.map(({ school, totalCount, unreadCount, openUrgent }) => {
                const isSelected = selectedSchoolId === school.id;
                return (
                  <button
                    key={school.id}
                    type="button"
                    onClick={() => setSelectedSchoolId(school.id)}
                    className={`w-full text-left p-2.5 rounded-lg border transition cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-text-title)]'
                        : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-card-subtle)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold truncate">{school.nameTh}</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold tabular-nums shrink-0">
                          {unreadCount} ใหม่
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                      <span>{school.province}</span>
                      <span className="tabular-nums">
                        {openUrgent > 0 ? `ด่วน ${openUrgent} · ` : ''}
                        {totalCount} รายการ
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Thread + Composer Stack (Right side for Super Admin, Split for School Admin) */}
        <div className={`space-y-4 ${!isSuperAdmin ? 'contents' : ''}`}>
          {/* Message Feed */}
          <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    { id: 'all', label: 'ทั้งหมด' },
                    { id: 'chat', label: 'แชตด่วน' },
                    { id: 'letter', label: 'จดหมาย/หนังสือ' },
                    { id: 'urgent', label: 'เร่งด่วนมาก' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterType(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      filterType === tab.id
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] border-[var(--color-border)] hover:text-[var(--color-text-title)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาหัวข้อ / เนื้อหา..."
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {visibleMessages.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-[var(--color-text-muted)] mx-auto" />
                <p className="text-xs text-[var(--color-text-muted)]">
                  ยังไม่มีข้อความหรือจดหมายประสานงานในเงื่อนไขที่เลือก
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {visibleMessages.map((msg) => {
                  const isFromSuper = msg.senderRole === 'super_admin';
                  return (
                    <article
                      key={msg.id}
                      className={`rounded-xl border p-3.5 space-y-2.5 ${
                        isFromSuper
                          ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                          : 'bg-[var(--color-card-subtle)] border-[var(--color-border)]'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                msg.channelType === 'letter'
                                  ? 'bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                  : 'bg-sky-50 dark:bg-sky-950 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-700'
                              }`}
                            >
                              {msg.channelType === 'letter' ? <Mail className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                              <span>{msg.channelType === 'letter' ? 'จดหมายประสานงาน' : 'แชตด่วน'}</span>
                            </span>

                            {msg.priority === 'urgent' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700">
                                <AlertTriangle className="w-3 h-3" />
                                <span>ด่วนที่สุด</span>
                              </span>
                            )}
                            {msg.priority === 'high' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                สำคัญ
                              </span>
                            )}

                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                msg.status === 'resolved'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                  : msg.status === 'acknowledged'
                                  ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {msg.status === 'resolved'
                                ? 'ดำเนินการเสร็จสิ้น'
                                : msg.status === 'acknowledged'
                                ? 'รับเรื่องแล้ว'
                                : 'รอตรวจสอบ'}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-[var(--color-text-title)]">{msg.subject}</h3>
                          <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-[var(--color-text-body)]">{msg.senderName}</span>
                            <span>({isFromSuper ? 'Super Admin' : `Admin · ${msg.schoolName}`})</span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Clock className="w-3 h-3" />
                              {new Date(msg.createdAt).toLocaleString('th-TH')}
                            </span>
                          </div>
                        </div>

                        {/* Status actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {msg.status === 'open' && (
                            <button
                              type="button"
                              onClick={() => void handleUpdateStatus(msg.id, 'acknowledged')}
                              className="px-2.5 py-1 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 text-[11px] font-bold hover:opacity-90 cursor-pointer flex items-center gap-1"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>รับเรื่อง</span>
                            </button>
                          )}
                          {msg.status !== 'resolved' && (
                            <button
                              type="button"
                              onClick={() => void handleUpdateStatus(msg.id, 'resolved')}
                              className="px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold hover:opacity-90 cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>ปิดเรื่อง</span>
                            </button>
                          )}
                          {isSuperAdmin && selectedSchoolId !== msg.schoolId && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSchoolId(msg.schoolId);
                                setComposeSchoolId(msg.schoolId);
                                setSubject(`ตอบกลับ: ${msg.subject}`);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-title)] text-[11px] font-bold hover:bg-[var(--color-primary-light)] cursor-pointer"
                            >
                              ตอบกลับ
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed text-[var(--color-text-body)] whitespace-pre-wrap">
                        {msg.body}
                      </p>

                      {/* Attachments */}
                      {msg.attachments.length > 0 && (
                        <div className="pt-2 border-t border-[var(--color-border)] flex flex-wrap gap-2">
                          {msg.attachments.map((att) => {
                            const isImage = att.mimeType.startsWith('image/');
                            return (
                              <div
                                key={att.id}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-xs max-w-full"
                              >
                                {isImage && att.dataUrl ? (
                                  <img
                                    src={att.dataUrl}
                                    alt={att.name}
                                    className="w-8 h-8 rounded object-cover border border-[var(--color-border)] shrink-0"
                                  />
                                ) : (
                                  <FileText className="w-4 h-4 text-[var(--color-primary-text)] shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <div className="font-semibold text-[var(--color-text-title)] truncate max-w-[180px]">
                                    {att.name}
                                  </div>
                                  <div className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                                    {formatFileSize(att.size)}
                                  </div>
                                </div>
                                {att.dataUrl && (
                                  <a
                                    href={att.dataUrl}
                                    download={att.name}
                                    className="p-1.5 rounded-md bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-primary-text)] shrink-0"
                                    title="ดาวน์โหลดไฟล์แนบ"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Composer Card */}
          <form
            onSubmit={handleSend}
            className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 space-y-3 h-fit"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <Send className="w-4 h-4 text-[var(--color-primary-text)]" />
                <span>
                  {isSuperAdmin ? 'ส่งข้อความ / หนังสือตอบกลับไปยัง Admin โรงเรียน' : 'ส่งข้อความด่วน / จดหมายถึง Super Admin'}
                </span>
              </h2>
            </div>

            {errorMsg && (
              <div role="alert" className="rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950 px-3 py-2 text-xs text-rose-800 dark:text-rose-200 font-medium">
                {errorMsg}
              </div>
            )}
            {noticeMsg && (
              <div role="status" className="rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200 font-medium">
                {noticeMsg}
              </div>
            )}

            {isSuperAdmin && (
              <label className="block space-y-1 text-xs font-bold text-[var(--color-text-body)]">
                <span>เลือกโรงเรียนผู้รับ</span>
                <select
                  value={composeSchoolId}
                  onChange={(e) => setComposeSchoolId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs text-[var(--color-text-title)]"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameTh} ({s.province})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[11px] font-bold text-[var(--color-text-muted)] mb-1">รูปแบบการติดต่อ</div>
                <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => setChannelType('chat')}
                    className={`py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                      channelType === 'chat'
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--color-text-body)]'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>แชตด่วน</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannelType('letter')}
                    className={`py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                      channelType === 'letter'
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--color-text-body)]'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>จดหมาย</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-[var(--color-text-muted)] mb-1">ระดับความเร่งด่วน</div>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'urgent' | 'high' | 'normal')}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-title)]"
                >
                  <option value="urgent">ด่วนที่สุด (Urgent)</option>
                  <option value="high">สำคัญ (High)</option>
                  <option value="normal">ปกติ (Normal)</option>
                </select>
              </div>
            </div>

            <label className="block space-y-1 text-xs font-bold text-[var(--color-text-body)]">
              <span>{channelType === 'letter' ? 'หัวเรื่องหนังสือ / จดหมายราชการ *' : 'หัวข้อ (ไม่บังคับ)'}</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={
                  channelType === 'letter'
                    ? 'เช่น ขออนุมัติปรับปรุงข้อมูลโรงเรียน / แจ้งปัญหาด่วน'
                    : 'หัวข้อสั้นๆ เช่น สอบถามการนำเข้า DMC'
                }
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </label>

            <label className="block space-y-1 text-xs font-bold text-[var(--color-text-body)]">
              <span>รายละเอียดข้อความ</span>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="พิมพ์รายละเอียดที่ต้องการประสานงาน..."
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] px-3 py-2 text-xs text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary)] resize-y"
              />
            </label>

            {/* Attachment Picker */}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-xs font-bold text-[var(--color-text-title)] cursor-pointer"
                >
                  <Paperclip className="w-3.5 h-3.5 text-[var(--color-primary-text)]" />
                  <span>แนบไฟล์เอกสาร / รูปภาพ</span>
                </button>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  รองรับ PDF, Word, Excel, CSV, รูปภาพ (ไม่เกิน 4 MB/ไฟล์, สูงสุด 5 ไฟล์)
                </span>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-1.5">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {att.mimeType.startsWith('image/') ? (
                          <ImageIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        )}
                        <span className="truncate font-semibold text-[var(--color-text-title)]">{att.name}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] shrink-0 tabular-nums">
                          {formatFileSize(att.size)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== att.id))}
                        className="p-1 text-[var(--color-text-muted)] hover:text-rose-600 cursor-pointer"
                        title="ลบไฟล์แนบ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>
                {sending
                  ? 'กำลังส่งข้อมูล...'
                  : channelType === 'letter'
                  ? 'ส่งจดหมายประสานงานพร้อมไฟล์แนบ'
                  : 'ส่งข้อความประสานงานด่วน'}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
