import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SafetyPageProps {
  onAccept?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

const SafetyPage: React.FC<SafetyPageProps> = ({ onAccept, isModal = false, onClose }) => {
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
          <h1 className="text-2xl font-bold">Safety & Trust Center</h1>
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
        <p className="text-gray-500 text-sm mb-6">Your safety is our top priority</p>

        <section className="space-y-8 text-gray-700">
          {/* Safety Tips */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🛡️ Safety Tips</h2>
            <p className="leading-relaxed mb-4">
              Dating online can be enjoyable and safe when you take precautions. Follow these essential tips to protect yourself while using LunesaLove:
            </p>
            
            <div className="space-y-4 ml-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">1. Protect Your Personal Information</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>Never share your home address, workplace, or phone number before meeting</li>
                  <li>Avoid sharing your credit card, Social Security number, or bank details</li>
                  <li>Don't disclose your full name until you're comfortable</li>
                  <li>Be cautious about financial requests - legitimate matches won't ask for money</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">2. Meet Safely in Public</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>Always meet in a public place for the first meeting (coffee shop, restaurant, park)</li>
                  <li>Avoid going to private residences on first dates</li>
                  <li>Meet during daytime hours when possible</li>
                  <li>Choose locations you're familiar with</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">3. Tell Someone Where You're Going</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>Share your date plans with a trusted friend or family member</li>
                  <li>Provide them with your match's profile name and photo</li>
                  <li>Share your location in real-time if possible</li>
                  <li>Agree on a check-in time during and after the date</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">4. Trust Your Instincts</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>If something feels off, it probably is - trust your gut</li>
                  <li>Don't feel obligated to continue talking to someone who makes you uncomfortable</li>
                  <li>Block or report anyone who exhibits red flags</li>
                  <li>It's okay to change your mind about meeting</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">5. Video Chat Before Meeting</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>We recommend video chatting before meeting in person</li>
                  <li>This helps verify the person matches their profile</li>
                  <li>You can get a feel for their personality and mannerisms</li>
                  <li>It's a low-commitment way to verify authenticity</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">6. Use a Safe Payment Method</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>Never wire money or use cryptocurrency</li>
                  <li>Use secure payment methods like credit cards or PayPal</li>
                  <li>Check transaction history regularly</li>
                  <li>Report unauthorized charges immediately</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">7. Red Flags to Watch For</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>People who refuse to video chat or share recent photos</li>
                  <li>Anyone asking for money or financial assistance</li>
                  <li>Requests to move communication off the app quickly</li>
                  <li>Inconsistent stories or evasive answers about personal details</li>
                  <li>Pressure to meet immediately or engage in intimate conversations</li>
                  <li>Profile that looks professionally modeled or too perfect</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Photo Verification */}
          <div className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">✓ Photo Verification System</h2>
            <p className="leading-relaxed mb-4">
              Our photo verification system is designed to ensure authenticity and protect our community from fraud and catfishing.
            </p>
            
            <div className="space-y-4 ml-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How It Works</h3>
                <p className="text-sm leading-relaxed mb-3">
                  Verified members take a selfie that matches their profile photo. Our AI and moderation team confirm the person in both photos is the same individual. Successfully verified members receive a blue checkmark badge on their profile.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Why Verification Matters</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>Builds trust in the community</li>
                  <li>Reduces catfishing and deception</li>
                  <li>Increases confidence when deciding to meet</li>
                  <li>Verified members get more matches and engagement</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How to Get Verified</h3>
                <ol className="list-decimal list-inside space-y-1 ml-2 text-sm">
                  <li>Go to Account Settings → Photo Verification</li>
                  <li>Take a clear selfie in good lighting</li>
                  <li>Make sure your face is visible and matches your profile photo</li>
                  <li>Submit the photo for verification</li>
                  <li>Our team reviews within 24 hours</li>
                  <li>Display your verification badge once approved!</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Verification Tips</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>Use natural lighting (not too bright)</li>
                  <li>Ensure your full face is visible</li>
                  <li>Wear similar clothing/style to your profile photo</li>
                  <li>Avoid filters, heavy makeup changes, or editing</li>
                  <li>Look directly at the camera</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Privacy & Security</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>Your verification selfie is encrypted and secured</li>
                  <li>We never share your verification photos publicly</li>
                  <li>Only our moderation team can see the verification image</li>
                  <li>After verification, the image is securely deleted from our servers</li>
                  <li>Your privacy is always protected</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Report User */}
          <div className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🚨 Report a User</h2>
            <p className="leading-relaxed mb-4">
              Help us maintain a safe community by reporting inappropriate behavior. We take all reports seriously and investigate promptly.
            </p>
            
            <div className="space-y-4 ml-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">When to Report</h3>
                <p className="text-sm leading-relaxed mb-3">
                  Report a user if they engage in:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>Sexually explicit or harassing messages</li>
                  <li>Threatening, abusive, or violent language</li>
                  <li>Requests for money, gifts, or personal financial information</li>
                  <li>Spam, scams, or fraudulent activity</li>
                  <li>Sharing private information without consent</li>
                  <li>Hate speech, discrimination, or bigotry</li>
                  <li>Impersonation or catfishing (fake profile)</li>
                  <li>Non-consensual intimate images or requests for them</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How to Report</h3>
                <ol className="list-decimal list-inside space-y-1 ml-2 text-sm">
                  <li>Open the user's profile or conversation</li>
                  <li>Click the "Report User" button (flag icon)</li>
                  <li>Select the reason for reporting</li>
                  <li>Provide any relevant details or screenshots</li>
                  <li>Submit your report</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What Happens After Reporting</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>Our moderation team receives your report</li>
                  <li>We investigate within 24 hours</li>
                  <li>We may request additional information from you</li>
                  <li>Based on findings, we take appropriate action:</li>
                  <li style={{ marginLeft: '1.5rem' }}>• Warning or suspension of the user account</li>
                  <li style={{ marginLeft: '1.5rem' }}>• Permanent ban for serious violations</li>
                  <li style={{ marginLeft: '1.5rem' }}>• Referral to law enforcement if necessary</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Confidentiality</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>Your report is confidential</li>
                  <li>The reported user won't know who reported them (unless required by law)</li>
                  <li>We protect your privacy throughout the investigation</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Block User */}
          <div className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🚫 Block a User</h2>
            <p className="leading-relaxed mb-4">
              Blocking gives you immediate control over your LunesaLove experience. A blocked user cannot contact you or see your profile.
            </p>
            
            <div className="space-y-4 ml-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">When to Block</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>Someone is persistently messaging you after you've declined interest</li>
                  <li>You want to avoid seeing someone's profile</li>
                  <li>Someone is making you uncomfortable (even if not reportable)</li>
                  <li>You've had a bad experience and want to move on</li>
                  <li>You simply don't want specific people to see your profile</li>
                  <li>You need to take a break from someone specific</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How to Block</h3>
                <ol className="list-decimal list-inside space-y-1 ml-2 text-sm">
                  <li>Open the user's profile or conversation</li>
                  <li>Click the three-dot menu icon</li>
                  <li>Select "Block User"</li>
                  <li>Confirm the action</li>
                  <li>The user is now blocked</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What Happens When You Block</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>The user can no longer message you</li>
                  <li>The user can no longer see your profile</li>
                  <li>Previous messages are hidden from your view</li>
                  <li>The user is removed from your matches and connections</li>
                  <li>Existing conversations are archived</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Managing Your Blocked List</h3>
                <ol className="list-decimal list-inside space-y-1 ml-2 text-sm">
                  <li>Go to Account Settings → Privacy</li>
                  <li>Select "Blocked Users"</li>
                  <li>View your complete list of blocked users</li>
                  <li>Click "Unblock" next to any user to remove them from the list</li>
                  <li>Once unblocked, you'll both be able to interact again</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Will They Know They're Blocked?</h3>
                <p className="text-sm leading-relaxed">
                  The blocked user will notice they can no longer find your profile or message you, but we don't notify them directly that they've been blocked. It's a private action.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Other Privacy Controls</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li><strong>Hide Your Profile:</strong> Make your profile visible only to matches</li>
                  <li><strong>Invisible Mode:</strong> Browse profiles without appearing online</li>
                  <li><strong>Match Requests Only:</strong> Filter who can message you</li>
                  <li><strong>Location Visibility:</strong> Control how precise your location appears</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Additional Resources */}
          <div className="border-t border-gray-200 pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📚 Additional Resources</h2>
            <div className="space-y-3 text-sm">
              <p className="leading-relaxed">
                <strong>National Domestic Violence Hotline:</strong> 1-800-799-7233<br />
                Available 24/7. If you're experiencing abuse or violence.
              </p>
              <p className="leading-relaxed">
                <strong>FBI Internet Crime Complaint Center:</strong> ic3.gov<br />
                Report online fraud, scams, and cyber crimes.
              </p>
              <p className="leading-relaxed">
                <strong>Federal Trade Commission:</strong> reportfraud.ftc.gov<br />
                Report identity theft and fraud.
              </p>
              <p className="leading-relaxed">
                <strong>LunesaLove Support:</strong> support@datingapp.com<br />
                Contact our safety team with concerns.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 pb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Questions?</h3>
            <p className="text-sm leading-relaxed">
              If you have questions about safety on LunesaLove, please contact our support team at support@datingapp.com. We're here to help keep our community safe and welcoming.
            </p>
          </div>
        </section>
      </div>

      {/* Footer */}
      {isModal && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={handleClose}
              className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold hover:from-pink-600 hover:to-red-600 transition shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafetyPage;
