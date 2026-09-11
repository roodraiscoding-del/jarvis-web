import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse existing Firebase app instance if already initialized
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Google Workspace Scopes requested by user
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/contacts'
];

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
provider.setCustomParameters({
  prompt: 'select_account'
});

// Flag to indicate ongoing sign-in popup flow
let isSigningIn = false;

// Persistent User-Scoped Session Storage Key (isolated per browser client)
const STORAGE_KEY = 'jarvis_google_workspace_auth_session';

export interface PersistedAuthSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  accessToken: string;
  savedAt: number;
  expiresAt: number;
}

// In-memory cache synced with browser-scoped localStorage
let cachedAccessToken: string | null = null;
let currentUser: User | null = null;

/**
 * Restores session from the user's browser-scoped persistent localStorage.
 * Ensures each user's login state persists independently across page refreshes
 * and remains strictly isolated to that specific browser environment.
 */
function restorePersistedSession(): { user: User | null; token: string | null } {
  if (typeof window === 'undefined') return { user: null, token: null };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null };

    const parsed: PersistedAuthSession = JSON.parse(raw);

    // Check if the OAuth token has expired (default 1-hour window with 2-minute safety margin)
    if (parsed.expiresAt && Date.now() > parsed.expiresAt - 2 * 60 * 1000) {
      console.info('[GoogleAuth] Persisted OAuth access token expired. Clearing session.');
      localStorage.removeItem(STORAGE_KEY);
      cachedAccessToken = null;
      currentUser = null;
      return { user: null, token: null };
    }

    if (parsed.accessToken && parsed.uid) {
      cachedAccessToken = parsed.accessToken;
      currentUser = {
        uid: parsed.uid,
        email: parsed.email,
        displayName: parsed.displayName,
        photoURL: parsed.photoURL,
      } as unknown as User;
      return { user: currentUser, token: cachedAccessToken };
    }
  } catch (err) {
    console.warn('[GoogleAuth] Error reading persisted auth session from localStorage:', err);
  }

  return { user: null, token: null };
}

// Initial synchronous hydration from localStorage on script load
restorePersistedSession();

// Auth state listeners
type AuthCallback = (user: User | null, token: string | null) => void;
const listeners = new Set<AuthCallback>();

const notifyListeners = () => {
  listeners.forEach((cb) => cb(currentUser, cachedAccessToken));
};

export const subscribeAuth = (callback: AuthCallback) => {
  listeners.add(callback);
  // Synchronously deliver the restored or current session
  callback(currentUser, cachedAccessToken);
  return () => {
    listeners.delete(callback);
  };
};

/**
 * Initialize Firebase Auth listener. Call this on application load.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      currentUser = user;
      // Sync with localStorage
      const restored = restorePersistedSession();
      if (restored.token) {
        cachedAccessToken = restored.token;
        notifyListeners();
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        notifyListeners();
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      // If Firebase says no user, also verify localStorage before clearing
      const restored = restorePersistedSession();
      if (!restored.user) {
        cachedAccessToken = null;
        currentUser = null;
        notifyListeners();
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

// Automatically attach onAuthStateChanged listener to keep auth state synchronized
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      currentUser = user;
      const restored = restorePersistedSession();
      if (restored.token) {
        cachedAccessToken = restored.token;
      }
      notifyListeners();
    }
  });
}

/**
 * Triggers interactive Google OAuth Popup with requested Workspace scopes.
 * Must be triggered by a direct user interaction (button click).
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve OAuth access token from Google sign-in credentials.');
    }

    cachedAccessToken = credential.accessToken;
    currentUser = result.user;

    // Persist session to the user's browser-scoped localStorage (valid for 1 hour)
    const expiresAt = Date.now() + 3600 * 1000;
    const sessionData: PersistedAuthSession = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
      accessToken: credential.accessToken,
      savedAt: Date.now(),
      expiresAt
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    } catch (e) {
      console.warn('[GoogleAuth] Failed to write session to localStorage:', e);
    }

    notifyListeners();

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Workspace Sign-in Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get current in-memory or persisted access token.
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }
  const restored = restorePersistedSession();
  return restored.token;
};

/**
 * Sign out and clear in-memory and browser-scoped storage.
 * Only signs out the current browser session.
 */
export const logout = async (): Promise<void> => {
  try {
    await auth.signOut();
  } catch (e) {
    console.warn('[GoogleAuth] Firebase signOut notice:', e);
  }
  cachedAccessToken = null;
  currentUser = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  notifyListeners();
};

export const getCurrentUser = (): User | null => {
  if (currentUser) return currentUser;
  const restored = restorePersistedSession();
  return restored.user;
};
