"""
Configuration settings for the Jarvis Local Agent.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Local HTTP Bridge Server configuration
BRIDGE_HOST = os.getenv("JARVIS_BRIDGE_HOST", "127.0.0.1")
BRIDGE_PORT = int(os.getenv("JARVIS_BRIDGE_PORT", "5000"))

# Browser Automation (Playwright) settings
# Set HEADLESS=False so the user can watch YouTube videos on their screen
BROWSER_HEADLESS = os.getenv("JARVIS_HEADLESS", "false").lower() == "true"
BROWSER_TYPE = os.getenv("JARVIS_BROWSER", "chromium")  # chromium, firefox, or webkit
USER_DATA_DIR = os.getenv("JARVIS_USER_DATA_DIR", str(BASE_DIR / "browser_profile"))

# YouTube Default Settings
YOUTUBE_BASE_URL = "https://www.youtube.com"
DEFAULT_VOLUME = 80  # 0 to 100

# Voice settings
VOICE_TRIGGER_WORD = "jarvis"
VOICE_RATE = 185
VOICE_VOLUME = 0.95
