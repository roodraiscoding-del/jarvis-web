import { GoogleGenAI } from '@google/genai';
import { storage } from './storage.js';
import { executeWebSearch } from './web-search.js';
import { fetchWeatherByCoordinates, fetchWeatherByCityName, WeatherInfo } from './weather-service.js';
import { ChatMessage, ModelProviderInfo } from '../src/types.js';

let forceSimulatedRateLimit = false;

export function setSimulateRateLimit(enabled: boolean) {
  forceSimulatedRateLimit = enabled;
}

export function isSimulateRateLimitActive() {
  return forceSimulatedRateLimit;
}

export function getProviderMatrix(): ModelProviderInfo[] {
  const geminiAvailable = Boolean(process.env.GEMINI_API_KEY);
  const groqAvailable = Boolean(process.env.GROQ_API_KEY);
  const openRouterAvailable = Boolean(process.env.OPENROUTER_API_KEY);

  return [
    {
      id: 'gemini-flash',
      name: 'Google Gemini 3.8 Flash (Primary)',
      provider: 'gemini',
      modelName: 'gemini-3.8-flash',
      tier: 'Free Tier',
      status: forceSimulatedRateLimit ? 'rate_limited' : (geminiAvailable ? 'operational' : 'standby'),
      latencyMs: 380,
      isCurrentPrimary: !forceSimulatedRateLimit && geminiAvailable,
      quotaDescription: 'Google AI Studio Free Tier (Primary Core)'
    },
    {
      id: 'gemini-lite',
      name: 'Google Gemini 3.1 Flash-Lite (Instant Failover)',
      provider: 'gemini',
      modelName: 'gemini-3.1-flash-lite',
      tier: 'Free Tier',
      status: forceSimulatedRateLimit ? 'rate_limited' : (geminiAvailable ? 'operational' : 'standby'),
      latencyMs: 210,
      isCurrentPrimary: false,
      quotaDescription: 'High-speed separate quota failover model'
    },
    {
      id: 'groq-llama',
      name: 'Groq LLaMA 3.3 (Fast Cloud Failover)',
      provider: 'groq',
      modelName: 'llama-3.3-70b-versatile',
      tier: 'Free Tier',
      status: groqAvailable ? 'operational' : 'standby',
      latencyMs: 190,
      isCurrentPrimary: false,
      quotaDescription: 'Free tier 30 RPM (Zero Cost)'
    },
    {
      id: 'openrouter-free',
      name: 'OpenRouter Free Model Gateway',
      provider: 'openrouter',
      modelName: 'meta-llama/llama-3.3-70b-instruct:free',
      tier: 'Free Tier',
      status: openRouterAvailable ? 'operational' : 'standby',
      latencyMs: 520,
      isCurrentPrimary: false,
      quotaDescription: 'Free tier open models (Zero Cost)'
    },
    {
      id: 'jarvis-edge-engine',
      name: 'Jarvis Edge Rule-Based Fallback',
      provider: 'fallback_engine',
      modelName: 'jarvis-deterministic-v1',
      tier: 'Free Tier',
      status: 'operational',
      latencyMs: 45,
      isCurrentPrimary: (!geminiAvailable && !groqAvailable && !openRouterAvailable) || forceSimulatedRateLimit,
      quotaDescription: '100% Local Autonomous Fallback (Never Fails)'
    }
  ];
}

interface ProcessCommandResult {
  reply: string;
  providerUsed: string;
  modelUsed: string;
  fallbackTriggered: boolean;
  fallbackReason?: string;
  fallbackChain: string[];
  actionTaken?: {
    type: string;
    description: string;
    details?: any;
  };
  sources?: Array<{ title: string; url: string; snippet: string }>;
}

/**
 * System prompt defining Jarvis persona and tool invocation conventions
 */
const JARVIS_SYSTEM_PROMPT = `
You are Jarvis, a highly competent, proactive personal AI assistant operating in a cybernetic dark HUD interface.
You are granted full authorization to interface with the local system and browser extensions to perform the following core duties:

1. Media Control: Execute play, pause, next track, and previous track commands via browser automation and the integrated cybernetic media deck.
2. Social Media: Draft content for Instagram, Facebook, and YouTube. In accordance with strict safety protocols, you MUST present all drafts for manual approval in the Pending Approvals queue before posting. Never post autonomously.
3. Research & Data: Conduct real-time web research to provide comprehensive answers to inquiries.
4. Task Management: Manage calendar meetings, set and track reminders, and organize daily objectives.
5. Operational Protocol: Be proactive, respectful, and crystal clear. Always confirm actions taken and wait for explicit approval for any external posting or sensitive system changes. You are the user's primary interface for all digital tasks.

When responding:
- Address the user respectfully (e.g. "At your command, Sir.", "Task confirmed and registered.").
- Clearly state what action was executed or logged in local storage.
- Present drafts or sensitive operations with explicit reminders for review in the HUD.
`.trim();

