import React, { useState } from 'react';
import { VerificationStatus, VerificationInfo } from '../types';
import { useAlert } from '../services/AlertContext';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  verification: VerificationInfo;
  onSubmit: (verification: VerificationInfo) => void;
}

const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  verification,
  onSubmit,
}) => {
  const { showAlert } = useAlert();
  const [idType, setIdType] = useState<string>(verification.idType || 'DRIVERS_LICENSE');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) {
      showAlert('Missing Photo', 'Please select a photo');
      return;
    }

    setUploading(true);
    // Simulate upload - in production, this would go to backend
    setTimeout(() => {
      onSubmit({
        status: VerificationStatus.PENDING,
        idType,
        verifiedAt: undefined,
      });
      setUploading(false);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-shield-check text-blue-500"></i>
            ID Verification
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {verification.status === VerificationStatus.VERIFIED && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 text-emerald-600 font-bold">
              <i className="fa-solid fa-check-circle"></i>
              Verified Identity
            </div>
            <p className="text-sm text-emerald-600 mt-2">
              Your identity was verified on {new Date(verification.verifiedAt || 0).toLocaleDateString()}
            </p>
          </div>
        )}

        {verification.status === VerificationStatus.PENDING && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 text-amber-600 font-bold">
              <i className="fa-solid fa-hourglass-half"></i>
              Verification Pending
            </div>
            <p className="text-sm text-amber-600 mt-2">
              Your document is under review. This typically takes 1-2 hours.
            </p>
          </div>
        )}

        {(verification.status === VerificationStatus.UNVERIFIED ||
          verification.status === VerificationStatus.REJECTED) && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Identification Type
              </label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DRIVERS_LICENSE">Driver's License</option>
                <option value="PASSPORT">Passport</option>
                <option value="NATIONAL_ID">National ID</option>
                <option value="STUDENT_ID">Student ID</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Upload Clear Photo
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-blue-400 transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="photo-input"
                />
                <label htmlFor="photo-input" className="cursor-pointer">
                  {photoFile ? (
                    <div>
                      <i className="fa-solid fa-check-circle text-emerald-500 text-2xl mb-2"></i>
                      <p className="text-sm font-bold text-gray-900">{photoFile.name}</p>
                    </div>
                  ) : (
                    <div>
                      <i className="fa-solid fa-cloud-arrow-up text-gray-400 text-2xl mb-2"></i>
                      <p className="text-sm font-bold text-gray-700">Click to upload</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs text-blue-700">
                <i className="fa-solid fa-lock text-blue-500 mr-2"></i>
                Your document is encrypted and only used for verification
              </p>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 disabled:bg-gray-400 transition"
            >
              {uploading ? 'Uploading...' : 'Submit for Verification'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default VerificationModal;
