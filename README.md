# Jarvis AI Assistant ⚡

> Futuristic AI Web Agent powered by Multi-Model Free-Tier Fallbacks, Hermes AI Web Scraping & Deep Research, Voice Synthesis, Social Media Draft Gates, and Browser Automation.

---

## 📋 Table of Contents

- [System Overview](#-system-overview)
- [Prerequisites](#-prerequisites)
- [Quick Start (All Commands)](#-quick-start-all-commands)
- [Environment Configuration](#-environment-configuration)
- [Available Scripts](#-available-scripts)
- [Running on Another Computer (Step-by-Step)](#-running-on-another-computer-step-by-step)
- [Architecture & Directory Structure](#-architecture--directory-structure)
- [Key Subsystems](#-key-subsystems)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🚀 System Overview

Jarvis is a full-stack, enterprise-grade AI executive assistant built with:
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide Icons
- **Backend**: Node.js, Express, Vite middleware integration, esbuild bundler
- **AI Engine Cascade**: Google Gemini 3.8 Flash → Gemini 3.1 Flash-Lite → Groq LLaMA 3.3 → OpenRouter Free Models → Jarvis Autonomous Local Fallback
- **Hermes AI Engine**: Nous Research Hermes-3 Agent for autonomous live URL web scraping, DOM parsing, clean Markdown conversion, and deep multi-source research
- **Human-in-the-Loop Content Gate**: Social media drafting engine (YouTube, Instagram, Facebook) requiring manual user approval before publishing
- **Atmospheric Telemetry**: Live GPS/Open-Meteo weather integration
- **Voice Synthesis & Recognition**: Web Speech API audio synthesis with proactive diagnostic logging

---

## 💻 Prerequisites

Ensure you have the following installed on your machine:

1. **Node.js**: `v18.0.0` or higher (Recommended: `v20.x` or `v22.x LTS`)
   - Check version:
     ```bash
     node -v
     ```
2. **npm**: `v9.0.0` or higher
   - Check version:
     ```bash
     npm -v
     ```
3. **Git**: (Optional, for cloning repository)
   - Check version:
     ```bash
     git -v
     ```

---

## ⚡ Quick Start (All Commands)

Run these commands in your terminal to get Jarvis running locally:

```bash
# 1. Clone or navigate to the project directory
cd jarvis-ai-assistant

# 2. Install all dependencies
npm install

# 3. Create your environment file from the template
cp .env.example .env

# 4. (Optional) Edit .env with your free API keys (or run with zero-cost fallback)
# nano .env   OR   notepad .env

# 5. Launch development server (Server + Client on port 3000)
npm run dev
```

Once running, open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Environment Configuration

Create a `.env` file in the root directory. You can copy the provided `.env.example`:

```bash
cp .env.example .env
```

### Supported Variables in `.env`:

```env
# 1. Google Gemini API Key (Primary Core)
# Get a free API key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="your_gemini_api_key_here"

# 2. Groq Cloud API Key (Fast Failover Tier - Optional)
# Get a free key at: https://console.groq.com/keys
GROQ_API_KEY=""

# 3. OpenRouter API Key (Hermes 3 & Free Models - Optional)
# Get a free key at: https://openrouter.ai/keys
OPENROUTER_API_KEY=""

# 4. App URL (Optional for local development)
APP_URL="http://localhost:3000"
```

> **Note**: If no API keys are configured, Jarvis will seamlessly engage its **Jarvis Edge Autonomous Rule-Based Fallback** engine. The system never crashes or goes offline.

---

## 🛠️ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the unified Express + Vite development server on `http://localhost:3000` with TypeScript type-stripping via `tsx`. |
| `npm run build` | Compiles the React client with Vite to `dist/` and bundles the Express backend with `esbuild` into a self-contained `dist/server.cjs`. |
| `npm run start` | Boots the compiled production server (`node dist/server.cjs`). |
| `npm run lint` | Runs TypeScript static verification without emitting code (`tsc --noEmit`). |
| `npm run clean` | Removes `dist/` directory and temporary build artifacts. |
| `npm run preview` | Previews the Vite static build (standalone). |

---

## 📦 Running on Another Computer (Step-by-Step)

Follow these exact steps when copying or setting up this codebase on any Windows, macOS, or Linux machine:

### Step 1: Transfer or Clone the Project
Transfer the project folder to the destination computer, or clone it using git:
```bash
git clone <your-repository-url>
cd <project-folder>
```

### Step 2: Clean Old Modules (If copied directly via USB or ZIP)
If you copied the project including `node_modules` from an OS with a different architecture:
```bash
# Delete pre-existing node_modules and package-lock to avoid native binary mismatches
rm -rf node_modules package-lock.json   # On macOS/Linux
# OR on Windows PowerShell:
# Remove-Item -Recurse -Force node_modules, package-lock.json
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Setup `.env` Configuration
```bash
cp .env.example .env
```
Open `.env` in any text editor and add your `GEMINI_API_KEY` (or leave blank to test the autonomous failover).

### Step 5: Test TypeScript Compilation
Verify that all types and modules resolve cleanly:
```bash
npm run lint
```
*(Should output `tsc --noEmit` with 0 errors).*

### Step 6: Start the Server

#### Option A: Development Mode (Recommended for working on code)
```bash
npm run dev
```
- Open `http://localhost:3000`
- Supports instant code reloads and hot updates.

#### Option B: Production Build (Recommended for continuous deployment)
```bash
# Build both frontend and backend
npm run build

# Start the optimized bundle
npm run start
```

---

## 📂 Architecture & Directory Structure

```text
├── index.html                   # HTML entry point with metadata
├── package.json                 # Project manifest, dependencies, and build scripts
├── server.ts                    # Express backend entry point + Vite middleware
├── metadata.json                # AI Studio application metadata & frame permissions
├── vite.config.ts               # Vite configuration with Tailwind CSS v4 plugin
├── .env.example                 # Environment variables specification
│
├── server/                      # Server-side modules (Node.js / Express)
│   ├── ai-router.ts             # Multi-model cascade routing (Gemini, Groq, OpenRouter, Edge)
│   ├── hermes-research.ts       # Hermes AI (Nous Research) web scraper & deep research engine
│   ├── web-search.ts            # Live web search scraper & news feed aggregator
│   ├── weather-service.ts       # Open-Meteo atmospheric telemetry and GPS geocoding
│   ├── extension-bundle.ts      # Chrome Extension ZIP bundle generator
│   └── storage.ts               # In-memory persistence & state manager
│
├── src/                         # Client-side React 19 application
│   ├── main.tsx                 # React DOM mount entry
│   ├── App.tsx                  # Main Jarvis HUD interface & command input loop
│   ├── types.ts                 # Global TypeScript interfaces & data contracts
│   ├── index.css                # Tailwind CSS v4 directives
│   │
│   ├── components/              # Extracted modular UI components
│   │   ├── HeaderHUD.tsx        # System vitals, atmospheric telemetry, GPS & model status
│   │   ├── WebResearchHub.tsx   # Hermes AI scraper, deep research, and viral trend outliers
│   │   ├── SocialDraftCard.tsx  # Human-in-the-loop social approval workflow cards
│   │   ├── WorkspaceIntegration.tsx # Google Workspace sync & mock integration suite
│   │   ├── ExtensionInstaller.tsx   # Manifest V3 browser automation extension installer
│   │   ├── DocumentSummarizer.tsx   # PDF/PPTX/TXT document executive summary engine
│   │   ├── AmbientMediaPlayer.tsx   # Synthwave/Lofi audio player with Web Audio visualizer
│   │   └── TechnicalMentorModal.tsx # Architectural walkthrough & failover demonstration guide
│   │
│   └── utils/
│       └── speech.ts            # Web Speech API manager with diagnostic checks
```

---

## 🧠 Key Subsystems & How to Test

### 1. Hermes AI Web Scraping & Deep Research
- **Via Chat**: Type or speak:
  - *"Hermes scrape https://news.ycombinator.com"*
  - *"Hermes research latest breakthroughs in agentic AI 2026"*
  - *"Use hermes ai for web scraping or doing the research"*
- **Via Web Research Hub**: Navigate to the **Hermes AI (Scraper & Research)** tab in the bottom right panel:
  - **Live URL Web Scraper**: Enter any URL (e.g., `https://github.com/trending`) and click **Scrape with Hermes** to extract structured summaries, entity tags, quantifiable statistics, and outbound links.
  - **Deep Multi-Source Research**: Enter an inquiry and click **Run Hermes Research** to crawl real-time web sources and synthesize an executive brief.

### 2. Multi-Model 429 Failover Simulation
- Click the **"Simulate 429 Failover"** button in the top HUD.
- The system will immediately simulate Google Gemini primary quota exhaustion and demonstrate zero-interruption auto-failover to Groq, OpenRouter, or the Jarvis Edge reasoning engine.

### 3. Voice Synthesis & Microphone Recognition
- Click the **Mic** button in the lower command dock to activate speech recognition.
- Click the **Speaker** icon to toggle voice synthesis responses.
- If voice synthesis fails on a restricted browser, click **"Test Voice"** in the diagnostic banner to inspect Web Speech API and AudioContext permissions.

### 4. Manifest V3 Browser Automation Extension
- Click **"Browser Extension"** in the sidebar.
- Click **"Download Chrome Extension (.zip)"**.
- Unzip the downloaded file.
- In Google Chrome, go to `chrome://extensions`, enable **Developer mode**, click **"Load unpacked"**, and select the unzipped folder.

---

## ❓ Troubleshooting & FAQs

### Port 3000 is already in use
If another application is using port 3000:
- **On Linux/macOS**:
  ```bash
  lsof -i :3000
  kill -9 <PID>
  ```
- **On Windows (PowerShell)**:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
  ```

### Voice synthesis is silent
- Most modern browsers require an explicit user gesture (a mouse click) before allowing audio playback. Click any button on the interface before testing audio.
- Check that your browser has permissions allowed for Microphone and Sound for `localhost:3000`.

### `tsx: command not found` or build errors
Run a fresh install to ensure all dev dependencies are linked:
```bash
npm install
npm run lint
```

---

## 📜 License

MIT License — free to use, modify, and distribute.
