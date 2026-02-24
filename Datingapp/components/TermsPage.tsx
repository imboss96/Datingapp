import React from 'react';
import { useNavigate } from 'react-router-dom';

interface TermsPageProps {
  onAccept: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

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
    <div className="w-full h-screen bg-white overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-red-500 text-white p-6 shadow-md z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Terms of Service</h1>
          {isModal && (
            <button
              onClick={handleClose}
              className="text-white text-2xl hover:text-pink-200 transition"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <p className="text-gray-500 text-sm mb-6">Last Updated: February 2026</p>

        <section className="space-y-6 text-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p className="leading-relaxed">
              By accessing and using this dating application (the "App"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Use License</h2>
            <p className="leading-relaxed mb-3">
              Permission is granted to temporarily download one copy of the materials (information or software) on our App for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to decompile or reverse engineer any software contained on the App</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
              <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
              <li>Harass, threaten, or abuse other users</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. User Accounts</h2>
            <p className="leading-relaxed">
              You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account or password. You must be at least 18 years old to use this App.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Content & Prohibited Behavior</h2>
            <p className="leading-relaxed mb-3">
              Users agree not to post, upload, or distribute any content that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Is sexually explicit or obscene</li>
              <li>Violates any laws or regulations</li>
              <li>Infringes third-party intellectual property rights</li>
              <li>Constitutes spam, phishing, or fraud</li>
              <li>Contains hateful, discriminatory, or violent content</li>
              <li>Involves catfishing, deception, or misrepresentation</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. User Safety & Verification</h2>
            <p className="leading-relaxed">
              While we implement safety measures including photo verification and reporting systems, users acknowledge that online interactions carry inherent risks. We recommend exercising caution and meeting only in public places. We are not liable for user conduct or incidents occurring outside the App.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Premium Subscription</h2>
            <p className="leading-relaxed">
              Premium subscriptions are recurring monthly charges. Cancellations must be made through account settings. We reserve the right to modify pricing with 30 days notice. Subscriptions do not provide additional legal rights or protections.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Limitation of Liability</h2>
            <p className="leading-relaxed">
              The materials on our App are provided "as is". We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Limitations</h2>
            <p className="leading-relaxed">
              In no event shall our company or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on our App, even if we or our authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Termination</h2>
            <p className="leading-relaxed">
              We may terminate or suspend your account and access to the App immediately, without prior notice or liability, for any reason whatsoever, including if you breach these Terms. Upon termination, your right to use the App ceases immediately.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Changes to Terms</h2>
            <p className="leading-relaxed">
              We may revise these terms and conditions for our App at any time without notice. By using this App, you are agreeing to be bound by the then-current version of these terms and conditions.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Governing Law</h2>
            <p className="leading-relaxed">
              These and other pages or documents within this Website are governed by and construed in accordance with the laws of the jurisdiction where we operate, and you irrevocably submit to the exclusive jurisdiction of the courts located there.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Contact Us</h2>
            <p className="leading-relaxed">
              If you have questions about these Terms of Service, please contact us at support@datingapp.com
            </p>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex gap-4">
          <button
            onClick={handleClose}
            className="flex-1 py-3 px-4 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold hover:from-pink-600 hover:to-red-600 transition shadow-md"
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
