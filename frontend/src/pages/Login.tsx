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
      // Check for 2FA requirement
      if (err.response?.status === 403 && err.response?.headers['x-totp-required'] === 'true') {
        setRequires2FA(true);
        setError(null); // Clear error to show 2FA input cleanly
        return; // Stop here, UI will update to show 2FA input
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
      {/* ... (Header section remains same) */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* ... (Logo section remains same) */}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl border border-white/5">
          {/* Mode switch buttons - hide during 2FA entry */}
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

          {requires2FA && (
            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <p className="text-sm font-bold text-blue-400 text-center">
                Two-Factor Authentication Required
              </p>
              <p className="text-xs text-slate-400 text-center mt-1">
                Enter the code from your authenticator app
              </p>
            </div>
          )}

          {!isOnline && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
               {/* ... (Offline indicator remains same) */}
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
                     {/* ... (Password toggle button remains same) */}
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
                  className="block w-full px-4 py-3.5 bg-slate-900/50 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all disabled:opacity-50 font-mono text-center tracking-[0.5em] text-lg"
                  placeholder="000 000"
                />
              </div>
            )}

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
                     {/* ... (Spinner SVG remains same) */}
                  </svg>
                ) : requires2FA ? (
                  'Verify & Sign In'
                ) : isRegisterMode ? (
                  'Create Secure Account'
                ) : (
                  'Sign In to Gateway'
                )}
              </button>
            </div>
            
            {requires2FA && (
              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setTotpCode('');
                  setPassword(''); // Clear password for security on cancel
                  setError(null);
                }}
                className="w-full text-center text-xs text-slate-500 hover:text-white transition-colors"
              >
                Cancel verification
              </button>
            )}
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
