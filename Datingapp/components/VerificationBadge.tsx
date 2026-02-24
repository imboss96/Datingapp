import React from 'react';

interface VerificationBadgeProps {
  verified: boolean | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({ verified, size = 'md', showText = true }) => {
  if (verified === undefined || verified === null) {
    return null; // No badge if verification status is unknown
  }

  if (!verified) {
    return null; // No badge for unverified users
  }

  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-6 h-6 text-sm',
    lg: 'w-8 h-8 text-lg'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className="flex items-center gap-1">
      <div className={`${sizeClasses[size]} rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shadow-sm border border-blue-200`}>
        <i className="fa-solid fa-check"></i>
      </div>
      {showText && (
        <span className={`${textSizeClasses[size]} font-semibold text-blue-600`}>
          Verified
        </span>
      )}
    </div>
  );
};

export default VerificationBadge;