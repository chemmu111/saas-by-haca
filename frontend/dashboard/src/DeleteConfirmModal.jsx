import { AlertCircle, X } from 'lucide-react';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, postTitle, postStatus, isDeleting }) => {
  if (!isOpen) return null;

  const getDeleteMessage = () => {
    if (postStatus === 'published') {
      return 'This will remove the post from your database. The Instagram post will remain on the platform.';
    } else if (postStatus === 'scheduled') {
      return 'This will cancel the scheduled post and prevent it from being published.';
    }
    return 'This action cannot be undone.';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 rounded-full p-2">
              <AlertCircle size={24} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Confirm Delete</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-900 font-semibold mb-2">
            Are you sure you want to delete this post?
          </p>
          
          {postTitle && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-600 line-clamp-2">{postTitle}</p>
            </div>
          )}

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">{getDeleteMessage()}</p>
            </div>
          </div>

          {postStatus && (
            <p className="text-xs text-gray-500 mb-4">
              Post Status: <span className="font-semibold capitalize">{postStatus}</span>
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                'Delete Post'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;


