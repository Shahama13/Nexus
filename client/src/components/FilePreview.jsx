import { FileText, Music, Video } from 'lucide-react';
import React from 'react'

const FilePreview = ({ index, att }) => {



    return (
        <div key={index}>
            {att.attachmentType === 'image' ? (
                <img src={att.url} alt="🖼️" className="w-20 h-20 object-cover rounded" />
            ) : att.attachmentType === "audio" ? (
                <div className="w-full max-w-[200px]">
                    <Music size={20} className="text-purple-500" />
                </div>
            ) : att.attachmentType === "video" ? (
                <video
                    className="w-20 rounded-lg"
                    poster={att.thumbnail || undefined}
                >
                    <source src={att.url} />
                    Your browser does not support the video tag.
                </video>
            ) : (
                <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <FileText size={32} className="text-gray-400" />
                    <span className="text-sm truncate max-w-[100px]">{att.fileName || 'Document'}</span>
                </div>
            )}
        </div>
    )
}

export default FilePreview