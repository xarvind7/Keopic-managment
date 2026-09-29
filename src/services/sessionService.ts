import { supabase } from '../lib/supabase';
import { ActiveSession } from '../types';

const SESSION_STORAGE_KEY = 'sic_current_session_id';

export function getOrCreateClientSessionId(): string {
  let sId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sId) {
    sId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem(SESSION_STORAGE_KEY, sId);
  }
  return sId;
}

export function getBrowserInfo(): string {
  if (typeof navigator === 'undefined') return 'Unknown Browser';
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung Internet';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Edge') || ua.includes('Edg')) return 'Microsoft Edge';
  if (ua.includes('Chrome')) return 'Google Chrome';
  if (ua.includes('Safari')) return 'Apple Safari';
  return 'Web Browser';
}

/**
 * Register a new active session in Supabase.
 * Automatically invalidates any existing active session for this staff account in any other browser.
 */
export async function registerStaffSession(userId: string): Promise<string> {
  if (!userId) return '';
  const sessionId = getOrCreateClientSessionId();
  const browser = getBrowserInfo();

  try {
    // 1. Invalidate older sessions for this user
    await supabase
      .from('active_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('revoked_at', null)
      .neq('session_id', sessionId);

    // 2. Upsert current session
    await supabase.from('active_sessions').upsert({
      user_id: userId,
      session_id: sessionId,
      browser,
      last_seen_at: new Date().toISOString(),
      revoked_at: null
    }, { onConflict: 'session_id' });

    return sessionId;
  } catch (err) {
    console.warn('[sessionService] Failed to register session in Supabase:', err);
    return sessionId;
  }
}

/**
 * Heartbeat to update last_seen_at
 */
export async function sendSessionHeartbeat(userId: string, sessionId: string) {
  if (!userId || !sessionId) return;
  try {
    await supabase
      .from('active_sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('user_id', userId);
  } catch (err) {
    // Silent fail for heartbeat
  }
}

/**
 * Listen for remote session invalidation.
 * If another browser logs in with the same user ID, the previous session's revoked_at will be set,
 * or another session becomes active, triggering onInvalidated callback.
 */
export function subscribeToSessionRevocation(
  userId: string,
  currentSessionId: string,
  onInvalidated: () => void
) {
  if (!userId || !currentSessionId) return () => {};

  // Check current session validity immediately
  const checkValidity = async () => {
    try {
      const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('session_id', currentSessionId)
        .maybeSingle();

      if (!error && data) {
        if (data.revoked_at) {
          onInvalidated();
        }
      }
    } catch (e) {
      // Ignored
    }
  };

  checkValidity();

  // Supabase Realtime channel on active_sessions table
  const channel = supabase
    .channel(`active_session:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'active_sessions',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        const record = payload.new as ActiveSession;
        if (record) {
          // If this session is explicitly revoked, or a newer session was created for this user
          if (record.session_id === currentSessionId && record.revoked_at) {
            onInvalidated();
          } else if (record.session_id !== currentSessionId && !record.revoked_at) {
            // A newer session was activated elsewhere
            onInvalidated();
          }
        }
      }
    )
    .subscribe();

  // Polling heartbeat interval as fallback
  const interval = setInterval(() => {
    checkValidity();
    sendSessionHeartbeat(userId, currentSessionId);
  }, 10000);

  return () => {
    clearInterval(interval);
    supabase.removeChannel(channel);
  };
}

export async function revokeStaffSession(userId: string, sessionId: string) {
  if (!sessionId) return;
  try {
    await supabase
      .from('active_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('session_id', sessionId);
  } catch (err) {
    console.warn('[sessionService] Failed to revoke session:', err);
  }
}
