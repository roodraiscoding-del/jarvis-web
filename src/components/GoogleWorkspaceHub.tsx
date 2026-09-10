import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Mail,
  FileText,
  CheckSquare,
  Users,
  StickyNote,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  Send,
  Search,
  Check,
  Clock,
  MapPin,
  Sparkles,
  LogOut,
  AlertCircle
} from 'lucide-react';
import {
  googleSignIn,
  logout,
  getAccessToken,
  subscribeAuth
} from '../utils/googleAuth';
import {
  GoogleCalendarEvent,
  GmailMessagePreview,
  GoogleTaskItem,
  GoogleTaskList,
  GoogleDocFile,
  GoogleContactPerson,
  fetchCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  fetchGmailMessages,
  sendGmailMessage,
  trashGmailMessage,
  fetchTaskLists,
  fetchTasks,
  createGoogleTask,
  toggleGoogleTaskStatus,
  deleteGoogleTask,
  fetchRecentDocs,
  createGoogleDoc,
  fetchGoogleContacts,
  createGoogleContact,
  deleteGoogleContact
} from '../utils/workspaceApi';
import {
  WorkspaceConfirmationModal,
  ConfirmationDialogState
} from './WorkspaceConfirmationModal';

interface QuickNote {
  id: string;
  title: string;
  content: string;
  color: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
}

interface GoogleWorkspaceHubProps {}

