import React, { useState, useRef } from 'react';

interface PhotoVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (photoData: string) => void;
  userId: string;
}

const PhotoVerificationModal: React.FC<PhotoVerificationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userId
}) => {
  const [step, setStep] = useState<'capture' | 'confirm' | 'uploading' | 'success'>('capture');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setCapturedPhoto(dataUrl);
      setStep('confirm');
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    // Draw video frame to canvas
    context.drawImage(videoRef.current, 0, 0, 640, 480);

    // Convert to base64
    const photoData = canvasRef.current.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(photoData);
    setStep('confirm');
    setError('');
  };

  const handleConfirm = async () => {
    if (!capturedPhoto) return;

    setLoading(true);
    setError('');

    try {
      // Extract base64 from data URL
      const base64Data = capturedPhoto.split(',')[1];

      // Call the onSubmit callback
      onSubmit(base64Data);

      setStep('uploading');

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      setStep('success');

      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setStep('capture');
    setError('');
  };

  const handleClose = () => {
    setStep('capture');
    setCapturedPhoto(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-red-500 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Photo Verification</h2>
            <p className="text-pink-100 text-sm mt-1">Help us verify your profile is authentic</p>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:text-pink-100 transition text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'capture' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-900 text-sm">
                  📸 <strong>Guidelines:</strong><br/>
                  • Clear photo of your face<br/>
                  • Good lighting<br/>
                  • Facing the camera directly<br/>
                  • No filters or editing
                </p>
              </div>

              {!capturedPhoto && (
                <div className="space-y-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-pink-600 hover:to-red-600 transition"
                  >
                    📤 Upload Photo from Device
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">OR</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep('capture')}
                    disabled
                    className="w-full bg-gray-200 text-gray-500 font-semibold py-3 rounded-lg cursor-not-allowed"
                  >
                    📷 Take a Photo (Coming Soon)
                  </button>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-900 text-sm">❌ {error}</p>
                </div>
              )}
            </div>
          )}

          {step === 'confirm' && capturedPhoto && (
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 text-sm mb-3">Preview your photo:</p>
                <img
                  src={capturedPhoto}
                  alt="Verification photo"
                  className="w-full h-80 object-cover rounded-lg border-2 border-gray-200"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-900 text-sm">
                  ⚠️ This photo will be reviewed by our moderation team. Keep it clear and authentic!
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRetake}
                  disabled={loading}
                  className="flex-1 border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  ↩️ Retake Photo
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-pink-600 hover:to-red-600 transition disabled:opacity-50"
                >
                  {loading ? 'Uploading...' : '✓ Confirm & Submit'}
                </button>
              </div>
            </div>
          )}

          {step === 'uploading' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="animate-spin">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full"></div>
                </div>
              </div>
              <p className="text-center text-gray-600">
                Uploading your verification photo...
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-4 text-center py-6">
              <div className="text-5xl">✅</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Photo Submitted!
                </h3>
                <p className="text-gray-600">
                  Your verification photo has been submitted. Our team typically reviews submissions within 24-48 hours.
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <p className="text-green-900 text-sm">
                  📧 We'll notify you when your verification is complete!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} width="640" height="480" className="hidden" />
    </div>
  );
};

export default PhotoVerificationModal;
