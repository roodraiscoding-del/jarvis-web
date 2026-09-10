import React, { useState } from 'react';
import { Calendar, Clock, Plus, Trash2, CheckCircle2, Circle, AlertCircle, Target, Users, Bell } from 'lucide-react';
import { Meeting, Reminder, DailyGoal } from '../types';
import { playJarvisSound } from '../utils/audioSynth';

interface SchedulePanelProps {
  meetings: Meeting[];
  reminders: Reminder[];
  goals: DailyGoal[];
  soundEnabled: boolean;
  onAddMeeting: (meeting: Omit<Meeting, 'id' | 'createdAt'>) => void;
  onDeleteMeeting: (id: string) => void;
  onToggleReminder: (id: string) => void;
  onAddReminder: (rem: Omit<Reminder, 'id' | 'createdAt'>) => void;
  onDeleteReminder: (id: string) => void;
  onToggleGoal: (id: string, completed: boolean) => void;
}

export const SchedulePanel: React.FC<SchedulePanelProps> = ({
  meetings,
  reminders,
  goals,
  soundEnabled,
  onAddMeeting,
  onDeleteMeeting,
  onToggleReminder,
  onAddReminder,
  onDeleteReminder,
  onToggleGoal,
}) => {
  const [activeTab, setActiveTab] = useState<'meetings' | 'reminders' | 'goals'>('meetings');
  const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('14:00');
  const [newDuration, setNewDuration] = useState('30');
  const [newParticipants, setNewParticipants] = useState('');

  const [reminderInput, setReminderInput] = useState('');
  const [reminderPriority, setReminderPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddMeeting({
      title: newTitle.trim(),
      date: newDate,
      time: newTime,
      durationMinutes: parseInt(newDuration, 10) || 30,
      participants: newParticipants.split(',').map(p => p.trim()).filter(Boolean),
      status: 'confirmed'
    });
    setNewTitle('');
    setNewParticipants('');
    setShowAddMeetingModal(false);
    if (soundEnabled) playJarvisSound('action_done');
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderInput.trim()) return;
    onAddReminder({
      title: reminderInput.trim(),
      dueDate: 'Today',
      priority: reminderPriority,
      completed: false,
      category: 'work'
    });
    setReminderInput('');
    if (soundEnabled) playJarvisSound('action_done');
  };

  return (
    <div className="hud-card rounded-xl p-4 flex flex-col h-[580px]">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('meetings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'meetings'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Meetings ({meetings.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'reminders'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Reminders ({reminders.filter(r => !r.completed).length})</span>
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'goals'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Goals ({goals.length})</span>
          </button>
        </div>

        {activeTab === 'meetings' && (
          <button
            onClick={() => setShowAddMeetingModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/40 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Meeting</span>
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {/* MEETINGS TAB */}
        {activeTab === 'meetings' && (
          <div className="space-y-2.5">
            {meetings.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">
                No scheduled meetings. Say "Schedule meeting tomorrow at 2pm" to create one.
              </div>
            ) : (
              meetings.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/90 hover:border-cyan-500/30 transition-all text-xs font-mono flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="font-semibold text-cyan-300 text-sm">{m.title}</div>
                    <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-cyan-400" />
                        {m.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        {m.time} ({m.durationMinutes}m)
                      </span>
                    </div>
                    {m.participants && m.participants.length > 0 && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Users className="w-3 h-3 text-slate-500" />
                        <span>{m.participants.join(', ')}</span>
                      </div>
                    )}
                    {m.notes && <div className="text-[11px] text-slate-500 italic mt-1">{m.notes}</div>}
                  </div>
                  <button
                    onClick={() => onDeleteMeeting(m.id)}
                    className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-950/40 transition-colors"
                    title="Delete meeting"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* REMINDERS TAB */}
        {activeTab === 'reminders' && (
          <div className="space-y-3">
            {/* Quick Add Form */}
            <form onSubmit={handleCreateReminder} className="flex gap-2">
              <input
                type="text"
                value={reminderInput}
                onChange={(e) => setReminderInput(e.target.value)}
                placeholder="Add a new reminder..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500/50"
              />
              <select
                value={reminderPriority}
                onChange={(e) => setReminderPriority(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 rounded px-2 text-xs text-slate-300 font-mono"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <button
                type="submit"
                disabled={!reminderInput.trim()}
                className="px-3 py-1.5 bg-amber-600/40 hover:bg-amber-600/60 border border-amber-500/40 rounded text-xs font-mono text-amber-200"
              >
                Add
              </button>
            </form>

            <div className="space-y-2">
              {reminders.map((r) => (
                <div
                  key={r.id}
                  className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between gap-3 transition-colors ${
                    r.completed
                      ? 'bg-slate-950/40 border-slate-900 text-slate-500'
                      : 'bg-slate-900/80 border-slate-800 text-slate-200'
                  }`}
                >
                  <div
                    onClick={() => {
                      onToggleReminder(r.id);
                      if (soundEnabled) playJarvisSound('action_done');
                    }}
                    className="flex items-center gap-2.5 flex-1 cursor-pointer"
                  >
                    {r.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span className={r.completed ? 'line-through text-slate-500' : 'text-slate-200'}>
                      {r.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                        r.priority === 'high'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : r.priority === 'medium'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {r.priority}
                    </span>
                    <button
                      onClick={() => onDeleteReminder(r.id)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GOALS TAB */}
        {activeTab === 'goals' && (
          <div className="space-y-3">
            {goals.map((g) => (
              <div key={g.id} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleGoal(g.id, !g.completed)}
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      {g.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 text-slate-500" />}
                    </button>
                    <span className={`font-semibold ${g.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {g.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-400">{g.progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${g.progressPercent}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400">Target: {g.target}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Meeting Modal */}
      {showAddMeetingModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-xl p-5 max-w-md w-full font-mono text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-cyan-400 font-bold text-sm">Schedule Meeting</span>
              <button
                onClick={() => setShowAddMeetingModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateMeeting} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Meeting Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Q4 Strategy Review"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Participants (comma separated)</label>
                <input
                  type="text"
                  value={newParticipants}
                  onChange={(e) => setNewParticipants(e.target.value)}
                  placeholder="Alex Vance, Sarah Lin"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMeetingModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded"
                >
                  Save to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
