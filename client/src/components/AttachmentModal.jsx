import { Image, Music, Video } from 'lucide-react'
import React from 'react'

const AttachmentModal = ({ modalRef, handleAttachClick }) => {
    return (
        <div
            ref={modalRef}
            className="absolute bottom-14 left-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
        >
            <div className="py-2">
                <button
                    onClick={() => handleAttachClick('image')}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <Image size={20} className="text-green-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Photos</span>
                </button>
                <button
                    onClick={() => handleAttachClick('video')}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <Video size={20} className="text-blue-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Videos</span>
                </button>
                <button
                    onClick={() => handleAttachClick('audio')}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <Music size={20} className="text-purple-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Audio</span>
                </button>
                {/* <button
                  onClick={() => handleAttachClick('document')}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-t border-gray-200 dark:border-gray-700"
                >
                  <FileText size={20} className="text-orange-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Documents</span>
                </button> */}
            </div>
        </div>
    )
}

export default AttachmentModal