import { supabase } from '../lib/supabase';
import { ChatMessage } from '../types';

export async function sendMessageSupabase(
  sender: 'staff' | 'admin',
  senderName: string,
  text: string,
  receiverId?: string,
  senderId?: string
) {
  if (!text.trim()) return;

  try {
    await supabase.from('messages').insert({
      sender_id: senderId || senderName,
      sender_name: senderName,
      receiver_id: receiverId || null,
      sender_role: sender,
      message: text.trim(),
      read: false,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[chatService] Error sending message to Supabase:', err);
  }
}

export function subscribeToMessages(callback: (messages: ChatMessage[]) => void) {
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(200);

      if (!error && data) {
        callback(data.map(d => ({
          id: d.id,
          sender: (d.sender_role || 'staff') as 'staff' | 'admin',
          senderId: d.sender_id,
          receiverId: d.receiver_id,
          senderName: d.sender_name || 'User',
          text: d.message,
          timestamp: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
          read: d.read
        })));
      }
    } catch (err) {
      console.warn('[chatService] Error fetching messages:', err);
    }
  };

  fetchMessages();

  const channel = supabase
    .channel('public:messages')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
      fetchMessages();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function markMessagesAsRead(senderRoleToMark: 'staff' | 'admin') {
  try {
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_role', senderRoleToMark)
      .eq('read', false);
  } catch (err) {
    // Ignored
  }
}
