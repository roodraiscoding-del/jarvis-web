import React, { useState } from 'react';
import { ShieldAlert, Check, X, Edit3, Youtube, Instagram, Facebook, Send, Clock, Sparkles } from 'lucide-react';
import { SocialDraft } from '../types';
import { playJarvisSound } from '../utils/audioSynth';

interface SocialApprovalQueueProps {
  drafts: SocialDraft[];
  soundEnabled: boolean;
  onApproveDraft: (id: string, notes?: string) => void;
  onRejectDraft: (id: string, notes?: string) => void;
  onPublishDraft: (id: string) => void;
  onCreateDraft: (draft: Omit<SocialDraft, 'id' | 'createdAt' | 'status'>) => void;
}

export const SocialApprovalQueue: React.FC<SocialApprovalQueueProps> = ({
  drafts,
  soundEnabled,
  onApproveDraft,
  onRejectDraft,
  onPublishDraft,
  onCreateDraft,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Draft Form State
  const [newPlatform, setNewPlatform] = useState<'youtube' | 'instagram' | 'facebook'>('youtube');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');

  const pendingDrafts = drafts.filter((d) => d.status === 'pending_approval');
  const pastDrafts = drafts.filter((d) => d.status !== 'pending_approval');

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube': return <Youtube className="w-4 h-4 text-red-400" />;
      case 'instagram': return <Instagram className="w-4 h-4 text-pink-400" />;
      case 'facebook': return <Facebook className="w-4 h-4 text-blue-400" />;
      default: return <Sparkles className="w-4 h-4 text-cyan-400" />;
    }
  };

  const handleStartEdit = (draft: SocialDraft) => {
    setEditingId(draft.id);
    setEditedContent(draft.content);
  };

  const handleSaveEdit = (draft: SocialDraft) => {
    draft.content = editedContent;
    setEditingId(null);
    if (soundEnabled) playJarvisSound('action_done');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    onCreateDraft({
      platform: newPlatform,
      title: newTitle.trim(),
      content: newContent.trim(),
      tags: newTags.split(' ').filter(t => t.startsWith('#') || t.length > 1),
      estimatedReach: 'Manual Creator Dispatch'
    });
    setNewTitle('');
    setNewContent('');
    setNewTags('');
    setShowCreateModal(false);
    if (soundEnabled) playJarvisSound('action_done');
  };

  return (
    <div className="hud-card rounded-xl p-4 flex flex-col h-[580px]">
      {/* Header & Strict Safety Mandate */}
      <div className="border-b border-cyan-500/20 pb-3 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span className="font-mono font-bold text-sm text-cyan-300">
              SOCIAL POST APPROVAL GATEWAY
            </span>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-2.5 py-1 text-xs font-mono rounded bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/50"
          >
            + New Draft
          </button>
        </div>
        <p className="text-[11px] font-mono text-emerald-400/90 mt-1">
          ✓ STRICT HARD CONSTRAINTS ENFORCED: Autonomous posting is prohibited. Every broadcast requires manual human authorization.
        </p>
      </div>

      {/* Queue Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {/* Pending Approval Section */}
        <div>
          <div className="text-xs font-mono text-slate-400 mb-2 flex items-center justify-between">
            <span>PENDING YOUR EXPLICIT APPROVAL ({pendingDrafts.length})</span>
            <span className="text-[10px] text-amber-400">Action Required</span>
          </div>

          {pendingDrafts.length === 0 ? (
            <div className="p-6 rounded-lg bg-slate-900/60 border border-slate-800 text-center text-xs font-mono text-slate-500">
              No pending social drafts. Ask Jarvis in the command box: "Draft a post about AI agent workflows".
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="p-3.5 rounded-lg bg-slate-900/90 border border-amber-500/30 hover:border-amber-500/50 transition-all text-xs font-mono space-y-2.5 shadow-lg"
                >
                  {/* Platform & Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-slate-950 border border-slate-800">
                        {getPlatformIcon(draft.platform)}
                      </span>
                      <span className="font-bold text-slate-200 uppercase">{draft.platform} BROADCAST</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/30">
                        Pending Sign-Off
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(draft.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Title & Content */}
                  <div className="text-cyan-300 font-semibold">{draft.title}</div>

                  {editingId === draft.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={4}
                        className="w-full bg-slate-950 border border-cyan-500/40 rounded p-2 text-slate-100 text-xs font-mono"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[11px]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(draft)}
                          className="px-2 py-1 bg-cyan-600 text-slate-950 font-bold rounded text-[11px]"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800 text-slate-300 text-[11px] whitespace-pre-wrap leading-relaxed">
                      {draft.content}
                    </div>
                  )}

                  {/* Tags & Estimated Reach */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px]">
                    <div className="flex flex-wrap gap-1">
                      {draft.tags.map((t, idx) => (
                        <span key={idx} className="text-cyan-400/80 bg-cyan-950/40 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                    {draft.estimatedReach && (
                      <span className="text-slate-400">Est. Reach: {draft.estimatedReach}</span>
                    )}
                  </div>

                  {/* Decision Actions: Explicit Approve, Edit, Reject */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleStartEdit(draft)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        onRejectDraft(draft.id);
                        if (soundEnabled) playJarvisSound('fallback');
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-900/60 border border-red-800 text-red-300 text-[11px] transition-colors"
                    >
                      <X className="w-3 h-3" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => {
                        onApproveDraft(draft.id);
                        if (soundEnabled) playJarvisSound('action_done');
                      }}
                      className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[11px] transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    >
                      <Check className="w-3 h-3" />
                      <span>Approve & Publish</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historical Decisions / Audit Log */}
        {pastDrafts.length > 0 && (
          <div className="pt-2">
            <div className="text-xs font-mono text-slate-400 mb-2">
              AUDIT LOG & PUBLISHED HISTORY ({pastDrafts.length})
            </div>
            <div className="space-y-2">
              {pastDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80 text-[11px] font-mono flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 flex-1 truncate">
                    {getPlatformIcon(draft.platform)}
                    <span className="text-slate-300 font-semibold truncate">{draft.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        draft.status === 'approved' || draft.status === 'published'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}
                    >
                      {draft.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Manual New Draft Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-xl p-5 max-w-md w-full font-mono text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-cyan-400 font-bold text-sm">Create New Social Draft</span>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Target Platform</label>
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100"
                >
                  <option value="youtube">YouTube (Community / Video Post)</option>
                  <option value="instagram">Instagram (Reel / Caption)</option>
                  <option value="facebook">Facebook (Post / Page)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Draft Headline</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Free Tier AI Agent Tutorial"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Post Content & Copy</label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Write post content..."
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Hashtags</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="#AIAgent #TechTutorial"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded"
                >
                  Add to Approval Gate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
