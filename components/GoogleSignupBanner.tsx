import React from 'react';

interface GoogleSignupBannerProps {
  variant?: 'full' | 'compact';
  onClose?: () => void;
}

const GoogleSignupBanner: React.FC<GoogleSignupBannerProps> = ({ 
  variant = 'full', 
  onClose 
}) => {
  if (variant === 'compact') {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-4 mb-4 shadow-lg">
        <style>{`
          @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
          }
          .shimmer-text {
            animation: shimmer 3s infinite;
            background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
            background-size: 1000px 100%;
          }
        `}</style>
        
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.38 0 0 5.38 0 12s5.38 12 12 12 12-5.38 12-12S18.62 0 12 0zm3.6 12.3h-2.52v8.83H10.9v-8.83H9.63V9.25h1.27V7.75c0-1.05.25-2.7 2.64-2.7h2.05v2.6h-1.49c-.24 0-.42.12-.42.63v1.6h2.06l-.3 3.05z"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Quick & Secure Signup</p>
            <p className="text-white/90 text-xs">Sign up with Google for instant verification</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <i className="fa-solid fa-xmark text-lg" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl mb-8 shadow-2xl">
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .gradient-bg {
          animation: gradientShift 6s ease infinite;
          background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
          background-size: 400% 400%;
        }
        
        .float-icon {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      {/* Background gradient */}
      <div className="gradient-bg absolute inset-0" />
      
      {/* Decorative elements */}
      <div className="absolute top--20 right--20 w-64 h-64 bg-white/10 rounded-full" />
      <div className="absolute bottom--30 left--10 w-80 h-80 bg-white/5 rounded-full" />

      {/* Content */}
      <div className="relative z-10 p-8 md:p-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left side - Text */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="float-icon">
                <svg className="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white">Sign Up with Google</h2>
            </div>

            <p className="text-white/95 text-lg mb-2 font-semibold">
              The fastest way to get started
            </p>
            <p className="text-white/85 text-sm md:text-base mb-6 leading-relaxed">
              Skip the passwords, verify instantly, and start connecting. Google Sign-In is secure, quick, and recommended.
            </p>

            {/* Benefits */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-white/20 backdrop-blur">
                    <i className="fa-solid fa-bolt text-white text-xs" />
                  </div>
                </div>
                <span className="text-white/90 text-sm">Instant account verification</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-white/20 backdrop-blur">
                    <i className="fa-solid fa-shield text-white text-xs" />
                  </div>
                </div>
                <span className="text-white/90 text-sm">Google's security protection</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-white/20 backdrop-blur">
                    <i className="fa-solid fa-clock text-white text-xs" />
                  </div>
                </div>
                <span className="text-white/90 text-sm">Complete profile in seconds</span>
              </div>
            </div>
          </div>

          {/* Right side - Visual */}
          <div className="hidden md:flex justify-center">
            <div className="relative">
              {/* Floating card */}
              <div className="float-icon bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl">
                <div className="text-center">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center mb-4 shadow-lg">
                    <svg className="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  <p className="text-white font-semibold text-lg">Zero Password</p>
                  <p className="text-white/70 text-xs mt-2">Secure by default</p>
                </div>
              </div>

              {/* Decorative checkmark */}
              <div className="absolute -bottom-2 -right-2 bg-green-400 text-white rounded-full p-3 shadow-lg">
                <i className="fa-solid fa-check text-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleSignupBanner;
