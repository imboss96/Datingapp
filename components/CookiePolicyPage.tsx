import React from 'react';
import { useNavigate } from 'react-router-dom';

interface CookiePolicyProps {
  onAccept: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

const CookiePolicyPage: React.FC<CookiePolicyProps> = ({ onAccept, isModal = false, onClose }) => {
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
          <h1 className="text-2xl font-bold">Cookie Policy</h1>
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
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. What Are Cookies?</h2>
            <p className="leading-relaxed">
              Cookies are small text files that are stored on your device (computer, tablet, or mobile phone) when you visit a website or use an application. They contain information about your browsing patterns and preferences and help website operators understand user behavior.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Why We Use Cookies</h2>
            <p className="leading-relaxed mb-3">
              We use cookies and similar tracking technologies for the following purposes:
            </p>
            <div className="ml-4 space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Essential Cookies:</h3>
                <p className="text-sm leading-relaxed">
                  These are necessary for the App to function properly. They help with user authentication, security, and session management. You cannot opt out of these cookies.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Preference Cookies:</h3>
                <p className="text-sm leading-relaxed">
                  These remember your settings and preferences (language, theme, notification settings) to provide a personalized experience.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Analytics Cookies:</h3>
                <p className="text-sm leading-relaxed">
                  We use these to understand how you use the App and identify areas for improvement. We may use services like Google Analytics.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Marketing Cookies:</h3>
                <p className="text-sm leading-relaxed">
                  These track your behavior to show you relevant advertisements and content. You can opt out of these cookies.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Types of Cookies We Use</h2>
            <p className="leading-relaxed mb-3">
              Our App uses both session and persistent cookies:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong>Session cookies:</strong> These exist only during your browser session and are deleted when you close the browser</li>
              <li><strong>Persistent cookies:</strong> These remain on your device until they expire or you delete them</li>
              <li><strong>First-party cookies:</strong> These are set by our App directly</li>
              <li><strong>Third-party cookies:</strong> These are set by third-party services we use (Google, Facebook, Cloudinary)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Specific Cookies We Use</h2>
            <p className="leading-relaxed mb-3">
              Below is a list of cookies commonly used in our App:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-left">Cookie Name</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Purpose</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2">auth_token</td>
                    <td className="border border-gray-300 px-3 py-2">User authentication</td>
                    <td className="border border-gray-300 px-3 py-2">Session</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2">user_preferences</td>
                    <td className="border border-gray-300 px-3 py-2">Store user settings</td>
                    <td className="border border-gray-300 px-3 py-2">Persistent</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2">_ga</td>
                    <td className="border border-gray-300 px-3 py-2">Google Analytics</td>
                    <td className="border border-gray-300 px-3 py-2">Persistent</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2">language</td>
                    <td className="border border-gray-300 px-3 py-2">Language preference</td>
                    <td className="border border-gray-300 px-3 py-2">Persistent</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2">marketing_id</td>
                    <td className="border border-gray-300 px-3 py-2">Marketing/advertising tracking</td>
                    <td className="border border-gray-300 px-3 py-2">Persistent</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Local Storage & Web Storage</h2>
            <p className="leading-relaxed">
              In addition to cookies, we may use local storage (localStorage and sessionStorage) to store information about your preferences and activities. This data is stored on your device and is not sent to servers with every request.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Third-Party Cookies</h2>
            <p className="leading-relaxed mb-3">
              We allow third parties to set cookies for the following purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong>Google Analytics:</strong> Helps us understand App usage patterns (www.google.com/analytics)</li>
              <li><strong>Stripe:</strong> Payment processing (www.stripe.com)</li>
              <li><strong>Cloudinary:</strong> Image hosting and optimization (cloudinary.com)</li>
              <li><strong>Facebook Pixel:</strong> Marketing and conversion tracking (facebook.com)</li>
            </ul>
            <p className="mt-3 leading-relaxed">
              These third parties have their own privacy policies governing their use of cookies.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. How to Control Cookies</h2>
            <p className="leading-relaxed mb-3">
              You have control over cookies through several methods:
            </p>
            <div className="ml-4 space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Browser Controls:</h3>
                <p className="text-sm leading-relaxed">
                  Most browsers allow you to refuse cookies or alert you when a cookie is being sent. You can control this through your browser's Privacy/Settings menu. Note that disabling cookies may affect the functionality of the App.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">App Settings:</h3>
                <p className="text-sm leading-relaxed">
                  We provide cookie preference controls in your account settings, allowing you to manage non-essential cookies.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Opt-Out Tools:</h3>
                <p className="text-sm leading-relaxed">
                  You can opt out of Google Analytics at https://tools.google.com/dlpage/gaoptout
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Do Not Track (DNT)</h2>
            <p className="leading-relaxed">
              Some browsers include a "Do Not Track" feature. Our App does not currently respond to DNT signals, but we respect your privacy preferences through the cookie controls described above.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Updates to This Policy</h2>
            <p className="leading-relaxed">
              We may update this Cookie Policy from time to time to reflect changes in technology or legal requirements. We will notify you of significant changes through the App or via email.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Contact Us</h2>
            <p className="leading-relaxed">
              If you have questions about our use of cookies, please contact us at:
            </p>
            <p className="mt-2">
              Email: cookies@datingapp.com<br />
              Phone: +1 (555) 123-4567
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

export default CookiePolicyPage;
