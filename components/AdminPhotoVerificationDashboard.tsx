import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { useAlert } from '../services/AlertContext';

interface PhotoVerification {
  _id: string;
  userId: string;
  photoUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reason?: string;
  notes?: string;
  antiSpoofScore?: number;
}

interface AnalysisResult {
  qualityScore: number;
  faceDetected: boolean;
  faceCount: number;
  suitableForVerification: boolean;
  recommendations: string[];
  analysisDetails?: any;
}

interface DashboardStats {
  pending: number;
  approved: number;
  rejected: number;
  averageReviewTimeHours: number;
}

const AdminPhotoVerificationDashboard: React.FC = () => {
  const { showAlert } = useAlert();
  const [verifications, setVerifications] = useState<PhotoVerification[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<PhotoVerification | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({ pending: 0, approved: 0, rejected: 0, averageReviewTimeHours: 0 });
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all'>('pending');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const rejectionReasons = [
    'No face detected',
    'Multiple faces detected',
    'Face not clear',
    'Blurry image',
    'Poor lighting',
    'Not a selfie/ID photo',
    'Inappropriate content',
    'Photo appears outdated',
    'Other'
  ];

  // Fetch pending verifications
  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/verification/pending-reviews');
      setStats(response.stats || { pending: 0, approved: 0, rejected: 0, averageReviewTimeHours: 0 });
      setVerifications(response.verifications || []);
    } catch (err: any) {
      console.error('Error fetching verifications:', err);
      showAlert('Error', 'Failed to load verifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
    
    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout | null = null;
    if (autoRefreshEnabled) {
      interval = setInterval(fetchVerifications, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefreshEnabled]);

  // Analyze selected verification photo
  const handleAnalyzePhoto = async () => {
    if (!selectedVerification) return;

    try {
      setAnalyzing(true);
      const response = await apiClient.post(`/verification/analyze-photo/${selectedVerification._id}`, {});
      setAnalysis(response);
      showAlert('Success', 'Photo analysis complete');
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to analyze photo');
    } finally {
      setAnalyzing(false);
    }
  };

  // Approve verification
  const handleApprove = async () => {
    if (!selectedVerification) return;

    try {
      setLoading(true);
      await apiClient.put(`/verification/review/${selectedVerification._id}`, {
        decision: 'approve',
        notes: reviewNotes
      });

      showAlert('Success', `✓ Photo approved for ${selectedVerification.userId}`);
      setSelectedVerification(null);
      setAnalysis(null);
      setReviewNotes('');
      await fetchVerifications();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to approve photo');
    } finally {
      setLoading(false);
    }
  };

  // Reject verification
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

      showAlert('Success', `✗ Photo rejected for ${selectedVerification.userId}`);
      setSelectedVerification(null);
      setAnalysis(null);
      setReviewNotes('');
      setRejectReason('');
      await fetchVerifications();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to reject photo');
    } finally {
      setLoading(false);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Photo Verification Admin</h1>
            <p className="text-blue-50 mt-1">Review and approve user verification photos</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Auto-refresh (30s)</span>
            </label>
            <button
              onClick={fetchVerifications}
              disabled={loading}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              <i className="fa-solid fa-refresh mr-2"></i>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-4 gap-4 p-6 bg-white border-b border-gray-200">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-sm text-gray-600">Pending Review</div>
          <div className="text-3xl font-bold text-blue-600">{stats.pending}</div>
          <div className="text-xs text-gray-500 mt-2">Awaiting approval</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-sm text-gray-600">Approved</div>
          <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-xs text-gray-500 mt-2">Verified users</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="text-sm text-gray-600">Rejected</div>
          <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-xs text-gray-500 mt-2">Not approved</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="text-sm text-gray-600">Avg Review Time</div>
          <div className="text-3xl font-bold text-purple-600">{stats.averageReviewTimeHours}</div>
          <div className="text-xs text-gray-500 mt-2">Hours</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left: Pending Photos List */}
        <div className="w-1/3 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col shadow-sm">
          <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <i className="fa-solid fa-clock text-blue-500"></i>
              Pending Photos ({verifications.length})
            </h2>
          </div>

          {loading && verifications.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">Loading verifications...</p>
              </div>
            </div>
          ) : verifications.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div>
                <i className="fa-solid fa-check-circle text-4xl text-green-300 mb-4 block"></i>
                <p className="text-gray-500 font-medium">All caught up!</p>
                <p className="text-gray-400 text-sm mt-1">No pending verifications</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {verifications.map((v) => (
                <button
                  key={v._id}
                  onClick={() => {
                    setSelectedVerification(v);
                    setAnalysis(null);
                    setReviewNotes('');
                    setRejectReason('');
                  }}
                  className={`w-full p-4 border-b border-gray-100 text-left hover:bg-blue-50 transition-colors ${
                    selectedVerification?._id === v._id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={v.photoUrl}
                      alt="Verification"
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate text-sm">
                        {v.userId.slice(0, 12)}...
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(v.submittedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {v.antiSpoofScore && (
                      <div className={`text-xs px-2 py-1 rounded font-semibold ${getQualityColor(v.antiSpoofScore)}`}>
                        {Math.round(v.antiSpoofScore * 100)}%
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Review Panel */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col shadow-sm">
          {selectedVerification ? (
            <>
              {/* Photo Preview */}
              <div className="bg-gray-900 flex items-center justify-center flex-1 overflow-auto">
                <img
                  src={selectedVerification.photoUrl}
                  alt="Verification"
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Analysis Results */}
              {analysis && (
                <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3 max-h-48 overflow-y-auto">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <i className="fa-solid fa-brain text-blue-500"></i>
                    AI Analysis Results
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Quality Score</p>
                      <div className="mt-1 bg-white rounded p-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-full rounded-full transition-all ${
                                analysis.qualityScore >= 0.8
                                  ? 'bg-green-500'
                                  : analysis.qualityScore >= 0.6
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${analysis.qualityScore * 100}%` }}
                            ></div>
                          </div>
                          <span className="font-bold text-gray-900 w-12">
                            {Math.round(analysis.qualityScore * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-600">Face Detection</p>
                      <div className="mt-1 bg-white rounded p-2 font-semibold">
                        {analysis.faceDetected ? (
                          <span className="text-green-600">✓ {analysis.faceCount} face(s)</span>
                        ) : (
                          <span className="text-red-600">✗ No face</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-600 text-sm">Recommendations</p>
                    <div className="mt-1 space-y-1">
                      {analysis.recommendations.map((rec, i) => (
                        <p key={i} className="text-xs text-gray-700 bg-white rounded px-2 py-1">
                          {rec}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className={`text-sm font-semibold rounded p-2 ${
                    analysis.suitableForVerification
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {analysis.suitableForVerification ? '✓ Suitable for verification' : '⚠ May need review'}
                  </div>
                </div>
              )}

              {/* Review Controls */}
              <div className="border-t border-gray-200 bg-white p-4 space-y-3">
                <button
                  onClick={handleAnalyzePhoto}
                  disabled={analyzing || loading}
                  className="w-full py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <i className={`fa-solid ${analyzing ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
                  {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
                </button>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Optional review notes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={loading}
                    className="py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-check"></i>
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectReason('other')}
                    className="py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-times"></i>
                    Reject
                  </button>
                </div>

                {rejectReason && (
                  <div className="border-t border-gray-200 pt-3 space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">
                      Rejection Reason
                    </label>
                    <select
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Select a reason...</option>
                      {rejectionReasons.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleReject}
                      disabled={loading || !rejectReason}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
                    >
                      {loading ? 'Processing...' : 'Confirm Rejection'}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-6">
              <div>
                <i className="fa-solid fa-image text-4xl text-gray-300 mb-4 block"></i>
                <p className="text-gray-500 font-medium">Select a photo to review</p>
                <p className="text-gray-400 text-sm mt-1">Click on a pending photo from the list</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPhotoVerificationDashboard;
