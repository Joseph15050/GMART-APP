import React, { useState } from 'react';
import { MessageSquare, Search, User, ShieldCheck, Wallet } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('matchmaking');

  return (
    <div class="flex flex-col h-screen max-w-md mx-auto bg-slate-900 border-x border-slate-800">
      {/* Header */}
      <header class="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
        <div>
          <h1 class="font-bold text-emerald-400 text-lg tracking-wide">GMART APP</h1>
          <p class="text-xs text-slate-400">Matchmaking & Escrow</p>
        </div>
        <div class="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
          <Wallet class="w-4 h-4 text-amber-400" />
          <span class="text-xs font-bold text-amber-400">0.00 GMART</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main class="flex-1 overflow-y-auto p-4">
        {activeTab === 'matchmaking' && (
          <div class="space-y-4">
            <div class="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
              <h2 class="text-sm font-semibold text-emerald-400 mb-2">AI Interest Logger & Finder</h2>
              <p class="text-xs text-slate-300 mb-3">
                Tell AI what you do or what you need. Connect directly with likeminds.
              </p>
              <textarea 
                placeholder="E.g., Today I attended the 10X business summit in Port Harcourt..."
                class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 h-24 resize-none"
              ></textarea>
              <div class="flex gap-2 mt-2">
                <button class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2.5 rounded-lg font-medium transition">
                  Log to My Database
                </button>
                <button class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs py-2.5 rounded-lg font-medium transition">
                  Find Likeminds
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div class="text-center py-12">
            <MessageSquare class="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p class="text-sm text-slate-400">LagosLife style web chats will load here.</p>
          </div>
        )}

        {activeTab === 'profile' && (
          <div class="text-center py-12">
            <User class="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p class="text-sm text-slate-400">Profile & Avatar configuration.</p>
          </div>
        )}
      </main>

      {/* Retro Bottom Navigation Bar */}
      <nav class="bg-slate-800 border-t border-slate-700 grid grid-cols-3 p-2">
        <button 
          onClick={() => setActiveTab('matchmaking')}
          class={`flex flex-col items-center py-1 ${activeTab === 'matchmaking' ? 'text-emerald-400' : 'text-slate-400'}`}
        >
          <Search class="w-5 h-5" />
          <span class="text-[10px] mt-1">AI Match</span>
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          class={`flex flex-col items-center py-1 ${activeTab === 'chat' ? 'text-emerald-400' : 'text-slate-400'}`}
        >
          <MessageSquare class="w-5 h-5" />
          <span class="text-[10px] mt-1">Chats</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          class={`flex flex-col items-center py-1 ${activeTab === 'profile' ? 'text-emerald-400' : 'text-slate-400'}`}
        >
          <User class="w-5 h-5" />
          <span class="text-[10px] mt-1">Profile</span>
        </button>
      </nav>
    </div>
  );
}
