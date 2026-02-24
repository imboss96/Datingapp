import React from 'react';

interface ChatOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  onBlock: () => void;
  chatUsername: string;
  loading?: boolean;
}

const ChatOptionsModal: React.FC<ChatOptionsModalProps> = ({
  isOpen,
  onClose,
  onDelete,
  onBlock,
  chatUsername,
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 md:hidden animate-in slide-in-from-bottom-5 duration-300">
        {/* Header */}
        <div className="sticky top-0 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Options for {chatUsername}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Options */}
        <div className="px-4 py-2">
          {/* Block Option */}
          <button
            onClick={onBlock}
            disabled={loading}
            className="w-full px-4 py-3 text-left text-amber-600 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-circle-stop text-lg"></i>
            <div>
              <div className="font-semibold">Block</div>
              <div className="text-xs text-amber-500">Hide messages and calls</div>
            </div>
          </button>

          {/* Delete Option */}
          <button
            onClick={onDelete}
            disabled={loading}
            className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            <i className="fa-solid fa-trash text-lg"></i>
            <div>
              <div className="font-semibold">Delete Chat</div>
              <div className="text-xs text-red-500">Remove conversation</div>
            </div>
          </button>

          {/* Cancel Option */}
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-3 mt-1"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
            <div className="font-semibold">Cancel</div>
          </button>
        </div>

        {/* Spacer for safe area */}
        <div className="h-6" />
      </div>
    </>
  );
};

export default ChatOptionsModal;
