import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const Login: React.FC = () => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register } = useAuth();
  const isOnline = useNetworkStatus();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) return;

    setError(null);
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        await register(username, email, password);
      } else {
        await login(username, password);
      }
      navigate('/');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid username or password. Please try again.');
      } else if (err.response?.status === 400 && isRegisterMode) {
        setError(err.response.data.detail || 'Registration failed.');
      } else if (!isOnline) {
        setError('No network connection. Please check your internet.');
      } else {
        setError('A system error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-white line-height-tight">
          Relay<span className="text-blue-500">PACS</span>
        </h2>
        <p className="mt-2 text-center text-sm font-bold text-slate-500 uppercase tracking-widest">
          Secure Gateway Node
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl border border-white/5">
          <div className="flex gap-4 mb-8 p-1 bg-slate-900/50 rounded-2xl border border-white/5">
            <button
              onClick={() => setIsRegisterMode(false)}
              className={`flex-1 py-2 px-4 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                !isRegisterMode
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsRegisterMode(true)}
              className={`flex-1 py-2 px-4 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                isRegisterMode
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {!isOnline && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-500 mt-0.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="text-sm font-bold text-amber-500">Working Offline</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  You can {isRegisterMode ? 'create an account' : 'sign in'} once connectivity
                  returns. Your local study data is safe and pending upload.
                </p>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2"
              >
                User ID
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                disabled={!isOnline || isLoading}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full px-4 py-3.5 bg-slate-900/50 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all disabled:opacity-50"
                placeholder="Choose or enter your ID"
              />
            </div>

            {isRegisterMode && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label
                  htmlFor="email"
                  className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2"
                >
                  Clinical Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  disabled={!isOnline || isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-4 py-3.5 bg-slate-900/50 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all disabled:opacity-50"
                  placeholder="your-name@hospital.com"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2"
              >
                Security Key
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={!isOnline || isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3.5 bg-slate-900/50 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all disabled:opacity-50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057-5.064-7-9.542-7 1.274 4.057 5.064 7 9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.025 10.025 0 011.53-2.14m3.084-2.164a3 3 0 11-4.243-4.243m4.242 4.242L19.07 19.07M10.125 5.175A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-1.53 2.14M15.536 8.464a3 3 0 010 4.243L14.464 11.536m-4.242-4.242L10.125 5.175"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 animate-shake">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={!isOnline || isLoading}
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-black text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : isRegisterMode ? (
                  'Create Secure Account'
                ) : (
                  'Sign In to Gateway'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-white/5">
            <p className="text-[10px] font-bold text-slate-500 tracking-tight leading-relaxed">
              Clinical Session • AES-256 Encrypted Transfer
              <br />
              Authorized medical personnel only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
