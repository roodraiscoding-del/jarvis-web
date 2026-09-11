"""
Command Parser & Orchestrator Module for Jarvis Local Agent.
Parses natural language commands (from text or voice) and dispatches them
to the appropriate controller (YouTubeController or DesktopController).
"""

import re
import logging
from typing import Dict, Any, Optional

from .youtube_controller import YouTubeController
from .desktop_controller import DesktopController
from .voice_engine import VoiceEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("CommandParser")


class CommandParser:
    """
    Parses natural language user commands and routes them to:
    - YouTubeController (browser automation, search, video play/pause, scrub)
    - DesktopController (global media keys, master volume, window focus, PyAutoGUI)
    - VoiceEngine (spoken vocal confirmations)
    """

    def __init__(
        self,
        youtube_ctrl: Optional[YouTubeController] = None,
        desktop_ctrl: Optional[DesktopController] = None,
        voice_engine: Optional[VoiceEngine] = None
    ):
        self.youtube = youtube_ctrl or YouTubeController()
        self.desktop = desktop_ctrl or DesktopController()
        self.voice = voice_engine

    def execute_command(self, text: str) -> Dict[str, Any]:
        """
        Main entry point for processing a text or voice command.
        Returns a structured result dictionary.
        """
        raw = text.strip()
        lower = raw.lower()
        logger.info(f"Processing command: '{raw}'")

        # ---------------------------------------------------------------------
        # 1. YouTube Playback Search & Direct URL
        # ---------------------------------------------------------------------
        # Pattern: "play <query> on youtube", "youtube play <query>", "search youtube for <query>"
        yt_search_match = re.search(r'(?:play|search)\s+(?:for\s+)?(.+?)\s+on\s+youtube', lower)
        if yt_search_match:
            query = yt_search_match.group(1).strip()
            return self._handle_youtube_play(query)

        if lower.startswith("youtube play ") or lower.startswith("play on youtube "):
            query = re.sub(r'^(?:youtube\s+play|play\s+on\s+youtube)\s+', '', raw, flags=re.IGNORECASE).strip()
            return self._handle_youtube_play(query)

        # "open youtube video <url>" or raw https://www.youtube.com/watch...
        if "youtube.com/watch" in lower or "youtu.be/" in lower:
            url_match = re.search(r'(https?://[^\s]+)', raw)
            if url_match:
                url = url_match.group(1)
                res = self.youtube.open_video_url(url)
                msg = f"Opening YouTube video: {res.get('title') or url}"
                self._speak(msg)
                return {"success": True, "action": "open_url", "message": msg, "details": res}

        # Generic "play <query>" (if query has > 2 words or mentions song/video/music)
        if lower.startswith("play ") and not any(k in lower for k in ["pause", "game", "around"]):
            candidate = raw[5:].strip()
            if any(term in lower for term in ["song", "music", "video", "track", "beats", "lofi", "ambient", "chopin", "podcast"]) or len(candidate.split()) >= 2:
                return self._handle_youtube_play(candidate)

        # ---------------------------------------------------------------------
        # 2. Play / Pause / Resume Controls
        # ---------------------------------------------------------------------
        if lower in ["pause", "pause video", "pause playback", "pause music", "stop video", "stop playback", "stop"]:
            # Pause both YouTube tab and send OS media pause
            yt_res = self.youtube.pause()
            if not yt_res.get("success"):
                # Fallback to desktop media key
                self.desktop.media_play_pause()
            msg = "Playback paused."
            self._speak(msg)
            return {"success": True, "action": "pause", "message": msg}

        if lower in ["resume", "resume video", "resume playback", "play", "start video", "unpause"]:
            yt_res = self.youtube.ensure_play()
            if not yt_res.get("success"):
                self.desktop.media_play_pause()
            msg = "Resuming playback."
            self._speak(msg)
            return {"success": True, "action": "resume", "message": msg}

        if lower in ["toggle playback", "toggle play", "play pause"]:
            res = self.youtube.toggle_play_pause()
            if not res.get("success"):
                self.desktop.media_play_pause()
            msg = "Toggled playback state."
            self._speak(msg)
            return {"success": True, "action": "toggle_play_pause", "message": msg}

        # Skip Ad on YouTube
        if any(phrase in lower for phrase in ["skip ad", "skip the ad", "bypass ad"]):
            skipped = self.youtube.skip_ad()
            msg = "Skipped YouTube advertisement." if skipped else "No active skippable advertisement detected."
            self._speak(msg)
            return {"success": True, "action": "skip_ad", "message": msg, "skipped": skipped}

        # Next / Previous Track
        if any(phrase in lower for phrase in ["next track", "next video", "next song", "skip track"]):
            res = self.desktop.media_next()
            msg = "Skipping to the next track."
            self._speak(msg)
            return {"success": True, "action": "media_next", "message": msg, "details": res}

        if any(phrase in lower for phrase in ["previous track", "previous video", "prev track", "last track"]):
            res = self.desktop.media_previous()
            msg = "Returning to the previous track."
            self._speak(msg)
            return {"success": True, "action": "media_prev", "message": msg, "details": res}

        # ---------------------------------------------------------------------
        # 3. Volume & Audio Mixer Controls
        # ---------------------------------------------------------------------
        vol_match = re.search(r'(?:set\s+)?(?:volume|sound)\s+(?:to\s+)?(\d{1,3})%?', lower)
        if vol_match:
            level = int(vol_match.group(1))
            # Set both in YouTube player and on OS system master mixer
            self.youtube.set_volume(level)
            self.desktop.set_system_volume(level)
            msg = f"Volume calibrated to {level}%."
            self._speak(msg)
            return {"success": True, "action": "set_volume", "level": level, "message": msg}

        if any(phrase in lower for phrase in ["volume up", "louder", "turn it up", "increase volume"]):
            self.desktop.media_volume_up(steps=3)
            msg = "Volume increased."
            self._speak(msg)
            return {"success": True, "action": "volume_up", "message": msg}

        if any(phrase in lower for phrase in ["volume down", "softer", "turn it down", "decrease volume", "lower volume"]):
            self.desktop.media_volume_down(steps=3)
            msg = "Volume lowered."
            self._speak(msg)
            return {"success": True, "action": "volume_down", "message": msg}

        if any(phrase in lower for phrase in ["mute", "mute audio", "silence"]):
            self.desktop.media_mute()
            msg = "Audio muted."
            self._speak(msg)
            return {"success": True, "action": "mute", "message": msg}

        if any(phrase in lower for phrase in ["unmute", "unmute audio"]):
            self.desktop.media_mute()
            msg = "Audio unmuted."
            self._speak(msg)
            return {"success": True, "action": "unmute", "message": msg}

        # ---------------------------------------------------------------------
        # 4. Desktop Window & System Commands
        # ---------------------------------------------------------------------
        if any(phrase in lower for phrase in ["focus browser", "focus youtube", "show youtube", "bring youtube to front"]):
            res = self.desktop.focus_browser_or_youtube()
            msg = "Bringing YouTube window to the foreground."
            self._speak(msg)
            return {"success": True, "action": "focus_window", "message": msg, "details": res}

        if any(phrase in lower for phrase in ["take a screenshot", "capture screen", "screenshot"]):
            res = self.desktop.capture_screen("jarvis_desktop_capture.png")
            msg = f"Desktop screenshot captured and saved as {res.get('path', 'screenshot.png')}."
            self._speak(msg)
            return {"success": True, "action": "screenshot", "message": msg, "details": res}

        # ---------------------------------------------------------------------
        # 5. Playback Status Inquiries
        # ---------------------------------------------------------------------
        if any(phrase in lower for phrase in ["what's playing", "what is playing", "current song", "current video", "playback status"]):
            status = self.youtube.get_playback_status()
            if status.get("active"):
                title = status.get("title", "Unknown")
                state_str = "playing" if status.get("state") == 1 else "paused"
                msg = f"Currently {state_str}: '{title}' on YouTube."
            else:
                msg = "No active YouTube playback detected."
            self._speak(msg)
            return {"success": True, "action": "get_status", "message": msg, "status": status}

        # Unhandled / General Query
        return {
            "success": False,
            "handled": False,
            "message": f"Command not recognized by local automation engine: '{raw}'. Forwarding to general AI assistant.",
            "command": raw
        }

    def _handle_youtube_play(self, query: str) -> Dict[str, Any]:
        """Executes a YouTube search query, plays the top video, and provides vocal feedback."""
        self._speak(f"Searching YouTube for {query} and starting playback, Sir.")
        res = self.youtube.play_search_query(query)
        if res.get("success"):
            title = res.get("title") or query
            msg = f"Now playing '{title}' on YouTube."
            self._speak(msg)
            return {
                "success": True,
                "action": "youtube_play",
                "query": query,
                "title": title,
                "url": res.get("url"),
                "message": msg
            }
        else:
            err = res.get("error", "Unknown error")
            msg = f"Could not start YouTube playback: {err}"
            self._speak(msg)
            return {"success": False, "error": err, "message": msg}

    def _speak(self, text: str):
        """Dispatches text to VoiceEngine if available."""
        if self.voice:
            self.voice.speak(text, block=False)
