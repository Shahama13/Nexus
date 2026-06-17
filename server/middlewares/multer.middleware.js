import multer from "multer"

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        // Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        // Audio
        'audio/mpeg', 'audio/wav', 'audio/ogg',
        // Video
        'video/mp4', 'video/webm', 'video/ogg',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/zip'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not supported'), false);
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: 1024 * 1024 * 50
    },
    fileFilter
})

export default upload
