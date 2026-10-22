import P2PMarket from './components/P2PMarket';
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import AuthModal from './components/AuthModal';
import ChatRoom from './components/ChatRoom';
import { logUserInterest, searchLikeminds } from './aiEngine';
import { MessageSquare, Search, User, Wallet, LogOut, Bell, Edit2, Sparkles, Trash2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  
  // Chat List States
  const [conversations, setConversations] = useState([]);
  const [chatFilter, setChatFilter] = useState('all');
  const [chatSearch, setChatSearch] = useState('');
  const [directUsername, setDirectUsername] = useState('');
  const [selectedChatUser, setSelectedChatUser] = useState(null);

  // AI Match & Log States
  const [logInput, setLogInput] = useState('');
  const [userLogs, setUserLogs] = useState([]);
  const [matchResults, setMatchResults] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchRecentConversations(session.user.id);
        fetchUserLogs(session.user.id);
        subscribeToProfileUpdates(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchRecentConversations(session.user.id);
        fetchUserLogs(session.user.id);
        subscribeToProfileUpdates(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  const subscribeToProfileUpdates = (userId) => {
    supabase
      .channel(`public:profiles:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          setProfile(payload.new);
        }
      )
      .subscribe();
  };

  const fetchUserLogs = async (userId) => {
    const { data } = await supabase
      .from('user_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) setUserLogs(data);
  };

  const fetchRecentConversations = async (userId) => {
    const { data: msgs, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) return;

    if (msgs && msgs.length > 0) {
      const otherUserIds = [...new Set(msgs.map(m => m.sender_id === userId ? m.receiver_id : m.sender_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, gender_avatar')
        .in('id', otherUserIds);

      const profileMap = new Map();
      if (profilesData) {
        profilesData.forEach(p => profileMap.set(p.id, p));
      }

      const map = new Map();
      msgs.forEach((m) => {
        const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
        const otherProfile = profileMap.get(otherId);

        if (!map.has(otherId) && otherProfile) {
          map.set(otherId, {
            user_id: otherId,
            username: otherProfile.username,
            gender_avatar: otherProfile.gender_avatar,
            lastMessage: m.message_text,
            created_at: m.created_at,
            is_unread: m.receiver_id === userId && !m.is_read,
          });
        }
      });
      setConversations(Array.from(map.values()));
    } else {
      setConversations([]);
    }
  };

  const handleLogData = async () => {
    if (!logInput.trim()) return;
    setLoadingAI(true);
    setStatusMessage('Saving interest vector...');

    try {
      await logUserInterest(session.user.id, logInput.trim());
      setStatusMessage('Log saved!');
      setLogInput('');
      await fetchUserLogs(session.user.id);
    } catch (err) {
      setStatusMessage(err.message || 'Failed to save log.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleDeleteSingleLog = async (logId) => {
    const { error } = await supabase.from('user_logs').delete().eq('id', logId);
    if (!error) {
      setUserLogs((prev) => prev.filter((l) => l.id !== logId));
    }
  };

  const handleDeleteAllLogs = async () => {
    if (!window.confirm('Delete all your logged details?')) return;
    const { error } = await supabase.from('user_logs').delete().eq('user_id', session.user.id);
    if (!error) {
      setUserLogs([]);
    }
  };

  const handleFindLikeminds = async () => {
    if (!logInput.trim()) return;
    setLoadingAI(true);
    setStatusMessage('Searching AI vector database...');

    try {
      const rawResults = await searchLikeminds(logInput.trim(), session.user.id);
      
      const uniqueUsersMap = new Map();
      rawResults.forEach((match) => {
        if (!uniqueUsersMap.has(match.user_id)) {
          uniqueUsersMap.set(match.user_id, match);
        }
      });

      const deduplicatedResults = Array.from(uniqueUsersMap.values());

      setMatchResults(deduplicatedResults);
      setStatusMessage(
        deduplicatedResults.length > 0 
          ? `Found ${deduplicatedResults.length} match(es)!` 
          : 'No close matches found.'
      );
    } catch (err) {
      setStatusMessage(err.message || 'Failed to search database.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleStartDirectChat = async () => {
    if (!directUsername.trim()) return;
    const cleanUser = directUsername.replace('@', '').trim();
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', cleanUser)
      .single();

    if (data) {
      setSelectedChatUser({
        user_id: data.id,
        username: data.username,
        gender_avatar: data.gender_avatar,
      });
      setDirectUsername('');
    } else {
      alert(`User @${cleanUser} not found.`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch = c.username.toLowerCase().includes(chatSearch.toLowerCase());
    if (chatFilter === 'unread') return matchesSearch && c.is_unread;
    if (chatFilter === 'read') return matchesSearch && !c.is_unread;
    return matchesSearch;
  });

  const inChatRoom = activeTab === 'chat' && selectedChatUser !== null;

  return (
    <div className="flex flex-col w-full h-[100dvh] bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {!session && <AuthModal onAuthSuccess={(user) => fetchProfile(user.id)} />}

      {/* TOP HEADER */}
      {!inChatRoom && (
        <header className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center sticky top-0 z-10 shadow-md shrink-0">
          <div>
            <h1 className="font-bold text-emerald-400 text-base tracking-wide">GINGOMART</h1>
            <p className="text-[11px] text-slate-400">{profile ? `@${profile.username}` : 'P2P Marketplace'}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full">
            <Wallet className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400">
              {profile ? Number(profile.gmart_balance).toFixed(2) : '0.00'} GMART
            </span>
          </div>
        </header>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 w-full max-w-xl mx-auto overflow-hidden relative flex flex-col">
        {activeTab === 'chat' && (
          selectedChatUser ? (
            <ChatRoom
              currentUserId={session.user.id}
              targetUser={selectedChatUser}
              onBack={() => {
                setSelectedChatUser(null);
                fetchRecentConversations(session.user.id);
                fetchProfile(session.user.id);
              }}
            />
          ) : (
            <div className="p-3 space-y-4 overflow-y-auto pb-24">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-100">Messages</h2>
                <div className="flex items-center gap-2">
                  <button className="p-2 bg-slate-800 rounded-full border border-slate-700 text-slate-300 relative">
                    <Bell className="w-5 h-5" />
                    {conversations.some((c) => c.is_unread) && (
                      <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900"></span>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-2xl px-3 py-2">
                <Edit2 className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={directUsername}
                  onChange={(e) => setDirectUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartDirectChat()}
                  placeholder="Message someone: @username"
                  className="bg-transparent border-none text-xs text-slate-100 placeholder-slate-500 focus:outline-none w-full"
                />
                <button
                  onClick={handleStartDirectChat}
                  className="text-xs bg-emerald-600 text-white font-bold px-3 py-1 rounded-xl"
                >
                  Start
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setChatFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${chatFilter === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setChatFilter('unread')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${chatFilter === 'unread' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                  >
                    Unread
                    {conversations.filter((c) => c.is_unread).length > 0 && (
                      <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                        {conversations.filter((c) => c.is_unread).length}
                      </span>
                    )}
                  </button>
                </div>

                <input
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Search chats..."
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1 text-xs text-slate-200 focus:outline-none w-28"
                />
              </div>

              <div className="space-y-2">
                {filteredConversations.length > 0 ? (
                  filteredConversations.map((c) => (
                    <div
                      key={c.user_id}
                      onClick={() => setSelectedChatUser(c)}
                      className="bg-slate-800/90 hover:bg-slate-800 p-3 rounded-2xl border border-slate-700 flex items-center justify-between cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-slate-700 flex items-center justify-center font-bold text-slate-200 text-sm border border-slate-600 shrink-0">
                          {c.gender_avatar === 'female' ? '👩' : '👨'}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-xs font-bold text-slate-100">@{c.username}</h4>
                          <p className="text-[11px] text-slate-400 truncate max-w-[180px] mt-0.5">
                            {c.lastMessage}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                        {c.is_unread && (
                          <span className="w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                            1
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    No active messages found.
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* AI MATCH & LOGGED DETAILS TAB */}
        {activeTab === 'matchmaking' && (
          <div className="p-3 space-y-4 overflow-y-auto pb-24">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm">
              <h2 className="text-sm font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> AI Interest Logger
              </h2>
              <textarea
                value={logInput}
                onChange={(e) => setLogInput(e.target.value)}
                placeholder="Log your interest or need (e.g., Looking for a Web3 developer)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 h-24 resize-none mb-3"
              ></textarea>
              <div className="flex gap-2">
                <button
                  onClick={handleLogData}
                  disabled={loadingAI}
                  className="flex-1 bg-emerald-600 text-white text-xs py-2.5 rounded-lg font-medium"
                >
                  Log Detail
                </button>
                <button
                  onClick={handleFindLikeminds}
                  disabled={loadingAI}
                  className="flex-1 bg-slate-700 text-slate-200 text-xs py-2.5 rounded-lg font-medium"
                >
                  Find Matches
                </button>
              </div>
              {statusMessage && <p className="text-[11px] text-amber-400 mt-2">{statusMessage}</p>}
            </div>

            {/* LOGGED DETAILS SECTION */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-200">Your Logged Details</h3>
                {userLogs.length > 0 && (
                  <button
                    onClick={handleDeleteAllLogs}
                    className="text-[10px] text-red-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="w-3 h-3" /> Delete All
                  </button>
                )}
              </div>

              {userLogs.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {userLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/60 flex justify-between items-center text-xs"
                    >
                      <p className="text-slate-300 text-[11px] flex-1 pr-2">
                        {log.log_text || log.content || log.interest_text}
                      </p>
                      <button
                        onClick={() => handleDeleteSingleLog(log.id)}
                        className="text-slate-500 hover:text-red-400 transition p-1 shrink-0"
                        title="Delete log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No logged details saved yet.</p>
              )}
            </div>

            {/* MATCH RESULTS */}
            {matchResults.map((match) => (
              <div key={match.log_id || match.user_id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-emerald-400">@{match.username}</span>
                  <p className="text-xs text-slate-300 mt-1">"{match.log_text}"</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedChatUser({
                      user_id: match.user_id,
                      username: match.username,
                      gender_avatar: match.gender_avatar,
                    });
                    setActiveTab('chat');
                  }}
                  className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                >
                  Chat
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'p2p' && (
  <P2PMarket
    currentUserId={session.user.id}
    onBalanceChange={() => fetchProfile(session.user.id)} />
        )}
    
        
        {/* PROFILE TAB */}
        {activeTab === 'profile' && profile && (
          <div className="p-3 bg-slate-800 p-4 rounded-2xl border border-slate-700 text-xs space-y-3 m-3">
            <h2 className="text-sm font-bold text-emerald-400">Account</h2>
            <div className="p-3 bg-slate-900 rounded-xl flex justify-between">
              <span>Username</span>
              <span className="text-emerald-400 font-bold">@{profile.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}
      </main>

      {/* BOTTOM NAV */}
      {!inChatRoom && (
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 grid grid-cols-3 p-2 z-20 shadow-lg shrink-0">
          <button
            onClick={() => setActiveTab('matchmaking')}
            className={`flex flex-col items-center py-1.5 ${activeTab === 'matchmaking' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] mt-1">AI Match</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center py-1.5 ${activeTab === 'chat' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] mt-1">Chats</span>
          </button>
          
<button
  onClick={() => setActiveTab('p2p')}
  className={`flex flex-col items-center py-1.5 ${activeTab === 'p2p' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
>
  <Wallet className="w-5 h-5" />
  <span className="text-[10px] mt-1">P2P</span>
</button>
          
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center py-1.5 ${activeTab === 'profile' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-1">Profile</span>
          </button>
        </nav>
      )}
    </div>
  );
}
