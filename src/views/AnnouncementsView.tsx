import React, { useState } from 'react';
import { Announcement, SystemConfig } from '../types';
import { 
  BellRing, 
  Plus, 
  MessageSquare, 
  Mail, 
  Pin, 
  Send, 
  CheckCircle2, 
  Users, 
  Calendar,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { getLocalDateString } from '../lib/date';
import { PagedList } from '../components/PagedList';

interface AnnouncementsViewProps {
  announcements: Announcement[];
  systemConfig: SystemConfig;
  onAddAnnouncement: (announcement: Announcement) => void;
  onBroadcastLine: (announcementId: string) => void;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
  announcements,
  systemConfig,
  onAddAnnouncement,
  onBroadcastLine,
}) => {
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [filterAudience, setFilterAudience] = useState<string>('all');
  const [broadcastToast, setBroadcastToast] = useState<string | null>(null);

  // Form
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'academic' as Announcement['category'],
    targetAudience: 'all' as Announcement['targetAudience'],
    pinned: false,
    author: 'Principal Office',
    authorRole: 'Administrator',
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title: formData.title,
      content: formData.content,
      category: formData.category,
      targetAudience: formData.targetAudience,
      publishedAt: `${getLocalDateString()} ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
      author: formData.author,
      authorRole: formData.authorRole,
      pinned: formData.pinned,
      lineBroadcastSent: false,
      resendEmailSent: false,
    };

    onAddAnnouncement(newAnn);
    setShowComposeModal(false);
    setBroadcastToast('Announcement added. LINE OA and email were not sent.');
    setTimeout(() => setBroadcastToast(null), 4000);
  };

  const handleManualLineBroadcast = (id: string, title: string) => {
    onBroadcastLine(id);
    setBroadcastToast(`LINE OA is not configured. No message was sent for "${title}".`);
    setTimeout(() => setBroadcastToast(null), 4000);
  };

  const filteredAnnouncements = announcements.filter((a) => {
    if (filterAudience === 'all') return true;
    return a.targetAudience === filterAudience || a.targetAudience === 'all';
  });

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 p-3 app-page-header">
        <h1 className="text-base sm:text-lg font-bold text-[var(--color-text-title)] flex items-center gap-2">
          <BellRing className="w-5 h-5 text-[var(--color-primary-text)] shrink-0" />
          <span>School Announcements &amp; Broadcast</span>
        </h1>

        <button
          onClick={() => setShowComposeModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Publish Broadcast</span>
        </button>
      </div>

      {broadcastToast && (
        <div className="shrink-0 p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2 font-medium">
          <MessageSquare className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
          <span>{broadcastToast}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="shrink-0 p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {['all', 'students', 'parents', 'teachers'].map((aud) => (
            <button
              key={aud}
              onClick={() => setFilterAudience(aud)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer border ${
                filterAudience === aud
                  ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-xs'
                  : 'bg-[var(--color-card-subtle)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-text-title)] border-[var(--color-border)]'
              }`}
            >
              Target: {aud}
            </button>
          ))}
        </div>

        <span className="text-xs text-[var(--color-text-muted)] shrink-0">
          Showing <strong className="text-[var(--color-text-title)]">{filteredAnnouncements.length}</strong> items
        </span>
      </div>

      {/* Announcements List */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <PagedList
          items={filteredAnnouncements}
          pageSize={2}
          emptyState={<p className="text-sm text-[var(--color-text-muted)] font-medium">No announcements match this audience.</p>}
          renderItem={(ann) => (
          <div
            key={ann.id}
            className={`p-5 rounded-2xl border transition-all ${
              ann.pinned
                ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] shadow-sm'
                : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {ann.pinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                      <Pin className="w-2.5 h-2.5" /> Pinned
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[var(--color-card-subtle)] text-[var(--color-text-title)] border border-[var(--color-border)]">
                    {ann.category}
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--color-text-muted)] flex items-center gap-1">
                    <Users className="w-3 h-3 text-[var(--color-primary-text)]" />
                    Target: <strong className="text-[var(--color-text-title)] uppercase">{ann.targetAudience}</strong>
                  </span>
                </div>

                <h3 className="text-base font-bold text-[var(--color-text-title)] mt-1">{ann.title}</h3>
              </div>

              <span className="text-xs text-[var(--color-text-muted)] font-mono shrink-0 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {ann.publishedAt}
              </span>
            </div>

            <p className="text-xs text-[var(--color-text-body)] mt-3 leading-relaxed whitespace-pre-line">
              {ann.content}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-4 border-t border-[var(--color-border)] text-xs">
              <div className="text-[var(--color-text-muted)]">
                Author: <span className="font-semibold text-[var(--color-text-title)]">{ann.author}</span> ({ann.authorRole})
              </div>

              <div className="flex items-center gap-2">
                {ann.lineBroadcastSent ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-900 dark:text-emerald-200 font-semibold bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded border border-emerald-300 dark:border-emerald-700">
                    <MessageSquare className="w-3 h-3 fill-current" />
                    LINE OA Broadcast Active
                  </span>
                ) : (
                  <button
                    onClick={() => handleManualLineBroadcast(ann.id, ann.title)}
                    className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                  >
                    <Send className="w-3 h-3" />
                    Send LINE Push
                  </button>
                )}

                {ann.resendEmailSent && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-sky-900 dark:text-sky-200 font-semibold bg-sky-100 dark:bg-sky-950 px-2 py-1 rounded border border-sky-300 dark:border-sky-700">
                    <Mail className="w-3 h-3" />
                    Email Dispatched
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        />
      </div>

      {/* Compose Announcement Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-[var(--color-text-body)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-title)] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[var(--color-primary-text)]" />
                Publish School Announcement &amp; LINE Push
              </h3>
              <button
                onClick={() => setShowComposeModal(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-title)] text-lg font-bold px-2 py-0.5 rounded-lg hover:bg-[var(--color-card-subtle)] cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--color-text-body)] font-semibold mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Schedule for Sports Day 2026"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-body)] font-semibold mb-1">Target Audience</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  >
                    <option value="all">Everyone (All)</option>
                    <option value="parents">Parents / Guardians</option>
                    <option value="students">Students</option>
                    <option value="teachers">Faculty / Teachers</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--color-text-body)] font-semibold mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)]"
                  >
                    <option value="academic">Academic / Exam</option>
                    <option value="event">Event / Activity</option>
                    <option value="urgent">Urgent Alert</option>
                    <option value="general">General Notice</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[var(--color-text-body)] font-semibold mb-1">Announcement Body</label>
                <textarea
                  rows={4}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write announcement text here..."
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] placeholder:text-[var(--color-text-muted)]"
                ></textarea>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={formData.pinned}
                  onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                  className="rounded accent-blue-700"
                />
                <label htmlFor="pinCheck" className="text-[var(--color-text-body)] font-semibold cursor-pointer">
                  Pin to top of school board
                </label>
              </div>

              <div className="pt-3 border-t border-[var(--color-border)] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-body)] hover:bg-[var(--color-primary-light)] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Publish &amp; Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
