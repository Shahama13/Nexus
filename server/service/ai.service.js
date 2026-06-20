import mongoose from "mongoose";
import MessageModel from "../models/Message.model.js";
import { tryCatchWrapper } from "../middlewares/error.middleware.js";
import { redisClient } from "../config/redis.config.js";
import { extractText } from "unpdf";
import { uploadToCloudinary } from "../config/cloudinary.config.js";
import { v4 as uuidv4 } from 'uuid';
import { processAndStorePdf, searchPDFContext } from "./pdf.service.js";
import { client, qdrant, mem0, Tavily } from "../config/ai.config.js";


export const streamChat = tryCatchWrapper(async (req, res) => {
    const { message, chatId, source = "auto" } = req.body
    const pdfFile = req.file
    const attachment = req.body.attachment ? JSON.parse(req.body.attachment) : null

    console.log(req.body.attachment, "Here is your attachment")

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders()

    const userId = req.user._id.toString();
    const redisKey = `chat:${chatId}:recent`
    const cachedMessages = await redisClient.lrange(redisKey, -4, -1)

    let openAIMessages = []
    if (cachedMessages?.length > 0) {

        // openAIMessages = cachedMessages.map(msg => {
        //     const parsed = JSON.parse(msg)
        //     return { role: parsed.role, content: parsed.content }
        // })

        openAIMessages = cachedMessages.map((msg) => {
            const parsed = JSON.parse(msg)

            if (parsed.role === "user" && parsed?.attachments?.length) {
                const content = [
                    {
                        type: "text",
                        text: parsed.content
                    }
                ]
                parsed.attachments.forEach((attachment) => {
                    if (attachment.attachmentType === "image") {
                        content.push({
                            type: "image_url",
                            image_url: {
                                url: attachment.url
                            }
                        })
                    }
                })

                return {
                    role: parsed.role,
                    content
                }
            }

            return {
                role: parsed.role,
                content: parsed.content
            }

        })
    }


    let hasPDF = false
    let pdfProcessed = false


    if (pdfFile) {
        hasPDF = true



        const result = await processAndStorePdf(pdfFile.buffer, userId, chatId)
        if (result.success) {
            pdfProcessed = true

            console.log(`PDF processed: ${result.chunks} chunks for user`)
        }

    }

    if (attachment && attachment.attachmentType === "image") {

        // attachmentsToSave.push(attachment)

        const userContent = [
            {
                type: "text",
                text: message
            },
            {
                type: "image_url",
                image_url: {
                    url: attachment.url
                }
            }
        ]

        openAIMessages.push({
            role: "user",
            content: userContent
        })

    } else {
        openAIMessages.push({
            role: "user",
            content: message
        })
    }

    const classifier = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `You decide what context is needed to answer the user's message.
Reply with JSON only:

{
  "needsWebSearch": boolean,
  "needsMemory": boolean,
  "saveToMemory": boolean,
  "needsPDF": boolean
}

- needsWebSearch: true if the query needs current information
- needsMemory: true if the query references user history
- saveToMemory: true if the user shares personal information
- needsPDF: true if the user is asking about an uploaded document, PDF, file content, summary, chapter, section, page, or document-related information
- All false for casual chat, greetings, coding help`
            },
            { role: "user", content: message }
        ],
        response_format: { type: "json_object" },
        max_tokens: 50
    })

    let { needsWebSearch, needsMemory, saveToMemory, needsPDF } = JSON.parse(
        classifier.choices[0].message.content
    )

    console.log("Classification:", { needsWebSearch, needsMemory, saveToMemory, needsPDF })

    const hasImage = attachment && attachment.attachmentType === "image"

    if (hasImage) {
        needsWebSearch = false
    }

    let pdfChunks = []

    if (needsPDF || hasPDF) {
        pdfChunks = await searchPDFContext(message, userId, chatId)
        if (pdfChunks.length > 0) {
            console.log(`Found ${pdfChunks.length} relevant PDF chunks for user ${userId}`);
        } else {
            console.log(`No relevant PDF chunks found for user ${userId}`);
        }
    }


    const [memories, searchResult] = await Promise.all([
        needsMemory
            ? mem0.search(message, { filters: { user_id: req.user._id.toString() } })
            : Promise.resolve(null),
        needsWebSearch
            ? Tavily.search(message, { max_results: 3 })
            : Promise.resolve(null)
    ])

    // Build system prompt with contexts
    let systemPrompt = "";

    if (memories?.results?.length > 0) {
        const memoryContext = memories.results.map(m => `- ${m.memory}`).join("\n")
        systemPrompt += `Relevant facts about the user:\n${memoryContext}\n\n`;
    }

    if (searchResult?.results?.length > 0) {
        const webContext = searchResult.results.map(r => r.content).join("\n")

        systemPrompt += `Current web search results:\n${webContext}\nUse this if relevant.`

    }

    if (pdfChunks.length > 0) {
        const pdfContext = pdfChunks.map((chunk, index) =>
            `[Chunk ${index + 1} (relevance: ${Math.round(chunk.score * 100)}%)] :\n ${chunk.text}`
        ).join("\n\n---\n\n")

        systemPrompt += `Context from your uploaded PDF document:\n${pdfContext}\n\n`;
        systemPrompt += `Answer the question based on the PDF content above. If the answer is not in the PDF, say "I couldn't find that information in your PDF document."\n\n`;
    } else if (needsPDF && pdfChunks.length === 0 && !hasPDF) {
        systemPrompt += `The user asked about a PDF document, but no PDF has been uploaded yet. Ask them to upload a PDF first.\n\n`;
    } else if (pdfProcessed && pdfChunks.length === 0) {
        // User has PDF but no relevant chunks found
        systemPrompt += `The user has uploaded a PDF, but the query doesn't match any content in it. Inform them that the answer might not be in the document.\n\n`;
    }

    if (systemPrompt) {
        openAIMessages.unshift({
            role: "system",
            content: systemPrompt
        });
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
            MessageModel.create({ sender: req.user._id, content: message, chat: chatId, attachments: attachment ? [attachment] : [] }),
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
            chat: chatId, content: message, attachments: attachment ? [attachment] : [],
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


