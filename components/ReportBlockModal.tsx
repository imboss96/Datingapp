import React, { useState } from 'react';
import { UserProfile } from '../types';
import { useAlert } from '../services/AlertContext';

interface ReportBlockModalProps {
  isOpen: boolean;
  targetUser: UserProfile | null;
  onClose: () => void;
  onReport: (reason: string, description: string) => void;
  onBlock: () => void;
  isBlocked: boolean;
}

type ActionType = 'block' | 'report' | null;

const ReportBlockModal: React.FC<ReportBlockModalProps> = ({
  isOpen,
  targetUser,
  onClose,
  onReport,
  onBlock,
  isBlocked,
}) => {
  const { showAlert } = useAlert();
  const [action, setAction] = useState<ActionType>(null);
  const [reportReason, setReportReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleReportSubmit = () => {
    if (!reportReason) {
      showAlert('Missing Reason', 'Please select a reason');
      return;
    }
    onReport(reportReason, description);
    setSubmitted(true);
    setTimeout(() => {
      setAction(null);
      setReportReason('');
      setDescription('');
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  const handleBlockSubmit = () => {
    onBlock();
    setSubmitted(true);
    setTimeout(() => {
      onClose();
      setSubmitted(false);
    }, 1500);
  };

  if (!isOpen || !targetUser) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Safety Options</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {action === null && (
          <div className="space-y-3">
            {/* Block Button */}
            <button
              onClick={() => setAction('block')}
              className={`w-full p-4 rounded-2xl border-2 transition text-left ${
                isBlocked
                  ? 'border-gray-300 bg-gray-50 cursor-not-allowed opacity-50'
                  : 'border-red-300 hover:border-red-500 hover:bg-red-50'
              }`}
              disabled={isBlocked}
            >
              <div className="flex items-start gap-3">
                <i className={`fa-solid fa-ban text-xl ${isBlocked ? 'text-gray-400' : 'text-red-500'}`}></i>
                <div>
                  <h4 className="font-bold text-gray-900">
                    {isBlocked ? 'Already Blocked' : 'Block User'}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    {isBlocked
                      ? 'You have blocked this user'
                      : 'Hide this profile and prevent contact'}
                  </p>
                </div>
              </div>
            </button>

            {/* Report Button */}
            <button
              onClick={() => setAction('report')}
              className="w-full p-4 rounded-2xl border-2 border-amber-300 hover:border-amber-500 hover:bg-amber-50 transition text-left"
            >
              <div className="flex items-start gap-3">
                <i className="fa-solid fa-flag text-xl text-amber-500"></i>
                <div>
                  <h4 className="font-bold text-gray-900">Report User</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Help us keep Spark safe for everyone
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 text-gray-600 font-bold hover:text-gray-900 transition"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Block Confirmation */}
        {action === 'block' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-sm text-gray-700">
                Blocking <span className="font-bold">{targetUser.username || targetUser.name}</span> will:
              </p>
              <ul className="text-xs text-gray-600 mt-3 space-y-2">
                <li className="flex gap-2">
                  <span>✓</span> Hide their profile from you
                </li>
                <li className="flex gap-2">
                  <span>✓</span> Prevent them from messaging you
                </li>
                <li className="flex gap-2">
                  <span>✓</span> Remove existing chats
                </li>
              </ul>
            </div>

            {!submitted ? (
              <button
                onClick={handleBlockSubmit}
                className="w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition"
              >
                Confirm Block
              </button>
            ) : (
              <div className="text-center py-4">
                <i className="fa-solid fa-check-circle text-emerald-500 text-3xl mb-2"></i>
                <p className="text-sm font-bold text-gray-900">User blocked</p>
              </div>
            )}

            <button
              onClick={() => setAction(null)}
              disabled={submitted}
              className="w-full py-2 text-gray-600 font-bold hover:text-gray-900 transition disabled:opacity-50"
            >
              Back
            </button>
          </div>
        )}

        {/* Report Form */}
        {action === 'report' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Reason for Report
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select a reason</option>
                <option value="INAPPROPRIATE_CONTENT">Inappropriate Content</option>
                <option value="HARASSMENT">Harassment or Abuse</option>
                <option value="FAKE_PROFILE">Fake Profile</option>
                <option value="SCAM">Scam or Fraud</option>
                <option value="UNDERAGE">Underage User</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Additional Details
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                placeholder="Please provide any relevant details..."
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/500</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-700">
                <i className="fa-solid fa-lock text-amber-500 mr-2"></i>
                Your report is confidential. We'll review it and take action if needed.
              </p>
            </div>

            {!submitted ? (
              <button
                onClick={handleReportSubmit}
                disabled={!reportReason}
                className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 disabled:bg-gray-400 transition"
              >
                Submit Report
              </button>
            ) : (
              <div className="text-center py-4">
                <i className="fa-solid fa-check-circle text-emerald-500 text-3xl mb-2"></i>
                <p className="text-sm font-bold text-gray-900">Report submitted</p>
              </div>
            )}

            <button
              onClick={() => setAction(null)}
              disabled={submitted}
              className="w-full py-2 text-gray-600 font-bold hover:text-gray-900 transition disabled:opacity-50"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportBlockModal;
