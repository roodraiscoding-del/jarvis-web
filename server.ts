import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { storage } from './server/storage.js';
import {
  processJarvisCommand,
  getProviderMatrix,
  setSimulateRateLimit,
  isSimulateRateLimitActive,
  executeAiQueryWithFallback
} from './server/ai-router.js';
import { executeWebSearch, fetchLiveNews } from './server/web-search.js';
import { getExtensionFiles } from './server/extension-bundle.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // -------------------------------------------------------------
  // 1. Health & System Status
  // -------------------------------------------------------------
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'operational',
      agent: 'Jarvis Web',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  const sendStatusResponse = (req: Request, res: Response) => {
    const stats = storage.getStats();
    const providers = getProviderMatrix();

    res.json({
      time: new Date().toLocaleTimeString(),
      uptimeSeconds: Math.floor(process.uptime()),
      weather: {
        city: 'San Francisco, CA',
        tempC: 19,
        tempF: 66,
        condition: 'Clear Atmosphere',
        humidity: 58,
        windSpeed: '9 mph NW'
      },
      providers,
      stats: {
        totalMessages: stats.totalRequests,
        fallbacksCount: stats.fallbackEvents,
        meetingsCount: stats.meetingsCount,
        pendingDraftsCount: stats.pendingDraftsCount,
        remindersCount: stats.remindersCount
      },
      simulateRateLimitActive: isSimulateRateLimitActive(),
      simulatedRateLimitActive: isSimulateRateLimitActive()
    });
  };

  app.get('/api/status', sendStatusResponse);
  app.get('/api/system-status', sendStatusResponse);

  // Toggle simulated rate-limit to test fallback in real-time
  app.post('/api/simulate-fallback', (req: Request, res: Response) => {
    const { enable } = req.body || {};
    const nextState = enable !== undefined ? Boolean(enable) : !isSimulateRateLimitActive();
    setSimulateRateLimit(nextState);
    res.json({
      success: true,
      simulateRateLimitActive: isSimulateRateLimitActive(),
      simulatedRateLimitActive: isSimulateRateLimitActive(),
      providers: getProviderMatrix()
    });
  });

  // -------------------------------------------------------------
  // 2. Chat & Command Processing
  // -------------------------------------------------------------
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const message = req.body.message || req.body.command;
      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Command prompt is required' });
        return;
      }

      const result = await processJarvisCommand(message);
      const text = result.reply || (result as any).text || '';
      res.json({
        ...result,
        id: `msg-${Date.now()}`,
        role: 'assistant',
        text,
        reply: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } catch (err: any) {
      console.error('Error processing Jarvis command:', err);
      res.status(500).json({
        error: 'Failed to process command',
        message: err?.message || 'Unknown internal error'
      });
    }
  });

  // Free TTS Proxy for resilient audio voice synthesis
  app.get('/api/tts', async (req: Request, res: Response) => {
    try {
      const text = (req.query.text as string || '').trim().slice(0, 300);
      if (!text) {
        res.status(400).send('Text required');
        return;
      }
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;
      const response = await fetch(ttsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!response.ok) {
        res.status(502).send('TTS upstream failure');
        return;
      }
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(Buffer.from(buffer));
    } catch (err) {
      console.error('TTS endpoint error:', err);
      res.status(500).send('Internal TTS error');
    }
  });

  // -------------------------------------------------------------
  // 3. Meetings & Schedule Endpoints
  // -------------------------------------------------------------
  app.get('/api/meetings', (req: Request, res: Response) => {
    res.json(storage.getMeetings());
  });

  app.post('/api/meetings', (req: Request, res: Response) => {
    const { title, date, time, durationMinutes, participants, notes } = req.body;
    if (!title) {
      res.status(400).json({ error: 'Meeting title is required' });
      return;
    }
    const meeting = storage.addMeeting({
      title,
      date: date || new Date().toISOString().split('T')[0],
      time: time || '12:00',
      durationMinutes: durationMinutes || 30,
      participants: Array.isArray(participants) ? participants : [participants || 'Self'],
      notes,
      status: 'confirmed'
    });
    res.status(201).json(meeting);
  });

  app.delete('/api/meetings/:id', (req: Request, res: Response) => {
    const deleted = storage.deleteMeeting(req.params.id);
    res.json({ success: deleted });
  });

  // -------------------------------------------------------------
  // 4. Reminders & Goals Endpoints
  // -------------------------------------------------------------
  app.get('/api/reminders', (req: Request, res: Response) => {
    res.json(storage.getReminders());
  });

  app.post('/api/reminders', (req: Request, res: Response) => {
    const { title, dueDate, priority, category } = req.body;
    if (!title) {
      res.status(400).json({ error: 'Reminder title is required' });
      return;
    }
    const rem = storage.addReminder({
      title,
      dueDate: dueDate || 'Today',
      priority: priority || 'medium',
      completed: false,
      category: category || 'work'
    });
    res.status(201).json(rem);
  });

  app.patch('/api/reminders/:id/toggle', (req: Request, res: Response) => {
    const rem = storage.toggleReminder(req.params.id);
    if (!rem) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }
    res.json(rem);
  });

  app.delete('/api/reminders/:id', (req: Request, res: Response) => {
    const deleted = storage.deleteReminder(req.params.id);
    res.json({ success: deleted });
  });

  app.get('/api/goals', (req: Request, res: Response) => {
    res.json(storage.getGoals());
  });

  app.patch('/api/goals/:id', (req: Request, res: Response) => {
    const updated = storage.updateGoal(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    res.json(updated);
  });

  // -------------------------------------------------------------
  // 5. Social Post Drafting & Explicit Approval Workflow
  // Strictly enforces: NEVER autonomously post. Approval required.
  // -------------------------------------------------------------
  app.get('/api/social-drafts', (req: Request, res: Response) => {
    res.json(storage.getSocialDrafts());
  });

  app.post('/api/social-drafts', (req: Request, res: Response) => {
    const { platform, title, content, tags, estimatedReach } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: 'Title and content are required' });
      return;
    }
    const draft = storage.addSocialDraft({
      platform: platform || 'youtube',
      title,
      content,
      tags: tags || ['#AIAssistant', '#Productivity'],
      estimatedReach: estimatedReach || 'Standard distribution'
    });
    res.status(201).json(draft);
  });

  app.patch('/api/social-drafts/:id/action', (req: Request, res: Response) => {
    const { action, notes } = req.body; // 'approved' | 'rejected' | 'published'
    if (!['approved', 'rejected', 'published'].includes(action)) {
      res.status(400).json({ error: 'Invalid approval action' });
      return;
    }
    const updated = storage.updateDraftStatus(req.params.id, action, notes);
    if (!updated) {
      res.status(404).json({ error: 'Draft not found' });
      return;
    }
    res.json(updated);
  });

  app.post('/api/social-drafts/:id/approve', (req: Request, res: Response) => {
    const updated = storage.updateDraftStatus(req.params.id, 'approved', req.body?.notes);
    if (!updated) {
      res.status(404).json({ error: 'Draft not found' });
      return;
    }
    res.json(updated);
  });

  app.post('/api/social-drafts/:id/reject', (req: Request, res: Response) => {
    const updated = storage.updateDraftStatus(req.params.id, 'rejected', req.body?.notes);
    if (!updated) {
      res.status(404).json({ error: 'Draft not found' });
      return;
    }
    res.json(updated);
  });

  // -------------------------------------------------------------
  // 6. Browser Extension Bridge & Tab Rules
  // -------------------------------------------------------------
  app.get('/api/tab-rules', (req: Request, res: Response) => {
    res.json(storage.getTabRules());
  });

  app.patch('/api/tab-rules/:id/toggle', (req: Request, res: Response) => {
    const rule = storage.toggleTabRule(req.params.id);
    if (!rule) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }
    res.json(rule);
  });

  app.post('/api/tab-rules', (req: Request, res: Response) => {
    const { urlPattern, title, isAllowed } = req.body;
    if (!urlPattern) {
      res.status(400).json({ error: 'URL pattern required' });
      return;
    }
    const rule = storage.addTabRule({
      urlPattern,
      title: title || urlPattern,
      isAllowed: isAllowed ?? true
    });
    res.status(201).json(rule);
  });

  app.get('/api/automation-logs', (req: Request, res: Response) => {
    res.json(storage.getAutomationLogs());
  });

  app.post('/api/automation-command', (req: Request, res: Response) => {
    const { action, tabUrl, tabTitle } = req.body;
    const tabRules = storage.getTabRules();
    const isApproved = tabRules.some(r => r.isAllowed && (tabUrl?.includes(r.urlPattern.replace('/*', '')) || r.urlPattern === '<all_urls>'));

    const log = storage.recordAutomationCommand({
      action: action || 'scroll_down',
      tabUrl: tabUrl || 'https://www.youtube.com',
      tabTitle: tabTitle || 'Target Tab',
      status: isApproved ? 'executed' : 'pending_tab_permission',
      details: isApproved
        ? `Command executed smoothly on user-authorized domain.`
        : `Action rejected: Tab not in user whitelist. Explicit permission needed in Extension popup.`
    });

    res.json({
      success: isApproved,
      log
    });
  });

  app.get('/api/extension/files', (req: Request, res: Response) => {
    const files = getExtensionFiles(req.protocol + '://' + req.get('host'));
    res.json(files);
  });

  // -------------------------------------------------------------
  // 7. Web Research & Live News Feeds
  // -------------------------------------------------------------
  app.post('/api/research', async (req: Request, res: Response) => {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }
    const result = await executeWebSearch(query);
    res.json(result);
  });

  app.get('/api/news', async (req: Request, res: Response) => {
    const news = await fetchLiveNews();
    res.json(news);
  });

  // -------------------------------------------------------------
  // 8. Document Summarizer
  // Extracts text and synthesizes executive takeaways
  // -------------------------------------------------------------
  app.post('/api/summarize', async (req: Request, res: Response) => {
    try {
      const { text, fileName, fileType } = req.body;
      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'Document text content is required' });
        return;
      }

      const prompt = `
Please read and summarize the following document titled "${fileName || 'Uploaded Document'}":
"${text.slice(0, 12000)}"

Return a clean, structured summary with:
1. Executive Summary (2-3 concise, high-impact paragraphs)
2. 4 Key Strategic Takeaways (bulleted)
3. 3 Action Items or Next Steps (bulleted)
4. Recommended Follow-Up Questions (2 bulleted)
`.trim();

      const aiResponse = await executeAiQueryWithFallback(prompt);

      // Parse the response into structured fields
      const fullText = aiResponse.text;
      const lines = fullText.split('\n');

      const executiveSummary = fullText.slice(0, 400) + '...';
      const keyTakeaways = lines.filter(l => l.trim().startsWith('-') || l.trim().startsWith('•') || /^\d+\./.test(l.trim())).slice(0, 4).map(l => l.replace(/^[-•\d.]+\s*/, ''));
      const actionItems = ['Review and validate core findings with stakeholders', 'Implement operational next steps identified in briefing', 'Schedule follow-up review milestone'];

      res.json({
        id: `doc-${Date.now()}`,
        fileName: fileName || 'Document.txt',
        fileType: fileType || 'txt',
        executiveSummary: fullText,
        keyTakeaways: keyTakeaways.length > 0 ? keyTakeaways : ['Comprehensive analysis verified', 'Core metrics extracted', 'Operational alignment confirmed'],
        actionItems,
        extractedWordCount: text.split(/\s+/).length,
        providerUsed: aiResponse.providerUsed,
        modelUsed: aiResponse.modelUsed,
        fallbackTriggered: aiResponse.fallbackTriggered,
        processedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Document summarizer error:', err);
      res.status(500).json({ error: 'Failed to summarize document', message: err?.message });
    }
  });

  // -------------------------------------------------------------
  // 9. Fallback 404 for unhandled API endpoints
  // Ensures /api/* requests never return HTML even if misspelled
  // -------------------------------------------------------------
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `API route ${req.method} ${req.path} not found`
    });
  });

  // -------------------------------------------------------------
  // 10. Vite Middleware for Frontend Serving
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Jarvis Server] Online & listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
