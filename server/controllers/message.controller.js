import mongoose from "mongoose";
import { CustomError, tryCatchWrapper } from "../middlewares/error.middleware.js"
import ChatModel from "../models/Chat.model.js";
import MessageModel from "../models/Message.model.js"

export const getMessages = tryCatchWrapper(async (req, res, next) => {

    const { chatId } = req.params

    const selectedChat = await ChatModel.findById(chatId);

    if (!selectedChat) {
        return newt(new CustomError("Chat does not exist", 404));
    }

    if (!selectedChat.participants?.includes(req.user?._id)) {
        return newt(new CustomError("User is not a part of this chat", 400));
    }

    const { page = 1, limit = 20 } = req.query

    const [messages, totalMsgCount] = await Promise.all([
        MessageModel
            .find({ chat: chatId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            //populate threadID and sender details
            .populate([
                { path: "sender", select: "name" },
                { path: "threadId", select: "content sender createdAt", populate: { path: "sender", select: "name" } }
            ])
            .lean()
        , MessageModel.countDocuments({ chat: chatId })
    ])

    const totalPages = Math.ceil(totalMsgCount / limit) || 0


    return res.status(200).json({
        success: true,
        messages,
        totalPages
    });
})

export const readMessages = tryCatchWrapper(async (req, res, next) => {
    const { chatId } = req.params;

    const chat = await ChatModel.findById(chatId);

    if (!chat) {
        return next(new CustomError("Chat does not exist", 404));
    }

    if (!chat.participants.some(p => p.toString() === req.user._id.toString())) {
        return next(new CustomError("User is not a part of this chat", 403));
    }

    const result = await MessageModel.updateMany(
        {
            chat: chatId,
            readBy: { $ne: req.user._id }
        },
        {
            $addToSet: { readBy: req.user._id }
        }
    );

    return res.status(200).json({
        success: true,
        modifiedCount: result.modifiedCount
    });
});
