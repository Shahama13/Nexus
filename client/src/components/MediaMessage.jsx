import React, { useState } from 'react';
import { Play, Volume2, Download, File, FileText, ExternalLink } from 'lucide-react';


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
                        className="w-[30vw] rounded-lg cursor-pointer hover:opacity-90 transition "
                        onClick={() => window.open(attachment.url, '_blank')}
                        loading="lazy"
                    />
                );

            case 'video':
                return (
                    <div className="relative group">
                        <video
                            controls
                            className="w-[30vw] rounded-lg"
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
                    <div className=" min-w-[250px]">

                        <audio controls className="w-full mt-2">
                            <source src={attachment.url} type={attachment.mimeType || 'audio/mpeg'} />
                        </audio>

                    </div>
                );


            default:
                return (

                    <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                        onClick={() => window.open(attachment.url, '_blank')}
                    >
                        <div className="flex-shrink-0">
                            <FileText size={24} className="text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {attachment.fileName || 'PDF'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {attachment.fileType || 'PDF'} • {(attachment.size / 1024).toFixed(1)} KB
                            </p>
                        </div>
                        <ExternalLink size={16} className="text-gray-400 flex-shrink-0" />
                    </div>


                );
        }
    }
    const formatFileSize = (bytes) => {
        if (!bytes) return 'Unknown size';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };
    return (
        <div className="space-x-2 flex flex-row">
            {attachments.map((attachment, index) => (
                <div key={index}>
                    {renderMedia(attachment, index)}
                </div>
            ))}
        </div>
    )
}

export default MediaMessage