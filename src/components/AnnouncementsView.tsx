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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BellRing className="w-5 h-5 text-indigo-400" />
            School Announcements &amp; LINE OA Broadcast
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Official communications synced with LINE Messaging API and Resend transactional email services.
          </p>
        </div>

        <button
          onClick={() => setShowComposeModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Publish Broadcast</span>
        </button>
      </div>

      {broadcastToast && (
        <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-600/50 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
          <MessageSquare className="w-4 h-4 text-[#06C755] fill-current" />
          <span>{broadcastToast}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['all', 'students', 'parents', 'teachers'].map((aud) => (
            <button
              key={aud}
              onClick={() => setFilterAudience(aud)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filterAudience === aud
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              Target: {aud}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400">
          Showing <strong className="text-white">{filteredAnnouncements.length}</strong> items
        </span>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.map((ann) => (
          <div
            key={ann.id}
            className={`p-5 rounded-2xl border transition-all ${
              ann.pinned
                ? 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-indigo-500/40 shadow-lg shadow-indigo-500/5'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {ann.pinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Pin className="w-2.5 h-2.5" /> Pinned
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {ann.category}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <Users className="w-3 h-3 text-indigo-400" />
                    Target: <strong className="text-slate-300 uppercase">{ann.targetAudience}</strong>
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mt-1">{ann.title}</h3>
              </div>

              <span className="text-xs text-slate-400 font-mono shrink-0 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {ann.publishedAt}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed whitespace-pre-line">
              {ann.content}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-4 border-t border-slate-800 text-xs">
              <div className="text-slate-400">
                Author: <span className="font-semibold text-slate-300">{ann.author}</span> ({ann.authorRole})
              </div>

              <div className="flex items-center gap-2">
                {ann.lineBroadcastSent ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#06C755] font-semibold bg-[#06C755]/10 px-2 py-1 rounded border border-[#06C755]/30">
                    <MessageSquare className="w-3 h-3 fill-current" />
                    LINE OA Broadcast Active
                  </span>
                ) : (
                  <button
                    onClick={() => handleManualLineBroadcast(ann.id, ann.title)}
                    className="px-2.5 py-1 rounded bg-[#06C755]/20 hover:bg-[#06C755]/30 text-[#06C755] border border-[#06C755]/30 text-[11px] font-semibold flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    Send LINE Push
                  </button>
                )}

                {ann.resendEmailSent && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/30">
                    <Mail className="w-3 h-3" />
                    Email Dispatched
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Compose Announcement Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                Publish School Announcement &amp; LINE Push
              </h3>
              <button
                onClick={() => setShowComposeModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Schedule for Sports Day 2026"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Audience</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  >
                    <option value="all">Everyone (All)</option>
                    <option value="parents">Parents / Guardians</option>
                    <option value="students">Students</option>
                    <option value="teachers">Faculty / Teachers</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                  >
                    <option value="academic">Academic / Exam</option>
                    <option value="event">Event / Activity</option>
                    <option value="urgent">Urgent Alert</option>
                    <option value="general">General Notice</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Announcement Body</label>
                <textarea
                  rows={4}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write announcement text here..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                ></textarea>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={formData.pinned}
                  onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                />
                <label htmlFor="pinCheck" className="text-slate-300 font-medium">
                  Pin to top of school board
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
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
