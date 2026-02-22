import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { useAlert } from '../services/AlertContext';

interface PhotoVerification {
  _id: string;
  userId: string;
  photoUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  antiSpoofScore?: number;
  analysisMetadata?: any;
  notes?: string;
}

interface AnalysisResult {
  qualityScore: number;
  faceDetected: boolean;
  faceCount: number;
  suitableForVerification: boolean;
  recommendations: string[];
  analysisDetails?: any;
}

const PhotoVerificationReviewPanel: React.FC = () => {
  const { showAlert } = useAlert();
  const [verifications, setVerifications] = useState<PhotoVerification[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<PhotoVerification | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, averageReviewTimeHours: 0 });

  // Fetch pending photos
  useEffect(() => {
    fetchPendingPhotos();
    const interval = setInterval(fetchPendingPhotos, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPendingPhotos = async () => {
    try {
      setLoading(true);
      const response = await apiClient.request('/verification/pending-reviews');
      setVerifications(response.verifications || []);
      setStats(response.stats);
    } catch (err: any) {
      console.error('Failed to fetch pending photos:', err);
      showAlert('Error', 'Failed to load pending photo verifications');
    } finally {
      setLoading(false);
    }
  };

  const analyzePhoto = async (verification: PhotoVerification) => {
    try {
      setAnalyzing(true);
      const result = await apiClient.request(`/verification/analyze-photo/${verification._id}`, {
        method: 'POST'
      });
      setAnalysis(result);
    } catch (err: any) {
      console.error('Failed to analyze photo:', err);
      showAlert('Error', 'Failed to analyze photo');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedVerification) return;

    try {
      setLoading(true);
      await apiClient.request(`/verification/review/${selectedVerification._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          decision: 'approve',
          notes: reviewNotes
        })
      });

      showAlert('Success', 'Photo approved successfully');
      setSelectedVerification(null);
      setAnalysis(null);
      setReviewNotes('');
      fetchPendingPhotos();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to approve photo');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification || !rejectReason.trim()) {
      showAlert('Error', 'Please provide a rejection reason');
      return;
    }

    try {
      setLoading(true);
      await apiClient.put(`/verification/review/${selectedVerification._id}`, {
        decision: 'reject',
        reason: rejectReason,
        notes: reviewNotes
      });

      showAlert('Success', 'Photo rejected and user notified');
      setSelectedVerification(null);
      setAnalysis(null);
      setReviewNotes('');
      setRejectReason('');
      fetchPendingPhotos();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to reject photo');
    } finally {
      setLoading(false);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.75) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSuitabilityIcon = (suitable: boolean | null) => {
    if (suitable === null) return '⏳';
    return suitable ? '✅' : '❌';
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <i className="fa-solid fa-id-card text-blue-600"></i>
              Photo Verification Review
            </h2>
            <p className="text-sm text-gray-500 mt-1">AI-powered identity verification system</p>
          </div>
          <button
            onClick={fetchPendingPhotos}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-2"
          >
            <i className={`fa-solid fa-refresh ${loading ? 'animate-spin' : ''}`}></i>
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Pending Review</p>
            <p className="text-3xl font-bold text-blue-600">{stats.pending}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Approved</p>
            <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Rejected</p>
            <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Avg. Review Time</p>
            <p className="text-3xl font-bold text-purple-600">{stats.averageReviewTimeHours}h</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-4 p-6">
        {/* Photo List */}
        <div className="w-1/3 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Pending Photos ({verifications.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {verifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <i className="fa-solid fa-check-circle text-4xl mb-4 opacity-20"></i>
                <p>No pending photos to review</p>
              </div>
            ) : (
              verifications.map((verification) => (
                <button
                  key={verification._id}
                  onClick={() => {
                    setSelectedVerification(verification);
                    setAnalysis(null);
                    setReviewNotes('');
                    setRejectReason('');
                  }}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-blue-50 transition-colors text-left ${
                    selectedVerification?._id === verification._id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={verification.photoUrl}
                      alt="Verification"
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate text-sm">User {verification.userId.slice(0, 8)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(verification.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {verification.antiSpoofScore && (
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${getQualityColor(verification.antiSpoofScore)}`}>
                        {Math.round(verification.antiSpoofScore * 100)}%
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Review Panel */}
        {selectedVerification ? (
          <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
            {/* Photo Display */}
            <div className="bg-gray-900 p-4 flex items-center justify-center h-80">
              <img
                src={selectedVerification.photoUrl}
                alt="Verification"
                className="max-h-full max-w-full object-contain rounded"
              />
            </div>

            {/* Analysis Results */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!analysis ? (
                <button
                  onClick={() => analyzePhoto(selectedVerification)}
                  disabled={analyzing || loading}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <i className={`fa-solid fa-microchip ${analyzing ? 'animate-spin' : ''}`}></i>
                  {analyzing ? 'Analyzing with AI...' : 'Run AI Analysis'}
                </button>
              ) : (
                <>
                  {/* Quality Score */}
                  <div className={`p-4 rounded-lg ${getQualityColor(analysis.qualityScore)}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Photo Quality Score</span>
                      <span className="text-2xl font-bold">{Math.round(analysis.qualityScore * 100)}%</span>
                    </div>
                    <div className="mt-2 bg-white/50 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${analysis.qualityScore >= 0.65 ? 'bg-green-500' : analysis.qualityScore >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${analysis.qualityScore * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Face Detection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-semibold text-gray-900">Face Detected</span>
                      <span className="text-xl">{getSuitabilityIcon(analysis.faceDetected)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-semibold text-gray-900">Face Count</span>
                      <span className="text-lg font-bold text-blue-600">{analysis.faceCount}</span>
                    </div>
                    <div className={`flex items-center justify-between p-3 rounded-lg ${analysis.suitableForVerification ? 'bg-green-50' : 'bg-red-50'}`}>
                      <span className="font-semibold text-gray-900">Suitable for Verification</span>
                      <span className="text-xl">{getSuitabilityIcon(analysis.suitableForVerification)}</span>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-900">Recommendations:</h4>
                    {analysis.recommendations.map((rec, idx) => (
                      <p key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="mt-1">{rec.startsWith('✅') ? '✅' : rec.startsWith('💡') ? '💡' : '⚠️'}</span>
                        <span>{rec.replace(/^[✅💡⚠️]\s*/, '')}</span>
                      </p>
                    ))}
                  </div>

                  {/* Analysis Details */}
                  {analysis.analysisDetails && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">Photo Details</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-600">Resolution:</span> {analysis.analysisDetails.imageWidth}x{analysis.analysisDetails.imageHeight}</p>
                        <p><span className="text-gray-600">File Size:</span> {analysis.analysisDetails.imageSize}</p>
                        <p><span className="text-gray-600">Aspect Ratio:</span> {analysis.analysisDetails.aspectRatio}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Review Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Review Notes</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Optional notes for your review..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows={3}
                />
              </div>

              {/* Rejection Reason (if needed) */}
              {selectedVerification.status === 'pending' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Rejection Reason (if rejecting)</label>
                  <select
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select reason if rejecting...</option>
                    <option value="no_face_detected">No face detected</option>
                    <option value="multiple_faces">Multiple faces in photo</option>
                    <option value="face_not_clear">Face not clearly visible</option>
                    <option value="poor_quality">Poor image quality</option>
                    <option value="low_resolution">Low resolution</option>
                    <option value="selfie_with_object">Holding object or selfie stick</option>
                    <option value="not_recent">Photo appears old/outdated</option>
                    <option value="suspicious">Suspicious or fraudulent</option>
                    <option value="other">Other reason</option>
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
                >
                  <i className="fa-solid fa-check mr-2"></i>
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
                >
                  <i className="fa-solid fa-times mr-2"></i>
                  Reject
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <i className="fa-solid fa-hand-pointer text-4xl mb-4 opacity-20"></i>
              <p>Select a photo to review</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoVerificationReviewPanel;