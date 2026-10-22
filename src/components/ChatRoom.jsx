import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Send, Lock, ShieldOff } from 'lucide-react';

export default function ChatRoom({ currentUserId, targetUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEscrowModal, setShowEscrowModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasBlockedMe, setHasBlockedMe] = useState(false);
  const messagesEndRef = useRef(null);

  const targetId = targetUser.user_id || targetUser.id;

  useEffect(() => {
    if (!currentUserId || !targetId) return;

    checkBlockStatus();
    fetchMessages();
    markMessagesAsRead();

    const channel = supabase
      .channel(`public:messages:${currentUserId}_${targetId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new;
          if (
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === targetId) ||
            (newMsg.sender_id === targetId && newMsg.receiver_id === currentUserId)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (newMsg.receiver_id === currentUserId) {
              markMessagesAsRead();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, targetId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkBlockStatus = async () => {
    // Check if I blocked target
    const { data: iBlocked } = await supabase
      .from('blocked_users')
      .select('*')
      .eq('blocker_id', currentUserId)
      .eq('blocked_id', targetId)
      .single();

    if (iBlocked) setIsBlocked(true);

    // Check if target blocked me
    const { data: targetBlockedMe } = await supabase
      .from('blocked_users')
      .select('*')
      .eq('blocker_id', targetId)
      .eq('blocked_id', currentUserId)
      .single();

    if (targetBlockedMe) setHasBlockedMe(true);
  };

  const handleBlockUser = async () => {
    if (!window.confirm(`Are you sure you want to block @${targetUser.username}?`)) return;

    try {
      const { error } = await supabase.from('blocked_users').insert([
        { blocker_id: currentUserId, blocked_id: targetId },
      ]);
      if (error) throw error;
      setIsBlocked(true);
      alert(`@${targetUser.username} has been blocked.`);
    } catch (err) {
      alert(err.message || 'Failed to block user');
    }
  };

  const handleUnblockUser = async () => {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', currentUserId)
        .eq('blocked_id', targetId);

      if (error) throw error;
      setIsBlocked(false);
      alert(`@${targetUser.username} has been unblocked.`);
    } catch (err) {
      alert(err.message || 'Failed to unblock user');
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true });

    if (error) console.error(error);
    else if (data) setMessages(data);
  };

  const markMessagesAsRead = async () => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', targetId)
      .eq('receiver_id', currentUserId)
      .eq('is_read', false);
  };

  const handleSendMessage = async (textToSend = null) => {
    if (isBlocked || hasBlockedMe) {
      alert('Cannot send messages in this chat.');
      return;
    }

    const text = textToSend || inputMessage.trim();
    const amountVal = parseFloat(sendAmount) || 0;

    if (!text && amountVal === 0) return;

    setLoading(true);

    try {
      // 1. Handle Escrow GMART Transfer
      if (amountVal > 0) {
        const { error: transferError } = await supabase.rpc('transfer_gmart', {
          sender_id: currentUserId,
          receiver_id: targetId,
          transfer_amount: amountVal,
        });

        if (transferError) throw new Error(transferError.message || 'Transfer failed. Check balance.');
      }

      // 2. Insert Message
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: currentUserId,
            receiver_id: targetId,
            message_text: text || `Sent ${amountVal} GMART`,
            amount: amountVal,
            is_escrow: amountVal > 0,
          },
        ])
        .select();

      if (error) throw error;

      setInputMessage('');
      setSendAmount('');
      setShowEscrowModal(false);

      if (data && data[0]) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data[0].id)) return prev;
          return [...prev, data[0]];
        });
      }
    } catch (err) {
      alert(err.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden">
      {/* 1. TOP HEADER */}
      <div className="bg-slate-800 px-4 py-3 border-b border-slate-700/80 flex items-center justify-between shrink-0 shadow-md z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 text-slate-300 hover:text-emerald-400 transition">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-1">
              @{targetUser.username}
            </h2>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-500" /> Private · only you and @{targetUser.username} can see this
            </p>
          </div>
        </div>

        {/* BLOCK / UNBLOCK BUTTON */}
        {isBlocked ? (
          <button
            onClick={handleUnblockUser}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-amber-400 font-semibold px-3 py-1.5 rounded-xl border border-amber-500/30"
          >
            Unblock
          </button>
        ) : (
          <button
            onClick={handleBlockUser}
            className="p-2 text-slate-400 hover:text-red-400 transition"
            title="Block User"
          >
            <ShieldOff className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. MESSAGES CANVAS */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/60">
        {/* Action Pills */}
        <div className="flex gap-2 justify-center py-1">
          <button className="bg-slate-800 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-full text-xs font-semibold">
            Profile
          </button>
          <button 
            onClick={() => setShowEscrowModal(!showEscrowModal)}
            disabled={isBlocked || hasBlockedMe}
            className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-xs font-semibold disabled:opacity-40"
          >
            Send GMART
          </button>
        </div>

        {/* Escrow Modal */}
        {showEscrowModal && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex items-center gap-2">
            <input
              type="number"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              placeholder="Amount GMART"
              className="bg-slate-800 border border-amber-400/50 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-bold w-full focus:outline-none"
            />
            <button
              onClick={() => handleSendMessage()}
              className="bg-amber-500 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl shrink-0"
            >
              Send Escrow
            </button>
          </div>
        )}

        {/* Blocked Notifications */}
        {isBlocked && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-2xl text-center text-xs font-semibold">
            You have blocked @{targetUser.username}. Unblock to send messages.
          </div>
        )}
        {hasBlockedMe && (
          <div className="bg-slate-800 border border-slate-700 text-slate-400 p-3 rounded-2xl text-center text-xs">
            You cannot reply to this conversation.
          </div>
        )}

        {/* Messages List */}
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          const isEscrow = msg.amount > 0;

          if (isEscrow) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm">
                  <span>{isMe ? 'You sent them' : `@${targetUser.username} sent you`}</span>
                  <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md font-bold">
                    {msg.amount} GMART
                  </span>
                  <span className="text-[10px] opacity-70">
                    · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs shadow-sm ${
                  isMe
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-none'
                }`}
              >
                <p className="leading-relaxed">{msg.message_text}</p>
                <span className="block text-[9px] opacity-60 text-right mt-1 font-mono">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. BOTTOM INPUT BAR */}
      <div className="px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+8px)] bg-slate-800 border-t border-slate-700/80 flex items-center gap-2 shrink-0 shadow-2xl z-20">
        <input
          type="text"
          value={inputMessage}
          disabled={isBlocked || hasBlockedMe}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={isBlocked || hasBlockedMe ? 'Messaging unavailable' : `Message @${targetUser.username}...`}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={loading || !inputMessage.trim() || isBlocked || hasBlockedMe}
          className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-full shadow transition disabled:opacity-50 shrink-0 flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
