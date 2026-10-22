import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import AuthModal from './components/AuthModal';
import { logUserInterest, searchLikeminds } from './aiEngine';
import { MessageSquare, Search, User, Wallet, LogOut, Trash2, Send, Sparkles, CheckCircle, ShieldAlert } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('matchmaking');
  
  // AI Match States
  const [logInput, setLogInput] = useState('');
  const [userLogs, setUserLogs] = useState([]);
  const [matchResults, setMatchResults] = useState([]);
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

  // 1. Log Interest / Activity
  const handleLogData = async () => {
    if (!logInput.trim()) return;
    setLoadingAI(true);
    setStatusMessage('Generating AI embeddings & storing log...');
    setStatusType('info');

    try {
      await logUserInterest(session.user.id, logInput.trim());
      setStatusMessage('Log saved successfully! Visible to AI matchmakers.');
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

  // 2. Search Likeminds via Vector Similarity
  const handleFindLikeminds = async () => {
    if (!logInput.trim()) return;
    setLoadingAI(true);
    setStatusMessage('Searching AI vector database for matching minds...');
    setStatusType('info');
    setMatchResults([]);

    try {
      const results = await searchLikeminds(logInput.trim(), session.user.id);
      setMatchResults(results);
      if (results.length === 0) {
        setStatusMessage('No close matches found yet. Try broadening your prompt!');
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

  // 3. Delete Individual Log
  const handleDeleteLog = async (logId) => {
    await supabase.from('user_logs').delete().eq('id', logId);
    fetchMyLogs(session.user.id);
  };

  // 4. Erase Entire Personal Database
  const handleEraseAllData = async () => {
    if (window.confirm('Are you sure you want to permanently erase all your logged data?')) {
      await supabase.from('user_logs').delete().eq('user_id', session.user.id);
      setUserLogs([]);
      setMatchResults([]);
      setStatusMessage('All personal logged data erased.');
      setStatusType('success');
    }
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
      <main className="flex-1 p-4 pb-24 overflow-y-auto max-w-2xl mx-auto w-full">
        {statusMessage && (
          <div className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
            statusType === 'success' 
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
              : statusType === 'error'
              ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
          }`}>
            <Sparkles className="w-4 h-4 shrink-0 animate-spin" />
            <span>{statusMessage}</span>
          </div>
        )}

        {activeTab === 'matchmaking' && (
          <div className="space-y-4">
            {/* AI Prompt Card */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm">
              <h2 className="text-sm font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> AI Interest Logger & Matchmaker
              </h2>
              <p className="text-xs text-slate-300 mb-3">
                Log what you do, or search for users with matching skills and interests.
              </p>
              <textarea
                value={logInput}
                onChange={(e) => setLogInput(e.target.value)}
                placeholder="E.g. I attended the 10X business summit in Port Harcourt, or looking for electrical installation..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 h-28 resize-none mb-3"
              ></textarea>
              <div className="flex gap-2">
                <button
                  onClick={handleLogData}
                  disabled={loadingAI}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-3 rounded-lg font-medium transition shadow disabled:opacity-50"
                >
                  Log My Data
                </button>
                <button
                  onClick={handleFindLikeminds}
                  disabled={loadingAI}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs py-3 rounded-lg font-medium transition shadow disabled:opacity-50"
                >
                  Find Likeminds
                </button>
              </div>
            </div>

            {/* AI Search Results */}
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
                      onClick={() => setActiveTab('chat')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg text-xs font-medium shrink-0 ml-3 flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Chat
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* My Active Logs Section */}
            {userLogs.length > 0 && (
              <div className="space-y-2 mt-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Public Logs ({userLogs.length})</h3>
                {userLogs.map((log) => (
                  <div key={log.id} className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between">
                    <p className="text-xs text-slate-300 pr-2">{log.log_text}</p>
                    <button 
                      onClick={() => handleDeleteLog(log.id)}
                      className="text-slate-500 hover:text-red-400 p-1 transition"
                      title="Delete log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="space-y-3">
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center py-12">
              <MessageSquare className="w-12 h-12 text-emerald-400 mx-auto mb-2 opacity-80" />
              <h3 className="text-sm font-semibold text-slate-200">LagosLife Chatroom</h3>
              <p className="text-xs text-slate-400 mt-1">Connect with matched users securely.</p>
            </div>
          </div>
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
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 flex justify-between items-center">
                  <span>Registered Device IP</span>
                  <span className="text-slate-400">{profile.device_ip || 'Secured'}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition mt-4"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>

                <button 
                  onClick={handleEraseAllData}
                  className="w-full bg-red-500/10 border border-red-500/30 text-red-400 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-red-500/20 transition mt-2"
                >
                  <Trash2 className="w-4 h-4" /> Erase Personal Database
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Retro Bottom Navigation Bar */}
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
