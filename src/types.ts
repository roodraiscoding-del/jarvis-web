export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  timestamp: string;
  providerUsed?: string;
  modelUsed?: string;
  fallbackTriggered?: boolean;
  fallbackReason?: string;
  fallbackChain?: string[];
  actionTaken?: {
    type: string;
    description: string;
    details?: any;
  };
  sources?: Array<{ title: string; url: string; snippet: string }>;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  durationMinutes: number;
  participants: string[];
  notes?: string;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  category: 'work' | 'personal' | 'health' | 'content';
  createdAt: string;
}

export interface DailyGoal {
  id: string;
  title: string;
  target: string;
  completed: boolean;
  progressPercent: number;
}

export type SocialPlatform = 'youtube' | 'instagram' | 'facebook';

export interface SocialDraft {
  id: string;
  platform: SocialPlatform;
  title: string;
  content: string;
  tags: string[];
  status: 'pending_approval' | 'approved' | 'rejected' | 'published';
  createdAt: string;
  updatedAt?: string;
  scheduledTime?: string;
  estimatedReach?: string;
  approvalHistory?: string[];
}

export interface ModelProviderInfo {
  id: string;
  name: string;
  provider: 'gemini' | 'groq' | 'openrouter' | 'fallback_engine';
  modelName: string;
  tier: 'Free Tier';
  status: 'operational' | 'rate_limited' | 'quota_exhausted' | 'standby';
  latencyMs?: number;
  isCurrentPrimary: boolean;
  quotaDescription: string;
}

export interface MediaTrack {
  id: string;
  title: string;
  artist: string;
  category: 'synthwave' | 'lofi' | 'ambient' | 'focus';
  audioUrl?: string;
  embedVideoId?: string;
  duration: string;
}

export interface BrowserTabRule {
  id: string;
  urlPattern: string;
  title: string;
  isAllowed: boolean;
  lastAction?: string;
  addedAt: string;
}

export interface BrowserAutomationCommand {
  id: string;
  action: 'scroll_down' | 'scroll_up' | 'play_video' | 'pause_video' | 'copy_text';
  tabUrl: string;
  tabTitle: string;
  timestamp: string;
  status: 'executed' | 'pending_tab_permission' | 'declined';
  details?: string;
}

export interface DocumentSummaryResult {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: 'pdf' | 'pptx' | 'txt' | 'doc';
  pageOrSlideCount?: number;
  executiveSummary: string;
  keyTakeaways: string[];
  actionItems: string[];
  suggestedFollowUps: string[];
  extractedWordCount: number;
  processedAt: string;
}

export interface SystemStatusData {
  time: string;
  uptimeSeconds: number;
  weather: {
    city: string;
    tempC: number;
    tempF: number;
    condition: string;
    humidity: number;
    windSpeed: string;
  };
  providers: ModelProviderInfo[];
  stats: {
    totalMessages: number;
    fallbacksCount: number;
    meetingsCount: number;
    pendingDraftsCount: number;
    remindersCount: number;
  };
}
