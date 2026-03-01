import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

interface PaymentMethod {
  id: string;
  type: 'mpesa' | 'card' | 'bank_transfer' | 'paypal' | 'zelle' | 'cash' | 'payoneer' | 'chime' | 'cashapp';
  name: string;
  details: string;
  isDefault: boolean;
  lastUpdated: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  moderatorId: string;
}

const PaymentMethodModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, moderatorId }) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<'mpesa' | 'card' | 'bank_transfer' | 'paypal' | 'zelle' | 'cash' | 'payoneer' | 'chime' | 'cashapp'>('mpesa');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPaymentMethods();
    }
  }, [isOpen, moderatorId]);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      // Fetch payment methods from backend
      const response = await apiClient.getPaymentMethods(moderatorId);
      setPaymentMethods(response.paymentMethods || response || []);
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      setError('Failed to load payment methods');
      // Set empty array as fallback
      setPaymentMethods([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (selectedType === 'mpesa' && !formData.phone) {
      setError('Please enter M-Pesa number');
      return;
    }
    if (selectedType === 'bank_transfer' && !formData.accountNumber) {
      setError('Please enter account number');
      return;
    }
    if (selectedType === 'card' && !formData.cardNumber) {
      setError('Please enter card details');
      return;
    }
    if (selectedType === 'paypal' && !formData.paypalEmail) {
      setError('Please enter PayPal email');
      return;
    }
    if (selectedType === 'zelle' && !formData.zelleEmail) {
      setError('Please enter email/phone associated with Zelle');
      return;
    }
    if (selectedType === 'cash' && !formData.cashDetails) {
      setError('Please enter cash pickup details');
      return;
    }
    if (selectedType === 'payoneer' && !formData.payoneerEmail) {
      setError('Please enter Payoneer email');
      return;
    }
    if (selectedType === 'chime' && !formData.chimePhone) {
      setError('Please enter phone number associated with Chime');
      return;
    }
    if (selectedType === 'cashapp' && !formData.cashappHandle) {
      setError('Please enter Cash App handle');
      return;
    }

    try {
      setLoading(true);
      // Prepare payment details based on type
      const details = formData.phone || formData.accountNumber || formData.cardNumber || formData.paypalEmail || formData.zelleEmail || formData.cashDetails || formData.payoneerEmail || formData.chimePhone || formData.cashappHandle || '';
      
      // Call backend API to save payment method
      const response = await apiClient.addPaymentMethod(moderatorId, {
        type: selectedType,
        name: selectedType === 'mpesa' ? 'M-Pesa' : 
              selectedType === 'card' ? 'Card' : 
              selectedType === 'bank_transfer' ? 'Bank Transfer' :
              selectedType === 'paypal' ? 'PayPal' :
              selectedType === 'zelle' ? 'Zelle' :
              selectedType === 'cash' ? 'Cash' :
              selectedType === 'payoneer' ? 'Payoneer' :
              selectedType === 'chime' ? 'Chime' : 'Cash App',
        details: details,
      });

      // Refresh payment methods list
      await fetchPaymentMethods();
      setSuccess('Payment method added successfully');
      setFormData({});
      setSelectedType('mpesa');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError((err as any).message || 'Failed to add payment method');
      console.error('Error adding payment method:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePaymentMethod = async (id: string) => {
    try {
      setLoading(true);
      await apiClient.deletePaymentMethod(moderatorId, id);
      setPaymentMethods(paymentMethods.filter(m => m.id !== id));
      setSuccess('Payment method removed');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError((err as any).message || 'Failed to remove payment method');
      console.error('Error removing payment method:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 flex items-center justify-between border-b">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-credit-card text-sm"></i>
            Payment
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-6 h-6 flex items-center justify-center transition-all text-sm"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-2 rounded text-xs flex items-center gap-2">
              <i className="fa-solid fa-exclamation-circle text-sm"></i>
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 p-2 rounded text-xs flex items-center gap-2">
              <i className="fa-solid fa-check-circle text-sm"></i>
              {success}
            </div>
          )}

          {/* Current Payment Methods */}
          <div>
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-1 text-sm">
              <i className="fa-solid fa-list text-sm"></i>
              Methods
            </h3>
            {loading ? (
              <div className="text-center py-4 text-gray-500">
                <i className="fa-solid fa-spinner animate-spin"></i> Loading...
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
                <i className="fa-solid fa-inbox text-2xl mb-1 text-gray-300"></i>
                <p className="text-xs">No payment methods</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="p-2 bg-gray-50 rounded border border-gray-200 flex items-center justify-between hover:border-gray-300 transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {method.type === 'mpesa' && <i className="fa-solid fa-mobile text-green-600 text-sm flex-shrink-0"></i>}
                      {method.type === 'card' && <i className="fa-solid fa-credit-card text-blue-600 text-sm flex-shrink-0"></i>}
                      {method.type === 'bank_transfer' && <i className="fa-solid fa-building text-purple-600 text-sm flex-shrink-0"></i>}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 text-xs">{method.name}</p>
                        <p className="text-xs text-gray-600 truncate">{method.details}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {method.isDefault && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">
                          Default
                        </span>
                      )}
                      <button
                        onClick={() => handleRemovePaymentMethod(method.id)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors text-xs"
                      >
                        <i className="fa-solid fa-trash text-xs"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Payment Method */}
          <div className="border-t pt-3">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-1 text-sm">
              <i className="fa-solid fa-plus text-sm"></i>
              Add Method
            </h3>

            <form onSubmit={handleAddPaymentMethod} className="space-y-3">
              {/* Payment Type Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Type</label>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-3">
                  {[
                    { id: 'mpesa', label: 'M-Pesa', icon: 'fa-mobile' },
                    { id: 'card', label: 'Card', icon: 'fa-credit-card' },
                    { id: 'bank_transfer', label: 'Bank', icon: 'fa-building' },
                    { id: 'paypal', label: 'PayPal', icon: 'fa-paypal' },
                    { id: 'zelle', label: 'Zelle', icon: 'fa-building-columns' },
                    { id: 'cash', label: 'Cash', icon: 'fa-money-bill' },
                    { id: 'payoneer', label: 'Payoneer', icon: 'fa-wallet' },
                    { id: 'chime', label: 'Chime', icon: 'fa-card-visa' },
                    { id: 'cashapp', label: 'Cash App', icon: 'fa-dollar-sign' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedType(type.id as any)}
                      className={`p-2 rounded border-2 transition-all flex flex-col items-center gap-1 ${
                        selectedType === type.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <i className={`fa-solid ${type.icon}`}></i>
                      <span className="text-sm font-bold">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Type-Specific Fields */}
              {selectedType === 'mpesa' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+254 7XX XXX XXX"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              )}
              {selectedType === 'card' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Card Number</label>
                    <input
                      type="text"
                      placeholder="4532 XXXX XXXX XXXX"
                      value={formData.cardNumber || ''}
                      onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Expiry</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={formData.expiry || ''}
                        onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">CVV</label>
                      <input
                        type="text"
                        placeholder="XXX"
                        value={formData.cvv || ''}
                        onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
              {selectedType === 'bank_transfer' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      placeholder="Enter account number"
                      value={formData.accountNumber || ''}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="Enter bank name"
                      value={formData.bankName || ''}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}
              {selectedType === 'paypal' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">PayPal Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={formData.paypalEmail || ''}
                    onChange={(e) => setFormData({ ...formData, paypalEmail: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              {selectedType === 'zelle' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email or Phone</label>
                  <input
                    type="text"
                    placeholder="Email or phone associated with Zelle"
                    value={formData.zelleEmail || ''}
                    onChange={(e) => setFormData({ ...formData, zelleEmail: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
              {selectedType === 'cash' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Pickup Location/Details</label>
                  <textarea
                    placeholder="Your preferred cash pickup location and details"
                    value={formData.cashDetails || ''}
                    onChange={(e) => setFormData({ ...formData, cashDetails: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 h-16 resize-none"
                  />
                </div>
              )}
              {selectedType === 'payoneer' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Payoneer Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={formData.payoneerEmail || ''}
                    onChange={(e) => setFormData({ ...formData, payoneerEmail: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}
              {selectedType === 'chime' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="Your phone number associated with Chime"
                    value={formData.chimePhone || ''}
                    onChange={(e) => setFormData({ ...formData, chimePhone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}
              {selectedType === 'cashapp' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Cash App Handle</label>
                  <input
                    type="text"
                    placeholder="$YourHandle"
                    value={formData.cashappHandle || ''}
                    onChange={(e) => setFormData({ ...formData, cashappHandle: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-3 rounded text-sm transition-all transform hover:scale-105"
              >
                <i className="fa-solid fa-plus mr-1"></i>
                Add
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodModal;
