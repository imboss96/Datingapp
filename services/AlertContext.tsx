import React, { createContext, useContext, useState, useCallback } from 'react';

interface AlertConfig {
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  isDanger?: boolean;
}

interface AlertContextType {
  showAlert: (title: string, message: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<AlertConfig | null>(null);

  const showAlert = useCallback((title: string, message: string) => {
    setAlert({
      type: 'alert',
      title,
      message,
      confirmText: 'OK',
      onConfirm: () => setAlert(null),
    });
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, isDanger = false) => {
    setAlert({
      type: 'confirm',
      title,
      message,
      confirmText: isDanger ? 'Remove' : 'Confirm',
      cancelText: 'Cancel',
      onConfirm: () => {
        onConfirm();
        setAlert(null);
      },
      onCancel: () => setAlert(null),
      isDanger,
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(null);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, hideAlert }}>
      {children}
      {alert && <AlertModal alert={alert} />}
    </AlertContext.Provider>
  );
};

export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

interface AlertModalProps {
  alert: AlertConfig;
}

const AlertModal: React.FC<AlertModalProps> = ({ alert }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all animate-in">
        {/* Header */}
        <div className={`p-6 ${alert.isDanger ? 'bg-red-50 border-b border-red-200' : 'bg-gradient-to-r from-pink-500 to-red-500'}`}>
          <h2 className={`text-xl font-bold ${alert.isDanger ? 'text-red-600' : 'text-white'}`}>
            {alert.title}
          </h2>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-700 text-center">{alert.message}</p>
        </div>

        {/* Footer */}
        <div className={`flex gap-3 p-6 border-t ${alert.isDanger ? 'border-red-200' : 'border-gray-200'}`}>
          {alert.type === 'confirm' && (
            <button
              onClick={alert.onCancel}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition"
            >
              {alert.cancelText}
            </button>
          )}
          <button
            onClick={alert.onConfirm}
            className={`flex-1 px-4 py-2 text-white font-semibold rounded-lg transition ${
              alert.isDanger
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600'
            }`}
          >
            {alert.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
