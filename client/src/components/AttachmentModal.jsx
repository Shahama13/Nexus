import { FileText, Image, Music, Video } from 'lucide-react'
import React, { useEffect, useRef } from 'react'

const AttachmentModal = ({ setAttachments, setShowAttachmentModal }) => {

    const modalRef = useRef(null);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowAttachmentModal(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAttachClick = (fileType) => {
        setShowAttachmentModal(false);
        // Create a new file input with specific accept attribute
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;

        switch (fileType) {
            case 'image':
                input.accept = 'image/*';
                break;
            case 'video':
                input.accept = 'video/*';
                break;
            case 'audio':
                input.accept = 'audio/*';
                break;
            case 'pdf':
                input.accept = '.pdf';
                break;
            default:
                input.accept = '*/*';
        }

        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            const newAttachments = files.map(file => ({
                file,
                preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
                type: file.type,
                name: file.name,
                size: file.size
            }));
            setAttachments(prev => [...prev, ...newAttachments]);
        };

        input.click();
    };


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
                <button
                    onClick={() => handleAttachClick('pdf')}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <FileText size={20} className="text-red-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Document</span>
                </button>
            </div>
        </div>
    )
}

export default AttachmentModal