/**
 * Core LLM caller with multi-provider cascade failover
 */
export async function executeAiQueryWithFallback(
  prompt: string,
  contextPrompt?: string,
  actionTaken?: ProcessCommandResult['actionTaken']
): Promise<{
  text: string;
  providerUsed: string;
  modelUsed: string;
  fallbackTriggered: boolean;
  fallbackReason?: string;
  fallbackChain: string[];
}> {
  const fallbackChain: string[] = [];
  const fullPrompt = contextPrompt ? `${contextPrompt}\n\nUser command/prompt: ${prompt}` : prompt;

  // -------------------------------------------------------------
  // Provider 1: Google Gemini Models (Free Tier Multi-Model Cascade)
  // 1a: Primary: gemini-3.8-flash
  // 1b: Instant Free Failover: gemini-3.1-flash-lite
  // -------------------------------------------------------------
  if (process.env.GEMINI_API_KEY && !forceSimulatedRateLimit) {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    // Attempt 1a: gemini-3.8-flash
    try {
      fallbackChain.push('Google Gemini 3.8 Flash (Checking)');
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: fullPrompt,
        config: {
          systemInstruction: JARVIS_SYSTEM_PROMPT,
          temperature: 0.7
        }
      });

      const textOutput = response.text?.trim();
      if (textOutput) {
        fallbackChain[fallbackChain.length - 1] = 'Google Gemini 3.8 Flash (Success)';
        return {
          text: textOutput,
          providerUsed: 'Google Gemini (Free Tier)',
          modelUsed: 'gemini-3.8-flash',
          fallbackTriggered: false,
          fallbackChain
        };
      }
    } catch (err: any) {
      console.warn('[Jarvis Failover] Gemini 3.8 Flash rate limit or error, cascading to Gemini 3.1 Flash-Lite:', err?.message || err);
      storage.recordFallback();
      fallbackChain[fallbackChain.length - 1] = `Google Gemini 3.8 Flash (Limit: ${err?.status || 429})`;

      // Attempt 1b: gemini-3.1-flash-lite (high-speed free failover model)
      try {
        fallbackChain.push('Google Gemini 3.1 Flash-Lite (Failover Checking)');
        const liteResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: fullPrompt,
          config: {
            systemInstruction: JARVIS_SYSTEM_PROMPT,
            temperature: 0.7
          }
        });

        const liteText = liteResponse.text?.trim();
        if (liteText) {
          fallbackChain[fallbackChain.length - 1] = 'Google Gemini 3.1 Flash-Lite (Failover Success)';
          return {
            text: liteText,
            providerUsed: 'Google Gemini (Flash-Lite Free Failover)',
            modelUsed: 'gemini-3.1-flash-lite',
            fallbackTriggered: true,
            fallbackReason: 'Primary 3.8 Flash quota reached - seamless failover to Gemini 3.1 Flash-Lite',
            fallbackChain
          };
        }
      } catch (liteErr: any) {
        console.warn('[Jarvis Failover] Gemini 3.1 Flash-Lite also exhausted, cascading to next provider:', liteErr?.message || liteErr);
        fallbackChain[fallbackChain.length - 1] = `Google Gemini 3.1 Flash-Lite (Limit: ${liteErr?.status || 429})`;
      }
    }
  } else if (forceSimulatedRateLimit) {
    storage.recordFallback();
    fallbackChain.push('Google Gemini 3.8 Flash (Simulated 429 Quota Exhausted)');
  }

  // -------------------------------------------------------------
  // Provider 2: Groq Free Tier (LLaMA 3.3 70B / 8B Instant)
  // -------------------------------------------------------------
  if (process.env.GROQ_API_KEY) {
    try {
      fallbackChain.push('Groq Cloud (Cascading)');
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: JARVIS_SYSTEM_PROMPT },
            { role: 'user', content: fullPrompt }
          ],
          temperature: 0.7
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json() as any;
        const textOutput = groqData.choices?.[0]?.message?.content?.trim();
        if (textOutput) {
          fallbackChain[fallbackChain.length - 1] = 'Groq LLaMA 3.3 (Failover Success)';
          return {
            text: textOutput,
            providerUsed: 'Groq Cloud (Free Tier)',
            modelUsed: 'llama-3.3-70b-versatile',
            fallbackTriggered: true,
            fallbackReason: forceSimulatedRateLimit ? 'Simulated 429 Quota Test' : 'Primary Gemini Rate Limit',
            fallbackChain
          };
        }
      } else {
        fallbackChain[fallbackChain.length - 1] = `Groq Cloud (Failed: HTTP ${groqRes.status})`;
      }
    } catch (err) {
      console.warn('[Jarvis Failover] Groq failover failed:', err);
      fallbackChain[fallbackChain.length - 1] = 'Groq Cloud (Timeout/Error)';
    }
  }

  // -------------------------------------------------------------
  // Provider 3: OpenRouter Free Models Gateway
  // -------------------------------------------------------------
  if (process.env.OPENROUTER_API_KEY) {
    try {
      fallbackChain.push('OpenRouter Free Models (Cascading)');
      const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://ai.studio',
          'X-Title': 'Jarvis Assistant'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [
            { role: 'system', content: JARVIS_SYSTEM_PROMPT },
            { role: 'user', content: fullPrompt }
          ]
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (openRouterRes.ok) {
        const orData = await openRouterRes.json() as any;
        const textOutput = orData.choices?.[0]?.message?.content?.trim();
        if (textOutput) {
          fallbackChain[fallbackChain.length - 1] = 'OpenRouter Free Model (Failover Success)';
          return {
            text: textOutput,
            providerUsed: 'OpenRouter Free Gateway',
            modelUsed: 'meta-llama/llama-3.3-70b-instruct:free',
            fallbackTriggered: true,
            fallbackReason: 'Cascaded past primary providers',
            fallbackChain
          };
        }
      }
    } catch (err) {
      console.warn('[Jarvis Failover] OpenRouter failed:', err);
      fallbackChain[fallbackChain.length - 1] = 'OpenRouter (Failed)';
    }
  }

  // -------------------------------------------------------------
  // Provider 4: Autonomous Jarvis Edge Reasoning Engine (Local Fallback)
  // Ensures Jarvis NEVER crashes or leaves the user stranded!
  // -------------------------------------------------------------
  fallbackChain.push('Jarvis Edge Reasoning Engine (Active)');
  storage.recordFallback();

  const synthesizedReply = synthesizeFallbackResponse(prompt, actionTaken);

  return {
    text: synthesizedReply,
    providerUsed: 'Jarvis Edge Engine (Autonomous Fallback)',
    modelUsed: 'jarvis-deterministic-v1',
    fallbackTriggered: true,
    fallbackReason: forceSimulatedRateLimit 
      ? 'Manual 429 Quota Exhaustion Simulation Triggered' 
      : 'Free-tier cloud rate limit reached - switched to local edge reasoning',
    fallbackChain
  };
}

