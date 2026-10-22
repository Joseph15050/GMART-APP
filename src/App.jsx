import React, { useState } from 'react';
import { MessageSquare, Search, User, Wallet, Send, ShieldCheck, Trash2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('matchmaking');
  const [logInput, setLogInput] = useState('');
  const [balance, setBalance] = useState('0.00');
  const [statusMessage, setStatusMessage] = useState('');

  const handleLogData = () => {
    if (!logInput.trim()) return;
    setStatusMessage('Logging data to AI database...');
    setTimeout(() => {
      setStatusMessage('Successfully logged!');
      setLogInput('');
      setTimeout(() => setStatusMessage(''), 3000);
    }, 1000);
  };

  const handleFindLikeminds = () => {
    if (!logInput.trim()) return;
    setStatusMessage('Searching AI vector database for matches...');
    setTimeout(() => {
      setStatusMessage('Match search simulated successfully!');
      setTimeout(() => setStatusMessage(''), 3000);
    }, 1000);
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center sticky top-0 z-10 shadow-md">
        <div>
          <h1 className="font-bold text-emerald-400 text-base tracking-wide">GMART APP</h1>
          <p className="text-[11px] text-slate-400">Matchmaking & Escrow</p>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full">
          <Wallet className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-amber-400">{balance} GMART</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto max-w-2xl mx-auto w-full">
        {statusMessage && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg text-center animate-pulse">
            {statusMessage}
          </div>
        )}

        {activeTab === 'matchmaking' && (
          <div className="space-y-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm">
              <h2 className="text-sm font-semibold text-emerald-400 mb-1">AI Interest Logger & Finder</h2>
              <p className="text-xs text-slate-300 mb-3">
                Log what you do or search for likeminds instantly.
              </p>
              <textarea 
                value={logInput}
                onChange={(e) => setLogInput(e.target.value)}
                placeholder="E.g., Electrical installation expert in Port Harcourt..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 h-28 resize-none mb-3"
              ></textarea>
              <div className="flex gap-2">
                <button 
                  onClick={handleLogData}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-3 rounded-lg font-medium transition shadow"
                >
                  Log to Database
                </button>
                <button 
                  onClick={handleFindLikeminds}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs py-3 rounded-lg font-medium transition shadow"
                >
                  Find Likeminds
                </button>
              </div>
            </div>
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

        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <h2 className="text-sm font-semibold text-emerald-400 mb-2">My Profile & Data Controls</h2>
              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 flex justify-between items-center">
                  <span>Avatar Selection</span>
                  <span className="text-emerald-400 font-medium">Male Avatar</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 flex justify-between items-center">
                  <span>Device IP Protection</span>
                  <span className="text-slate-400">Tracked & Secured</span>
                </div>
                <button className="w-full bg-red-500/10 border border-red-500/30 text-red-400 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-red-500/20 transition">
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
