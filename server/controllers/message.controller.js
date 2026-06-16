import mongoose from "mongoose";
import { CustomError, tryCatchWrapper } from "../middlewares/error.middleware.js"
import ChatModel from "../models/Chat.model.js";
import MessageModel from "../models/Message.model.js"
import { pub, redisClient } from "../config/redis.config.js";
import { uploadToCloudinary } from "../config/cloudinary.config.js";

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
                { path: "threadId", select: "content sender createdAt attachments", populate: { path: "sender", select: "name" } }
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

export const sendAttachment = tryCatchWrapper(async (req, res, next) => {

    const { chatId, threadId, content, tempId } = req.body
    const files = req.files;

    if (!files || files.length === 0) {
        return next(new CustomError("No files uploaded", 400))
    }

    const chat = await ChatModel.findById(chatId)
    if (!chat) {
        return next(new CustomError("Chat not found", 404))
    }



    const isParticipant = chat.participants.some(
        id => id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
        return next(new CustomError("Not a participant", 403))
    }

    const attachments = []

    console.log(files)

    for (const file of files) {

        console.log(file, "Here is the file")
        try {
            let resourceType = "auto";
            if (file.mimetype.startsWith('image/')) resourceType = 'image';
            else if (file.mimetype.startsWith('video/')) resourceType = 'video';
            else if (file.mimetype.startsWith('audio/')) resourceType = 'video';


            const result = await uploadToCloudinary(file.buffer, {
                resource_type: resourceType,
                filename: file.originalname
            })

            attachments.push({
                url: result.secure_url,
                localPath: result.public_id,
                fileType: file.mimetype.split('/')[0],
                mimeType: file.mimetype,
                fileName: file.originalname,
                size: file.size,
                secure_url: result.secure_url, // Add this for compatibility
                originalname: file.originalname, // Add this for compatibility
                attachmentType: file.mimetype.startsWith('image/') ? "image" : file.mimetype.startsWith('video/') ? "video" : file.mimetype.startsWith('audio/') ? "audio" : "doc"
            });
        }
        catch (uploadError) {
            console.error('Cloudinary upload error:', uploadError);
            return res.status(500).json({ error: `Failed to upload ${file.originalname}` });
        }
    }

    const savedMessage = await MessageModel.create({
        sender: req.user._id,
        chat: chatId,
        content: content || '',
        attachments,
        threadId: threadId ? new mongoose.Types.ObjectId(threadId) : null
    });

    // Populate sender info
    const populatedMessage = await MessageModel.findById(savedMessage._id)
        .populate('sender', 'name email avatar');

    const cacheMessage = {
        _id: populatedMessage._id,
        sender: {
            _id: req.user._id,
            name: req.user.name
        },
        chat: chatId,
        content: populatedMessage.content,
        attachments: populatedMessage.attachments,
        createdAt: populatedMessage.createdAt,
        threadId: threadId ? { _id: threadId, sender: req.user._id, content, attachments: threadId.attachments } : null
    };


    const redisKey = `chat:${chatId}:recent`;
    await Promise.all([
        pub.rpush(redisKey, JSON.stringify(cacheMessage)),
        pub.ltrim(redisKey, -30, -1)
    ]);

    await ChatModel.findByIdAndUpdate(chatId, {
        $set: { lastMessage: savedMessage._id }
    });


    const messageData = {
        id: savedMessage._id,
        chatId,
        sender: { _id: req.user._id, name: req.user.name },
        text: populatedMessage.content,
        attachments: populatedMessage.attachments,
        createdAt: populatedMessage.createdAt,
        threadId: threadId ? { _id: threadId, sender: req.user._id, content, attachments: threadId.attachments } : null,
        tempId
    };

    await pub.publish('chat-message', JSON.stringify(messageData));


    for (const participantId of chat.participants) {
        await pub.publish('new-message-alert', JSON.stringify({
            participantId: participantId.toString(),
            chatId,
            sender: { _id: req.user._id, name: req.user.name },
            content: populatedMessage.content || populatedMessage.attachments[0].attachmentType,
            attachments: populatedMessage.attachments
        }));
    }

    res.status(201).json({
        success: true,
        message: populatedMessage
    });



})


export const getAttachmentUrl = async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await MessageModel.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        res.json({
            success: true,
            attachments: message.attachments
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};