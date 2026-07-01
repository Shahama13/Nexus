import { ExternalLink, FileText, Music, Video, X } from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'
import '../styles/FileAttachment.scss'

const FileAttachment = ({ index, att, handleRemoveAttachment }) => {
    const [thumbnail, setThumbnail] = useState(null);
    const videoRef = useRef(null);

    useEffect(() => {
        if (att.type?.startsWith('video/') && att.file) {
            generateVideoThumbnail(att.file);
        }
    }, [att]);

    const generateVideoThumbnail = (file) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);

        video.onloadeddata = () => {
            const seekTime = Math.min(1, video.duration * 0.1);
            video.currentTime = seekTime;
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 160;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
            setThumbnail(thumbnailUrl);
            URL.revokeObjectURL(video.src);
        };

        video.onerror = () => {
            console.error('Error loading video for thumbnail');
            URL.revokeObjectURL(video.src);
        };
    };

    return (
        <div className="file-attachment">
            {att.type?.startsWith('image/') && att.preview ? (
                <div className="attachment-preview image-preview">
                    <img src={att.preview} alt={att.name} />
                </div>
            ) : att.type?.startsWith('video/') && thumbnail ? (
                <div className="attachment-preview video-preview">
                    <img src={thumbnail} alt={att.name} />
                    <div className="video-overlay">
                        <Video size={20} />
                    </div>
                </div>
            ) : att.type?.startsWith('video/') ? (
                <div className="attachment-preview loading-preview">
                    <Video size={28} className="loading-icon" />
                </div>
            ) : att.type?.startsWith('audio/') ? (
                <div className="attachment-preview audio-preview">
                    <Music size={28} />
                </div>
            ) : (
                <div
                    key={index}
                    className="nexus-attachment-file"
                >
                    <div className="file-icon">
                        <FileText size={24} />
                    </div>
                    <div className="file-info">
                        <p className="file-name">
                            {att.name || 'PDF'}
                        </p>
                        <p className="file-meta">
                            {att.type || 'PDF'} • {(att.size / 1024).toFixed(1)} KB
                        </p>
                    </div>
                </div>
            )}
            <button
                onClick={() => handleRemoveAttachment(index)}
                className="remove-btn"
            >
                ✖ 
            </button>
        </div>
    );
}

export default FileAttachment;