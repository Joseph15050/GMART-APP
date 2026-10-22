import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Send, Trash2, Lock, ShieldAlert } from 'lucide-react';

export default function ChatRoom({ currentUserId, targetUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [iBlockedTarget, setIBlockedTarget] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    checkBlockStatus();

    const channel = supabase
      .channel(`chat_${currentUserId}_${targetUser.user_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new;
          if (
            (m.sender_id === currentUserId && m.receiver_id === targetUser.user_id) ||
            (m.sender_id === targetUser.user_id && m.receiver_id === currentUserId)
          ) {
            setMessages((prev) => [...prev, m]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const deletedId = payload.old.id;
          setMessages((prev) => prev.filter((msg) => msg.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, targetUser.user_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkBlockStatus = async () => {
    const { data } = await supabase
      .from('blocked_users')
      .select('*')
      .or(
        `and(blocker_id.eq.${currentUserId},blocked_id.eq.${targetUser.user_id}),and(blocker_id.eq.${targetUser.user_id},blocked_id.eq.${currentUserId})`
      );

    if (data && data.length > 0) {
      setIsBlocked(true);
      const IBlocked = data.some((b) => b.blocker_id === currentUserId);
      setIBlockedTarget(IBlocked);
    } else {
      setIsBlocked(false);
      setIBlockedTarget(false);
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUser.user_id}),and(sender_id.eq.${targetUser.user_id},receiver_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isBlocked) return;

    const text = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase.from('messages').insert([
      {
        sender_id: currentUserId,
        receiver_id: targetUser.user_id,
        message_text: text,
      },
    ]);

    if (error) {
      alert(error.message || 'Failed to send message.');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (!error) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } else {
      alert('Could not delete message: ' + error.message);
    }
  };

  const handleClearChatHistory = async () => {
    if (!window.confirm(`Clear all messages with @${targetUser.username}?`)) return;

    const { error } = await supabase
      .from('messages')
      .delete()
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUser.user_id}),and(sender_id.eq.${targetUser.user_id},receiver_id.eq.${currentUserId})`
      );

    if (!error) {
      setMessages([]);
    } else {
      alert('Failed to clear conversation: ' + error.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* CHAT HEADER */}
      <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
              {targetUser.gender_avatar === 'female' ? '👩' : '👨'}
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100">@{targetUser.username}</h3>
              <p className="text-[10px] text-slate-400">{isBlocked ? 'Blocked' : 'Online'}</p>
            </div>
          </div>
        </div>

        {/* CLEAR CHAT BUTTON */}
        <button
          onClick={handleClearChatHistory}
          className="text-xs text-red-400 hover:bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 flex items-center gap-1 font-semibold transition"
          title="Clear Conversation"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear Chat
        </button>
      </div>

      {/* MESSAGES LIST */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m) => {
          const isMe = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={`flex items-center gap-2 group ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {isMe && (
                <button
                  onClick={() => handleDeleteMessage(m.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition p-1"
                  title="Delete message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <div
                className={`max-w-[75%] p-3 rounded-2xl text-xs ${
                  isMe
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                }`}
              >
                <p>{m.message_text}</p>
                <span className="text-[9px] text-slate-300/70 block text-right mt-1">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT BAR */}
      <form onSubmit={handleSendMessage} className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
        <input
          type="text"
          value={newMessage}
          disabled={isBlocked}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={isBlocked ? 'Messaging disabled' : 'Type a message...'}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isBlocked || !newMessage.trim()}
          className="bg-emerald-600 text-white p-2 rounded-xl disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
