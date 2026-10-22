import React, { useState } from 'react';
import { MessageSquare, Search, User, Wallet } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('matchmaking');

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-900 border-x border-slate-800">
      {/* Header */}
      <header className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
        <div>
          <h1 className="font-bold text-emerald-400 text-lg tracking-wide">GMART APP</h1>
          <p className="text-xs text-slate-400">Matchmaking & Escrow</p>
        </div>
        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
          <Wallet className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-amber-400">0.00 GMART</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4">
        {activeTab === 'matchmaking' && (
          <div className="space-y-4">
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
              <h2 className="text-sm font-semibold text-emerald-400 mb-2">AI Interest Logger & Finder</h2>
              <p className="text-xs text-slate-300 mb-3">
                Tell AI what you do or what you need. Connect directly with likeminds.
              </p>
              <textarea 
                placeholder="E.g., Today I attended the 10X business summit in Port Harcourt..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 h-24 resize-none"
              ></textarea>
              <div className="flex gap-2 mt-2">
                <button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2.5 rounded-lg font-medium transition">
                  Log to My Database
                </button>
                <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs py-2.5 rounded-lg font-medium transition">
                  Find Likeminds
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">LagosLife style web chats will load here.</p>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Profile & Avatar configuration.</p>
          </div>
        )}
      </main>

      {/* Retro Bottom Navigation Bar */}
      <nav className="bg-slate-800 border-t border-slate-700 grid grid-cols-3 p-2">
        <button 
          onClick={() => setActiveTab('matchmaking')}
          className={`flex flex-col items-center py-1 ${activeTab === 'matchmaking' ? 'text-emerald-400' : 'text-slate-400'}`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] mt-1">AI Match</span>
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center py-1 ${activeTab === 'chat' ? 'text-emerald-400' : 'text-slate-400'}`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] mt-1">Chats</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center py-1 ${activeTab === 'profile' ? 'text-emerald-400' : 'text-slate-400'}`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] mt-1">Profile</span>
        </button>
      </nav>
    </div>
  );
}
