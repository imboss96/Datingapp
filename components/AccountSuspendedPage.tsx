import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface AccountSuspendedPageProps {
  isModal?: boolean;
  onClose?: () => void;
  error?: any;
  email?: string;
}

const AccountSuspendedPage: React.FC<AccountSuspendedPageProps> = ({ 
  isModal = false, 
  onClose,
  error: propError,
  email: propEmail
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Use props if provided, otherwise fall back to location state
  const error = propError || (location.state as any)?.error || {};
  const email = propEmail || (location.state as any)?.email || '';

  const isBanned = error.code === 'ACCOUNT_BANNED' || error.message?.includes('Banned');
  const suspensionType = isBanned ? 'banned' : 'suspended';
  const typeName = isBanned ? 'Banned' : 'Suspended';

  const content = (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 text-center">
        <div className="text-5xl mb-3">
          <i className="fa-solid fa-circle-exclamation"></i>
        </div>
        <h1 className="text-xl font-bold mb-1">Account {typeName}</h1>
        <p className="text-red-100 text-xs">Access restricted</p>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[70vh] overflow-y-auto">
        {/* Status Box */}
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-5 rounded">
          <p className="text-xs text-red-700 font-semibold mb-1">Account Status:</p>
          <p className="text-red-900 font-bold text-sm">{error.message || `Your account has been ${suspensionType}`}</p>
        </div>

        {/* Reason */}
        {error.reason && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-600 mb-2">Reason:</p>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-gray-700 text-xs">{error.reason}</p>
            </div>
          </div>
        )}

        {/* Date */}
        {(error.suspendedAt || error.bannedAt) && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-600 mb-2">
              {isBanned ? 'Banned Date' : 'Suspension Date'}:
            </p>
            <p className="text-gray-700 text-xs">
              {new Date(error.suspendedAt || error.bannedAt).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        )}

        {/* Support Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
          <p className="text-xs text-blue-900 mb-2 font-semibold">
            <i className="fa-solid fa-info-circle text-blue-500 mr-2"></i>
            What you can do:
          </p>
          <ul className="text-xs text-blue-800 space-y-1 ml-4">
            <li className="list-disc">Review our community guidelines</li>
            <li className="list-disc">Contact our support team for an appeal</li>
            <li className="list-disc">Learn about account recovery options</li>
          </ul>
        </div>

        {/* Contact Support */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5">
          <p className="text-xs font-semibold text-amber-900 mb-2">
            <i className="fa-solid fa-headset text-amber-600 mr-2"></i>
            Contact Support
          </p>
          <div className="text-xs">
            <p className="text-gray-600 mb-1">Email:</p>
            <a
              href={`mailto:${error.contactEmail || 'support@lunesa.com'}?subject=Account%20${typeName}%20Appeal`}
              className="text-blue-600 hover:text-blue-700 font-semibold break-all"
            >
              {error.contactEmail || 'support@lunesa.com'}
            </a>
          </div>
        </div>

        {/* Additional Info */}
        {isBanned ? (
          <div className="bg-red-50 p-3 rounded-lg border border-red-200 mb-5">
            <p className="text-xs text-red-800">
              <strong>Permanent Ban:</strong> This account has been permanently banned. Contact support immediately if you believe this is an error.
            </p>
          </div>
        ) : (
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 mb-5">
            <p className="text-xs text-orange-800">
              <strong>Temporary Suspension:</strong> Your account access is temporarily restricted. You may be able to appeal.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <a
            href={`mailto:${error.contactEmail || 'support@lunesa.com'}?subject=Account%20${typeName}%20Appeal&body=I%20would%20like%20to%20appeal%20my%20account%20${suspensionType}.%0A%0AEmail:%20${email}`}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <i className="fa-solid fa-envelope"></i>
            Appeal via Email
          </a>
          {!isModal && (
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <i className="fa-solid fa-arrow-left"></i>
              Return Home
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Modal version - overlay with close button
  if (isModal) {
    return (
      <div className="fixed inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center p-4 z-50">
        <div className="relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute -top-10 right-0 text-gray-800 hover:text-gray-600 text-xl font-bold"
            >
              ✕
            </button>
          )}
          {content}
        </div>
      </div>
    );
  }

  // Full page version - for direct route
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      {content}
    </div>
  );
};

export default AccountSuspendedPage;
