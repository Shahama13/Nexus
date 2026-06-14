import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const uploadToCloudinary = async (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            {
                folder: 'chat-attachments',
                resource_type: 'auto',
                ...options
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        ).end(buffer); // Just pass the buffer directly with .end()
    });
}

export default cloudinary;