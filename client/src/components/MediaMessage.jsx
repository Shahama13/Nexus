import React, { useState } from 'react';
import { Play, Volume2, Download, File, FileText, ExternalLink } from 'lucide-react';
import '../styles/MediaMessage.scss';

const MediaMessage = ({ attachments, isOwn }) => {
    const [isPlaying, setIsPlaying] = useState({});

    const getFileType = (url) => {
        const extension = url.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
        if (['mp4', 'webm', 'ogg'].includes(extension)) return 'video';
        if (['mp3', 'wav', 'ogg'].includes(extension)) return 'audio';
        return 'other';
    };

    const renderMedia = (attachment, index) => {
        const type = attachment.fileType || getFileType(attachment.url);
        switch (type) {
            case 'image':
                return (
                    <img
                        src={attachment.url}
                        alt={attachment.fileName || 'Image'}
                        className="media-image"
                        onClick={() => window.open(attachment.url, '_blank')}
                        loading="lazy"
                    />
                );

            case 'video':
                return (
                    <div className="media-video-wrapper">
                        <video
                            controls
                            className="media-video"
                            poster={attachment.thumbnail || undefined}
                            preload="metadata"
                        >
                            <source src={attachment.url} type={attachment.mimeType || 'video/mp4'} />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                );

            case 'audio':
                return (
                    <div className="media-audio-wrapper">
                        <audio controls className="media-audio">
                            <source src={attachment.url} type={attachment.mimeType || 'audio/mpeg'} />
                        </audio>
                    </div>
                );

            default:
                return (
                    <div
                        key={index}
                        className="media-file"
                        onClick={() => window.open(attachment.url, '_blank')}
                    >
                        <div className="file-icon-wrapper">
                            <FileText size={24} className="file-icon" />
                        </div>
                        <div className="file-info">
                            <p className="file-name">
                                {attachment.fileName || 'PDF'}
                            </p>
                            <p className="file-meta">
                                {attachment.fileType || 'PDF'} • {(attachment.size / 1024).toFixed(1)} KB
                            </p>
                        </div>
                        <ExternalLink size={16} className="file-external" />
                    </div>
                );
        }
    };

    return (
        <div className="media-message">
            {attachments.map((attachment, index) => (
                <div key={index} className="media-item">
                    {renderMedia(attachment, index)}
                </div>
            ))}
        </div>
    );
};

export default MediaMessage;