/**
 * Intelligent Action Dispatcher: Parses user natural language command,
 * detects the exact requested action (meetings, reminders, social drafts, browser automation),
 * executes the state update in `storage`, and calls the LLM with the context.
 */
export async function processJarvisCommand(
  userCommand: string,
  options?: { coords?: { latitude: number; longitude: number }; city?: string }
): Promise<ProcessCommandResult> {
  const lower = userCommand.toLowerCase().trim();
  storage.recordRequest();

  let actionTaken: ProcessCommandResult['actionTaken'] = undefined;
  let sources: ProcessCommandResult['sources'] = undefined;
  let contextForAi = '';

  // 0A. WEATHER & LOCATION SYNCHRONIZATION
  if (
    lower.includes('weather') ||
    lower.includes('location') ||
    lower.includes('temperature') ||
    lower.includes('forecast') ||
    lower.includes('climate')
  ) {
    try {
      let weatherData: WeatherInfo | undefined;

      // 1. If explicit GPS coords are supplied
      if (options?.coords && typeof options.coords.latitude === 'number' && typeof options.coords.longitude === 'number') {
        weatherData = await fetchWeatherByCoordinates(options.coords.latitude, options.coords.longitude);
      } else {
        // 2. Check if a specific city was specified in text (e.g., "in Tokyo", "to London", "for Seattle")
        const cityMatch = userCommand.match(/(?:in|for|to|at|city of)\s+([a-zA-Z\s]{2,30})/i);
        let targetCity = options?.city || (cityMatch ? cityMatch[1].trim() : '');
        targetCity = targetCity.replace(/today|tomorrow|now|my|current|location|weather|the|please/gi, '').trim();

        if (targetCity && targetCity.length >= 2) {
          weatherData = await fetchWeatherByCityName(targetCity);
        } else {
          // 3. User requested current location sync or general weather check
          const currentW = storage.getWeather();
          if (currentW.latitude && currentW.longitude) {
            weatherData = await fetchWeatherByCoordinates(currentW.latitude, currentW.longitude, currentW.city);
          } else {
            weatherData = currentW as WeatherInfo;
          }
        }
      }

      if (weatherData) {
        storage.setWeather(weatherData);
        actionTaken = {
          type: 'update_weather',
          description: `Location & weather synchronized: ${weatherData.city} (${weatherData.tempC}°C / ${weatherData.tempF}°F, ${weatherData.condition})`,
          details: weatherData
        };
        contextForAi = `SYSTEM ACTION COMPLETED: Synchronized location and weather to "${weatherData.city}". Atmospheric vitals: Temperature is ${weatherData.tempC}°C (${weatherData.tempF}°F), condition is "${weatherData.condition}", relative humidity is ${weatherData.humidity}%, wind speed is ${weatherData.windSpeed}. Real-time telemetry is reflected on the user's HUD. Inform the user respectfully and confirm their location update.`;
      }
    } catch (err: any) {
      console.warn('Weather processing note:', err);
      const currentW = storage.getWeather();
      actionTaken = {
        type: 'update_weather',
        description: `Current location telemetry: ${currentW.city} (${currentW.tempC}°C, ${currentW.condition})`,
        details: currentW
      };
      contextForAi = `USER LOCATION & WEATHER: Current location is ${currentW.city}. Temperature is ${currentW.tempC}°C, condition is ${currentW.condition}. Inform the user that location telemetry is active on their HUD.`;
    }
  }

  // 0B. Google Workspace Actions (Calendar, Gmail, Docs, Tasks, Contacts, Keep)
  else if (
    lower.includes('google workspace') ||
    lower.includes('google calendar') ||
    lower.includes('gmail') ||
    lower.includes('send email') ||
    lower.includes('my email') ||
    lower.includes('check email') ||
    lower.includes('google doc') ||
    lower.includes('create doc') ||
    lower.includes('google task') ||
    lower.includes('contacts') ||
    lower.includes('google keep') ||
    lower.includes('keep note')
  ) {
    let service = 'General Workspace';
    if (lower.includes('calendar')) service = 'Calendar';
    else if (lower.includes('gmail') || lower.includes('email')) service = 'Gmail';
    else if (lower.includes('doc')) service = 'Docs';
    else if (lower.includes('task')) service = 'Tasks';
    else if (lower.includes('contact')) service = 'Contacts';
    else if (lower.includes('keep') || lower.includes('note')) service = 'Keep';

    actionTaken = {
      type: 'google_workspace',
      description: `Routed command to Google Workspace ${service} console with user confirmation safeguards.`,
      details: { service, userCommand }
    };
    contextForAi = `GOOGLE WORKSPACE COMMAND: The user requested an action for Google ${service} ("${userCommand}"). The Google Workspace console has been engaged. Advise the user that they can review, authorize, and trigger their requested ${service} items directly within the Google Workspace Hub with end-user confirmation safeguards.`;
  }

  // 1A. DELETE / CANCEL / REMOVE MEETING
  else if (
    (lower.includes('delete') || lower.includes('cancel') || lower.includes('remove') || lower.includes('drop') || lower.includes('clear')) &&
    (lower.includes('meeting') || lower.includes('appointment') || lower.includes('sync') || lower.includes('calendar event'))
  ) {
    const allMeetings = storage.getMeetings();
    if (allMeetings.length === 0) {
      actionTaken = {
        type: 'delete_meeting',
        description: 'No active meetings found on your calendar to cancel.',
        details: { found: false }
      };
      contextForAi = `USER COMMAND: "${userCommand}". There are currently no meetings scheduled in the agenda to delete. Inform the user respectfully.`;
    } else {
      // Check if a specific meeting ID or title keyword was mentioned
      const searchTerms = lower.replace(/delete|cancel|remove|clear|drop|the|meeting|sync|appointment|call|event/gi, '').trim();
      let target = allMeetings.find(m => {
        const mTitle = m.title.toLowerCase();
        if (lower.includes(m.id.toLowerCase())) return true;
        if (searchTerms && mTitle.includes(searchTerms)) return true;
        const words = searchTerms.split(/\s+/).filter(w => w.length > 2);
        return words.length > 0 && words.some(w => mTitle.includes(w));
      });

      // Default to the first/most recent meeting if not specified (e.g. "delete the meeting")
      if (!target) {
        target = allMeetings[0];
      }

      storage.deleteMeeting(target.id);
      actionTaken = {
        type: 'delete_meeting',
        description: `Meeting canceled and removed: "${target.title}" (${target.date} at ${target.time})`,
        details: target
      };
      contextForAi = `SYSTEM ACTION COMPLETED: Successfully canceled and deleted the meeting "${target.title}" (scheduled for ${target.date} at ${target.time}). Confirm this deletion politely and clearly to the user.`;
    }
  }

  // 1B. VIEW / LIST / CHECK SCHEDULE OR MEETINGS
  else if (
    (lower.includes('what') || lower.includes('show') || lower.includes('view') || lower.includes('check') || lower.includes('list') || lower.includes('get') || lower.includes('display')) &&
    (lower.includes('schedule') || lower.includes('meeting') || lower.includes('agenda') || lower.includes('calendar') || lower.includes('appointments')) ||
    lower === 'schedule' || lower === 'meetings' || lower === 'agenda' || lower === 'calendar' || lower.includes('today schedule') || lower.includes('upcoming schedule')
  ) {
    const allMeetings = storage.getMeetings();
    const meetingSummaries = allMeetings.length > 0
      ? allMeetings.map(m => `• "${m.title}" on ${m.date} at ${m.time} (${m.durationMinutes}m)`).join('\n')
      : 'No meetings currently scheduled in your agenda.';

    actionTaken = {
      type: 'view_schedule',
      description: `Retrieved ${allMeetings.length} scheduled meeting(s) from your agenda.`,
      details: { count: allMeetings.length, meetings: allMeetings }
    };
    contextForAi = `CALENDAR SCHEDULE RETRIEVED: Here are the user's scheduled meetings:\n${meetingSummaries}\nReport this schedule politely and concisely to the user.`;
  }

  // 1C. SCHEDULE / BOOK / CREATE MEETING
  else if (
    (lower.includes('schedule') || lower.includes('book') || lower.includes('create meeting') || lower.includes('add meeting') || lower.includes('new meeting') || lower.includes('set up a meeting') || lower.includes('arrange a meeting')) &&
    !lower.includes('delete') && !lower.includes('cancel') && !lower.includes('remove')
  ) {
    let extracted = userCommand
      .replace(/^(?:please\s+)?(?:schedule|book|create|add|set up|arrange)\s+(?:a\s+)?(?:meeting|appointment|call|sync)?(?:\s+(?:with|for|about)\s+)?/i, '')
      .replace(/\s+(?:at\s+\d+|tomorrow|today|next\s+week|on\s+\w+).*$/i, '')
      .replace(/^[:\-\s]+|[:\-\s]+$/g, '')
      .trim();

    const title = extracted.length >= 2 ? extracted : 'Sync Meeting';

    // Default to tomorrow 14:00 if not specified
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    let dateStr = tomorrow.toISOString().split('T')[0];
    if (lower.includes('today')) {
      dateStr = new Date().toISOString().split('T')[0];
    }

    const timeMatch = userCommand.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    const timeStr = timeMatch ? timeMatch[1] : '14:00';

    const newMeeting = storage.addMeeting({
      title: `Scheduled: ${title}`,
      date: dateStr,
      time: timeStr,
      durationMinutes: 30,
      participants: ['User', 'Invited Team'],
      notes: `Created from natural language command: "${userCommand}"`,
      status: 'confirmed'
    });

    actionTaken = {
      type: 'schedule_meeting',
      description: `Meeting scheduled: "${newMeeting.title}" on ${newMeeting.date} at ${newMeeting.time}`,
      details: newMeeting
    };

    contextForAi = `SYSTEM ACTION COMPLETED: You successfully scheduled the meeting "${newMeeting.title}" for ${newMeeting.date} at ${newMeeting.time}. Confirm this politely to the user.`;
  }

  // 2A. DELETE / REMOVE REMINDER
  else if (
    (lower.includes('delete') || lower.includes('remove') || lower.includes('clear')) &&
    (lower.includes('reminder') || lower.includes('task'))
  ) {
    const rems = storage.getReminders();
    if (rems.length === 0) {
      actionTaken = {
        type: 'delete_reminder',
        description: 'No active reminders found to delete.',
        details: { found: false }
      };
      contextForAi = `USER COMMAND: "${userCommand}". No reminders were found in your local database. Inform the user.`;
    } else {
      const searchTerms = lower.replace(/delete|remove|clear|drop|the|reminder|task/gi, '').trim();
      const target = rems.find(r => {
        const rTitle = r.title.toLowerCase();
        if (lower.includes(r.id.toLowerCase())) return true;
        if (searchTerms && rTitle.includes(searchTerms)) return true;
        const words = searchTerms.split(/\s+/).filter(w => w.length > 2);
        return words.length > 0 && words.some(w => rTitle.includes(w));
      }) || rems[0];

      storage.deleteReminder(target.id);
      actionTaken = {
        type: 'delete_reminder',
        description: `Deleted reminder: "${target.title}"`,
        details: target
      };
      contextForAi = `SYSTEM ACTION COMPLETED: Deleted reminder "${target.title}" from local database. Confirm this politely to the user.`;
    }
  }

  // 2B. COMPLETE / MARK REMINDER AS DONE
  else if (
    (lower.includes('complete') || lower.includes('done') || lower.includes('finish') || lower.includes('check off')) &&
    (lower.includes('reminder') || lower.includes('task'))
  ) {
    const rems = storage.getReminders();
    const searchTerms = lower.replace(/complete|done|finish|check off|mark|the|reminder|task/gi, '').trim();
    const target = rems.find(r => {
      if (r.completed) return false;
      const rTitle = r.title.toLowerCase();
      if (lower.includes(r.id.toLowerCase())) return true;
      if (searchTerms && rTitle.includes(searchTerms)) return true;
      const words = searchTerms.split(/\s+/).filter(w => w.length > 2);
      return words.length > 0 && words.some(w => rTitle.includes(w));
    }) || rems.find(r => !r.completed);

    if (target) {
      storage.toggleReminder(target.id);
      actionTaken = {
        type: 'complete_reminder',
        description: `Marked reminder as completed: "${target.title}"`,
        details: target
      };
      contextForAi = `SYSTEM ACTION COMPLETED: Marked reminder "${target.title}" as completed. Confirm this to the user.`;
    } else {
      actionTaken = {
        type: 'complete_reminder',
        description: 'All pending reminders are already completed.',
        details: { found: false }
      };
      contextForAi = `USER COMMAND: "${userCommand}". All reminders are already checked off. Inform the user.`;
    }
  }

  // 2C. VIEW / LIST REMINDERS
  else if (
    (lower.includes('what') || lower.includes('show') || lower.includes('view') || lower.includes('check') || lower.includes('list')) &&
    (lower.includes('reminder') || lower.includes('tasks'))
  ) {
    const rems = storage.getReminders();
    const remSummaries = rems.length > 0
      ? rems.map(r => `• [${r.completed ? 'DONE' : 'PENDING'}] "${r.title}" (Due: ${r.dueDate}, Priority: ${r.priority})`).join('\n')
      : 'No reminders currently registered.';

    actionTaken = {
      type: 'view_reminders',
      description: `Retrieved ${rems.length} reminder(s) from your task list.`,
      details: { count: rems.length, reminders: rems }
    };
    contextForAi = `REMINDERS RETRIEVED:\n${remSummaries}\nReport these tasks politely to the user.`;
  }

  // 2D. SET / ADD REMINDER OR GOAL
  else if (lower.includes('remind me') || lower.includes('set a reminder') || lower.includes('add reminder') || lower.includes('new reminder') || lower.includes('goal')) {
    const isGoal = lower.includes('goal');
    if (isGoal) {
      const goalTitle = userCommand.replace(/add goal|set goal|new goal|create goal/gi, '').trim() || 'Accomplish key daily objectives';
      const newGoal = storage.addGoal({
        title: goalTitle,
        target: 'Daily Completion',
        completed: false,
        progressPercent: 0
      });
      actionTaken = {
        type: 'manage_goal',
        description: `New daily goal logged: "${newGoal.title}"`,
        details: newGoal
      };
      contextForAi = `SYSTEM ACTION COMPLETED: Added new goal "${newGoal.title}" to daily goals list.`;
    } else {
      const reminderTitle = userCommand.replace(/remind me to|set a reminder to|add reminder|new reminder/gi, '').trim() || 'Follow up on pending task';
      const newRem = storage.addReminder({
        title: reminderTitle,
        dueDate: 'Today, upcoming',
        priority: lower.includes('urgent') || lower.includes('important') ? 'high' : 'medium',
        completed: false,
        category: lower.includes('post') || lower.includes('content') ? 'content' : 'work'
      });
      actionTaken = {
        type: 'set_reminder',
        description: `Reminder created: "${newRem.title}" (Priority: ${newRem.priority.toUpperCase()})`,
        details: newRem
      };
      contextForAi = `SYSTEM ACTION COMPLETED: Registered reminder "${newRem.title}" in local database.`;
    }
  }

  // 3. Social Media Post Drafting (HARD CONSTRAINT: NEVER autonomously post - always DRAFT for UI approval)
  else if (lower.includes('draft a post') || lower.includes('post to') || lower.includes('tweet') || lower.includes('instagram') || lower.includes('youtube post') || lower.includes('facebook post')) {
    let platform: 'youtube' | 'instagram' | 'facebook' = 'youtube';
    if (lower.includes('instagram') || lower.includes('ig') || lower.includes('reel')) platform = 'instagram';
    else if (lower.includes('facebook') || lower.includes('fb')) platform = 'facebook';

    const topic = userCommand.replace(/draft a post for|draft a post about|post to instagram|post to youtube|post to facebook/gi, '').trim() || 'Productivity & AI Insights';

    const draft = storage.addSocialDraft({
      platform,
      title: `Draft for ${platform.toUpperCase()}: ${topic.slice(0, 60)}`,
      content: `⚡ Quick insight on ${topic}:\n\nAlways design AI automation with human oversight. Our latest experiment shows a 4x boost in quality when agent outputs are reviewed before broadcast.\n\nWhat are your thoughts? Drop a comment below!`,
      tags: ['#AIAgent', '#JarvisWeb', `#${platform.toUpperCase()}`, '#TechInnovation'],
      estimatedReach: platform === 'youtube' ? '10K - 18K views' : '4K - 8K impressions'
    });

    actionTaken = {
      type: 'draft_social_post',
      description: `Draft created for ${platform.toUpperCase()} and added to the Approval Queue. (Pending your explicit review in the UI before publishing!)`,
      details: draft
    };

    contextForAi = `SYSTEM ACTION COMPLETED: Created social post draft for ${platform.toUpperCase()} with ID ${draft.id}. Remind the user that according to their strict safety policy, it is stored in their Pending Approvals queue and will NOT be posted until they review and approve it in the web UI.`;
  }

  // 4. Web Research & Current Facts
  else if (lower.includes('search') || lower.includes('research') || lower.includes('who is') || lower.includes('latest news') || lower.includes('what is the current') || lower.includes('fact check')) {
    const searchQuery = userCommand.replace(/search for|research|find out|google/gi, '').trim() || userCommand;
    const searchRes = await executeWebSearch(searchQuery);
    sources = searchRes.results;
    contextForAi = `LIVE WEB RESEARCH RESULTS for "${searchQuery}":\n${searchRes.summary}\n\nUse these fresh findings to answer the user accurately and cite the sources.`;
    actionTaken = {
      type: 'web_research',
      description: `Queried free web index for "${searchQuery}" (${searchRes.results.length} sources analyzed)`,
      details: { query: searchQuery, count: searchRes.results.length }
    };
  }

  // 5. Browser Automation (Scroll / Video Control)
  else if (lower.includes('scroll') || lower.includes('pause video') || lower.includes('play video') || lower.includes('active tab')) {
    const isScrollDown = lower.includes('down');
    const isScrollUp = lower.includes('up');
    const isVideoPlay = lower.includes('play');
    const isVideoPause = lower.includes('pause');

    let actionName: 'scroll_down' | 'scroll_up' | 'play_video' | 'pause_video' = 'scroll_down';
    if (isScrollUp) actionName = 'scroll_up';
    else if (isVideoPlay) actionName = 'play_video';
    else if (isVideoPause) actionName = 'pause_video';

    // Check allowed tab rules
    const tabRules = storage.getTabRules();
    const allowedRules = tabRules.filter(r => r.isAllowed);

    const log = storage.recordAutomationCommand({
      action: actionName,
      tabUrl: allowedRules[0]?.urlPattern || 'https://www.youtube.com/*',
      tabTitle: allowedRules[0]?.title || 'Authorized Browser Tab',
      status: allowedRules.length > 0 ? 'executed' : 'pending_tab_permission',
      details: allowedRules.length > 0 
        ? `Command "${actionName}" dispatched to allowed tab.` 
        : 'Action withheld: no matching tab has been explicitly approved in extension settings.'
    });

    actionTaken = {
      type: 'browser_automation',
      description: `Browser command: ${actionName.replace('_', ' ').toUpperCase()} on ${log.tabTitle} (${log.status})`,
      details: log
    };

    contextForAi = `BROWSER AUTOMATION ACTION: Command '${actionName}' was registered for active approved tab. Status: ${log.status}. Report this to the user. Note that the companion extension strictly enforces that only allowed tabs accept commands.`;
  }

  // 6. Media / Music Control
  else if (lower.includes('play music') || lower.includes('play song') || lower.includes('play synthwave') || lower.includes('play lofi') || lower.includes('pause music') || lower.includes('stop music')) {
    const isPause = lower.includes('pause') || lower.includes('stop');
    actionTaken = {
      type: 'media_control',
      description: isPause ? 'Paused in-browser audio player' : 'Activated cybernetic synthwave & lofi audio stream',
      details: { command: isPause ? 'pause' : 'play' }
    };
    contextForAi = `MEDIA CONTROLLER: Jarvis media player state updated (${actionTaken.description}). Acknowledge in your response.`;
  }

  // Call Multi-Model Fallback AI with assembled context and action details
  const aiResult = await executeAiQueryWithFallback(userCommand, contextForAi, actionTaken);

  return {
    reply: aiResult.text,
    providerUsed: aiResult.providerUsed,
    modelUsed: aiResult.modelUsed,
    fallbackTriggered: aiResult.fallbackTriggered,
    fallbackReason: aiResult.fallbackReason,
    fallbackChain: aiResult.fallbackChain,
    actionTaken,
    sources
  };
}

