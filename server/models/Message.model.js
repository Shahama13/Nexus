

import mongoose, { Types } from "mongoose";
const { Schema, model } = mongoose;

const messageSchema = new Schema({
    sender: { type: Types.ObjectId, ref: 'User', required: true },
    chat: { type: Types.ObjectId, ref: 'Chat', required: true },
    content: { type: String },
    attachments: {
        type: [
            {
                url: String,
                localPath: String,
                attachmentType: {
                    type: String,
                    enum: ["image", "audio", "video", "pdf"],
                    required: true
                },
                fileName: String,
                fileType: String,
                size: Number
            },
        ],
        default: [],
    },
    // For threaded messages
    threadId: { type: Types.ObjectId, ref: 'Message' },
    // Reactions to the message
    reactions: {
        type: Map,
        of: [{ type: Types.ObjectId, ref: 'User' }],
    },
    // Read status for each participant
    readBy: [{ type: Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export default model("Message", messageSchema);
