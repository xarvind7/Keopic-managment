import { supabase } from '../lib/supabase';
import { ActivityLog } from '../types';

export async function logActivity(
  action: string,
  entity: string,
  details: string,
  actor: string = 'System',
  userId?: string,
  entityId?: string,
  metadata?: Record<string, any>
) {
  try {
    const payload = {
      action,
      actor,
      entity,
      entity_id: entityId,
      user_id: userId,
      details,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    };

    // Insert to Supabase activity_logs / audit_logs table
    await supabase.from('activity_logs').insert(payload);
  } catch (err) {
    console.warn('[activityService] Error logging activity:', err);
  }
}

export function subscribeToActivityLogs(callback: (logs: ActivityLog[]) => void) {
  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        callback(data.map(d => ({
          id: d.id,
          user_id: d.user_id,
          actor: d.actor || 'User',
          action: d.action,
          entity: d.entity || 'General',
          entity_id: d.entity_id,
          details: d.details || '',
          metadata: d.metadata || {},
          created_at: d.created_at
        })));
      }
    } catch (err) {
      console.warn('[activityService] Error fetching activity logs:', err);
    }
  };

  fetchLogs();

  const channel = supabase
    .channel('public:activity_logs')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
      fetchLogs();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
