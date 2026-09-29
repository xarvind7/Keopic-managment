import { supabase } from '../lib/supabase';
import { SystemNotification } from '../types';

export async function createNotification(
  title: string,
  message: string,
  type: SystemNotification['type'] = 'system',
  targetRole: 'all' | 'admin' | 'staff' = 'admin',
  targetUserId?: string
) {
  try {
    await supabase.from('notifications').insert({
      title,
      message,
      type,
      target_role: targetRole,
      target_user_id: targetUserId || null,
      is_read: false,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[notificationService] Failed to create notification:', err);
  }
}

export function subscribeToNotifications(
  role: string = 'admin',
  userId?: string,
  callback?: (notifs: SystemNotification[]) => void
) {
  const fetchNotifs = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data && callback) {
        callback(data.map(d => ({
          id: d.id,
          title: d.title,
          message: d.message,
          type: d.type || 'system',
          targetRole: d.target_role,
          targetUserId: d.target_user_id,
          read: d.is_read || false,
          created_at: d.created_at
        })));
      }
    } catch (e) {
      console.warn('[notificationService] Fetch error:', e);
    }
  };

  fetchNotifs();

  const channel = supabase
    .channel('public:notifications')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
      fetchNotifs();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function markNotificationRead(id: string) {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  } catch (e) {
    // Ignored
  }
}
