import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { User, Lock, Mail, ShieldAlert } from 'lucide-react';

export default function AuthModal({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [genderAvatar, setGenderAvatar] = useState('male');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getDeviceIP = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip || '0.0.0.0';
    } catch (err) {
      return '0.0.0.0';
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        if (!username.trim()) throw new Error('Username is required.');

        // 1. Fetch user IP for anti-spam/anti-bot protection
        const userIP = await getDeviceIP();

        // 2. Sign up user via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          // 3. Create public profile with username, avatar, balance, and IP
          const { error: profileError } = await supabase.from('profiles').insert([
            {
              id: authData.user.id,
              username: username.toLowerCase().trim(),
              gender_avatar: genderAvatar,
              device_ip: userIP,
              gmart_balance: 0.00,
            },
          ]);

          if (profileError) throw profileError;
          onAuthSuccess(authData.user);
        }
      } else {
        // Sign In Flow
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;
        if (authData.user) onAuthSuccess(authData.user);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-emerald-400 text-center mb-1">
          {isSignUp ? 'Create GMART Account' : 'Welcome Back'}
        </h2>
        <p className="text-xs text-slate-400 text-center mb-6">
          {isSignUp ? 'Connect with likeminds & trade securely' : 'Sign in to access your chat & wallet'}
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. LagosDev"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Avatar Selection</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGenderAvatar('male')}
                    className={`py-2 rounded-lg border text-xs font-medium transition ${
                      genderAvatar === 'male'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    👨 Male Avatar
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenderAvatar('female')}
                    className={`py-2 rounded-lg border text-xs font-medium transition ${
                      genderAvatar === 'female'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    👩 Female Avatar
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg text-xs transition shadow-lg mt-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="text-[11px] text-slate-400 text-center mt-4">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
            }}
            className="text-emerald-400 hover:underline font-medium ml-1"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}
