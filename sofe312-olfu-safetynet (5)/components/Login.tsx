
import React, { useState } from 'react';
import { User as AppUser } from '../types';
import { Lock, User as UserIcon, ArrowRight, ShieldCheck, RefreshCcw, Mail } from 'lucide-react';
import Logo from './Logo';
import { api } from '../api';
import { auth, db } from '../src/lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface Props {
  onLogin: (user: AppUser) => void;
  users: AppUser[];
}

const Login: React.FC<Props> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    processLogin(username, password);
  };

  const processLogin = async (uname: string, upass: string) => {
    setIsLoading(true);
    setError('');

    try {
      console.log(`System: Attempting login for handle "${uname}"...`);
      const userMatch = (users || []).find(u => u.username.toLowerCase() === uname.toLowerCase());
      
      if (userMatch) {
        console.log(`System: User matched. Identity validated as ${userMatch.role}.`);
        if (userMatch.password && userMatch.password !== upass) {
          console.warn("System: Invalid PIN entered.");
          setError('Invalid Security PIN. Please verify your credentials.');
          setIsLoading(false);
          return;
        }

        console.log("System: Granting terminal access...");
        onLogin(userMatch);
        // We don't set isLoading(false) here because the component will unmount
      } else {
        console.warn(`System: No account found for handle "${uname}".`);
        setError('Unauthorized access. Please verify credentials.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError('System authentication error. Please try Google Login.');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // App.tsx handles state change
    } catch (err) {
      console.error(err);
      setError('Google Authentication failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleEmergencyReset = () => {
    if (window.confirm("This will clear all local shift data and reset the system. Continue?")) {
      api.clearAllData();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-800 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-green-400/10 blur-[120px] rounded-full"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      <div className="w-full max-w-[420px] z-10 animate-fade-in">
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/40 shadow-green-950/20">
          <div className="pt-12 pb-8 px-8 text-center bg-gradient-to-b from-green-50/50 to-transparent">
            <div className="mx-auto w-20 h-20 mb-6 transform transition-transform hover:scale-110 duration-500 drop-shadow-sm">
               <Logo />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">SafetyNet</h1>
            <p className="text-green-700 text-xs font-black uppercase tracking-[0.2em] mt-3 opacity-90">Valenzuela Main Campus</p>
          </div>

          <div className="px-10 pb-12">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Authentication ID</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-green-600 transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500/50 text-slate-900 placeholder-slate-400 transition-all outline-none font-medium"
                    placeholder="Username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security PIN</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-green-600 transition-colors" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500/50 text-slate-900 placeholder-slate-400 transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 text-xs font-bold flex items-center gap-3 animate-shake">
                   <ShieldCheck size={18} className="shrink-0" />
                   {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative group overflow-hidden bg-green-700 text-white font-black py-4.5 rounded-2xl transition-all shadow-xl shadow-green-700/20 active:scale-95 disabled:opacity-70 mt-4 h-16"
              >
                <div className="absolute inset-0 bg-green-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                  {isLoading ? 'Verifying Identity...' : 'Access Terminal'}
                  {!isLoading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                </span>
              </button>

              <div className="relative my-8 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <span className="relative px-4 bg-white text-[10px] font-black text-slate-300 uppercase tracking-widest">Or Secure Link</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full bg-white border-2 border-slate-100 text-slate-600 font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase text-xs tracking-widest hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-70"
              >
                <Mail size={18} className="text-red-500" /> Sign in with Google
              </button>
            </form>
            
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
               <button 
                onClick={handleEmergencyReset}
                className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-[0.2em] flex items-center justify-center gap-2 mx-auto transition-colors"
               >
                 <RefreshCcw size={12} /> Emergency System Reset
               </button>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">
          Our Lady of Fatima University • © 2025
        </p>
      </div>
    </div>
  );
};

export default Login;
