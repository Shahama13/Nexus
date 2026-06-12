import mongoose from "mongoose";
import { CustomError, tryCatchWrapper } from "../middlewares/error.middleware.js"
import ChatModel from "../models/Chat.model.js";
import MessageModel from "../models/Message.model.js"
import { redisClient } from "../config/redis.config.js";

export const getMessages = tryCatchWrapper(async (req, res, next) => {

    const { chatId } = req.params
    const { page = 1, limit = 30 } = req.query
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)

    const selectedChat = await ChatModel.findById(chatId);

    if (!selectedChat) {
        return next(new CustomError("Chat does not exist", 404));
    }

    if (!selectedChat.participants?.includes(req.user?._id)) {
        return next(new CustomError("User is not a part of this chat", 400));
    }

    console.log("Here in message controller", page)
    if (pageNum === 1) {
        

        const redisKey = `chat:${chatId}:recent`
        const cachedMessages = await redisClient.lrange(redisKey, 0, -1)
        // console.log("Retrived from redis",cachedMessages.length)
        if (cachedMessages && cachedMessages.length > 0) {
            const messages = cachedMessages.map((msg) => JSON.parse(msg)).reverse()
            const totalMsgCount = await MessageModel.countDocuments({ chat: chatId })
            const totalPages = Math.ceil(totalMsgCount / limitNum) || 1
            // console.log("Retrived from redis", messages)
            return res.status(200).json({
                success: true,
                messages,
                totalPages,
                fromCache: true
            })
        }

    }

    const [messages, totalMsgCount] = await Promise.all([
        MessageModel
            .find({ chat: chatId })
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            //populate threadID and sender details
            .populate([
                { path: "sender", select: "name" },
                { path: "threadId", select: "content sender createdAt", populate: { path: "sender", select: "name" } }
            ])
            .lean()
        , MessageModel.countDocuments({ chat: chatId })
    ])

    const totalPages = Math.ceil(totalMsgCount / limitNum) || 1


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
