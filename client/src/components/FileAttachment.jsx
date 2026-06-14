import React, { useState } from 'react'
import { Image, Video, Music, X, File } from 'lucide-react';

const FileAttachment = ({ onAttach, onRemove, attachments = [] }) => {

    const [previewUrls, setPreviewUrls] = useState([]);


    const getFileIcon = (type) => {
        if (type.startsWith('image/')) return <Image size={20} />;
        if (type.startsWith('video/')) return <Video size={20} />;
        if (type.startsWith('audio/')) return <Music size={20} />;
        return <File size={20} />;
    };


    const handleFileSelect = () => {
        const newAttachments = [];
        for (const file of files) {
            // Check file size(50MB mx)
            if (file.size > 50 * 1024 * 1024) {
                alert('File too large. Maximum 50MB');
                continue;
            }

            let preview = null;;

            if (file.startsWith('image/') || file.type.startsWith('video/')) {
                preview = URL.createObjectURL(file)
            }

            newAttachments.push({
                file,
                preview,
                type: file.type,
                name: file.name,
                size: file.size
            });
        }
    }

    const removeAttachment = (index) => {
        if (previewUrls[index]) {
            URL.revokeObjectURL(previewUrls[index]);
        }
        const newAttachments = [...attachments];
        newAttachments.splice(index, 1);
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
        onRemove(newAttachments);
    };

    return (
        <div>


            {/* <input
                type="file"
                id='file-input'
                multiple
                accept='image/*, video/*, audio/*'
                style={{ display: 'none' }}
            /> */}

            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {attachments.map((att, index) => (
                        <div key={index} className="relative group">
                            {att.type.startsWith('image/') && att.preview ? (
                                <img
                                    src={att.preview}
                                    alt={att.name}
                                    className="w-16 h-16 object-cover rounded"
                                />
                            ) : att.type.startsWith('video/') && att.preview ? (
                                <video className="w-16 h-16 object-cover rounded" muted>
                                    <source src={att.preview} />
                                </video>
                            ) : (
                                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                                    {getFileIcon(att.type)}
                                </div>
                            )}

                            <button
                                onClick={() => removeAttachment(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                            >
                                <X size={14} />
                            </button>

                            <span className="absolute bottom-0 left-0 right-0 text-xs bg-black bg-opacity-50 text-white truncate px-1 rounded-b">
                                {att.name.split('.').pop()}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default FileAttachment