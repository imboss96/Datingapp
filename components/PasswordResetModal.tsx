import React, { useState } from 'react';
import apiClient from '../services/apiClient';
import { useAlert } from '../services/AlertContext';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'request' | 'reset' | 'change';
  userEmail?: string;
}

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  mode,
  userEmail = '',
}) => {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'request' | 'token'>('request');

  // Request/Reset form states
  const [email, setEmail] = useState(userEmail);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Change password form states
  const [currentPassword, setCurrentPassword] = useState('');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showAlert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.requestPasswordReset(email);
      showAlert('Check Email', 'Password reset link has been sent to your email');
      setStep('token');
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetToken.trim()) {
      showAlert('Error', 'Please enter the reset code');
      return;
    }

    if (!newPassword || !confirmPassword) {
      showAlert('Error', 'Please enter both passwords');
      return;
    }

    if (newPassword.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiClient.resetPassword(email, resetToken, newPassword);
      showAlert('Success', 'Your password has been reset successfully. Please log in with your new password.');
      handleClose();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      showAlert('Error', 'Please enter your current password');
      return;
    }

    if (!newPassword || !confirmPassword) {
      showAlert('Error', 'Please enter both new passwords');
      return;
    }

    if (newPassword.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('Error', 'New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiClient.changePassword(currentPassword, newPassword);
      showAlert('Success', 'Your password has been changed successfully');
      handleClose();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form states
    setEmail(userEmail);
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPassword('');
    setStep('request');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all animate-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-red-500 p-6 text-white">
          <h2 className="text-xl font-bold">
            {mode === 'change' ? 'Change Password' : 'Reset Password'}
          </h2>
        </div>

        {/* Body */}
        <form
          onSubmit={
            mode === 'change'
              ? handleChangePassword
              : step === 'token'
              ? handleResetPassword
              : handleRequestReset
          }
          className="p-6 space-y-4"
        >
          {/* Request/Reset Mode */}
          {mode !== 'change' && (
            <>
              {step === 'request' ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Enter your email to receive a password reset code
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reset Code
                    </label>
                    <input
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Enter code from email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Check your email for the reset code (valid for 15 minutes)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      disabled={loading}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Change Password Mode */}
          {mode === 'change' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  disabled={loading}
                />
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-2xl transition disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              if (mode === 'change') {
                handleChangePassword(e as any);
              } else if (step === 'token') {
                handleResetPassword(e as any);
              } else {
                handleRequestReset(e as any);
              }
            }}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-semibold rounded-2xl transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Processing...' : step === 'request' ? 'Send Reset Code' : 'Reset Password'}
          </button>
        </div>

        {/* Back button for token step */}
        {mode !== 'change' && step === 'token' && (
          <div className="px-6 pb-4">
            <button
              onClick={() => {
                setStep('request');
                setResetToken('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 transition"
              disabled={loading}
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordResetModal;
