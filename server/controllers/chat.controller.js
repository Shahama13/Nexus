import mongoose from "mongoose";
import { NEW_CHAT_EVENT, LEAVE_CHAT_EVENT } from "../constants/events.js";
import { CustomError, tryCatchWrapper } from "../middlewares/error.middleware.js";
import Chat from "../models/Chat.model.js";
import MessageModel from "../models/Message.model.js";
import UserModel from "../models/User.model.js";
import { emitEvent } from "../socket/server.socket.js";
import ChatModel from "../models/Chat.model.js";

const chatCommonAggregation = () => {
    return [
        {
            $lookup: {
                from: "users",
                localField: "participants",
                foreignField: "_id",
                as: "participants",
                pipeline: [
                    {
                        $project: {
                            password: 0,
                            __v: 0,
                            provider: 0,
                            googleId: 0

                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "messages",
                foreignField: "_id",
                localField: "lastMessage",
                as: "lastMessage",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            foreignField: "_id",
                            localField: "sender",
                            as: "sender",
                            pipeline: [
                                {
                                    $project: {
                                        name: 1,
                                        email: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            sender: { $first: "$sender" },
                        },
                    },
                ]
            }
        },
        {
            $addFields: {
                lastMessage: { $first: "$lastMessage" }
            }
        }
    ]
}
export const newGroupChat = tryCatchWrapper(async (req, res, next) => {
    const { name, participants } = req.body

    if (participants.includes(req.user._id.toString())) return next(new CustomError("Participants array should not contain the group creator", 400))


    const members = [...new Set([...participants, req.user._id])]
    if (members.length < 3) return next(new CustomError("Seems like you have passed duplicate participants.", 400))
    const groupChat = await Chat.create({
        name,
        isGroupChat: true,
        participants: members,
        admin: req.user._id,
    });

    const createdChat = await Chat.aggregate([
        {
            $match: {
                _id: groupChat._id,
            },
        },
        ...chatCommonAggregation(),
    ]);

    const payload = createdChat[0]; // store the aggregation result

    if (!payload) {
        return next(new CustomError("Internal server error", 500))

    }

    emitEvent(
        req,
        payload.participants.map(p => p._id),
        NEW_CHAT_EVENT,
        payload
    );

    return res.status(201).json({
        success: true,
        message: "Group Created"
    })

})
export const newUserChat = tryCatchWrapper(async (req, res, next) => {

    const { receiverId } = req.params

    const receiver = await UserModel.findById(receiverId)

    if (!receiver) return next(new CustomError("User does not exist", 404))

    const chat = await ChatModel.aggregate([
        {
            $match: {
                isGroupChat: { $ne: true },
                participants: {
                    $all: [
                        req.user._id,
                        new mongoose.Types.ObjectId(receiverId),
                    ],
                },
            },
        },
    ]);

    if (chat.length > 0) return next(new CustomError("Chat Already exists", 404))

    if (receiver._id.toString() === req.user._id.toString()) return next(new CustomError("Cannot create chat with oneself/", 404))

    const newChatInstance = await Chat.create({
        name: "One on one chat",
        participants: [req.user._id, new mongoose.Types.ObjectId(receiverId)], // add receiver and logged in user as participants
        admin: req.user._id,
        isGroupChat: false
    });

    const createdChat = await Chat.aggregate([
        {
            $match: {
                _id: newChatInstance._id,
            },
        },
        ...chatCommonAggregation(),
    ]);

    const payload = createdChat[0]; // store the aggregation result

    if (!payload) {
        throw new ApiError(500, "Internal server error");
    }

    emitEvent(
        req,
        payload.participants.map(p => p._id),
        NEW_CHAT_EVENT,
        payload
    );


    return res.status(201).json({
        success: true,
        message: "Chat Created"
    })
})
export const getMyChats = tryCatchWrapper(async (req, res, next) => {

    const chats = await Chat.aggregate([
        {
            $match: {
                participants: { $elemMatch: { $eq: req.user._id } },
            }
        },
        {
            $sort: {
                updatedAt: -1,
            },
        },
        ...chatCommonAggregation()
    ])

    return res.status(200).json({
        success: true,
        chats: chats
    })
})
export const addParticipant = tryCatchWrapper(async (req, res, next) => {

    const { chatId, participantId } = req.params

    const groupChat = await Chat.findOne({
        _id: new mongoose.Types.ObjectId(chatId),
        isGroupChat: true,
    });

    if (!groupChat) return next(new CustomError("Chat not found", 404))

    if (groupChat.admin.toString() !== req.user._id.toString()) return next(new CustomError("You are not an admin", 400))

    const existingParticipants = groupChat.participants;

    if (existingParticipants?.includes(participantId)) {
        return next(new CustomError("Participant already in a group chat", 409))
    }

    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
            $push: {
                participants: participantId, // add new participant id
            },
        },
        { new: true }
    );

    emitEvent(req, participantId, NEW_CHAT_EVENT, updatedChat)

    return res.status(200).json({
        success: true,
        message: 'Participant added'
    })
})
export const removeParticipant = tryCatchWrapper(async (req, res, next) => {

    const { chatId, participantId } = req.params

    const groupChat = await Chat.findOne({
        _id: new mongoose.Types.ObjectId(chatId),
        isGroupChat: true,
    });

    if (!groupChat) return next(new CustomError("Chat not found", 404))

    if (groupChat.admin.toString() !== req.user._id.toString() ||
        req.user._id.toString() === participantId
    ) return next(new CustomError("You are not an admin or member", 400))

    const existingParticipants = groupChat.participants;

    if (!existingParticipants?.includes(participantId)) {
        return next(new CustomError("Participant not in chat", 409))
    }

    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
            $pull: {
                participants: participantId, // remove participant id
            },
        },
        { new: true }
    );

    emitEvent(req, participantId, LEAVE_CHAT_EVENT, updatedChat)

    return res.status(200).json({
        success: true,
        message: 'Participant removed'
    })

})
export const deleteGroup = tryCatchWrapper(async (req, res, next) => {
    const { chatId } = req.params

    const groupChat = await Chat.findOne({
        _id: new mongoose.Types.ObjectId(chatId),
        isGroupChat: true,
    }).lean();

    if (!groupChat) return next(new CustomError("Chat not found", 404))

    if (groupChat.admin.toString() !== req.user._id.toString()) return next(new CustomError("You are not an admin", 400))


    await Chat.findByIdAndDelete(chatId)
    await MessageModel.deleteMany({
        chat: new mongoose.Types.ObjectId(chatId)
    })


    emitEvent(req, groupChat.participants, LEAVE_CHAT_EVENT, { ...groupChat, participants: [] })

    return res.status(200).json({
        success: true,
        message: "Chat deleted"
    })
})
export const getGroupChatDetails = tryCatchWrapper(async (req, res, next) => {

    const { chatId } = req.params
    const groupChat = await Chat.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(chatId)
            }
        },
        ...chatCommonAggregation()
    ])

    if (!groupChat) return next(new CustomError("Chat not found", 404))

    return res.status(200).json({
        success: true,
        groupChat
    })
})

export const searchAvailableUsers = tryCatchWrapper(async (req, res, next) => {

    const users = await UserModel.aggregate([
        {
            $match: {
                _id: {
                    $ne: req.user._id
                },
                isBot: false
            }
        },
        {
            $project: {
                password: 0,
                googleId: 0,
                provider: 0
            }
        },
        {
            $unset: "__v"
        }
    ])


    return res.status(200).json({
        success: true,
        users: users
    })

})
