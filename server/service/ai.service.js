import mongoose from "mongoose";
import { OpenAI } from "openai";
import MessageModel from "../models/Message.model.js";
import { tryCatchWrapper } from "../middlewares/error.middleware.js";
import { redisClient } from "../config/redis.config.js";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


export const streamChat = tryCatchWrapper(async (req, res) => {
    const { message, chatId } = req.body

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders()

    //TODO: later get msgs from db for contenxt in case redis doesnt have acached texts

    const redisKey = `chat:${chatId}:recent`
    const cachedMessages = await redisClient.lrange(redisKey, 0, -1)
    let openAIMessages = []
    if (cachedMessages && cachedMessages.length > 0) {
        const messages = cachedMessages.map((msg) => JSON.parse(msg))
        openAIMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }))
    }
    openAIMessages.push(
        {
            role: "user",
            content: message,
        }
    )
    console.log(openAIMessages, "Thsser ae openAIMessages ")

    try {
        const stream = await client.chat.completions.create({
            model: "gpt-5.5",
            messages: openAIMessages,
            stream: true,

        });
        let result = ""
        for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content
            if (token) {
                result += token
            }
            console.log(token)
            if (token) {
                res.write(
                    `data: ${JSON.stringify({ token })}\n\n`
                )
            }
        }
        const redisKey = `chat:${chatId}:recent`;

        const saveduserMsg = await MessageModel.create({
            sender: req.user._id,
            content: message,
            chat: chatId,
        });

        const userCachedMessage = {
            _id: saveduserMsg._id,
            sender: {
                _id: req.user._id,
                name: req.user.name
            },
            chat: chatId,
            content: saveduserMsg.content,
            createdAt: saveduserMsg.createdAt,
            role: "user",
        }

        const mongoIdOfAi = new mongoose.Types.ObjectId(process.env.BOT_USER_ID)
        const savedAiMsg = await MessageModel.create({
            sender: mongoIdOfAi,
            content: result,
            chat: chatId,
        })

        const aiCachedMessage = {
            _id: savedAiMsg._id,
            sender: {
                _id: mongoIdOfAi,
                name: "Nexus AI"
            },
            chat: chatId,
            content: savedAiMsg.content,
            createdAt: savedAiMsg.createdAt,
            role: "assistant"
        }


        // To avoid race condition
        const pipeline = redisClient.multi();
        pipeline.rpush(redisKey, JSON.stringify(userCachedMessage));
        pipeline.rpush(redisKey, JSON.stringify(aiCachedMessage));
        pipeline.ltrim(redisKey, -30, -1);
        await pipeline.exec();


        res.write(
            `data: ${JSON.stringify({ done: true })}\n\n`
        )

        res.end()
    } catch (error) {
        console.error(error)
        res.status(500).end()
    }

})


