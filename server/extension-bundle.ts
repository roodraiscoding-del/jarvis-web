/**
 * Companion Browser Extension Bundle Generator
 * Manifest V3 compliant extension for safe, user-approved tab automation (scroll, play/pause video).
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
          name: 'Jarvis Companion - Safe Tab Controller',
          version: '1.0.0',
          description: 'Enables Jarvis to scroll pages and control media playback ONLY on user-approved tabs.',
          permissions: ['activeTab', 'scripting', 'storage'],
          host_permissions: ['<all_urls>'],
          action: {
            default_popup: 'popup.html',
            default_title: 'Jarvis Tab Authorization'
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
      description: 'Extension popup interface where user explicitly approves or revokes tab control',
      content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Jarvis Controller</title>
  <style>
    body {
      width: 320px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 16px;
      background: #090d16;
      color: #e2e8f0;
      box-sizing: border-box;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .arc {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid #06b6d4;
      box-shadow: 0 0 10px #06b6d4;
    }
    h2 { margin: 0; font-size: 16px; color: #38bdf8; }
    .status-box {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 14px;
    }
    .url-text {
      font-size: 11px;
      color: #94a3b8;
      word-break: break-all;
      margin-top: 4px;
    }
    .btn {
      width: 100%;
      padding: 10px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-allow {
      background: #0284c7;
      color: #ffffff;
    }
    .btn-allow:hover { background: #0369a1; }
    .btn-revoke {
      background: #dc2626;
      color: #ffffff;
    }
    .quick-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 12px;
    }
    .btn-action {
      background: #1e293b;
      color: #cbd5e1;
      padding: 8px;
      font-size: 12px;
      border: 1px solid #334155;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-action:hover { background: #334155; }
    .info {
      font-size: 11px;
      color: #64748b;
      margin-top: 14px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="arc"></div>
    <h2>Jarvis Safe Controller</h2>
  </div>

  <div class="status-box">
    <div style="font-size: 12px; font-weight: bold;">CURRENT ACTIVE TAB:</div>
    <div id="tabTitle" style="font-size: 13px; margin-top: 4px; color: #f1f5f9;">Loading tab...</div>
    <div id="tabUrl" class="url-text">...</div>
    <div id="permStatus" style="margin-top: 8px; font-size: 12px; font-weight: bold;">Checking permissions...</div>
  </div>

  <button id="toggleBtn" class="btn btn-allow">Allow Jarvis On This Tab</button>

  <div class="quick-actions" id="actionPanel" style="display: none;">
    <button class="btn-action" id="scrollDownBtn">Scroll Down</button>
    <button class="btn-action" id="scrollUpBtn">Scroll Up</button>
    <button class="btn-action" id="playPauseBtn">Play / Pause</button>
    <button class="btn-action" id="pingBtn">Sync with Web App</button>
  </div>

  <div class="info">
    <strong>Security Guarantee:</strong> Jarvis cannot trigger any browser actions on pages unless you explicitly toggle permission for that specific domain.
  </div>

  <script src="popup.js"></script>
</body>
</html>`
    },
    {
      filename: 'popup.js',
      description: 'Popup script that communicates tab permissions to chrome.storage and content script',
      content: `// Jarvis Extension Popup Controller
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  const urlObj = new URL(tab.url);
  const domain = urlObj.hostname;

  document.getElementById('tabTitle').innerText = tab.title || domain;
  document.getElementById('tabUrl').innerText = tab.url;

  const toggleBtn = document.getElementById('toggleBtn');
  const permStatus = document.getElementById('permStatus');
  const actionPanel = document.getElementById('actionPanel');

  // Check storage for domain permission
  const data = await chrome.storage.local.get(['allowedDomains']);
  const allowed = data.allowedDomains || [];
  const isAllowed = allowed.includes(domain);

  function updateUi(allowedState) {
    if (allowedState) {
      permStatus.innerHTML = '<span style="color: #4ade80;">✓ AUTHORIZED FOR JARVIS</span>';
      toggleBtn.innerText = 'Revoke Jarvis Permission';
      toggleBtn.className = 'btn btn-revoke';
      actionPanel.style.display = 'grid';
    } else {
      permStatus.innerHTML = '<span style="color: #f87171;">✕ ACCESS RESTRICTED</span>';
      toggleBtn.innerText = 'Allow Jarvis On This Tab';
      toggleBtn.className = 'btn btn-allow';
      actionPanel.style.display = 'none';
    }
  }

  updateUi(isAllowed);

  toggleBtn.addEventListener('click', async () => {
    const store = await chrome.storage.local.get(['allowedDomains']);
    let domains = store.allowedDomains || [];
    if (domains.includes(domain)) {
      domains = domains.filter(d => d !== domain);
      await chrome.storage.local.set({ allowedDomains: domains });
      updateUi(false);
    } else {
      domains.push(domain);
      await chrome.storage.local.set({ allowedDomains: domains });
      updateUi(true);
    }
  });

  document.getElementById('scrollDownBtn')?.addEventListener('click', () => {
    chrome.tabs.sendMessage(tab.id, { action: 'scroll_down' });
  });

  document.getElementById('scrollUpBtn')?.addEventListener('click', () => {
    chrome.tabs.sendMessage(tab.id, { action: 'scroll_up' });
  });

  document.getElementById('playPauseBtn')?.addEventListener('click', () => {
    chrome.tabs.sendMessage(tab.id, { action: 'play_pause_video' });
  });
});`
    },
    {
      filename: 'content.js',
      description: 'Content script injected on allowed pages to execute scroll and HTML5 media controls',
      content: `// Jarvis Content Script - Executes ONLY if domain is allowed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const currentDomain = window.location.hostname;

  chrome.storage.local.get(['allowedDomains'], (res) => {
    const allowed = res.allowedDomains || [];
    if (!allowed.includes(currentDomain)) {
      console.warn('[Jarvis Companion] Action rejected: domain is not permitted by user.', currentDomain);
      sendResponse({ success: false, reason: 'Tab not authorized in Jarvis popup' });
      return;
    }

    if (request.action === 'scroll_down') {
      window.scrollBy({ top: 500, behavior: 'smooth' });
      showFeedback('Jarvis: Scrolled Down');
      sendResponse({ success: true });
    } else if (request.action === 'scroll_up') {
      window.scrollBy({ top: -500, behavior: 'smooth' });
      showFeedback('Jarvis: Scrolled Up');
      sendResponse({ success: true });
    } else if (request.action === 'play_pause_video') {
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
    badge.style.padding = '8px 14px';
    badge.style.borderRadius = '9999px';
    badge.style.fontWeight = 'bold';
    badge.style.fontSize = '12px';
    badge.style.fontFamily = 'monospace';
    badge.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.6)';
    badge.style.zIndex = '9999999';
    badge.style.transition = 'opacity 0.3s';
    document.body.appendChild(badge);
  }
  badge.innerText = text;
  badge.style.opacity = '1';
  setTimeout(() => {
    if (badge) badge.style.opacity = '0';
  }, 2000);
}`
    },
    {
      filename: 'background.js',
      description: 'Background service worker for Jarvis web app bridge',
      content: `// Jarvis Service Worker
const JARVIS_WEB_APP = "${appBaseUrl}";

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Jarvis Companion] Extension installed successfully. Security policy: explicit tab opt-in only.');
});

// Periodic or event-driven polling can sync commands from the hosted Jarvis web app
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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
      description: 'Installation instructions for zero-coding users',
      content: `# Jarvis Companion Browser Extension Guide

## How to Install in 30 Seconds (No Coding Required!)
1. Click the **"Download Extension ZIP"** button inside the Jarvis web app.
2. Unzip the downloaded folder to your computer (e.g. into your Documents or Downloads folder).
3. Open your browser's extensions page:
   - **Chrome / Brave**: Go to \`chrome://extensions\`
   - **Edge**: Go to \`edge://extensions\`
4. Toggle **"Developer Mode"** in the top right corner.
5. Click **"Load unpacked"** and select the unzipped folder.
6. Done! The Jarvis arc icon will appear in your browser toolbar.

## Security & Safety Architecture
- **Zero Silent Actions**: The extension will refuse to execute any scroll or media commands until you click the Jarvis icon on that tab and toggle **"Allow Jarvis On This Tab"**.
- **No Private Data Scraped**: The extension only issues standard DOM window scrolls and video play/pause events.`
    }
  ];
}
