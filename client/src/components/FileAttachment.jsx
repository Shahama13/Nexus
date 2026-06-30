import { FileText, Music, Video, X } from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'

const FileAttachment = ({ index, att, handleRemoveAttachment }) => {
    const [thumbnail, setThumbnail] = useState(null);
    const videoRef = useRef(null);

    useEffect(() => {
        // Generate thumbnail for video files
        if (att.type?.startsWith('video/') && att.file) {
            generateVideoThumbnail(att.file);
        }
    }, [att]);

    const generateVideoThumbnail = (file) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);

        video.onloadeddata = () => {
            // Seek to 1 second or 10% of video duration
            const seekTime = Math.min(1, video.duration * 0.1);
            video.currentTime = seekTime;
        };

        video.onseeked = () => {
            // Draw video frame to canvas
            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 160;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to data URL
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
            setThumbnail(thumbnailUrl);

            // Cleanup
            URL.revokeObjectURL(video.src);
        };

        video.onerror = () => {
            console.error('Error loading video for thumbnail');
            // Cleanup on error
            URL.revokeObjectURL(video.src);
        };
    };

    return (
        <div key={index} className="relative group">
            {att.type?.startsWith('image/') && att.preview ? (
                <img src={att.preview} alt={att.name} className="w-20 h-20 object-cover rounded-lg" />
            ) : att.type?.startsWith('video/') && thumbnail ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                    <img
                        src={thumbnail}
                        alt={att.name}
                        className="w-full h-full object-cover"
                    />

                </div>
            ) : att.type?.startsWith('video/') ? (
                <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center animate-pulse">
                    <Video size={32} className="text-gray-400" />
                </div>
            ) : att.type?.startsWith('audio/') ? (
                <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center">
                    <Music size={32} className="text-gray-400" />
                </div>
            ) : (
                <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                    <div className="flex-shrink-0">
                        <FileText size={24} className="text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {att.name || 'PDF'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {att.type || 'PDF'} • {(att.size / 1024).toFixed(1)} KB
                        </p>
                    </div>
                </div>


            )}
            <button
                onClick={() => handleRemoveAttachment(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer
                    hover:bg-red-600 focus:outline-none"
            >
                <X size={14} />
            </button>
        </div>
    );
}

export default FileAttachment;