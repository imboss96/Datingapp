import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

interface VerificationPhoto {
  _id: string;
  userId: string;
  photoUrl: string;
  submittedAt: string;
  daysPending?: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  averageReviewTimeHours: number;
}

interface PhotoModerationPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  isAdmin?: boolean;
  embedded?: boolean; // For use within ModeratorPanel
}

const PhotoModerationPanel: React.FC<PhotoModerationPanelProps> = ({
  isOpen = true,
  onClose = () => {},
  isAdmin = true,
  embedded = false
}) => {
  const [verifications, setVerifications] = useState<VerificationPhoto[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<VerificationPhoto | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0, averageReviewTimeHours: 0 });
  const [error, setError] = useState<string | null>(null);
  const [debugResponse, setDebugResponse] = useState<any>(null);

  // Skip rendering if modal is closed and not embedded
  if (!embedded && !isOpen) return null;

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const fetchPendingVerifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/verification/pending-reviews');
      // response shape: { stats: {...}, verifications: [...] }
      setDebugResponse(response);
      setVerifications(response.verifications || []);
      setStats(response.stats || { pending: 0, approved: 0, rejected: 0, averageReviewTimeHours: 0 });
    } catch (error) {
      console.error('Error fetching verifications:', error && error.message ? error.message : error);
      setError('Failed to load pending verifications');
      // Fallback to mock data for demo
      const mockData: VerificationPhoto[] = [
        {
          _id: '1',
          userId: 'user1',
          photoUrl: 'https://via.placeholder.com/400x400',
          submittedAt: new Date().toISOString(),
          status: 'pending'
        }
      ];
      setVerifications(mockData);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/verification/pending-reviews');
      setDebugResponse(response);
      setStats(response.stats || { pending: 0, approved: 0, rejected: 0, averageReviewTimeHours: 0 });
    } catch (error) {
      console.error('Error fetching stats:', error && error.message ? error.message : error);
      // Keep existing stats
    }
  };

  const handleApprove = async () => {
    if (!selectedVerification) return;

    try {
      setLoading(true);
      setError(null);
        await apiClient.put(`/verification/review/${selectedVerification._id}`, {
        decision: 'approve',
        notes: reviewNotes
      });
      
      // Refresh the list
      await fetchPendingVerifications();
      await fetchStats();
      
      setSelectedVerification(null);
      setReviewNotes('');
      setDecision(null);
    } catch (error) {
      console.error('Error approving:', error);
      setError('Failed to approve photo');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification || !rejectReason) {
      setError('Please provide a rejection reason');
      return;
    }

    try {
      setLoading(true);
      setError(null);
        await apiClient.put(`/verification/review/${selectedVerification._id}`, {
        decision: 'reject',
        reason: rejectReason,
        notes: reviewNotes
      });
      
      // Refresh the list
      await fetchPendingVerifications();
      await fetchStats();
      
      setSelectedVerification(null);
      setRejectReason('');
      setReviewNotes('');
      setDecision(null);
    } catch (error) {
      console.error('Error rejecting:', error);
      setError('Failed to reject photo');
    } finally {
      setLoading(false);
    }
  };

  const panelContent = (
    <>
      {/* Left Side - List */}
      <div className={`${embedded ? 'w-full' : 'w-1/3'} border-r border-gray-200 overflow-y-auto`}>
        {/* Stats */}
        <div className="bg-gray-50 p-4 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-yellow-100 rounded p-2">
              <p className="text-yellow-900 font-semibold">{stats.pending}</p>
              <p className="text-yellow-700 text-xs">Pending</p>
            </div>
            <div className="bg-green-100 rounded p-2">
              <p className="text-green-900 font-semibold">{stats.approved}</p>
              <p className="text-green-700 text-xs">Approved</p>
            </div>
            <div className="bg-red-100 rounded p-2">
              <p className="text-red-900 font-semibold">{stats.rejected}</p>
              <p className="text-red-700 text-xs">Rejected</p>
            </div>
            <div className="bg-blue-100 rounded p-2">
              <p className="text-blue-900 font-semibold">{Math.round(stats.averageReviewTimeHours)}h</p>
              <p className="text-blue-700 text-xs">Avg Review</p>
            </div>
          </div>
        </div>

        {/* Verifications List */}
        <div className="divide-y divide-gray-200">
          {verifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <i className="fa-solid fa-check-circle text-3xl text-green-200 mb-2 block"></i>
              <p>No pending verifications</p>
            </div>
          ) : (
            verifications.map(v => (
              <div
                key={v._id}
                onClick={() => setSelectedVerification(v)}
                className={`p-4 cursor-pointer transition ${
                  selectedVerification?._id === v._id
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : 'hover:bg-gray-50'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">{v.userId}</p>
                <p className="text-xs text-gray-500">
                  {new Date(v.submittedAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Side - Details */}
      {!embedded && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedVerification ? (
            <div className="h-full flex flex-col overflow-hidden">
              {/* Photo */}
              <div className="flex-1 bg-gray-900 flex items-center justify-center overflow-auto">
                <img
                  src={selectedVerification.photoUrl}
                  alt="Verification"
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Review Panel */}
              <div className="border-t border-gray-200 p-6 bg-gray-50 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">
                    {error}
                  </div>
                )}
                {debugResponse && (
                  <div className="bg-gray-50 border border-gray-100 text-gray-700 p-3 rounded text-xs mt-2">
                    <strong className="text-gray-900">Debug response:</strong>
                    <pre className="whitespace-pre-wrap text-[11px] mt-2 max-h-40 overflow-auto">{JSON.stringify(debugResponse, null, 2)}</pre>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">User ID</p>
                    <p className="font-mono text-gray-900">{selectedVerification.userId}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Submitted</p>
                    <p className="text-gray-900">
                      {new Date(selectedVerification.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Review Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Notes (Optional)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Any observations about this photo..."
                  />
                </div>

                {/* Reject Reason (if rejecting) */}
                {decision === 'rejected' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason (Required)
                    </label>
                    <select
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Select a reason...</option>
                      <option value="not_clear">Photo not clear</option>
                      <option value="poor_quality">Poor quality/lighting</option>
                      <option value="face_not_visible">Face not clearly visible</option>
                      <option value="edited">Photo appears edited</option>
                      <option value="not_face">Not a face photo</option>
                      <option value="multiple_faces">Multiple faces in photo</option>
                      <option value="other">Other reason</option>
                    </select>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setDecision('approved');
                      handleApprove();
                    }}
                    disabled={loading}
                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => setDecision(decision === 'rejected' ? null : 'rejected')}
                    className="flex-1 border-2 border-red-500 text-red-500 hover:bg-red-50 font-semibold py-2 rounded-lg transition"
                  >
                    ✕ Reject
                  </button>
                </div>

                {decision === 'rejected' && (
                  <button
                    onClick={handleReject}
                    disabled={loading || !rejectReason}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition"
                  >
                    Confirm Rejection
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <p className="text-lg">Select a verification to review</p>
            </div>
          )}
        </div>
      )}
    </>
  );

  // Render as modal or embedded component
  if (embedded) {
    return <div className="flex-1 flex overflow-hidden">{panelContent}</div>;
  }

  // Modal render
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex">
      <div className="w-full max-w-6xl bg-white overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Photo Verification Moderation</h2>
            <p className="text-blue-100 text-sm">Review and approve/reject user verification photos</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-100 transition text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {panelContent}
        </div>
      </div>
    </div>
  );
};

export default PhotoModerationPanel;
