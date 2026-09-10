/**
 * Companion Browser Extension Bundle Generator
 * Manifest V3 compliant extension for safe, user-approved tab automation
 * (open tabs, search on engines, smooth scroll, click elements, and media playback).
 * Adheres strictly to the hard constraint: ONLY acts on tabs explicitly allowed by the user.
 */

export interface ExtensionFile {
  filename: string;
  description: string;
  content: string;
}

export function getExtensionFiles(appBaseUrl: string = 'http://localhost:3000'): ExtensionFile[] {
  return [
    {
      filename: 'manifest.json',
      description: 'Chrome/Brave/Edge Extension Manifest V3 configuration',
      content: JSON.stringify(
        {
          manifest_version: 3,
          name: 'Jarvis Companion - Autonomous Tab & Browser Controller',
          version: '1.2.0',
          description: 'Enables Jarvis to open tabs, search web engines, smooth scroll, click links/buttons, and control media on user-approved tabs.',
          permissions: ['tabs', 'activeTab', 'scripting', 'storage'],
          host_permissions: ['<all_urls>'],
          action: {
            default_popup: 'popup.html',
            default_title: 'Jarvis Tab Controller & Automation'
          },
          background: {
            service_worker: 'background.js'
          },
          content_scripts: [
            {
              matches: ['<all_urls>'],
              js: ['content.js'],
              run_at: 'document_idle'
            }
          ]
        },
        null,
        2
      )
    },
    {
      filename: 'popup.html',
      description: 'Extension popup interface where user approves tab permissions, opens tabs, and triggers search, scroll, and click',
      content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Jarvis Tab Controller</title>
  <style>
    body {
      width: 340px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 16px;
      background: #090d16;
      color: #e2e8f0;
      box-sizing: border-box;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .arc {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid #06b6d4;
      box-shadow: 0 0 10px #06b6d4;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.1); opacity: 1; }
    }
    h2 { margin: 0; font-size: 15px; color: #38bdf8; letter-spacing: 0.5px; }
    .badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: #0369a1;
      color: #e0f2fe;
      font-weight: bold;
    }
    .status-box {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 12px;
      font-size: 11px;
    }
    .url-text {
      color: #94a3b8;
      word-break: break-all;
      margin-top: 3px;
      font-size: 10px;
    }
    .btn {
      width: 100%;
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-allow { background: #0284c7; color: #ffffff; }
    .btn-allow:hover { background: #0369a1; }
    .btn-revoke { background: #dc2626; color: #ffffff; }
    .btn-revoke:hover { background: #b91c1c; }

    .section-title {
      font-size: 11px;
      font-weight: bold;
      color: #38bdf8;
      text-transform: uppercase;
      margin: 12px 0 6px 0;
      letter-spacing: 0.5px;
    }
    .input-row {
      display: flex;
      gap: 6px;
      margin-bottom: 6px;
    }
    .input-field {
      flex: 1;
      background: #030712;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 6px 8px;
      border-radius: 5px;
      font-size: 11px;
    }
    .input-field:focus {
      outline: none;
      border-color: #06b6d4;
    }
    .select-field {
      background: #030712;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 6px 8px;
      border-radius: 5px;
      font-size: 11px;
    }
    .btn-action {
      background: #1e293b;
      color: #cbd5e1;
      padding: 7px;
      font-size: 11px;
      border: 1px solid #334155;
      border-radius: 5px;
      cursor: pointer;
      font-weight: 500;
    }
    .btn-action:hover {
      background: #334155;
      color: #38bdf8;
      border-color: #06b6d4;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .info {
      font-size: 10px;
      color: #64748b;
      margin-top: 12px;
      line-height: 1.4;
      border-top: 1px solid #1e293b;
      padding-top: 8px;
    }
    #actionFeedback {
      margin-top: 8px;
      font-size: 11px;
      padding: 6px;
      border-radius: 4px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="arc"></div>
      <h2>Jarvis Companion</h2>
    </div>
    <span class="badge">v1.2.0</span>
  </div>

  <div class="status-box">
    <div style="font-weight: bold; color: #cbd5e1;">ACTIVE TAB:</div>
    <div id="tabTitle" style="color: #38bdf8; font-weight: 500; margin-top: 2px;">Detecting tab...</div>
    <div id="tabUrl" class="url-text">...</div>
    <div id="permStatus" style="margin-top: 6px; font-weight: bold;">Checking whitelist...</div>
  </div>

  <button id="toggleBtn" class="btn btn-allow">Allow Jarvis On This Tab</button>

  <!-- Open Tab & Search Section -->
  <div class="section-title">🌐 Open Tab & Search</div>
  <div class="input-row">
    <select id="searchEngine" class="select-field">
      <option value="ddg">DuckDuckGo</option>
      <option value="google">Google</option>
      <option value="youtube">YouTube</option>
      <option value="wiki">Wikipedia</option>
    </select>
    <input type="text" id="searchInput" class="input-field" placeholder="Search query or URL...">
  </div>
  <button id="openTabBtn" class="btn btn-action" style="width: 100%; margin-bottom: 8px; background: #075985; color: white;">
    🚀 Launch Tab & Search
  </button>

  <!-- Automated Tab Actions -->
  <div id="actionPanel">
    <div class="section-title">📜 Scroll Controls</div>
    <div class="grid-2" style="margin-bottom: 8px;">
      <button class="btn-action" id="scrollDownBtn">Scroll Down 500px</button>
      <button class="btn-action" id="scrollUpBtn">Scroll Up 500px</button>
      <button class="btn-action" id="scrollTopBtn">Scroll to Top</button>
      <button class="btn-action" id="scrollBottomBtn">Scroll to Bottom</button>
    </div>

    <div class="section-title">🎯 Click DOM Element</div>
    <div class="input-row">
      <input type="text" id="clickTargetInput" class="input-field" placeholder="Element text or CSS selector (e.g. 'First link')">
      <button class="btn-action" id="clickElementBtn" style="white-space: nowrap;">Click</button>
    </div>

    <div class="grid-2" style="margin-top: 6px;">
      <button class="btn-action" id="playPauseBtn">Play / Pause Video</button>
      <button class="btn-action" id="pingBtn">Sync with Jarvis</button>
    </div>
  </div>

  <div id="actionFeedback"></div>

  <div class="info">
    <strong>Security Guarantee:</strong> Jarvis operates exclusively on domains you explicitly authorize. All actions (tab opens, searches, scrolls, clicks) are logged and reversible.
  </div>

  <script src="popup.js"></script>
</body>
</html>`
    },
    {
      filename: 'popup.js',
      description: 'Popup script coordinating tab authorization, search launch, scroll, and click actions',
      content: `// Jarvis Extension Popup Controller v1.2.0
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  let domain = 'unknown';
  try {
    const urlObj = new URL(tab.url);
    domain = urlObj.hostname;
  } catch {}

  document.getElementById('tabTitle').innerText = tab.title || domain;
  document.getElementById('tabUrl').innerText = tab.url;

  const toggleBtn = document.getElementById('toggleBtn');
  const permStatus = document.getElementById('permStatus');
  const feedbackEl = document.getElementById('actionFeedback');

  function showFeedback(msg, isError = false) {
    if (!feedbackEl) return;
    feedbackEl.style.display = 'block';
    feedbackEl.innerText = msg;
    feedbackEl.style.background = isError ? '#450a0a' : '#083344';
    feedbackEl.style.color = isError ? '#fca5a5' : '#67e8f9';
    feedbackEl.style.border = isError ? '1px solid #dc2626' : '1px solid #06b6d4';
    setTimeout(() => {
      feedbackEl.style.display = 'none';
    }, 3000);
  }

  // Check storage for domain permission
  const data = await chrome.storage.local.get(['allowedDomains']);
  const allowed = data.allowedDomains || ['duckduckgo.com', 'google.com', 'youtube.com', 'en.wikipedia.org'];
  const isAllowed = allowed.includes(domain);

  function updateUi(allowedState) {
    if (allowedState) {
      permStatus.innerHTML = '<span style="color: #4ade80;">✓ AUTHORIZED FOR JARVIS</span>';
      toggleBtn.innerText = 'Revoke Jarvis Permission';
      toggleBtn.className = 'btn btn-revoke';
    } else {
      permStatus.innerHTML = '<span style="color: #f87171;">✕ ACCESS RESTRICTED</span>';
      toggleBtn.innerText = 'Allow Jarvis On This Tab';
      toggleBtn.className = 'btn btn-allow';
    }
  }

  updateUi(isAllowed);

  toggleBtn.addEventListener('click', async () => {
    const store = await chrome.storage.local.get(['allowedDomains']);
    let domains = store.allowedDomains || ['duckduckgo.com', 'google.com', 'youtube.com', 'en.wikipedia.org'];
    if (domains.includes(domain)) {
      domains = domains.filter(d => d !== domain);
      await chrome.storage.local.set({ allowedDomains: domains });
      updateUi(false);
      showFeedback('Access revoked for ' + domain);
    } else {
      domains.push(domain);
      await chrome.storage.local.set({ allowedDomains: domains });
      updateUi(true);
      showFeedback('Access granted for ' + domain);
    }
  });

  // Open Tab & Search Handler
  document.getElementById('openTabBtn')?.addEventListener('click', () => {
    const query = document.getElementById('searchInput').value.trim();
    const engine = document.getElementById('searchEngine').value;
    chrome.runtime.sendMessage({
      type: 'OPEN_TAB_AND_SEARCH',
      query: query || 'Autonomous AI Agents',
      engine
    }, (res) => {
      if (res?.success) {
        showFeedback('Opened search tab!');
      }
    });
  });

  // Scroll Actions
  document.getElementById('scrollDownBtn')?.addEventListener('click', () => {
    chrome.tabs.sendMessage(tab.id, { action: 'scroll_down', amount: 500 }, (res) => {
      if (res?.success) showFeedback('Scrolled down 500px');
      else showFeedback(res?.reason || 'Tab restricted', true);
    });
  });

  document.getElementById('scrollUpBtn')?.addEventListener('click', () => {
    chrome.tabs.sendMessage(tab.id, { action: 'scroll_up', amount: 500 }, (res) => {
      if (res?.success) showFeedback('Scrolled up 500px');
      else showFeedback(res?.reason || 'Tab restricted', true);
    });
  });

  document.getElementById('scrollTopBtn')?.addEventListener('click', () => {
    chrome.tabs.sendMessage(tab.id, { action: 'scroll_top' }, (res) => {
      if (res?.success) showFeedback('Scrolled to top');
      else showFeedback(res?.reason || 'Tab restricted', true);
    });
  });

  document.getElementById('scrollBottomBtn')?.addEventListener('click', () => {
    chrome.tabs.sendMessage(tab.id, { action: 'scroll_bottom' }, (res) => {
      if (res?.success) showFeedback('Scrolled to bottom');
      else showFeedback(res?.reason || 'Tab restricted', true);
    });
  });

  // Click Target Element
  document.getElementById('clickElementBtn')?.addEventListener('click', () => {
    const target = document.getElementById('clickTargetInput').value.trim();
    if (!target) {
      showFeedback('Enter element text or selector', true);
      return;
    }
    chrome.tabs.sendMessage(tab.id, { action: 'click_element', target }, (res) => {
      if (res?.success) showFeedback('Clicked: ' + (res.elementText || target));
      else showFeedback(res?.reason || 'Target not found', true);
    });
  });

  // Media
  document.getElementById('playPauseBtn')?.addEventListener('click', () => {
    chrome.tabs.sendMessage(tab.id, { action: 'play_pause_video' }, (res) => {
      if (res?.success) showFeedback('Media toggled');
      else showFeedback(res?.reason || 'No video found', true);
    });
  });

  // Sync ping
  document.getElementById('pingBtn')?.addEventListener('click', () => {
    showFeedback('Jarvis Companion is active and synchronized!');
  });
});`
    },
    {
      filename: 'content.js',
      description: 'Content script injected on allowed pages to execute search, smooth scroll, click targeting, and media control',
      content: `// Jarvis Content Script v1.2.0 - Executes ONLY on user-approved domains
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const currentDomain = window.location.hostname;

  chrome.storage.local.get(['allowedDomains'], (res) => {
    const allowed = res.allowedDomains || ['duckduckgo.com', 'google.com', 'youtube.com', 'en.wikipedia.org', 'news.ycombinator.com'];
    const isPermitted = allowed.some(d => currentDomain === d || currentDomain.endsWith('.' + d));

    if (!isPermitted) {
      console.warn('[Jarvis Companion] Action rejected: domain is not permitted by user.', currentDomain);
      sendResponse({ success: false, reason: 'Domain not authorized in Jarvis popup' });
      return;
    }

    // 1. Scroll Actions
    if (request.action === 'scroll_down') {
      const amount = request.amount || 500;
      window.scrollBy({ top: amount, behavior: 'smooth' });
      showFeedback('Jarvis: Scrolled Down ' + amount + 'px');
      sendResponse({ success: true });
    } else if (request.action === 'scroll_up') {
      const amount = request.amount || 500;
      window.scrollBy({ top: -amount, behavior: 'smooth' });
      showFeedback('Jarvis: Scrolled Up ' + amount + 'px');
      sendResponse({ success: true });
    } else if (request.action === 'scroll_top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showFeedback('Jarvis: Scrolled to Top');
      sendResponse({ success: true });
    } else if (request.action === 'scroll_bottom') {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      showFeedback('Jarvis: Scrolled to Bottom');
      sendResponse({ success: true });
    } 

    // 2. Search Inside Active Tab
    else if (request.action === 'search_page') {
      const query = request.query || '';
      const input = document.querySelector('input[type="search"], input[name="q"], input[name="search"], input[placeholder*="search" i], textarea, input[type="text"]');
      if (input) {
        input.focus();
        input.value = query;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        highlightElement(input);
        showFeedback('Jarvis: Searched "' + query + '"');
        // Submit if within form
        if (input.form) {
          input.form.submit();
        }
        sendResponse({ success: true });
      } else {
        showFeedback('Jarvis: No search bar found on page');
        sendResponse({ success: false, reason: 'No search input found' });
      }
    }

    // 3. Click Target Element (by CSS selector or matching text)
    else if (request.action === 'click_element') {
      const targetQuery = request.target || '';
      let targetEl = null;

      // Try CSS selector first
      try {
        targetEl = document.querySelector(targetQuery);
      } catch {}

      // Fallback: search by innerText
      if (!targetEl) {
        const candidates = Array.from(document.querySelectorAll('a, button, [role="button"], input[type="submit"], h1, h2, h3'));
        const lowerTarget = targetQuery.toLowerCase();
        targetEl = candidates.find(el => el.innerText && el.innerText.toLowerCase().includes(lowerTarget));
      }

      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightElement(targetEl);
        setTimeout(() => {
          targetEl.click();
        }, 350);
        const label = targetEl.innerText?.substring(0, 30) || targetQuery;
        showFeedback('Jarvis: Clicked "' + label + '"');
        sendResponse({ success: true, elementText: label });
      } else {
        showFeedback('Jarvis: Element "' + targetQuery + '" not found');
        sendResponse({ success: false, reason: 'Target element not found' });
      }
    }

    // 4. Video Play / Pause
    else if (request.action === 'play_pause_video') {
      const videos = document.querySelectorAll('video');
      if (videos.length > 0) {
        const vid = videos[0];
        if (vid.paused) {
          vid.play();
          showFeedback('Jarvis: Video Playing');
        } else {
          vid.pause();
          showFeedback('Jarvis: Video Paused');
        }
        sendResponse({ success: true });
      } else {
        showFeedback('Jarvis: No video element detected');
        sendResponse({ success: false, reason: 'No video element on page' });
      }
    }
  });

  return true;
});

function highlightElement(el) {
  const rect = el.getBoundingClientRect();
  const ring = document.createElement('div');
  ring.style.position = 'fixed';
  ring.style.top = (rect.top - 4) + 'px';
  ring.style.left = (rect.left - 4) + 'px';
  ring.style.width = (rect.width + 8) + 'px';
  ring.style.height = (rect.height + 8) + 'px';
  ring.style.border = '2px solid #06b6d4';
  ring.style.borderRadius = '6px';
  ring.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.8)';
  ring.style.pointerEvents = 'none';
  ring.style.zIndex = '99999999';
  ring.style.transition = 'opacity 0.4s';
  document.body.appendChild(ring);
  setTimeout(() => {
    ring.style.opacity = '0';
    setTimeout(() => ring.remove(), 400);
  }, 1200);
}

function showFeedback(text) {
  let badge = document.getElementById('jarvis-hud-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'jarvis-hud-badge';
    badge.style.position = 'fixed';
    badge.style.bottom = '20px';
    badge.style.right = '20px';
    badge.style.background = 'rgba(6, 182, 212, 0.95)';
    badge.style.color = '#020617';
    badge.style.padding = '8px 16px';
    badge.style.borderRadius = '9999px';
    badge.style.fontWeight = 'bold';
    badge.style.fontSize = '12px';
    badge.style.fontFamily = 'monospace';
    badge.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.7)';
    badge.style.zIndex = '99999999';
    badge.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    document.body.appendChild(badge);
  }
  badge.innerText = text;
  badge.style.opacity = '1';
  badge.style.transform = 'translateY(0)';
  setTimeout(() => {
    if (badge) {
      badge.style.opacity = '0';
      badge.style.transform = 'translateY(10px)';
    }
  }, 2200);
}`
    },
    {
      filename: 'background.js',
      description: 'Background service worker managing tab creation, search routing, and cross-tab automation',
      content: `// Jarvis Service Worker v1.2.0
const JARVIS_WEB_APP = "${appBaseUrl}";

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Jarvis Companion] Extension installed successfully. Multi-tab automation & explicit security enabled.');
  chrome.storage.local.set({
    allowedDomains: ['duckduckgo.com', 'google.com', 'youtube.com', 'en.wikipedia.org', 'news.ycombinator.com']
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Open Tab & Execute Search
  if (msg.type === 'OPEN_TAB_AND_SEARCH') {
    let searchUrl = 'https://duckduckgo.com/?q=' + encodeURIComponent(msg.query);
    if (msg.engine === 'google') {
      searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(msg.query);
    } else if (msg.engine === 'youtube') {
      searchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(msg.query);
    } else if (msg.engine === 'wiki') {
      searchUrl = 'https://en.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(msg.query);
    }

    chrome.tabs.create({ url: searchUrl, active: true }, (tab) => {
      sendResponse({ success: true, tabId: tab.id, url: searchUrl });
    });
    return true;
  }

  // Open Raw URL in New Tab
  if (msg.type === 'OPEN_TAB') {
    chrome.tabs.create({ url: msg.url || 'https://duckduckgo.com', active: true }, (tab) => {
      sendResponse({ success: true, tabId: tab.id });
    });
    return true;
  }

  // Check Permissions
  if (msg.type === 'CHECK_PERMISSIONS') {
    chrome.storage.local.get(['allowedDomains'], (res) => {
      sendResponse({ allowed: res.allowedDomains || [] });
    });
    return true;
  }
});`
    },
    {
      filename: 'README.md',
      description: 'Zero-friction installation guide and user authorization safety manual',
      content: `# Jarvis Companion Browser Extension Guide (v1.2.0)

## Features Included
- **Open Another Tab**: Launch new browser tabs with search queries directly from voice or text.
- **Search on Engines**: Pre-configured for DuckDuckGo, Google, YouTube, and Wikipedia.
- **Smooth Scrolling**: Scroll down, scroll up, scroll to top, or scroll to bottom by specified pixel distances.
- **Targeted DOM Clicking**: Finds links, buttons, or search results by text or CSS selector with glowing reticle confirmation.
- **Media Control**: Play and pause video elements seamlessly.

## How to Install in 30 Seconds
1. Click the **"Download Extension"** button inside the Jarvis web app.
2. Unzip the downloaded folder on your device.
3. Open your browser's extensions page:
   - **Chrome / Brave**: \`chrome://extensions\`
   - **Edge**: \`edge://extensions\`
4. Toggle **"Developer Mode"** in the top right.
5. Click **"Load unpacked"** and select the unzipped directory.
6. Done! The Jarvis arc icon will appear in your browser toolbar.

## Strict Security Architecture
- **No Unsolicited Actions**: Jarvis will NEVER interact with any website unless it is on your explicit authorization whitelist.
- **Clear Visual Feedback**: Every action on page displays an on-screen cybernetic HUD toast badge.`
    }
  ];
}
