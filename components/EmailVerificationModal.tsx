import React, { useState } from 'react';
import apiClient from '../services/apiClient';

const EmailVerificationModal: React.FC<{
  email: string;
  onClose: () => void;
  onVerified?: () => void;
}> = ({ email, onClose, onVerified }) => {
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(`A verification code was sent to ${email}`);

  const handleResend = async () => {
    try {
      setSending(true);
      await apiClient.requestEmailVerification(email);
      setInfo('Verification code resent');
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    } finally { setSending(false); }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    try {
      await apiClient.verifyEmailOTP(email, otp);
      setInfo('Email verified');
      onVerified && onVerified();
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally { setVerifying(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50 p-4">
      <div className="bg-white w-full md:max-w-sm rounded-t-3xl md:rounded-3xl overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="font-bold">Verify your email</h3>
          <button onClick={onClose} className="text-gray-500">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {info && <div className="text-sm text-gray-600">{info}</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}

          <div>
            <label className="text-xs text-gray-500">Enter 6-digit code</label>
            <input value={otp} onChange={e => setOtp(e.target.value)} className="w-full mt-2 p-3 border rounded-lg" placeholder="123456" />
          </div>

          <div className="flex gap-2">
            <button onClick={handleVerify} disabled={verifying || otp.length < 6} className="flex-1 py-3 bg-blue-600 text-white rounded-lg">{verifying ? 'Verifying...' : 'Verify'}</button>
            <button onClick={handleResend} disabled={sending} className="py-3 px-4 border rounded-lg">{sending ? 'Sending...' : 'Resend'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default EmailVerificationModal;
