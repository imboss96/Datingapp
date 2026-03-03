import React from 'react';
import { useNavigate } from 'react-router-dom';

interface PrivacyPageProps {
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

const PrivacyPage: React.FC<PrivacyPageProps> = ({ onAccept, isModal = false, onClose }) => {
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
          <h1 className="text-2xl sm:text-3xl font-bold relative inline-block">Privacy Policy<HandSketchedUnderline /></h1>
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
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 relative inline-block py-2">1. Introduction<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our dating application (the "App").
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">2. Information We Collect<HandSketchedUnderline /></h2>
            <p className="leading-relaxed mb-3">
              We collect information you provide directly and information collected automatically:
            </p>
            <div className="ml-4 space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Information You Provide:</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Account registration data (name, email, phone, date of birth)</li>
                  <li>Profile information (photos, bio, interests, location)</li>
                  <li>Communications with other users</li>
                  <li>Payment information (processed securely through Stripe)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Automatically Collected Information:</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Device information (type, OS, browser)</li>
                  <li>IP address and location data</li>
                  <li>User activity and interaction data</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">3. How We Use Your Information<HandSketchedUnderline /></h2>
            <p className="leading-relaxed mb-3">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Provide, maintain, and improve the App and all of our services</li>
              <li>Create and manage your account</li>
              <li>Enable your use of features like messaging, matches, and video calls</li>
              <li>Process payments and send related information</li>
              <li>Personalize your experience and show you relevant matches</li>
              <li>Send promotional emails and updates (with your consent, unsubscribe anytime)</li>
              <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
              <li>Enforce our Terms of Service and other agreements</li>
              <li>Comply with legal obligations</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">4. How We Share Information<HandSketchedUnderline /></h2>
            <p className="leading-relaxed mb-3">
              We may share your information in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong>With other users:</strong> Your profile information is visible to other users as part of the matching service</li>
              <li><strong>Service providers:</strong> We share information with third-party vendors who perform services on our behalf (payment processors, cloud hosts, analytics)</li>
              <li><strong>Legal compliance:</strong> We may disclose information if required by law or in response to valid legal requests</li>
              <li><strong>Business transfers:</strong> If we are acquired or merge with another company, your information may be transferred</li>
              <li><strong>Safety:</strong> We may disclose information to protect our rights, privacy, safety, or property, and that of our users</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">5. Data Retention<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy. If you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it by law.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">6. Your Privacy Rights<HandSketchedUnderline /></h2>
            <p className="leading-relaxed mb-3">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Right to access your personal data</li>
              <li>Right to correct inaccurate data</li>
              <li>Right to delete your data</li>
              <li>Right to port your data to another service</li>
              <li>Right to opt-out of marketing communications</li>
              <li>Right to restrict processing</li>
            </ul>
            <p className="mt-3 leading-relaxed">
              To exercise these rights, please contact us at privacy@datingapp.com with details of your request.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">7. Security<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no internet transmission is completely secure, and we cannot guarantee absolute security.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">8. Cookies and Tracking<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              We use cookies and similar technologies to enhance your experience, understand how users interact with the App, and for analytics purposes. You can control cookie preferences through your browser settings.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">9. Third-Party Links<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              The App may contain links to third-party websites. We are not responsible for their privacy practices. Please review their privacy policies before providing any personal information.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">10. GDPR Compliance (EU Users)<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              If you are located in the EU, we process your data on the basis of your consent, contract necessity, or legitimate interests. You have the rights outlined in Section 6. You have the right to lodge a complaint with a data protection authority in your jurisdiction.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">11. Children's Privacy<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              The App is not intended for users under 18 years of age. We do not knowingly collect personal information from minors. If we become aware that a minor has provided us with personal information, we will delete such information immediately.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">12. Changes to This Policy<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through the App. Your continued use of the App following the posting of revised Privacy Policy means that you accept and agree to the changes.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-3 relative inline-block py-2">Contact Us<HandSketchedUnderline /></h2>
            <p className="leading-relaxed">
              If you have questions about this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <p className="mt-2">
              Email: privacy@datingapp.com<br />
              Phone: +1 (555) 123-4567
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

export default PrivacyPage;
