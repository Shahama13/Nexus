import { FileText, Music, Video } from 'lucide-react';
import React from 'react';
import '../styles/FilePreview.scss';

const FilePreview = ({ index, att }) => {
    return (
        <div key={index} className="file-preview-item">
            {att.attachmentType === 'image' ? (
                <img src={att.url} alt="🖼️" className="preview-image" />
            ) : att.attachmentType === "audio" ? (
                <div className="preview-audio">
                    <Music size={20} className="audio-icon" />
                    <span className="preview-label">Audio</span>
                </div>
            ) : att.attachmentType === "video" ? (
                <div className="preview-video">
                    <video className="video-thumbnail" poster={att.thumbnail || undefined}>
                        <source src={att.url} />
                        Your browser does not support the video tag.
                    </video>
                    <div className="video-play-overlay">
                        <Video size={16} />
                    </div>
                </div>
            ) : (
                <div className="preview-file">
                    <FileText size={20} className="file-icon" />
                    <div className="file-info">
                        <p className="file-name">{att.fileName || 'PDF'}</p>
                        <p className="file-size">{att.type || 'PDF'} • {(att.size / 1024).toFixed(1)} KB</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilePreview;