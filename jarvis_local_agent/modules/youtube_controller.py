"""
YouTube Controller Module for Jarvis Local Agent.
Provides real browser automation and playback control for YouTube via Playwright,
with fallback capabilities.
"""

import sys
import time
import logging
import urllib.parse
from typing import Dict, Any, Optional

try:
    from playwright.sync_api import sync_playwright, BrowserContext, Page, Playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("YouTubeController")


class YouTubeController:
    """
    Automates YouTube playback using a real Chromium browser instance.
    Controls playback directly through YouTube's internal HTML5 MoviePlayer API
    and Playwright DOM interaction.
    """

    def __init__(self, headless: bool = False, user_data_dir: Optional[str] = None):
        self.headless = headless
        self.user_data_dir = user_data_dir
        self.playwright: Optional[Playwright] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self._is_initialized = False

    def _ensure_browser(self) -> bool:
        """Launches or verifies the Playwright browser instance."""
        if not PLAYWRIGHT_AVAILABLE:
            logger.warning("Playwright is not installed. Run: pip install playwright && playwright install chromium")
            return False

        if self.page and not self.page.is_closed():
            return True

        try:
            if not self.playwright:
                self.playwright = sync_playwright().start()

            # Launch persistent browser context to retain YouTube session/cookies
            launch_args = [
                "--disable-blink-features=AutomationControlled",
                "--autoplay-policy=no-user-gesture-required",
                "--start-maximized"
            ]

            if self.user_data_dir:
                self.context = self.playwright.chromium.launch_persistent_context(
                    user_data_dir=self.user_data_dir,
                    headless=self.headless,
                    args=launch_args,
                    no_viewport=True
                )
                self.page = self.context.pages[0] if self.context.pages else self.context.new_page()
            else:
                browser = self.playwright.chromium.launch(
                    headless=self.headless,
                    args=launch_args
                )
                self.context = browser.new_context(no_viewport=True)
                self.page = self.context.new_page()

            self._is_initialized = True
            logger.info("Playwright Chromium browser launched successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Playwright browser: {e}")
            return False

    def play_search_query(self, query: str) -> Dict[str, Any]:
        """
        Searches YouTube for the specified query, clicks the top result,
        and initiates video playback.
        """
        if not self._ensure_browser():
            return self._fallback_browser_open(f"https://www.youtube.com/results?search_query={urllib.parse.quote(query)}")

        try:
            logger.info(f"Navigating to YouTube search for: '{query}'")
            search_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(query)}"
            self.page.goto(search_url, wait_until="domcontentloaded", timeout=15000)

            # Wait for video renderer links
            # YouTube uses ytd-video-renderer for standard search results
            video_selector = "ytd-video-renderer a#video-title"
            self.page.wait_for_selector(video_selector, timeout=8000)

            first_video = self.page.locator(video_selector).first
            video_title = first_video.get_attribute("title") or first_video.inner_text() or query
            logger.info(f"Top video found: '{video_title}'. Initiating playback...")

            first_video.click()

            # Wait for video player to mount
            self.page.wait_for_selector("#movie_player video", timeout=10000)
            time.sleep(1.0)  # Short pause for playback buffer to start

            # Dismiss any consent dialogs or auto-skip intro ads
            self.skip_ad()
            self.ensure_play()

            return {
                "success": True,
                "action": "play_search",
                "query": query,
                "title": video_title,
                "url": self.page.url
            }
        except Exception as e:
            logger.error(f"Error executing YouTube search & play: {e}")
            return {"success": False, "error": str(e), "query": query}

    def open_video_url(self, url: str) -> Dict[str, Any]:
        """Opens a direct YouTube video URL and starts playback."""
        if not self._ensure_browser():
            return self._fallback_browser_open(url)

        try:
            logger.info(f"Navigating to video URL: {url}")
            self.page.goto(url, wait_until="domcontentloaded", timeout=15000)
            self.page.wait_for_selector("#movie_player video", timeout=10000)
            self.skip_ad()
            self.ensure_play()
            title = self.get_video_title()
            return {"success": True, "action": "open_url", "title": title, "url": url}
        except Exception as e:
            logger.error(f"Error opening YouTube URL: {e}")
            return {"success": False, "error": str(e), "url": url}

    def toggle_play_pause(self) -> Dict[str, Any]:
        """Toggles between play and pause using the player API or keyboard 'k'."""
        if not self.page or self.page.is_closed():
            return {"success": False, "error": "No active YouTube tab found"}

        try:
            # First attempt: Direct YouTube MoviePlayer API
            script = """
            () => {
                const player = document.getElementById('movie_player');
                if (player && typeof player.getPlayerState === 'function') {
                    const state = player.getPlayerState();
                    if (state === 1) { // 1 = PLAYING
                        player.pauseVideo();
                        return { action: 'paused', state: 2 };
                    } else {
                        player.playVideo();
                        return { action: 'playing', state: 1 };
                    }
                }
                // Fallback to HTML5 video element
                const video = document.querySelector('video');
                if (video) {
                    if (video.paused) {
                        video.play();
                        return { action: 'playing', state: 1 };
                    } else {
                        video.pause();
                        return { action: 'paused', state: 2 };
                    }
                }
                return { action: 'none', state: -1 };
            }
            """
            result = self.page.evaluate(script)
            logger.info(f"Playback toggle result: {result}")
            return {"success": True, "result": result}
        except Exception as e:
            # Fallback to pressing 'k' (standard YouTube keyboard shortcut)
            try:
                self.page.keyboard.press("k")
                return {"success": True, "fallback": "keyboard_k"}
            except Exception as e2:
                return {"success": False, "error": f"{e}; fallback failed: {e2}"}

    def pause(self) -> Dict[str, Any]:
        """Pauses the video."""
        if not self.page or self.page.is_closed():
            return {"success": False, "error": "No active YouTube tab found"}
        try:
            self.page.evaluate("() => document.getElementById('movie_player')?.pauseVideo() || document.querySelector('video')?.pause()")
            return {"success": True, "action": "paused"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def ensure_play(self) -> Dict[str, Any]:
        """Ensures the video is actively playing."""
        if not self.page or self.page.is_closed():
            return {"success": False, "error": "No active YouTube tab found"}
        try:
            self.page.evaluate("() => document.getElementById('movie_player')?.playVideo() || document.querySelector('video')?.play()")
            return {"success": True, "action": "playing"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def set_volume(self, level: int) -> Dict[str, Any]:
        """Sets the YouTube player volume (0 to 100)."""
        if not self.page or self.page.is_closed():
            return {"success": False, "error": "No active YouTube tab found"}
        clamped = max(0, min(100, level))
        try:
            script = f"""
            () => {{
                const player = document.getElementById('movie_player');
                if (player && typeof player.setVolume === 'function') {{
                    player.unMute();
                    player.setVolume({clamped});
                    return player.getVolume();
                }}
                const video = document.querySelector('video');
                if (video) {{
                    video.muted = false;
                    video.volume = {clamped / 100.0};
                    return Math.round(video.volume * 100);
                }}
                return null;
            }}
            """
            val = self.page.evaluate(script)
            logger.info(f"YouTube volume set to: {val}%")
            return {"success": True, "volume": val}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def seek_relative(self, seconds: int) -> Dict[str, Any]:
        """Seeks forward (positive) or backward (negative) by given seconds."""
        if not self.page or self.page.is_closed():
            return {"success": False, "error": "No active YouTube tab found"}
        try:
            script = f"""
            () => {{
                const player = document.getElementById('movie_player');
                if (player && typeof player.getCurrentTime === 'function') {{
                    const cur = player.getCurrentTime();
                    player.seekTo(cur + ({seconds}), true);
                    return player.getCurrentTime();
                }}
                const video = document.querySelector('video');
                if (video) {{
                    video.currentTime += ({seconds});
                    return video.currentTime;
                }}
                return null;
            }}
            """
            cur = self.page.evaluate(script)
            return {"success": True, "currentTime": cur, "offset": seconds}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def skip_ad(self) -> bool:
        """Attempts to click the skip ad button if currently active."""
        if not self.page or self.page.is_closed():
            return False
        try:
            skip_selectors = [
                ".ytp-skip-ad-button",
                ".ytp-ad-skip-button",
                ".ytp-ad-skip-button-modern",
                "button.ytp-ad-skip-button-text"
            ]
            for sel in skip_selectors:
                btn = self.page.locator(sel)
                if btn.count() > 0 and btn.first.is_visible():
                    btn.first.click()
                    logger.info("Ad skipped successfully.")
                    return True
            return False
        except Exception:
            return False

    def get_video_title(self) -> str:
        """Retrieves the title of the current playing video."""
        if not self.page or self.page.is_closed():
            return ""
        try:
            title = self.page.evaluate("""
            () => {
                const player = document.getElementById('movie_player');
                if (player && typeof player.getVideoData === 'function') {
                    return player.getVideoData().title;
                }
                const h1 = document.querySelector('h1.ytd-watch-metadata yt-formatted-string');
                return h1 ? h1.innerText : document.title;
            }
            """)
            return title or ""
        except Exception:
            return ""

    def get_playback_status(self) -> Dict[str, Any]:
        """Returns comprehensive status telemetry from the YouTube player."""
        if not self.page or self.page.is_closed():
            return {"active": False, "state": "closed"}
        try:
            status = self.page.evaluate("""
            () => {
                const player = document.getElementById('movie_player');
                if (player && typeof player.getPlayerState === 'function') {
                    const data = player.getVideoData() || {};
                    return {
                        active: true,
                        title: data.title || document.title,
                        author: data.author || '',
                        state: player.getPlayerState(), // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering
                        currentTime: Math.round(player.getCurrentTime()),
                        duration: Math.round(player.getDuration()),
                        volume: player.getVolume(),
                        isMuted: player.isMuted()
                    };
                }
                const video = document.querySelector('video');
                if (video) {
                    return {
                        active: true,
                        title: document.title,
                        state: video.paused ? 2 : 1,
                        currentTime: Math.round(video.currentTime),
                        duration: Math.round(video.duration || 0),
                        volume: Math.round(video.volume * 100),
                        isMuted: video.muted
                    };
                }
                return { active: false, state: "no_player" };
            }
            """)
            return status
        except Exception as e:
            return {"active": False, "error": str(e)}

    def close(self):
        """Closes the browser and terminates the Playwright session."""
        try:
            if self.context:
                self.context.close()
            if self.playwright:
                self.playwright.stop()
            logger.info("YouTubeController closed.")
        except Exception as e:
            logger.warning(f"Error while closing browser: {e}")
        finally:
            self.page = None
            self.context = None
            self.playwright = None
            self._is_initialized = False

    def _fallback_browser_open(self, url: str) -> Dict[str, Any]:
        """Fallback when Playwright is not yet installed."""
        import webbrowser
        logger.info(f"Opening via standard system browser fallback: {url}")
        webbrowser.open(url)
        return {
            "success": True,
            "fallback": True,
            "url": url,
            "message": "Opened in system default browser via webbrowser module (Playwright not active)."
        }
