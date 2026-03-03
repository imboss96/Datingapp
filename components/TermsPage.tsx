import React from 'react';
import { useNavigate } from 'react-router-dom';

interface TermsPageProps {
  onAccept: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

// Hand-sketched underline SVG
const HandSketchedUnderline = () => (
  <svg 
    className="absolute bottom-0 left-0 w-full" 
    height="12" 
    viewBox="0 0 400 12" 
    preserveAspectRatio="none"
  >
    <path 
      d="M 0 6 Q 50 3, 100 6 T 200 6 T 300 6 T 400 6" 
      stroke="#ec4899" 
      strokeWidth="2" 
      fill="none" 
      strokeLinecap="round"
      opacity="0.6"
    />
  </svg>
);

const TermsPage: React.FC<TermsPageProps> = ({ onAccept, isModal = false, onClose }) => {
  const navigate = useNavigate();

  const handleClose = () => {
    if (isModal && onClose) {
      onClose();
    } else if (!isModal) {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white p-6 sm:p-8 flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold relative inline-block">Terms of Service<HandSketchedUnderline /></h1>
          {isModal && (
            <button
              onClick={handleClose}
              className="text-white text-2xl hover:text-pink-200 transition flex-shrink-0"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
        <p className="text-gray-500 text-sm mb-6">Last Updated: February 2026</p>

        <section className="space-y-6 text-gray-700">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 relative inline-block py-2">1. Acceptance of Terms<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              By accessing and using this dating application (the "App"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">2. Use License<HandSketchedUnderline /></h2>
            <p className="leading-relaxed mb-3">
              Permission is granted to temporarily download one copy of the materials (information or software) on our App for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 text-sm">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to decompile or reverse engineer any software contained on the App</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
              <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
              <li>Harass, threaten, or abuse other users</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">3. User Accounts<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account or password. You must be at least 18 years old to use this App.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">4. Content & Prohibited Behavior<HandSketchedUnderline /></h2>
            <p className="leading-relaxed mb-3">
              Users agree not to post, upload, or distribute any content that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 text-sm">
              <li>Is sexually explicit or obscene</li>
              <li>Violates any laws or regulations</li>
              <li>Infringes third-party intellectual property rights</li>
              <li>Constitutes spam, phishing, or fraud</li>
              <li>Contains hateful, discriminatory, or violent content</li>
              <li>Involves catfishing, deception, or misrepresentation</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">5. User Safety & Verification<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              While we implement safety measures including photo verification and reporting systems, users acknowledge that online interactions carry inherent risks. We recommend exercising caution and meeting only in public places. We are not liable for user conduct or incidents occurring outside the App.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">6. Premium Subscription<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              Premium subscriptions are recurring monthly charges. Cancellations must be made through account settings. We reserve the right to modify pricing with 30 days notice. Subscriptions do not provide additional legal rights or protections.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">7. Limitation of Liability<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              The materials on our App are provided "as is". We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">8. Limitations<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              In no event shall our company or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on our App, even if we or our authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">9. Termination<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              We may terminate or suspend your account and access to the App immediately, without prior notice or liability, for any reason whatsoever, including if you breach these Terms. Upon termination, your right to use the App ceases immediately.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">10. Changes to Terms<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              We may revise these terms and conditions for our App at any time without notice. By using this App, you are agreeing to be bound by the then-current version of these terms and conditions.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">11. Governing Law<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              These and other pages or documents within this Website are governed by and construed in accordance with the laws of the jurisdiction where we operate, and you irrevocably submit to the exclusive jurisdiction of the courts located there.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">Contact Us<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              If you have questions about these Terms of Service, please contact us at support@datingapp.com
            </p>
          </div>
        </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4 sm:p-6 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 sm:py-3 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-2.5 sm:py-3 px-4 rounded-lg bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold hover:from-pink-600 hover:to-red-600 transition shadow-md hover:shadow-lg"
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
