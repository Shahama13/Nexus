import mongoose from "mongoose";
import MessageModel from "../models/Message.model.js";
import { CustomError, tryCatchWrapper } from "../middlewares/error.middleware.js";
import { redisClient } from "../config/redis.config.js";
import { extractText } from "unpdf";
import { uploadToCloudinary } from "../config/cloudinary.config.js";
import { v4 as uuidv4 } from 'uuid';
import { processAndStorePdf, searchPDFContext } from "./pdf.service.js";
import { client, qdrant, mem0, Tavily } from "../config/ai.config.js";
import ChatModel from "../models/Chat.model.js";


export const streamChat = tryCatchWrapper(async (req, res) => {
   
    const { message, chatId, source = "auto", isNewConversation = false, userName } = req.body
    const pdfFile = req.file
    const attachment = req.body.attachment ? JSON.parse(req.body.attachment) : null


    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders()

    const userId = req.user._id.toString();
    const redisKey = `chat:${chatId}:recent`
    const cachedMessages = await redisClient.lrange(redisKey, -4, -1)

    let openAIMessages = []
    if (cachedMessages?.length > 0) {
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
            // console.log(`PDF processed: ${result.chunks} chunks for user`)
        }
    }

    if (attachment && attachment.attachmentType === "image") {
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

    } else if (message) {
        openAIMessages.push({
            role: "user",
            content: message
        })
    } else if (isNewConversation) {
        // For welcome message, create a more specific user message
        openAIMessages.push({
            role: "user",
            content: `Please introduce yourself to me. My name is ${userName || 'new user'}. I'm starting a conversation with you for the first time.`
        });
    }

    let needsWebSearch = false, needsMemory = false, saveToMemory = false, needsPDF = false;

    // Only run classifier for non-welcome messages
    if (!isNewConversation && message) {
        try {
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
            });
            ({ needsWebSearch, needsMemory, saveToMemory, needsPDF } = JSON.parse(classifier.choices[0].message.content));
        } catch (error) {
            console.error("Classifier error:", error);
            // Default values if classifier fails
            needsWebSearch = false;
            needsMemory = false;
            saveToMemory = false;
            needsPDF = false;
        }
    }

    // console.log("Classification:", { needsWebSearch, needsMemory, saveToMemory, needsPDF })

    const hasImage = attachment && attachment.attachmentType === "image"

    if (hasImage) {
        needsWebSearch = false
    }

    let pdfChunks = []

    if (needsPDF || hasPDF) {
        pdfChunks = await searchPDFContext(message, userId, chatId)
        if (pdfChunks.length > 0) {
            // console.log(`Found ${pdfChunks.length} relevant PDF chunks for user ${userId}`);
        } else {
            // console.log(`No relevant PDF chunks found for user ${userId}`);
        }
    }

    // Build system prompt with contexts
    let systemPrompt = "";

    if (isNewConversation) {
        systemPrompt = `🌟 You're speaking with a new user for the first time.
The user's name is ${userName || 'new user'}

About you:
- Name: Nexus
- Role: Intelligent AI Assistant
- Capabilities: Text analysis, PDF processing, image understanding, web search, memory retention

Introduction Guidelines:
1. Start with a warm, friendly greeting using the user's name if you know it
2. Give a detailed description of your capabilities (PDF, images, web search, memory, conversation history)
3. Ask an open-ended question about how you can help them
4. Keep it friendly - be enthusiastic and approachable
5. Make them feel welcome and excited to use your services

Remember: This is the user's first impression of you. Make it count!`;
    } else {
        systemPrompt = "Your name is Nexus. You are a helpful, detailed, and knowledgeable AI assistant.";
    }

    const [memories, searchResult] = await Promise.all([
        needsMemory && !isNewConversation
            ? mem0.search(message, { filters: { user_id: req.user._id.toString() } })
            : Promise.resolve(null),
        needsWebSearch && !isNewConversation
            ? Tavily.search(message, { max_results: 3 })
            : Promise.resolve(null)
    ])

    if (memories?.results?.length > 0) {
        const memoryContext = memories.results.map(m => `- ${m.memory}`).join("\n")
        systemPrompt += `\n\nRelevant facts about the user:\n${memoryContext}\n\n`;
    }

    if (searchResult?.results?.length > 0) {
        const webContext = searchResult.results.map(r => r.content).join("\n")
        systemPrompt += `\n\nCurrent web search results:\n${webContext}\nUse this if relevant.`
    }

    if (pdfChunks.length > 0) {
        const pdfContext = pdfChunks.map((chunk, index) =>
            `[Chunk ${index + 1} (relevance: ${Math.round(chunk.score * 100)}%)] :\n ${chunk.text}`
        ).join("\n\n---\n\n")

        systemPrompt += `\n\nContext from your uploaded PDF document:\n${pdfContext}\n\n`;
        systemPrompt += `Answer the question based on the PDF content above. If the answer is not in the PDF, say "I couldn't find that information in your PDF document."\n\n`;
    } else if (needsPDF && pdfChunks.length === 0 && !hasPDF && !isNewConversation) {
        systemPrompt += `\n\nThe user asked about a PDF document, but no PDF has been uploaded yet. Ask them to upload a PDF first.\n\n`;
    } else if (pdfProcessed && pdfChunks.length === 0 && !isNewConversation) {
        systemPrompt += `\n\nThe user has uploaded a PDF, but the query doesn't match any content in it. Inform them that the answer might not be in the document.\n\n`;
    }

    // For non-welcome messages, add instructions for comprehensive answers
    if (!isNewConversation) {
        systemPrompt += `\n\nOnly reply what is asked`;
    }

    if (systemPrompt) {
        openAIMessages.unshift({
            role: "system",
            content: systemPrompt
        });
    }

    // console.log("Sending to AI:", JSON.stringify(openAIMessages, null, 2))

    try {
        const stream = await client.chat.completions.create({
            model: "gpt-4o-mini", 
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
            message ? MessageModel.create({ sender: req.user._id, content: message || "Welcome message", chat: chatId, attachments: attachment ? [attachment] : [] }) : Promise.resolve(null),
            MessageModel.create({
                sender: new mongoose.Types.ObjectId(process.env.BOT_USER_ID),
                content: result,
                chat: chatId
            })
        ])

        const pipeline = redisClient.multi()
        if(savedUserMsg){
            pipeline.rpush(redisKey, JSON.stringify({
                _id: savedUserMsg._id,
                sender: { _id: req.user._id, name: req.user.name },
                chat: chatId, content: message , attachments: attachment ? [attachment] : [],
                createdAt: savedUserMsg.createdAt, role: "user"
            }))
        }
        pipeline.rpush(redisKey, JSON.stringify({
            _id: savedAiMsg._id,
            sender: { _id: process.env.BOT_USER_ID, name: "Nexus AI" },
            chat: chatId, content: result,
            createdAt: savedAiMsg.createdAt, role: "assistant"
        }))

        pipeline.ltrim(redisKey, -30, -1)
        await pipeline.exec()

        if (saveToMemory && !isNewConversation && message) {
            mem0.add([{ role: "user", content: message }], {
                user_id: req.user._id.toString()
            }).catch(err => console.error("MEM0 ADD ERROR:", err))
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
        res.end()

    } catch (error) {
        console.error("Stream error:", error)
        // Send a fallback response
        const fallbackResponse = isNewConversation
            ? `Hello${userName ? ' ' + userName : ''}! 👋 I'm Nexus, your AI assistant. How can I help you today?`
            : "I'm having trouble processing your request. Could you please try again?";

        res.write(`data: ${JSON.stringify({ token: fallbackResponse })}\n\n`)
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
        res.end()
    }
})

