/**
 * src/lib/auth.js
 * GitHub Device Flow OAuth for static SPA.
 *
 * CORS NOTE: GitHub's OAuth endpoints (github.com/login/device/code and
 * github.com/login/oauth/access_token) do NOT support CORS from browsers.
 * A small proxy is required. Set PROXY_BASE below to your Cloudflare Worker
 * or similar proxy URL. The proxy must forward requests to github.com and
 * relay the response with appropriate CORS headers.
 *
 * Expected proxy behaviour:
 *   POST {PROXY_BASE}/login/device/code  -->  POST https://github.com/login/device/code
 *   POST {PROXY_BASE}/login/oauth/access_token  -->  POST https://github.com/login/oauth/access_token
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

// ── Proxy configuration ──────────────────────────────────────────────
// Change this to your CORS proxy that forwards to github.com.
// When empty string, calls go directly to github.com (will fail from browsers
// due to CORS, but useful for testing in non-browser environments).
const PROXY_BASE = browser
  ? (localStorage.getItem('gh_proxy_base') || 'https://github.com')
  : 'https://github.com';

// ── Stores ───────────────────────────────────────────────────────────
export const user = writable(null);       // { login, avatar_url, name, token }
export const authState = writable('idle'); // 'idle' | 'pending' | 'polling' | 'authenticated' | 'error'
export const authError = writable('');
export const deviceFlowData = writable(null); // { user_code, verification_uri, expires_in }

// ── Token helpers ────────────────────────────────────────────────────
export function getToken() {
  if (!browser) return null;
  return localStorage.getItem('gh_token') || null;
}

function setToken(token) {
  if (browser) localStorage.setItem('gh_token', token);
}

function clearToken() {
  if (browser) {
    localStorage.removeItem('gh_token');
    localStorage.removeItem('gh_user');
  }
}

function getStoredUser() {
  if (!browser) return null;
  try {
    const raw = localStorage.getItem('gh_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeUser(userData) {
  if (browser) localStorage.setItem('gh_user', JSON.stringify(userData));
}

// ── Validate existing token ──────────────────────────────────────────
export async function validateToken() {
  const token = getToken();
  if (!token) {
    authState.set('idle');
    user.set(null);
    return false;
  }

  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      clearToken();
      authState.set('idle');
      user.set(null);
      return false;
    }

    const profile = await res.json();
    const userData = {
      login: profile.login,
      avatar_url: profile.avatar_url,
      name: profile.name || profile.login,
      token
    };
    storeUser(userData);
    user.set(userData);
    authState.set('authenticated');
    return true;
  } catch {
    // Network error — keep stored user if available
    const stored = getStoredUser();
    if (stored) {
      user.set({ ...stored, token });
      authState.set('authenticated');
      return true;
    }
    authState.set('idle');
    return false;
  }
}

// ── Device Flow ──────────────────────────────────────────────────────
let pollingAbort = null;

export async function startDeviceFlow(clientId) {
  if (!clientId) {
    authError.set('GitHub OAuth Client ID is required. Configure it above.');
    authState.set('error');
    return;
  }

  authError.set('');
  authState.set('pending');
  deviceFlowData.set(null);

  try {
    // Step 1: Request device and user codes
    const codeRes = await fetch(`${PROXY_BASE}/login/device/code`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        scope: 'repo'
      })
    });

    if (!codeRes.ok) {
      const text = await codeRes.text();
      throw new Error(`Failed to start device flow: ${codeRes.status} ${text}`);
    }

    const codeData = await codeRes.json();

    if (codeData.error) {
      throw new Error(codeData.error_description || codeData.error);
    }

    deviceFlowData.set({
      user_code: codeData.user_code,
      verification_uri: codeData.verification_uri,
      expires_in: codeData.expires_in
    });

    // Step 2: Poll for the token
    authState.set('polling');
    const interval = (codeData.interval || 5) * 1000;
    const expiresAt = Date.now() + (codeData.expires_in || 900) * 1000;

    pollingAbort = new AbortController();

    while (Date.now() < expiresAt) {
      if (pollingAbort.signal.aborted) {
        authState.set('idle');
        deviceFlowData.set(null);
        return;
      }

      await new Promise(r => setTimeout(r, interval));

      if (pollingAbort.signal.aborted) {
        authState.set('idle');
        deviceFlowData.set(null);
        return;
      }

      try {
        const tokenRes = await fetch(`${PROXY_BASE}/login/oauth/access_token`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client_id: clientId,
            device_code: codeData.device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          })
        });

        const tokenData = await tokenRes.json();

        if (tokenData.access_token) {
          // Success!
          setToken(tokenData.access_token);
          await validateToken();
          deviceFlowData.set(null);
          return;
        }

        if (tokenData.error === 'authorization_pending') {
          // User hasn't authorised yet — keep polling
          continue;
        }

        if (tokenData.error === 'slow_down') {
          // Back off — wait an extra 5 seconds
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }

        if (tokenData.error === 'expired_token') {
          throw new Error('Device code expired. Please try again.');
        }

        if (tokenData.error === 'access_denied') {
          throw new Error('Authorization was denied by the user.');
        }

        if (tokenData.error) {
          throw new Error(tokenData.error_description || tokenData.error);
        }
      } catch (e) {
        if (pollingAbort.signal.aborted) {
          authState.set('idle');
          deviceFlowData.set(null);
          return;
        }
        throw e;
      }
    }

    throw new Error('Device code expired. Please try again.');
  } catch (e) {
    authError.set(e.message);
    authState.set('error');
    deviceFlowData.set(null);
  }
}

export function cancelDeviceFlow() {
  if (pollingAbort) {
    pollingAbort.abort();
    pollingAbort = null;
  }
  authState.set('idle');
  deviceFlowData.set(null);
  authError.set('');
}

export function logout() {
  if (pollingAbort) {
    pollingAbort.abort();
    pollingAbort = null;
  }
  clearToken();
  user.set(null);
  authState.set('idle');
  deviceFlowData.set(null);
  authError.set('');
}

// ── Initialise on load ───────────────────────────────────────────────
export function initAuth() {
  if (!browser) return;

  const token = getToken();
  if (token) {
    // Optimistically set from localStorage while we validate
    const stored = getStoredUser();
    if (stored) {
      user.set({ ...stored, token });
      authState.set('authenticated');
    }
    // Validate in background
    validateToken();
  }
}
