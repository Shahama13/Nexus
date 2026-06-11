

import mongoose, { Types } from "mongoose";
const { Schema, model } = mongoose;

const chatSchema = new Schema({
    name: { type: String, required: true },
    isGroupChat: { type: Boolean, required: false },
    admin: { type: Types.ObjectId, ref: 'User' },
    participants: [{ type: Types.ObjectId, ref: 'User' }],
    lastMessage: { type: Types.ObjectId, ref:"Message" }

}, { timestamps: true });

export default model("Chat", chatSchema);