export const GoogleWorkspaceHub: React.FC<GoogleWorkspaceHubProps> = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active Tab
  const [workspaceTab, setWorkspaceTab] = useState<
    'calendar' | 'gmail' | 'docs' | 'tasks' | 'contacts' | 'keep'
  >('calendar');

  // Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<ConfirmationDialogState | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  // Data Collections
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [gmailMessages, setGmailMessages] = useState<GmailMessagePreview[]>([]);
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [activeTaskListId, setActiveTaskListId] = useState<string>('@default');
  const [tasks, setTasks] = useState<GoogleTaskItem[]>([]);
  const [docs, setDocs] = useState<GoogleDocFile[]>([]);
  const [contacts, setContacts] = useState<GoogleContactPerson[]>([]);
  const [contactsFilter, setContactsFilter] = useState('');

  // Keep Notes (local + export to Docs/Tasks)
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([
    {
      id: 'note-1',
      title: 'Jarvis Project Architecture',
      content: 'Multi-model cascade: Gemini 3.8 Flash primary with Groq LLaMA 3.3 failover. Zero API cost design.',
      color: 'cyan',
      tags: ['system', 'ai', 'architecture'],
      pinned: true,
      createdAt: '2026-09-10'
    },
    {
      id: 'note-2',
      title: 'Google Workspace Checklist',
      content: 'Integrated services: Calendar, Gmail, Docs, Tasks, Contacts, and Keep Notes exporter.',
      color: 'amber',
      tags: ['workspace', 'google'],
      pinned: true,
      createdAt: '2026-09-10'
    }
  ]);

  // Loading indicators
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Forms State
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    summary: '',
    description: '',
    location: '',
    startDateTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    endDateTime: new Date(Date.now() + 7200000).toISOString().slice(0, 16)
  });

  const [showComposeEmail, setShowComposeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState({
    to: '',
    subject: '',
    body: ''
  });

  const [showDocForm, setShowDocForm] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: '',
    initialContent: ''
  });

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    notes: '',
    due: ''
  });

  const [showContactForm, setShowContactForm] = useState(false);
  const [newContact, setNewContact] = useState({
    givenName: '',
    familyName: '',
    email: '',
    phone: ''
  });

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    color: 'cyan',
    tags: ''
  });

  // Subscribe to Auth
  useEffect(() => {
    const unsubscribe = subscribeAuth((user, token) => {
      setCurrentUser(user);
      setAccessToken(token);
    });
    return () => unsubscribe();
  }, []);

  const notify = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setStatusNotification({ message, type });
    setTimeout(() => setStatusNotification(null), 4000);
  };

  // Sign In Handler
  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        notify(`Authenticated as ${res.user.displayName || res.user.email}`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setCalendarEvents([]);
    setGmailMessages([]);
    setTasks([]);
    setDocs([]);
    setContacts([]);
    notify('Signed out of Google Workspace session.', 'info');
  };

  // Load Data based on active tab
  const loadTabWorkspaceData = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;

    setIsLoadingData(true);
    try {
      if (workspaceTab === 'calendar') {
        const events = await fetchCalendarEvents(token);
        setCalendarEvents(events);
      } else if (workspaceTab === 'gmail') {
        const msgs = await fetchGmailMessages(token, 15);
        setGmailMessages(msgs);
      } else if (workspaceTab === 'tasks') {
        const lists = await fetchTaskLists(token);
        setTaskLists(lists);
        const activeId = lists[0]?.id || '@default';
        setActiveTaskListId(activeId);
        const taskItems = await fetchTasks(token, activeId);
        setTasks(taskItems);
      } else if (workspaceTab === 'docs') {
        const docList = await fetchRecentDocs(token);
        setDocs(docList);
      } else if (workspaceTab === 'contacts') {
        const contactsList = await fetchGoogleContacts(token);
        setContacts(contactsList);
      }
    } catch (err: any) {
      console.error('Workspace data load error:', err);
      notify(`Failed to fetch ${workspaceTab} data: ${err.message}`, 'error');
    } finally {
      setIsLoadingData(false);
    }
  }, [workspaceTab]);

  useEffect(() => {
    if (accessToken) {
      loadTabWorkspaceData();
    }
  }, [accessToken, workspaceTab, loadTabWorkspaceData]);

  // -------------------------------------------------------------
  // Calendar Actions with Confirmation
  // -------------------------------------------------------------
  const triggerCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.summary.trim()) return;

    setConfirmDialog({
      isOpen: true,
      type: 'create',
      service: 'Calendar',
      title: 'Schedule Google Calendar Event',
      description: 'You are about to add a new calendar event to your primary Google Calendar.',
      itemDetails: [
        { label: 'Event Summary', value: newEvent.summary },
        { label: 'Start Time', value: new Date(newEvent.startDateTime).toLocaleString() },
        { label: 'End Time', value: new Date(newEvent.endDateTime).toLocaleString() },
        { label: 'Location', value: newEvent.location || 'Remote / None' }
      ],
      confirmButtonText: 'Schedule Event',
      onConfirm: async () => {
        setIsExecutingAction(true);
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Authentication token missing');
          const created = await createCalendarEvent(token, newEvent);
          setCalendarEvents((prev) => [created, ...prev]);
          setShowEventForm(false);
          setNewEvent({
            summary: '',
            description: '',
            location: '',
            startDateTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
            endDateTime: new Date(Date.now() + 7200000).toISOString().slice(0, 16)
          });
          notify(`Calendar event "${created.summary}" scheduled!`, 'success');
        } catch (err: any) {
          notify(err.message, 'error');
        } finally {
          setIsExecutingAction(false);
        }
      }
    });
  };

  const triggerDeleteEvent = (event: GoogleCalendarEvent) => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      service: 'Calendar',
      title: 'Delete Google Calendar Event',
      description: 'Are you sure you want to remove this event from your Google Calendar? This action cannot be undone.',
      itemDetails: [
        { label: 'Event Title', value: event.summary },
        {
          label: 'Scheduled Time',
          value: event.start.dateTime
            ? new Date(event.start.dateTime).toLocaleString()
            : event.start.date || 'All day'
        }
      ],
      confirmButtonText: 'Delete Event',
      isDestructive: true,
      onConfirm: async () => {
        setIsExecutingAction(true);
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Authentication token missing');
          await deleteCalendarEvent(token, event.id);
          setCalendarEvents((prev) => prev.filter((ev) => ev.id !== event.id));
          notify(`Deleted event "${event.summary}"`, 'info');
        } catch (err: any) {
          notify(err.message, 'error');
        } finally {
          setIsExecutingAction(false);
        }
      }
    });
  };

  // -------------------------------------------------------------
  // Gmail Actions with Confirmation
  // -------------------------------------------------------------
  const triggerSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.to || !newEmail.subject) return;

    setConfirmDialog({
      isOpen: true,
      type: 'send',
      service: 'Gmail',
      title: 'Send Email via Gmail',
      description: 'You are about to send an outgoing email through your authorized Gmail account.',
      itemDetails: [
        { label: 'Recipient', value: newEmail.to },
        { label: 'Subject', value: newEmail.subject },
        { label: 'Body Preview', value: newEmail.body.slice(0, 120) + (newEmail.body.length > 120 ? '...' : '') }
      ],
      confirmButtonText: 'Authorize & Send Email',
      onConfirm: async () => {
        setIsExecutingAction(true);
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Authentication token missing');
          await sendGmailMessage(token, newEmail);
          setShowComposeEmail(false);
          setNewEmail({ to: '', subject: '', body: '' });
          notify(`Email sent to ${newEmail.to}`, 'success');
          loadTabWorkspaceData();
        } catch (err: any) {
          notify(err.message, 'error');
        } finally {
          setIsExecutingAction(false);
        }
      }
    });
  };

  const triggerTrashEmail = (msg: GmailMessagePreview) => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      service: 'Gmail',
      title: 'Move Email to Trash',
      description: 'This will move the selected email message to your Gmail Trash folder.',
      itemDetails: [
        { label: 'Subject', value: msg.subject || '(No Subject)' },
        { label: 'From', value: msg.from || 'Unknown' }
      ],
      confirmButtonText: 'Move to Trash',
      isDestructive: true,
      onConfirm: async () => {
        setIsExecutingAction(true);
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Authentication token missing');
          await trashGmailMessage(token, msg.id);
          setGmailMessages((prev) => prev.filter((m) => m.id !== msg.id));
          notify('Email moved to trash.', 'info');
        } catch (err: any) {
          notify(err.message, 'error');
        } finally {
          setIsExecutingAction(false);
        }
      }
    });
  };

  // -------------------------------------------------------------
  // Google Docs Actions with Confirmation
  // -------------------------------------------------------------
  const triggerCreateDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.title.trim()) return;

    setConfirmDialog({
      isOpen: true,
      type: 'create',
      service: 'Docs',
      title: 'Create New Google Doc',
      description: 'You are about to create a new Google Document in your Google Drive account.',
      itemDetails: [
        { label: 'Document Title', value: newDoc.title },
        { label: 'Initial Content', value: newDoc.initialContent ? `${newDoc.initialContent.slice(0, 100)}...` : '(Empty Document)' }
      ],
      confirmButtonText: 'Create Document',
      onConfirm: async () => {
        setIsExecutingAction(true);
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Authentication token missing');
          const created = await createGoogleDoc(token, newDoc.title, newDoc.initialContent);
          setShowDocForm(false);
          setNewDoc({ title: '', initialContent: '' });
          notify(`Created document "${created.title}"!`, 'success');
          loadTabWorkspaceData();
        } catch (err: any) {
          notify(err.message, 'error');
        } finally {
          setIsExecutingAction(false);
        }
      }
    });
  };

  // -------------------------------------------------------------
  // Google Tasks Actions with Confirmation
  // -------------------------------------------------------------
  const triggerCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    setConfirmDialog({
      isOpen: true,
      type: 'create',
      service: 'Tasks',
      title: 'Create Google Task',
      description: 'You are about to add a new task item to your Google Tasks account.',
      itemDetails: [
        { label: 'Task Title', value: newTask.title },
        { label: 'Notes', value: newTask.notes || 'None' },
        { label: 'Due Date', value: newTask.due ? new Date(newTask.due).toLocaleDateString() : 'No Deadline' }
      ],
      confirmButtonText: 'Add Task',
      onConfirm: async () => {
        setIsExecutingAction(true);
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Authentication token missing');
          const created = await createGoogleTask(token, activeTaskListId, newTask);
          setTasks((prev) => [created, ...prev]);
          setShowTaskForm(false);
          setNewTask({ title: '', notes: '', due: '' });
          notify(`Task "${created.title}" added to Google Tasks!`, 'success');
        } catch (err: any) {
          notify(err.message, 'error');
        } finally {
          setIsExecutingAction(false);
        }
      }
    });
  };

  const triggerToggleTask = async (task: GoogleTaskItem) => {
    const isDone = task.status === 'completed';
    try {
      const token = await getAccessToken();
      if (!token) return;
      const updated = await toggleGoogleTaskStatus(token, activeTaskListId, task.id, !isDone);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      notify(
        !isDone ? `Task marked completed!` : `Task marked active.`,
        'success'
      );
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const triggerDeleteTask = (task: GoogleTaskItem) => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      service: 'Tasks',
      title: 'Delete Google Task',
      description: 'Permanently remove this task from Google Tasks?',
      itemDetails: [{ label: 'Task Title', value: task.title }],
      confirmButtonText: 'Delete Task',
      isDestructive: true,
      onConfirm: async () => {
        setIsExecutingAction(true);
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Authentication token missing');
          await deleteGoogleTask(token, activeTaskListId, task.id);
          setTasks((prev) => prev.filter((t) => t.id !== task.id));
          notify(`Task "${task.title}" deleted.`, 'info');
        } catch (err: any) {
          notify(err.message, 'error');
        } finally {
          setIsExecutingAction(false);
        }
      }
    });
  };

  // -------------------------------------------------------------
  // Google Contacts Actions with Confirmation
  // -------------------------------------------------------------
  const triggerCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.givenName.trim()) return;

    setConfirmDialog({
      isOpen: true,
      type: 'create',
      service: 'Contacts',
      title: 'Save New Google Contact',
      description: 'Add this contact to your Google People contact book.',
      itemDetails: [
        { label: 'Name', value: `${newContact.givenName} ${newContact.familyName}`.trim() },
        { label: 'Email', value: newContact.email || 'None' },
        { label: 'Phone', value: newContact.phone || 'None' }
      ],
      confirmButtonText: 'Save Contact',
      onConfirm: async () => {
        setIsExecutingAction(true);
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Authentication token missing');
          const created = await createGoogleContact(token, newContact);
          setContacts((prev) => [created, ...prev]);
          setShowContactForm(false);
          setNewContact({ givenName: '', familyName: '', email: '', phone: '' });
          notify(`Contact "${created.displayName}" saved!`, 'success');
        } catch (err: any) {
          notify(err.message, 'error');
        } finally {
          setIsExecutingAction(false);
        }
      }
    });
  };

  const triggerDeleteContact = (contact: GoogleContactPerson) => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      service: 'Contacts',
      title: 'Delete Google Contact',
      description: 'Are you sure you want to permanently delete this contact from your Google Contacts?',
      itemDetails: [
        { label: 'Name', value: contact.displayName || 'Unnamed' },
        { label: 'Email', value: contact.email || 'None' }
      ],
      confirmButtonText: 'Delete Contact',
      isDestructive: true,
      onConfirm: async () => {
        setIsExecutingAction(true);
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Authentication token missing');
          await deleteGoogleContact(token, contact.resourceName);
          setContacts((prev) => prev.filter((c) => c.resourceName !== contact.resourceName));
          notify(`Deleted contact "${contact.displayName}"`, 'info');
        } catch (err: any) {
          notify(err.message, 'error');
        } finally {
          setIsExecutingAction(false);
        }
      }
    });
  };

  // -------------------------------------------------------------
  // Keep Notes Actions (Export to Google Docs / Tasks)
  // -------------------------------------------------------------
  const handleExportNoteToDoc = (note: QuickNote) => {
    setConfirmDialog({
      isOpen: true,
      type: 'create',
      service: 'Docs',
      title: 'Export Note to Google Doc',
      description: 'Create a new Google Document from this Keep note content.',
      itemDetails: [
        { label: 'Target Doc Title', value: note.title },
        { label: 'Content Snippet', value: note.content.slice(0, 120) }
      ],
      confirmButtonText: 'Export to Google Doc',
      onConfirm: async () => {
        setIsExecutingAction(true);
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Authentication token missing');
          const created = await createGoogleDoc(token, note.title, note.content);
          notify(`Note exported to Google Doc: "${created.title}"`, 'success');
          loadTabWorkspaceData();
        } catch (err: any) {
          notify(err.message, 'error');
        } finally {
          setIsExecutingAction(false);
        }
      }
    });
  };

  const handleExportNoteToTask = (note: QuickNote) => {
    setConfirmDialog({
      isOpen: true,
      type: 'create',
      service: 'Tasks',
      title: 'Export Note to Google Tasks',
      description: 'Add a new action item in Google Tasks from this Keep note.',
      itemDetails: [
        { label: 'Task Title', value: note.title },
        { label: 'Notes Description', value: note.content.slice(0, 120) }
      ],
      confirmButtonText: 'Export to Google Tasks',
      onConfirm: async () => {
        setIsExecutingAction(true);
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Authentication token missing');
          await createGoogleTask(token, activeTaskListId, {
            title: note.title,
            notes: note.content
          });
          notify(`Created Google Task for "${note.title}"`, 'success');
        } catch (err: any) {
          notify(err.message, 'error');
        } finally {
          setIsExecutingAction(false);
        }
      }
    });
  };

  const handleAddQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.title.trim()) return;
    const created: QuickNote = {
      id: `note-${Date.now()}`,
      title: newNote.title,
      content: newNote.content,
      color: newNote.color,
      tags: newNote.tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      pinned: false,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    setQuickNotes((prev) => [created, ...prev]);
    setShowNoteForm(false);
    setNewNote({ title: '', content: '', color: 'cyan', tags: '' });
    notify('Note created in Jarvis Keep Scratchpad!', 'success');
  };

  const handleDeleteQuickNote = (id: string) => {
    setQuickNotes((prev) => prev.filter((n) => n.id !== id));
    notify('Note removed.', 'info');
  };

  const filteredContacts = contacts.filter((c) => {
    const q = contactsFilter.toLowerCase();
    return (
      (c.displayName && c.displayName.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phoneNumber && c.phoneNumber.includes(q))
    );
  });

  return (
    <div className="hud-card rounded-xl p-4 flex flex-col gap-4 font-sans text-slate-100">
      {/* Workspace Header & Auth Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-display font-bold text-cyan-300">
                GOOGLE WORKSPACE INTEGRATION HUB
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800">
                6 Services Connected
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Calendar • Gmail • Keep • Docs • Tasks • Contacts
            </p>
          </div>
        </div>

        {/* User Profile or Official Google Sign In Button */}
        <div>
          {currentUser ? (
            <div className="flex items-center gap-3 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700/80">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-6 h-6 rounded-full border border-cyan-500/50"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-cyan-600 text-slate-950 font-bold text-xs flex items-center justify-center">
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">
                  {currentUser.displayName || 'Google Account'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                  {currentUser.email}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                title="Disconnect Google Account"
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* Official Google Sign-In Styled Button as mandated by Workspace skill */
            <button
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="px-3.5 py-1.5 rounded-md bg-white hover:bg-slate-100 text-slate-800 font-sans font-medium text-xs flex items-center gap-2.5 transition-all shadow-sm border border-slate-300 active:scale-95 disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>{isAuthenticating ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Auth error notification */}
      {authError && (
        <div className="p-2.5 rounded-lg bg-red-950/70 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      {/* Status notification toast */}
      {statusNotification && (
        <div
          className={`p-2.5 rounded-lg text-xs font-mono flex items-center justify-between border ${
            statusNotification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : statusNotification.type === 'error'
              ? 'bg-red-950/80 border-red-700 text-red-200'
              : 'bg-cyan-950/80 border-cyan-700 text-cyan-200'
          }`}
        >
          <span>{statusNotification.message}</span>
          <button
            onClick={() => setStatusNotification(null)}
            className="text-slate-400 hover:text-slate-200 text-[10px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub-Navigation for the 6 Google Workspace Services */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs font-mono">
        <button
          onClick={() => setWorkspaceTab('calendar')}
          className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-colors ${
            workspaceTab === 'calendar'
              ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span>Calendar</span>
        </button>

        <button
          onClick={() => setWorkspaceTab('gmail')}
          className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-colors ${
            workspaceTab === 'gmail'
              ? 'bg-red-500/20 text-red-300 font-semibold border border-red-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mail className="w-3.5 h-3.5 text-red-400" />
          <span>Gmail</span>
        </button>

        <button
          onClick={() => setWorkspaceTab('docs')}
          className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-colors ${
            workspaceTab === 'docs'
              ? 'bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span>Docs</span>
        </button>

        <button
          onClick={() => setWorkspaceTab('tasks')}
          className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-colors ${
            workspaceTab === 'tasks'
              ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span>Tasks</span>
        </button>

        <button
          onClick={() => setWorkspaceTab('contacts')}
          className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-colors ${
            workspaceTab === 'contacts'
              ? 'bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-purple-400" />
          <span>Contacts</span>
        </button>

        <button
          onClick={() => setWorkspaceTab('keep')}
          className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-colors ${
            workspaceTab === 'keep'
              ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <StickyNote className="w-3.5 h-3.5 text-amber-400" />
          <span>Keep</span>
        </button>
      </div>

      {/* Main Content Areas */}
      {!accessToken ? (
        <div className="py-10 text-center flex flex-col items-center justify-center gap-3 bg-slate-900/40 rounded-xl border border-slate-800/80 p-6">
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="max-w-md">
            <h3 className="text-sm font-display font-bold text-slate-200 mb-1">
              Connect Your Google Workspace
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans mb-4">
              Sign in with your Google account to manage your real Google Calendar events, check and compose Gmail, organize Google Tasks, create Google Docs, access Contacts, and sync Keep notes.
            </p>
            <button
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="mx-auto px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-semibold text-xs transition-all shadow-md shadow-cyan-900/30 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAuthenticating ? 'Connecting...' : 'Authorize Google Workspace'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-[360px]">
          {/* 1. GOOGLE CALENDAR VIEW */}
          {workspaceTab === 'calendar' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono font-bold text-cyan-300">
                    UPCOMING CALENDAR EVENTS ({calendarEvents.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadTabWorkspaceData}
                    disabled={isLoadingData}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs flex items-center gap-1"
                    title="Refresh Events"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setShowEventForm((prev) => !prev)}
                    className="px-2.5 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Schedule Event</span>
                  </button>
                </div>
              </div>

              {/* Event Creation Form */}
              {showEventForm && (
                <form
                  onSubmit={triggerCreateEvent}
                  className="bg-slate-900/90 rounded-lg p-3 border border-cyan-500/30 space-y-3 text-xs"
                >
                  <div className="font-mono text-cyan-300 font-semibold text-[11px] flex items-center gap-1.5">
                    <Plus className="w-3 h-3" />
                    <span>Add New Google Calendar Event</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Event Title / Meeting Summary *"
                      value={newEvent.summary}
                      onChange={(e) => setNewEvent({ ...newEvent, summary: e.target.value })}
                      required
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <input
                      type="text"
                      placeholder="Location (e.g. Google Meet, Room 4)"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Start Time</label>
                      <input
                        type="datetime-local"
                        value={newEvent.startDateTime}
                        onChange={(e) => setNewEvent({ ...newEvent, startDateTime: e.target.value })}
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">End Time</label>
                      <input
                        type="datetime-local"
                        value={newEvent.endDateTime}
                        onChange={(e) => setNewEvent({ ...newEvent, endDateTime: e.target.value })}
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowEventForm(false)}
                      className="px-3 py-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-semibold text-xs"
                    >
                      Confirm & Create
                    </button>
                  </div>
                </form>
              )}

              {/* Events List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {calendarEvents.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs font-mono">
                    {isLoadingData ? 'Loading Google Calendar events...' : 'No upcoming events found.'}
                  </div>
                ) : (
                  calendarEvents.map((ev) => {
                    const timeStr = ev.start.dateTime
                      ? new Date(ev.start.dateTime).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : ev.start.date || 'All day';

                    return (
                      <div
                        key={ev.id}
                        className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/40 transition-colors flex items-start justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-200">{ev.summary}</span>
                            {ev.htmlLink && (
                              <a
                                href={ev.htmlLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-500 hover:text-cyan-400"
                                title="Open in Google Calendar"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-cyan-400" />
                              {timeStr}
                            </span>
                            {ev.location && (
                              <span className="flex items-center gap-1 truncate max-w-[180px]">
                                <MapPin className="w-3 h-3 text-amber-400" />
                                {ev.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => triggerDeleteEvent(ev)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                          title="Delete Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 2. GMAIL VIEW */}
          {workspaceTab === 'gmail' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-mono font-bold text-red-300">
                    GMAIL INBOX ({gmailMessages.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadTabWorkspaceData}
                    disabled={isLoadingData}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs"
                    title="Refresh Inbox"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setShowComposeEmail((prev) => !prev)}
                    className="px-2.5 py-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/50 text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Compose</span>
                  </button>
                </div>
              </div>

              {/* Compose Email Form */}
              {showComposeEmail && (
                <form
                  onSubmit={triggerSendEmail}
                  className="bg-slate-900/90 rounded-lg p-3 border border-red-500/30 space-y-2 text-xs"
                >
                  <div className="font-mono text-red-300 font-semibold text-[11px] flex items-center gap-1.5">
                    <Send className="w-3 h-3" />
                    <span>Compose New Email via Authorized Gmail</span>
                  </div>
                  <input
                    type="email"
                    placeholder="To: recipient@example.com *"
                    value={newEmail.to}
                    onChange={(e) => setNewEmail({ ...newEmail, to: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                  <input
                    type="text"
                    placeholder="Subject *"
                    value={newEmail.subject}
                    onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                  <textarea
                    rows={3}
                    placeholder="Email body text..."
                    value={newEmail.body}
                    onChange={(e) => setNewEmail({ ...newEmail, body: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowComposeEmail(false)}
                      className="px-3 py-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-mono font-semibold text-xs flex items-center gap-1.5"
                    >
                      <Send className="w-3 h-3" />
                      <span>Review & Send</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Messages List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {gmailMessages.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs font-mono">
                    {isLoadingData ? 'Loading Gmail messages...' : 'No recent emails found.'}
                  </div>
                ) : (
                  gmailMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 hover:border-red-500/40 transition-colors flex items-start justify-between gap-2"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-200 truncate">
                            {msg.subject}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">
                            {msg.date ? new Date(msg.date).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div className="text-[11px] text-red-300/80 font-mono truncate">
                          {msg.from}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate max-w-lg font-sans">
                          {msg.snippet}
                        </p>
                      </div>
                      <button
                        onClick={() => triggerTrashEmail(msg)}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors shrink-0"
                        title="Trash Email"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 3. GOOGLE DOCS VIEW */}
          {workspaceTab === 'docs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-mono font-bold text-blue-300">
                    GOOGLE DOCS ({docs.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadTabWorkspaceData}
                    disabled={isLoadingData}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs"
                    title="Refresh Docs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setShowDocForm((prev) => !prev)}
                    className="px-2.5 py-1.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/50 text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Google Doc</span>
                  </button>
                </div>
              </div>

              {/* Doc Creation Form */}
              {showDocForm && (
                <form
                  onSubmit={triggerCreateDoc}
                  className="bg-slate-900/90 rounded-lg p-3 border border-blue-500/30 space-y-2 text-xs"
                >
                  <div className="font-mono text-blue-300 font-semibold text-[11px] flex items-center gap-1.5">
                    <Plus className="w-3 h-3" />
                    <span>Create Document via Google Docs API</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Document Title (e.g., Jarvis AI Briefing) *"
                    value={newDoc.title}
                    onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <textarea
                    rows={3}
                    placeholder="Initial content / notes (optional)..."
                    value={newDoc.initialContent}
                    onChange={(e) => setNewDoc({ ...newDoc, initialContent: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDocForm(false)}
                      className="px-3 py-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono font-semibold text-xs"
                    >
                      Confirm & Create Doc
                    </button>
                  </div>
                </form>
              )}

              {/* Docs List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {docs.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs font-mono">
                    {isLoadingData ? 'Loading Google Docs...' : 'No Google Docs found.'}
                  </div>
                ) : (
                  docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 hover:border-blue-500/40 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="font-semibold text-xs text-slate-200 truncate">
                            {doc.name}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {doc.modifiedTime
                            ? `Modified ${new Date(doc.modifiedTime).toLocaleDateString()}`
                            : 'Google Doc'}
                        </div>
                      </div>
                      {doc.webViewLink && (
                        <a
                          href={doc.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-blue-500/20 text-blue-300 text-xs font-mono flex items-center gap-1 transition-colors"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 4. GOOGLE TASKS VIEW */}
          {workspaceTab === 'tasks' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    GOOGLE TASKS ({tasks.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadTabWorkspaceData}
                    disabled={isLoadingData}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs"
                    title="Refresh Tasks"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setShowTaskForm((prev) => !prev)}
                    className="px-2.5 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Task</span>
                  </button>
                </div>
              </div>

              {/* Task Creation Form */}
              {showTaskForm && (
                <form
                  onSubmit={triggerCreateTask}
                  className="bg-slate-900/90 rounded-lg p-3 border border-emerald-500/30 space-y-2 text-xs"
                >
                  <div className="font-mono text-emerald-300 font-semibold text-[11px] flex items-center gap-1.5">
                    <Plus className="w-3 h-3" />
                    <span>Create Google Task</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Task Title (e.g., Audit zero-cost AI fallback) *"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Notes / context (optional)"
                      value={newTask.notes}
                      onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="date"
                      value={newTask.due}
                      onChange={(e) => setNewTask({ ...newTask, due: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowTaskForm(false)}
                      className="px-3 py-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-semibold text-xs"
                    >
                      Confirm & Add Task
                    </button>
                  </div>
                </form>
              )}

              {/* Tasks List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs font-mono">
                    {isLoadingData ? 'Loading Google Tasks...' : 'No tasks found in list.'}
                  </div>
                ) : (
                  tasks.map((t) => {
                    const isCompleted = t.status === 'completed';
                    return (
                      <div
                        key={t.id}
                        className={`p-2.5 rounded-lg border transition-colors flex items-start justify-between gap-2 ${
                          isCompleted
                            ? 'bg-slate-950/40 border-slate-900 opacity-60'
                            : 'bg-slate-900/80 border-slate-800/80 hover:border-emerald-500/40'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <button
                            onClick={() => triggerToggleTask(t)}
                            className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-colors ${
                              isCompleted
                                ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                                : 'border-slate-600 hover:border-emerald-400'
                            }`}
                          >
                            {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                          <div className="space-y-0.5">
                            <span
                              className={`text-xs font-medium block ${
                                isCompleted ? 'line-through text-slate-500' : 'text-slate-200'
                              }`}
                            >
                              {t.title}
                            </span>
                            {t.notes && <p className="text-[11px] text-slate-400">{t.notes}</p>}
                            {t.due && (
                              <span className="text-[10px] font-mono text-emerald-400 block">
                                Due {new Date(t.due).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => triggerDeleteTask(t)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 5. GOOGLE CONTACTS VIEW */}
          {workspaceTab === 'contacts' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-mono font-bold text-purple-300">
                    CONTACT BOOK ({contacts.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
                    <input
                      type="text"
                      placeholder="Search contacts..."
                      value={contactsFilter}
                      onChange={(e) => setContactsFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg pl-7 pr-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-purple-500 w-36 sm:w-44"
                    />
                  </div>
                  <button
                    onClick={loadTabWorkspaceData}
                    disabled={isLoadingData}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs"
                    title="Refresh Contacts"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setShowContactForm((prev) => !prev)}
                    className="px-2.5 py-1.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/50 text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Contact</span>
                  </button>
                </div>
              </div>

              {/* Contact Form */}
              {showContactForm && (
                <form
                  onSubmit={triggerCreateContact}
                  className="bg-slate-900/90 rounded-lg p-3 border border-purple-500/30 space-y-2 text-xs"
                >
                  <div className="font-mono text-purple-300 font-semibold text-[11px] flex items-center gap-1.5">
                    <Plus className="w-3 h-3" />
                    <span>Add New Google Contact via People API</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="First Name *"
                      value={newContact.givenName}
                      onChange={(e) => setNewContact({ ...newContact, givenName: e.target.value })}
                      required
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={newContact.familyName}
                      onChange={(e) => setNewContact({ ...newContact, familyName: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowContactForm(false)}
                      className="px-3 py-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-mono font-semibold text-xs"
                    >
                      Confirm & Save
                    </button>
                  </div>
                </form>
              )}

              {/* Contacts List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredContacts.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs font-mono">
                    {isLoadingData ? 'Loading Google Contacts...' : 'No contacts matching filter.'}
                  </div>
                ) : (
                  filteredContacts.map((c) => (
                    <div
                      key={c.resourceName}
                      className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 hover:border-purple-500/40 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {c.photoUrl ? (
                          <img
                            src={c.photoUrl}
                            alt={c.displayName}
                            className="w-8 h-8 rounded-full border border-purple-500/40"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-purple-900/60 border border-purple-600 text-purple-200 font-bold text-xs flex items-center justify-center">
                            {(c.displayName || 'C')[0].toUpperCase()}
                          </div>
                        )}
                        <div className="space-y-0.5 min-w-0">
                          <span className="font-semibold text-xs text-slate-200 block truncate">
                            {c.displayName}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400">
                            {c.email && <span>{c.email}</span>}
                            {c.phoneNumber && <span>• {c.phoneNumber}</span>}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => triggerDeleteContact(c)}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                        title="Delete Contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 6. GOOGLE KEEP & NOTES VIEW */}
          {workspaceTab === 'keep' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-mono font-bold text-amber-300">
                    JARVIS KEEP NOTES & MEMOS ({quickNotes.length})
                  </span>
                </div>
                <button
                  onClick={() => setShowNoteForm((prev) => !prev)}
                  className="px-2.5 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-xs font-mono flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Note</span>
                </button>
              </div>

              {/* Note Creation Form */}
              {showNoteForm && (
                <form
                  onSubmit={handleAddQuickNote}
                  className="bg-slate-900/90 rounded-lg p-3 border border-amber-500/30 space-y-2 text-xs"
                >
                  <div className="font-mono text-amber-300 font-semibold text-[11px] flex items-center gap-1.5">
                    <Plus className="w-3 h-3" />
                    <span>Add Quick Note</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Note Title *"
                    value={newNote.title}
                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <textarea
                    rows={3}
                    placeholder="Note thoughts, checklist items, or research snippets..."
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      placeholder="Tags (comma-separated, e.g. project, idea)"
                      value={newNote.tags}
                      onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-amber-500 flex-1"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowNoteForm(false)}
                        className="px-3 py-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-mono font-semibold text-xs"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Notes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                {quickNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-colors flex flex-col justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-semibold text-xs text-amber-200 leading-snug">
                          {note.title}
                        </span>
                        <button
                          onClick={() => handleDeleteQuickNote(note.id)}
                          className="text-slate-500 hover:text-red-400 p-0.5"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-line">
                        {note.content}
                      </p>
                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {note.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400/80 border border-slate-700"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick 1-Click Export to Google Docs or Google Tasks */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Sync Note:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleExportNoteToDoc(note)}
                          className="px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 flex items-center gap-1 transition-colors"
                          title="Export to Google Doc"
                        >
                          <FileText className="w-2.5 h-2.5" />
                          <span>Doc</span>
                        </button>
                        <button
                          onClick={() => handleExportNoteToTask(note)}
                          className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 transition-colors"
                          title="Export to Google Tasks"
                        >
                          <CheckSquare className="w-2.5 h-2.5" />
                          <span>Task</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mandatory User Confirmation Dialog before executing any Workspace write/update/delete */}
      <WorkspaceConfirmationModal
        dialogState={confirmDialog}
        onClose={() => setConfirmDialog(null)}
        isExecuting={isExecutingAction}
      />
    </div>
  );
};
