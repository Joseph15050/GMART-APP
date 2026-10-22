import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import AuthModal from './components/AuthModal';
import ChatRoom from './components/ChatRoom';
import { logUserInterest, searchLikeminds } from './aiEngine';
import { MessageSquare, Search, User, Wallet, LogOut, Trash2, Sparkles } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('matchmaking');
  
  // AI Match & Chat States
  const [logInput, setLogInput] = useState('');
  const [userLogs, setUserLogs] = useState([]);
  const [matchResults, setMatchResults] = useState([]);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('info');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchMyLogs(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchMyLogs(session.user.id);
      } else {
        setProfile(null);
        setUserLogs([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  const fetchMyLogs = async (userId) => {
    const { data } = await supabase
      .from('user_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setUserLogs(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleLogData = async () => {
    if (!logInput.trim()) return;
    setLoadingAI(true);
    setStatusMessage('Generating vector embeddings & saving log...');
    setStatusType('info');

    try {
      await logUserInterest(session.user.id, logInput.trim());
      setStatusMessage('Log saved! Visible to AI matchmakers.');
      setStatusType('success');
      setLogInput('');
      fetchMyLogs(session.user.id);
    } catch (err) {
      setStatusMessage(err.message || 'Failed to save log.');
      setStatusType('error');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleFindLikeminds = async () => {
    if (!logInput.trim()) return;
    setLoadingAI(true);
    setStatusMessage('Searching AI vector database...');
    setStatusType('info');
    setMatchResults([]);

    try {
      const results = await searchLikeminds(logInput.trim(), session.user.id);
      setMatchResults(results);
      if (results.length === 0) {
        setStatusMessage('No close matches found yet.');
        setStatusType('info');
      } else {
        setStatusMessage(`Found ${results.length} matching profile(s)!`);
        setStatusType('success');
      }
    } catch (err) {
      setStatusMessage(err.message || 'Failed to search match database.');
      setStatusType('error');
    } finally {
      setLoadingAI(false);
    }
  };

  const startChatWithUser = (userMatch) => {
    setSelectedChatUser({
      user_id: userMatch.user_id,
      username: userMatch.username,
      gender_avatar: userMatch.gender_avatar,
    });
    setActiveTab('chat');
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-slate-900 text-slate-100">
      {!session && <AuthModal onAuthSuccess={(user) => fetchProfile(user.id)} />}

      {/* Header */}
      <header className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center sticky top-0 z-10 shadow-md">
        <div>
          <h1 className="font-bold text-emerald-400 text-base tracking-wide">GMART APP</h1>
          <p className="text-[11px] text-slate-400">
            {profile ? `@${profile.username}` : 'Matchmaking & Escrow'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full">
          <Wallet className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-amber-400">
            {profile ? Number(profile.gmart_balance).toFixed(2) : '0.00'} GMART
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-3 max-w-2xl mx-auto w-full overflow-hidden flex flex-col">
        {statusMessage && activeTab === 'matchmaking' && (
          <div className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
            statusType === 'success' 
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
              : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
          }`}>
            <Sparkles className="w-4 h-4 shrink-0 animate-spin" />
            <span>{statusMessage}</span>
          </div>
        )}

        {activeTab === 'chat' && (
          selectedChatUser ? (
            <ChatRoom
              currentUserId={session.user.id}
              targetUser={selectedChatUser}
              onBack={() => setSelectedChatUser(null)}
            />
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Active Conversations
              </h3>
              {matchResults.length > 0 ? (
                matchResults.map((usr) => (
                  <div
                    key={usr.user_id}
                    onClick={() => startChatWithUser(usr)}
                    className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex items-center justify-between cursor-pointer hover:border-emerald-500/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-xs">
                        @{usr.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">@{usr.username}</h4>
                        <p className="text-[10px] text-slate-400">Tap to view chat & escrow history</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full font-medium">
                      Open Chat
                    </span>
                  </div>
                ))
              ) : (
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center py-12">
                  <MessageSquare className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <h3 className="text-xs font-semibold text-slate-200">No active chats selected</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Find a likemind on the "AI Match" tab and tap "Chat" to begin messaging live!
                  </p>
                </div>
              )}
            </div>
          )
        )}

            {/* Matched Likeminds Card */}
            {matchResults.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Matched Likeminds</h3>
                {matchResults.map((match) => (
                  <div key={match.log_id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-400">@{match.username}</span>
                        <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                          {match.gender_avatar === 'female' ? '👩 Female' : '👨 Male'}
                        </span>
                        <span className="text-[10px] text-amber-400 font-mono">
                          {(match.similarity * 100).toFixed(0)}% Match
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">"{match.log_text}"</p>
                    </div>
                    <button 
                      onClick={() => startChatWithUser(match)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-medium shrink-0 ml-3 flex items-center gap-1 shadow"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Chat
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          selectedChatUser ? (
            <ChatRoom
              currentUserId={session.user.id}
              targetUser={selectedChatUser}
              onBack={() => setSelectedChatUser(null)}
            />
          ) : (
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center py-16">
              <MessageSquare className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
              <h3 className="text-sm font-semibold text-slate-200">LagosLife Chatroom</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select a matched user from the "AI Match" tab to start chatting live!
              </p>
            </div>
          )
        )}

        {activeTab === 'profile' && profile && (
          <div className="space-y-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <h2 className="text-sm font-semibold text-emerald-400 mb-3">My Profile & Account</h2>
              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 flex justify-between items-center">
                  <span>Username</span>
                  <span className="text-emerald-400 font-bold">@{profile.username}</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 flex justify-between items-center">
                  <span>Avatar</span>
                  <span className="text-slate-200 font-medium">
                    {profile.gender_avatar === 'female' ? '👩 Female Avatar' : '👨 Male Avatar'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition mt-4"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Retro Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 grid grid-cols-3 p-2 z-20 shadow-lg">
        <button
          onClick={() => setActiveTab('matchmaking')}
          className={`flex flex-col items-center py-1.5 transition ${activeTab === 'matchmaking' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] mt-1">AI Match</span>
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center py-1.5 transition ${activeTab === 'chat' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] mt-1">Chats</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center py-1.5 transition ${activeTab === 'profile' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] mt-1">Profile</span>
        </button>
      </nav>
    </div>
  );
}
