import { FileText, Image, Music, Video, Sparkles } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import '../styles/AttachmentModal.scss';

const AttachmentModal = ({ setAttachments, setShowAttachmentModal }) => {
    const modalRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowAttachmentModal(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [setShowAttachmentModal]);

    const handleAttachClick = (fileType) => {
        setShowAttachmentModal(false);
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
        <div ref={modalRef} className="attachment-modal">
            <div className="modal-header">
                <Sparkles size={16} className="modal-icon" />
                <span className="modal-title">Add Attachment</span>
            </div>
            <div className="modal-options">
                <button
                    onClick={() => handleAttachClick('image')}
                    className="modal-option"
                >
                    <div className="option-icon image-icon">
                        <Image size={20} />
                    </div>
                    <span className="option-label">Photos</span>
                </button>
                <button
                    onClick={() => handleAttachClick('video')}
                    className="modal-option"
                >
                    <div className="option-icon video-icon">
                        <Video size={20} />
                    </div>
                    <span className="option-label">Videos</span>
                </button>
                <button
                    onClick={() => handleAttachClick('audio')}
                    className="modal-option"
                >
                    <div className="option-icon audio-icon">
                        <Music size={20} />
                    </div>
                    <span className="option-label">Audio</span>
                </button>
                <button
                    onClick={() => handleAttachClick('pdf')}
                    className="modal-option"
                >
                    <div className="option-icon pdf-icon">
                        <FileText size={20} />
                    </div>
                    <span className="option-label">Document</span>
                </button>
            </div>
        </div>
    );
};

export default AttachmentModal;