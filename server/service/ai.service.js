import mongoose from "mongoose";
import { OpenAI } from "openai";
import MessageModel from "../models/Message.model.js";
import { tryCatchWrapper } from "../middlewares/error.middleware.js";
import { redisClient } from "../config/redis.config.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import { MemoryClient } from "mem0ai";
import { tavily } from "@tavily/core";



const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const qdrant = new QdrantClient({
    url: process.env.QDRANT_ENDPOINT,
    apiKey: process.env.QDRANT_CLOUD_API_KEY,
});

const mem0 = new MemoryClient({
    apiKey: process.env.MEM0_API_KEY,
});

const Tavily = tavily({ apiKey: process.env.TAVILY_API_KEY, });


export const streamChat = tryCatchWrapper(async (req, res) => {
    const { message, chatId } = req.body

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders()

    const redisKey = `chat:${chatId}:recent`
    const cachedMessages = await redisClient.lrange(redisKey, -4, -1)

    let openAIMessages = []
    if (cachedMessages?.length > 0) {
        openAIMessages = cachedMessages.map(msg => {
            const parsed = JSON.parse(msg)
            return { role: parsed.role, content: parsed.content }
        })
    }

    openAIMessages.push({ role: "user", content: message })

    const classifier = await client.chat.completions.create({
        model: "gpt-4o-mini", 
        messages: [
            {
                role: "system",
                content: `You decide what context is needed to answer the user's message. 
    Reply with JSON only: { "needsWebSearch": boolean, "needsMemory": boolean, "saveToMemory": boolean }
    - needsWebSearch: true if the query needs current/real-world info (news, prices, weather, facts)
    - needsMemory: true if the query is personal, references the user's past, preferences, or history
    - saveToMemory: true if the user says facets about himself or something about his like and preferences or something personal
    - All false for casual chat, greetings, simple questions, coding help`
            },
            { role: "user", content: message }
        ],
        response_format: { type: "json_object" },
        max_tokens: 50
    })

    const { needsWebSearch, needsMemory, saveToMemory } = JSON.parse(
        classifier.choices[0].message.content
    )

    console.log("Classification:", { needsWebSearch, needsMemory, saveToMemory })

    const [memories, searchResult] = await Promise.all([
        needsMemory
            ? mem0.search(message, { filters: { user_id: req.user._id.toString() } })
            : Promise.resolve(null),
        needsWebSearch
            ? Tavily.search(message, { max_results: 3 })
            : Promise.resolve(null)
    ])

    if (memories?.results?.length > 0) {
        const memoryContext = memories.results.map(m => `- ${m.memory}`).join("\n")
        openAIMessages.unshift({
            role: "system",
            content: `Relevant facts about the user:\n${memoryContext}\nUse these if relevant.`
        })
    }

    if (searchResult?.results?.length > 0) {
        const webContext = searchResult.results.map(r => r.content).join("\n")
        openAIMessages.unshift({
            role: "system",
            content: `Current web search results:\n${webContext}\nUse this if relevant.`
        })
    }

    console.log(openAIMessages, "openAIMessages")
   
    try {
        const stream = await client.chat.completions.create({
            model: "gpt-5.5",
            messages: openAIMessages,
            stream: true,
        })

        let result = ""
        for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content
            if (token) {
                result += token
                res.write(`data: ${JSON.stringify({ token })}\n\n`)
            }
        }

        // Save to DB and cache
        const [savedUserMsg, savedAiMsg] = await Promise.all([
            MessageModel.create({ sender: req.user._id, content: message, chat: chatId }),
            MessageModel.create({
                sender: new mongoose.Types.ObjectId(process.env.BOT_USER_ID),
                content: result,
                chat: chatId
            })
        ])

        const pipeline = redisClient.multi()
        pipeline.rpush(redisKey, JSON.stringify({
            _id: savedUserMsg._id,
            sender: { _id: req.user._id, name: req.user.name },
            chat: chatId, content: message,
            createdAt: savedUserMsg.createdAt, role: "user"
        }))
        pipeline.rpush(redisKey, JSON.stringify({
            _id: savedAiMsg._id,
            sender: { _id: process.env.BOT_USER_ID, name: "Nexus AI" },
            chat: chatId, content: result,
            createdAt: savedAiMsg.createdAt, role: "assistant"
        }))
        pipeline.ltrim(redisKey, -30, -1)
        await pipeline.exec()

        // Only store memory if it was a personal/meaningful message
        if (saveToMemory) {
            mem0.add([{ role: "user", content: message }], {
                user_id: req.user._id.toString()
            }).catch(err => console.error("MEM0 ADD ERROR:", err))
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
        res.end()

    } catch (error) {
        console.error(error)
        res.status(500).end()
    }
})