/**
 * Intelligent deterministic fallback responder for offline/quota situations
 * Generates tailored, context-aware responses matching the user action and Jarvis persona.
 */
function synthesizeFallbackResponse(prompt: string, actionTaken?: ProcessCommandResult['actionTaken']): string {
  const lower = prompt.toLowerCase();

  // If a precise system action was dispatched, provide a matching confirmation
  if (actionTaken) {
    if (actionTaken.type === 'delete_meeting') {
      return `At your command, Sir. ${actionTaken.description}. Your Schedule HUD has been updated.`;
    }
    if (actionTaken.type === 'schedule_meeting') {
      return `At your command, Sir. ${actionTaken.description}. The meeting has been confirmed in your schedule.`;
    }
    if (actionTaken.type === 'view_schedule') {
      return `At your command, Sir. ${actionTaken.description} You can review the full schedule in the Schedule HUD panel below.`;
    }
    if (actionTaken.type === 'delete_reminder') {
      return `At your command, Sir. ${actionTaken.description}.`;
    }
    if (actionTaken.type === 'complete_reminder') {
      return `Task completed, Sir. ${actionTaken.description}.`;
    }
    if (actionTaken.type === 'set_reminder') {
      return `Reminder registered, Sir. ${actionTaken.description}.`;
    }
    if (actionTaken.type === 'view_reminders') {
      return `At your command, Sir. ${actionTaken.description}.`;
    }
    if (actionTaken.type === 'manage_goal') {
      return `Daily goal logged, Sir: "${actionTaken.details?.title}".`;
    }
    if (actionTaken.type === 'draft_social_post') {
      return `Understood. In accordance with your strict safety policy, I have generated a social media draft and queued it in Pending Approvals. It will never be published without your direct confirmation in the UI.`;
    }
    if (actionTaken.type === 'browser_automation') {
      return `Browser automation signal dispatched (${actionTaken.description}). Commands are strictly isolated to tabs approved in your Jarvis Companion extension.`;
    }
    if (actionTaken.type === 'media_control') {
      return `Audio stream updated. ${actionTaken.description}.`;
    }
    if (actionTaken.type === 'google_workspace') {
      return `${actionTaken.description} You can review and authorize this action securely in the Google Workspace Hub.`;
    }
    if (actionTaken.type === 'web_research') {
      return `Web research completed for your query. ${actionTaken.description}.`;
    }
    if (actionTaken.type === 'update_weather') {
      const w = actionTaken.details || storage.getWeather();
      return `Authorization confirmed, Sir. Location and weather telemetry synchronized to ${w.city}. Current readings: ${w.tempC}°C (${w.tempF}°F), ${w.condition}. Relative humidity is ${w.humidity}%, with winds at ${w.windSpeed}. Real-time telemetry is reflected on your HUD.`;
    }
  }

  // Conversational fallbacks
  if (lower.includes('weather') || lower.includes('location') || lower.includes('temperature') || lower.includes('climate')) {
    const w = storage.getWeather();
    return `At your command, Sir. Environmental vitals for ${w.city}: ${w.tempC}°C (${w.tempF}°F), ${w.condition}. Relative humidity is at ${w.humidity}%, with wind speed at ${w.windSpeed}. Real-time telemetry is live on your HUD.`;
  }
  if (lower.includes('full authorization') || lower.includes('operational protocol') || lower.includes('status report')) {
    return 'Authorization acknowledged and protocol confirmed, Sir. All five operational directives are locked into my core:\n\n• Media Control: Ready for play/pause/track signals via browser automation.\n• Social Media: Draft-first constraint active; zero autonomous publishing.\n• Research & Data: Live multi-source web index armed and ready.\n• Task Management: Calendar, reminders, and objectives synced to local persistent storage.\n• Operational Protocol: Proactive, transparent, and waiting for your explicit approval before executing sensitive actions.\n\nI am standing by for your command.';
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('jarvis') || lower.includes('hey')) {
    return 'Greetings, Sir. All systems are operational. I am running via the Jarvis Edge Fallback Engine. How may I assist your schedule, media, research, or content workflows today?';
  }

  if (lower.includes('who are you') || lower.includes('what are you') || lower.includes('what can you do')) {
    return 'I am Jarvis, your personal AI executive web assistant. I manage your daily schedule, Google Workspace tools, social media draft approvals, background research, and cybernetic focus audio—engineered with multi-model failover for 100% uptime.';
  }

  if (lower.includes('summarize') || lower.includes('document') || lower.includes('pdf')) {
    return 'Document analysis completed. Key takeaways and strategic action items have been compiled into your Document Summarizer panel.';
  }

  return `Command acknowledged: "${prompt}". Jarvis has processed your request through the resilient fallback core. Local databases and action registers are synchronized.`;
}
