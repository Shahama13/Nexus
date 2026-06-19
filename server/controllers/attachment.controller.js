import { CustomError, tryCatchWrapper } from "../middlewares/error.middleware.js"
import { uploadToCloudinary } from "../config/cloudinary.config.js";
import { extractText, getResolvedPDFJS } from 'unpdf';

export const getAttachmentUrl = tryCatchWrapper(async (req, res, next) => {

    const file = req.file;
    let resourceType = "auto"
    let attachmentType

    if (!file) {
        return next(new CustomError("No files uploaded", 400))
    }

    if (file.mimetype.startsWith("image/")) {
        resourceType = 'image';
        attachmentType = 'image';
    } else if (file.mimetype === 'application/pdf') {
        resourceType = 'raw'; // PDFs are uploaded as raw in cloudinary
        attachmentType = 'pdf';
    }


    const result = await uploadToCloudinary(file.buffer, {
        filename: file.originalname,
        format: file.mimetype === 'application/pdf' ? 'pdf' : undefined
    }, resourceType)


    res.json({
        success: true,
        attachment: {
            url: result.secure_url,
            localPath: result.public_id,
            attachmentType: attachmentType,
            fileName: file.originalname,
            fileType: file.mimetype,
            size: file.size
        }
    });
});

export const uploadPdf = async (req, res, next) => {
    try {
        const buffer = new Uint8Array(req.file.buffer);

        const { text, totalPages } = await extractText(buffer, {
            mergePages: true
        });

        console.log('Raw text length:', text.length);
        console.log('Sample:', text.slice(0, 200));

        res.json({ success: true, text, totalPages });
    } catch (err) {
        next(err);
    }
};