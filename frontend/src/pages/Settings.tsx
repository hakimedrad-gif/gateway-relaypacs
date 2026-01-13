import React, { useState } from 'react';
import { totpApi } from '../services/api';
import NotificationToast from '../components/notifications/NotificationToast';

export const Settings: React.FC = () => {
  const [setupData, setSetupData] = useState<{
    secret: string;
    qr_code: string;
    provisioning_uri: string;
  } | null>(null);
  
  const [verificationCode, setVerificationCode] = useState('');
  const [isEnabled, setIsEnabled] = useState(false); // Ideally fetch from user profile
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleStartSetup = async () => {
    try {
      const data = await totpApi.setup();
      setSetupData(data);
      setNotification(null);
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to start 2FA setup' });
    }
  };

  const handleVerify = async () => {
    if (!setupData) return;
    try {
      const result = await totpApi.enable(verificationCode, setupData.secret);
      if (result.success) {
        setIsEnabled(true);
        setSetupData(null);
        setVerificationCode('');
        setNotification({ type: 'success', message: 'Two-Factor Authentication enabled!' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Invalid code. Please try again.' });
    }
  };

  const handleDisable = async () => {
    try {
      await totpApi.disable();
      setIsEnabled(false);
      setNotification({ type: 'success', message: 'Two-Factor Authentication disabled.' });
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to disable 2FA' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Settings</h1>
      
      {notification && (
        <div className="mb-4">
          <NotificationToast
            notification={{
              id: 'settings-toast',
              user_id: 'current',
              notification_type: notification.type === 'success' ? 'upload_complete' : 'upload_failed',
              title: notification.type === 'success' ? 'Success' : 'Error',
              message: notification.message,
              is_read: false,
              created_at: new Date().toISOString()
            }}
            onDismiss={() => setNotification(null)}
          />
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Security</h2>
        
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 pb-6">
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</h3>
              <p className="text-sm text-slate-500 mt-1">
                Add an extra layer of security to your account using TOTP apps (Google Authenticator, Authy).
              </p>
            </div>
            {isEnabled ? (
              <button
                onClick={handleDisable}
                className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
              >
                Disable 2FA
              </button>
            ) : (
              !setupData && (
                <button
                  onClick={handleStartSetup}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
                >
                  Enable 2FA
                </button>
              )
            )}
          </div>

          {setupData && (
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
              <h3 className="font-medium text-slate-900 dark:text-white mb-4">Setup 2FA</h3>
              
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-shrink-0">
                  <div className="bg-white p-2 rounded-lg inline-block">
                    <img src={setupData.qr_code} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                  <p className="text-xs text-center mt-2 text-slate-500">Scan with your auth app</p>
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Enter Verification Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000 000"
                        className="flex-1 max-w-[200px] px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-center tracking-widest"
                      />
                      <button
                        onClick={handleVerify}
                        disabled={verificationCode.length !== 6}
                        className="px-4 py-2 bg-green-600 text-white hover:bg-green-500 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                      >
                        Verify & Enable
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm rounded-md">
                    <strong>Note:</strong> If you cannot scan the QR code, you cannot proceed. We do not display the secret key for security reasons.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
