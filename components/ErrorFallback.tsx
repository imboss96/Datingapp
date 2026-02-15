import React from 'react';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  context?: string; // Describe which part of the app had the error
}

/**
 * Fallback component displayed when an error occurs
 * Can be used standalone or within ErrorBoundary
 */
const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetError,
  context = 'this feature'
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 to-red-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">❌</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Error Loading {context}
        </h1>

        {/* Message */}
        <p className="text-center text-gray-600 mb-6">
          We encountered an unexpected problem. This has been reported to our team.
        </p>

        {/* Error Details (Development Only) */}
        {isDevelopment && error && (
          <div className="mb-6 bg-gray-100 rounded p-4 text-left">
            <h3 className="text-sm font-mono font-bold text-red-600 mb-2">
              Error Message:
            </h3>
            <p className="text-xs font-mono text-gray-700 whitespace-pre-wrap break-words">
              {error.message}
            </p>
            {error.stack && (
              <>
                <h3 className="text-sm font-mono font-bold text-red-600 mb-2 mt-4">
                  Stack Trace:
                </h3>
                <pre className="text-xs font-mono text-gray-600 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                  {error.stack}
                </pre>
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {resetError && (
            <button
              onClick={resetError}
              className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-pink-600 hover:to-red-600 transition shadow-md"
            >
              Try Again
            </button>
          )}

          <a
            href="/"
            className="block w-full text-center bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg hover:bg-gray-300 transition"
          >
            Go to Home
          </a>

          <a
            href="mailto:support@datingapp.com"
            className="block w-full text-center text-blue-600 font-semibold py-3 rounded-lg hover:text-blue-700 transition"
          >
            📧 Contact Support
          </a>
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-500 text-center mt-6">
          If the problem continues, please contact our support team at support@datingapp.com
        </p>
      </div>
    </div>
  );
};

/**
 * Inline error-fallback for smaller errors (not full screen)
 */
export const InlineErrorFallback: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({ 
  title = 'Something went wrong',
  message = 'Please try again',
  onRetry 
}) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-4">
      <div className="text-2xl flex-shrink-0">⚠️</div>
      <div className="flex-1">
        <h3 className="font-semibold text-red-900 mb-1">{title}</h3>
        <p className="text-sm text-red-700 mb-3">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm font-semibold text-red-600 hover:text-red-800 underline"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorFallback;
