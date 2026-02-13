import React, { useState } from 'react';
import { MediaFile } from '../types';

interface MediaRendererProps {
  media: MediaFile;
  isMe?: boolean;
  messageId?: string;
}

const MediaRenderer: React.FC<MediaRendererProps> = ({ media, isMe, messageId }) => {
  const [isImageLoadingError, setIsImageLoadingError] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  if (media.type === 'image') {
    return (
      <div className={`rounded-2xl overflow-hidden shadow-lg ${isMe ? 'max-w-xs' : 'max-w-md'}`}>
        <img
          src={media.url}
          alt={media.name}
          className="max-h-96 w-full object-contain bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
          onError={() => setIsImageLoadingError(true)}
          onClick={() => window.open(media.url, '_blank')}
        />
        {isImageLoadingError && (
          <div className="bg-red-50 p-4 text-sm text-red-600 text-center">Failed to load image</div>
        )}
      </div>
    );
  }

  if (media.type === 'video') {
    return (
      <div className={`rounded-2xl overflow-hidden shadow-lg ${isMe ? 'max-w-xs' : 'max-w-md'}`}>
        <video
          controls
          className="max-h-96 w-full bg-black"
          poster={media.thumbnail || undefined}
          controlsList="nodownload"
        >
          <source src={media.url} type={media.mimetype} />
          Your browser does not support the video tag.
        </video>
        <div className="bg-gray-50 px-3 py-2 text-xs text-gray-600 truncate">
          <i className="fa-solid fa-video text-gray-400 mr-2"></i>
          {media.name}
        </div>
      </div>
    );
  }

  if (media.type === 'audio') {
    return (
      <div className={`rounded-2xl overflow-hidden shadow-lg ${isMe ? 'max-w-xs' : 'max-w-md'}`}>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-music text-white text-2xl"></i>
            <div className="flex-1 text-white">
              <p className="text-sm font-semibold truncate">{media.name}</p>
              {media.duration && (
                <p className="text-xs opacity-80">
                  {Math.floor(media.duration / 60)}:{String(Math.floor(media.duration % 60)).padStart(2, '0')}
                </p>
              )}
            </div>
          </div>
        </div>
        <audio controls className="w-full bg-gray-50" style={{ padding: '8px' }}>
          <source src={media.url} type={media.mimetype} />
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  }

  if (media.type === 'pdf') {
    return (
      <div className={`rounded-2xl overflow-hidden shadow-lg ${isMe ? 'max-w-xs' : 'max-w-md'}`}>
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 cursor-pointer hover:from-red-600 hover:to-red-700 transition-all"
             onClick={() => window.open(media.url, '_blank')}>
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-file-pdf text-white text-2xl"></i>
            <div className="flex-1 text-white">
              <p className="text-sm font-semibold truncate">{media.name}</p>
              <p className="text-xs opacity-80">
                {(media.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <i className="fa-solid fa-download text-white text-lg"></i>
          </div>
        </div>
      </div>
    );
  }

  if (media.type === 'file') {
    return (
      <div className={`rounded-2xl overflow-hidden shadow-lg ${isMe ? 'max-w-xs' : 'max-w-md'}`}>
        <div className="bg-gradient-to-r from-gray-500 to-gray-600 p-4 cursor-pointer hover:from-gray-600 hover:to-gray-700 transition-all"
             onClick={() => window.open(media.url, '_blank')}>
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-file text-white text-2xl"></i>
            <div className="flex-1 text-white">
              <p className="text-sm font-semibold truncate">{media.name}</p>
              <p className="text-xs opacity-80">
                {(media.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <i className="fa-solid fa-download text-white text-lg"></i>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MediaRenderer;