export const generateResponseOnMessageContext = tryCatchWrapper(async (req, res, next) => {
    const { chatId } = req.params
    const { userQuery } = req.body

    if (!userQuery) return

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const chat = await ChatModel.findById(chatId)

    if (!chat) {
        return next(new CustomError("Chat not found", 404));
    }

    const isParticipant = chat.participants.find((p) => p.toString() === req.user._id.toString())

    if (!isParticipant) return next(new CustomError("User not part of chat", 403))

    // get recent chat context try getting from redis if not available go to db

    const redisKey = `chat:${chatId}:recent`;

    // build a small context for now
    const cachedMessages = await redisClient.lrange(redisKey, -5, -1)
    let context = `Your name is Nexus.
You are helping participants in a conversation . u just answer what is asked without saying who said what.
Conversation:
`;

    if (cachedMessages.length > 0) {

        const parsedMessages = cachedMessages.map(msg => JSON.parse(msg));

        context += parsedMessages
            .map(message => `${message.sender.name}: ${message.content}`)
            .join("\n");


    }
    else {
        const messagesFromDatabase = await MessageModel
            .find({ chat: chatId })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate({ path: "sender", select: "name" })

        context += messagesFromDatabase.map((message) => `${message.sender.name}: ${message.content}`).join("\n")
    }

    context += "\n\n"
    // run classifier for memory search and websearch


    const classifier = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `This is a conversation between people.
Reply with JSON only:

{
  "needsWebSearch": boolean,
  "needsMemory": boolean,
  "saveToMemory": boolean,
}

- needsWebSearch: true if the query needs current information
- needsMemory: true if the query references user history
- saveToMemory: true if the user shares personal information
- All false for casual chat, greetings, coding help`
            },
            { role: "user", content: userQuery }
        ],
        response_format: { type: "json_object" },
        max_tokens: 50
    })

    let { needsWebSearch, needsMemory, saveToMemory } = JSON.parse(
        classifier.choices[0].message.content
    )

    const [webSearchResults, memories] = await Promise.all([
        needsWebSearch ? await Tavily.search(userQuery, { max_results: 3 }) : Promise.resolve(null),
        needsMemory ? mem0.search(userQuery, { filters: { user_id: req.user._id.toString() } }) : Promise.resolve(null)
    ])



    if (webSearchResults?.results?.length > 0) {
        const webContext = webSearchResults.results.map(r => r.content).join("\n")
        context += `Current web search results:\n${webContext}\nUse this if relevant.`
    }

    if (memories?.results?.length > 0) {
        const memoryContext = memories.results.map(m => `- ${m.memory}`).join("\n")
        context += `Relevant facts about the user who called for your answer:\n${memoryContext}\n\n`;
    }

    const stream = await client.chat.completions.create({
        model: "gpt-5.5",
        messages: [
            {
                role: "system",
                content: context
            },
            {
                role: "user",
                content: userQuery
            }
        ],
        stream: true
    })

    let result = ""

    for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content
        if (token) {
            result += token
            res.write(`data: ${JSON.stringify({ token })}\n\n`)
        }
    }


    // const savedAiMsg = await MessageModel.create({
    //     sender: new mongoose.Types.ObjectId(process.env.BOT_USER_ID),
    //     content: result,
    //     chat: chatId,
    // })

    // await redisClient.rpush(redisKey, JSON.stringify({
    //     _id: savedAiMsg._id,
    //     sender: { _id: process.env.BOT_USER_ID, name: "Nexus AI" },
    //     chat: chatId, content: result,
    //     createdAt: savedAiMsg.createdAt, role: "assistant"
    // }))

    // await redisClient.ltrim(redisKey, -30, -1)

    if (saveToMemory) {
        mem0.add([{ role: "user", content: userQuery }], {
            user_id: req.user._id.toString()
        }).catch(err => console.error("MEM0 ADD ERROR:", err))
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()
})


