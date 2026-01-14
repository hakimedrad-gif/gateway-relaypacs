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
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) return;

    setError(null);
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        await register(username, email, password);
      } else {
        await login(username, password, requires2FA ? totpCode : undefined);
      }
      navigate('/');
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.headers['x-totp-required'] === 'true') {
        setRequires2FA(true);
        setError(null);
        return;
      }

      if (err.response?.status === 401) {
        setError('Invalid credentials or authentication code.');
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
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20">
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
        </div>
        <h2 className="text-4xl font-black text-white tracking-tighter mb-2">RelayPACS</h2>
        <p className="text-slate-400 font-bold text-sm tracking-tight uppercase">
          Medical DICOM Gateway
        </p>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl border border-white/5 relative overflow-hidden">
          {/* Status Indicator */}
          <div className="absolute top-4 right-6 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              }`}
            ></span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {!requires2FA && (
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
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {!requires2FA ? (
              <>
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
                    placeholder="Enter physician ID"
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
                      placeholder="physician@hospital.com"
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
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      {showPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.076m10.735 4.991A3.333 3.333 0 0112 15.667a3.333 3.333 0 01-3.333-3.334m4.667 0a3.333 3.333 0 01-3.334 3.334c-.167 0-.327-.013-.483-.038M12 5c4.477 0 8.268 2.943 9.542 7a10.017 10.017 0 01-4.28 5.766M17.226 17.226l-3.452-3.452m1.414-1.414l5.656 5.656"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
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
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="animate-in fade-in zoom-in duration-300">
                <label
                  htmlFor="totp"
                  className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2"
                >
                  Authentication Code
                </label>
                <input
                  id="totp"
                  name="totp"
                  type="text"
                  required
                  autoFocus
                  disabled={!isOnline || isLoading}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="block w-full px-4 py-3.5 bg-slate-900/50 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-center tracking-[0.5em] text-lg"
                  placeholder="000000"
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 animate-shake text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!isOnline || isLoading}
              className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-black text-white bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : requires2FA ? (
                'Verify & Sign In'
              ) : isRegisterMode ? (
                'Create Secure Account'
              ) : (
                'Sign In to Gateway'
              )}
            </button>
          </form>

          <footer className="mt-8 text-center pt-6 border-t border-white/5">
            <p className="text-[10px] font-bold text-slate-500 tracking-tight leading-relaxed">
              Clinical Session • AES-256 Encrypted Transfer
              <br />
              Authorized medical personnel only
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};
