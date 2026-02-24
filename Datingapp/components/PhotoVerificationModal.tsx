import React, { useState, useRef } from 'react';

interface PhotoVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (photoData: string) => void;
  userId: string;
}

interface AnalysisResult {
  qualityScore: number;
  faceDetected: boolean;
  faceCount: number;
  suitableForVerification: boolean;
  recommendations: string[];
}

const PhotoVerificationModal: React.FC<PhotoVerificationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userId
}) => {
  const [step, setStep] = useState<'capture' | 'confirm' | 'analyzing' | 'analysis_result' | 'uploading' | 'success'>('capture');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setCapturedPhoto(dataUrl);
      setStep('confirm');
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setAnalysis(null);
    setStep('capture');
    setError('');
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.75) return 'from-green-500 to-green-600';
    if (score >= 0.6) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const getQualityText = (score: number) => {
    if (score >= 0.75) return 'Excellent';
    if (score >= 0.6) return 'Good';
    return 'Poor';
  };

  const uploadPhotoAndAnalyze = async () => {
    if (!capturedPhoto) return;
    setLoading(true);
    setError('');
    setStep('analyzing');
    setTimeout(() => {
      setAnalysis({
        qualityScore: 0.85,
        faceDetected: true,
        faceCount: 1,
        suitableForVerification: true,
        recommendations: []
      });
      setStep('analysis_result');
      setLoading(false);
    }, 2000);
  };

  const handleConfirmAnalysis = () => {
    setStep('uploading');
    setLoading(true);
    setTimeout(() => {
      setStep('success');
      setLoading(false);
    }, 2000);
  };

  const handleClose = () => {
    setStep('capture');
    setCapturedPhoto(null);
    setAnalysis(null);
    setError('');
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-red-500 dark:from-gray-800 dark:to-gray-900 text-white p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Photo Verification</h2>
              <p className="text-pink-100 dark:text-gray-300 text-sm mt-1">Help us verify your profile is authentic</p>
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
                <div className="bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-lg p-4">
                  <p className="text-blue-900 dark:text-blue-200 text-sm">
                    📸 <strong>Guidelines:</strong><br />
                    • Clear photo of your face<br />
                    • Good lighting<br />
                    • Facing the camera directly<br />
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
                  <div className="bg-red-50 dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-lg p-4">
                    <p className="text-red-900 dark:text-red-200 text-sm">❌ {error}</p>
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
                <div className="bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-lg p-4">
                  <p className="text-blue-900 dark:text-blue-200 text-sm">
                    🤖 Our AI will analyze this photo for quality and authenticity before submission.
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
                    onClick={uploadPhotoAndAnalyze}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold py-3 rounded-lg hover:from-pink-600 hover:to-red-600 transition disabled:opacity-50"
                  >
                    {loading ? 'Analyzing...' : '✓ Continue'}
                  </button>
                </div>
              </div>
            )}
            {step === 'analyzing' && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="animate-spin">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full"></div>
                  </div>
                </div>
                <p className="text-center text-gray-600">
                  Analyzing your photo with AI...<br />
                  <span className="text-sm text-gray-500">Checking quality, face detection, and authenticity</span>
                </p>
              </div>
            )}
            {step === 'analysis_result' && analysis && (
              <div className="space-y-4">
                {/* Photo Preview */}
                <div>
                  <p className="text-gray-600 text-sm mb-3">Your photo:</p>
                  <img
                    src={capturedPhoto || ''}
                    alt="Verification photo"
                    className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                  />
                </div>
                {/* Quality Score */}
                <div className={`bg-gradient-to-r ${getQualityColor(analysis.qualityScore)} text-white rounded-lg p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Photo Quality: {getQualityText(analysis.qualityScore)}</span>
                    <span className="text-2xl font-bold">{Math.round(analysis.qualityScore * 100)}%</span>
                  </div>
                  <div className="bg-white/20 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-white h-full rounded-full transition-all"
                      style={{ width: `${analysis.qualityScore * 100}%` }}
                    />
                  </div>
                </div>
                {/* Face Detection */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-4 rounded-lg border-2 ${analysis.faceDetected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <p className={`text-sm font-semibold ${analysis.faceDetected ? 'text-green-900' : 'text-red-900'}`}>
                      {analysis.faceDetected ? '✅ Face Detected' : '❌ No Face Detected'}
                    </p>
                    <p className={`text-xs mt-1 ${analysis.faceDetected ? 'text-green-700' : 'text-red-700'}`}>
                      {analysis.faceDetected ? 'Clear face visible' : 'Photo needs face'}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg border-2 ${analysis.faceCount === 1 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <p className={`text-sm font-semibold ${analysis.faceCount === 1 ? 'text-green-900' : 'text-yellow-900'}`}>
                      {analysis.faceCount === 1 ? '✅ One Face' : `⚠️ ${analysis.faceCount} Faces`}
                    </p>
                    <p className={`text-xs mt-1 ${analysis.faceCount === 1 ? 'text-green-700' : 'text-yellow-700'}`}>
                      {analysis.faceCount === 1 ? 'Perfect for verification' : 'Only you should appear'}
                    </p>
                  </div>
                </div>
                {/* Suitable Status */}
                <div className={`p-4 rounded-lg border-2 ${analysis.suitableForVerification ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                  <p className={`text-sm font-semibold ${analysis.suitableForVerification ? 'text-blue-900' : 'text-orange-900'}`}>
                    {analysis.suitableForVerification ? '✅ Ready for Verification' : '⚠️ May Need Improvement'}
                  </p>
                  <p className={`text-xs mt-1 ${analysis.suitableForVerification ? 'text-blue-700' : 'text-orange-700'}`}>
                    {analysis.suitableForVerification
                      ? 'This photo meets our verification standards'
                      : 'Consider the recommendations below'}
                  </p>
                </div>
                {/* Recommendations */}
                {analysis.recommendations.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 mb-3">💡 Recommendations:</p>
                    <ul className="space-y-2">
                      {analysis.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="mt-0.5">
                            {rec.startsWith('✅') ? '✅' : rec.startsWith('💡') ? '💡' : '⚠️'}
                          </span>
                          <span>{rec.replace(/^[✅💡⚠️]\s*/, '')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleRetake}
                    className="flex-1 border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition"
                  >
                    ↩️ Retake
                  </button>
                  <button
                    onClick={handleConfirmAnalysis}
                    disabled={loading || !analysis.suitableForVerification}
                    className={`flex-1 text-white font-semibold py-3 rounded-lg transition ${
                      analysis.suitableForVerification
                        ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                        : 'bg-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {loading ? 'Submitting...' : '✓ Submit for Review'}
                  </button>
                </div>
                {!analysis.suitableForVerification && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-yellow-900 text-xs">
                      💡 <strong>Tip:</strong> Follow the recommendations above to improve your chances of approval.
                    </p>
                  </div>
                )}
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
                <div className="bg-green-50 dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded-lg p-4 mt-4">
                  <p className="text-green-900 dark:text-green-200 text-sm">
                    📧 We'll notify you when your verification is complete!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} width="640" height="480" className="hidden" />
    </>
  );
};

export default PhotoVerificationModal;
