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
                <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                    <div className="flex-shrink-0">
                        <FileText size={24} className="text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {att.fileName || 'PDF'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {att.type || 'PDF'} • {(att.size / 1024).toFixed(1)} KB
                        </p>
                    </div>
                </div>


            )}
        </div>
    )
}

export default FilePreview