import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Send, Wallet, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function ChatRoom({ currentUserId, targetUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime incoming messages between these two users
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new;
          if (
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === targetUser.user_id) ||
            (newMsg.sender_id === targetUser.user_id && newMsg.receiver_id === currentUserId)
          ) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUser.user_id}),and(sender_id.eq.${targetUser.user_id},receiver_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() && !sendAmount) return;

    setLoading(true);
    const amountVal = parseFloat(sendAmount) || 0;

    try {
      const { error } = await supabase.from('messages').insert([
        {
          sender_id: currentUserId,
          receiver_id: targetUser.user_id,
          message_text: inputMessage.trim() || `Sent ${amountVal} GMART`,
          amount: amountVal,
          is_escrow: amountVal > 0,
        },
      ]);

      if (error) throw error;
      setInputMessage('');
      setSendAmount('');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[78vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="bg-slate-800 p-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1 text-slate-400 hover:text-emerald-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-xs font-bold text-emerald-400">@{targetUser.username}</h3>
            <p className="text-[10px] text-slate-400">
              {targetUser.gender_avatar === 'female' ? '👩 Female Avatar' : '👨 Male Avatar'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[10px] text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" /> Text-Only Privacy
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500">
            No messages yet. Start the conversation with @{targetUser.username}!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-xs ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'
                  }`}
                >
                  {msg.amount > 0 && (
                    <div className="mb-1 bg-amber-500/20 border border-amber-500/40 p-2 rounded-lg text-amber-300 font-bold flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 shrink-0" />
                      <span>{msg.amount} GMART Escrow Sent</span>
                    </div>
                  )}
                  <p>{msg.message_text}</p>
                  <span className="block text-[9px] opacity-60 text-right mt-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <form onSubmit={handleSendMessage} className="p-2 bg-slate-800 border-t border-slate-700 flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <div className="relative w-28 shrink-0">
            <span className="absolute left-2.5 top-2 text-[10px] text-slate-400 font-bold">GMART:</span>
            <input
              type="number"
              step="0.01"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-12 pr-2 py-1.5 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500"
            />
          </div>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a secure message..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg transition disabled:opacity-50 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
