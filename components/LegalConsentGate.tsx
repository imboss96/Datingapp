import React, { useMemo, useState } from 'react';

interface LegalConsentGateProps {
  userName?: string;
  onOpenPolicy: (policy: 'terms' | 'privacy' | 'cookies') => void;
  onAcceptAll: () => Promise<void> | void;
  onLogout?: () => void;
  isSaving?: boolean;
  title?: string;
  subtitle?: string;
}

const LegalConsentGate: React.FC<LegalConsentGateProps> = ({
  userName,
  onOpenPolicy,
  onAcceptAll,
  onLogout,
  isSaving = false,
  title = 'Review And Accept Policies',
  subtitle = 'Before continuing, please confirm you have read and accepted our Terms of Service, Privacy Policy, and Cookie Policy.',
}) => {
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [cookiesChecked, setCookiesChecked] = useState(false);

  const allChecked = useMemo(
    () => termsChecked && privacyChecked && cookiesChecked,
    [termsChecked, privacyChecked, cookiesChecked]
  );

  const handleSubmit = async () => {
    if (!allChecked || isSaving) return;
    await onAcceptAll();
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 sm:px-8 sm:py-6 bg-gradient-to-r from-slate-900 to-slate-700 text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-200">Legal Consent</p>
          <h1 className="mt-2 text-2xl font-extrabold">{title}</h1>
          <p className="mt-2 text-sm text-slate-200">{subtitle}</p>
          {userName && <p className="mt-3 text-xs text-slate-300">Signed in as {userName}</p>}
        </div>

        <div className="p-6 sm:p-8 space-y-4">
          <div className="rounded-2xl border border-slate-200 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-rose-600" checked={termsChecked} onChange={(e) => setTermsChecked(e.target.checked)} />
              <div>
                <p className="text-sm font-bold text-slate-900">I accept the Terms of Service</p>
                <button type="button" onClick={() => onOpenPolicy('terms')} className="mt-1 text-xs text-rose-700 hover:text-rose-900 underline">
                  Read Terms of Service
                </button>
              </div>
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-rose-600" checked={privacyChecked} onChange={(e) => setPrivacyChecked(e.target.checked)} />
              <div>
                <p className="text-sm font-bold text-slate-900">I accept the Privacy Policy</p>
                <button type="button" onClick={() => onOpenPolicy('privacy')} className="mt-1 text-xs text-rose-700 hover:text-rose-900 underline">
                  Read Privacy Policy
                </button>
              </div>
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-rose-600" checked={cookiesChecked} onChange={(e) => setCookiesChecked(e.target.checked)} />
              <div>
                <p className="text-sm font-bold text-slate-900">I accept the Cookie Policy</p>
                <button type="button" onClick={() => onOpenPolicy('cookies')} className="mt-1 text-xs text-rose-700 hover:text-rose-900 underline">
                  Read Cookie Policy
                </button>
              </div>
            </label>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allChecked || isSaving}
            className="w-full mt-2 py-3.5 rounded-xl font-extrabold text-white bg-gradient-to-r from-rose-600 to-red-500 disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Accept And Continue'}
          </button>

          {onLogout && (
            <button type="button" onClick={onLogout} className="w-full text-sm text-slate-500 hover:text-slate-700 underline">
              Log Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalConsentGate;
