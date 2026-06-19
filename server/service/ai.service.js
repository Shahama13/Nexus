import mongoose from "mongoose";
import { OpenAI } from "openai";
import MessageModel from "../models/Message.model.js";
import { tryCatchWrapper } from "../middlewares/error.middleware.js";
import { redisClient } from "../config/redis.config.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import { MemoryClient } from "mem0ai";
import { tavily } from "@tavily/core";
import { extractText } from "unpdf";
import { uploadToCloudinary } from "../config/cloudinary.config.js";
import { v4 as uuidv4 } from 'uuid';


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

function getUserCollection(userId) {
    return `pdf_${userId}`
}

async function ensureCollectionExists(userId) {
    const collectionName = getUserCollection(userId)

    const collections = await qdrant.getCollections()
    const exists = collections.collections.find(c => c.name === collectionName)

    if (!exists) {
        await qdrant.createCollection(collectionName, {
            vectors: { size: 1536, distance: "Cosine" }
        });
        console.log("Collection created:", collectionName)
    }

    await qdrant.createPayloadIndex(collectionName, {
        field_name: "chat_id",
        field_schema: "keyword"
    }).catch(err => console.log("Index already exists, skipping:", err.data?.status?.error));

    return collectionName
}

function splitTextsIntoChunks(text, chunkSize = 1000, overlap = 200) {
    const chunks = []
    let start = 0

    while (start < text.length) {
        let end = Math.min(chunkSize + start, text.length)
        chunks.push(text.slice(start, end))
        start += chunkSize - overlap
    }

    return chunks
}

async function getEmbeddings(text) {
    const response = await client.embeddings.create({
        model: "text-embedding-ada-002",
        input: text
    })
    return response.data[0].embedding
}


async function processAndStorePdf(pdfBuffer, userId, chatId) {
    try {
        const buffer = new Uint8Array(pdfBuffer)

        const { text, totalPages } = await extractText(buffer, {
            mergePages: true
        })

        // break down in chunks
        const chunks = splitTextsIntoChunks(text)

        const collectionName = await ensureCollectionExists(userId)

        const points = []

        for (let i = 0; i < chunks.length; i++) {
            // create embeddings of chunks
            const embedding = await getEmbeddings(chunks[i])
            points.push({
                id: uuidv4(),
                vector: embedding,
                payload: {
                    chat_id: chatId,
                    text: chunks[i],
                    chunk_index: i,
                    total_chunks: chunks.length,
                    uploaded_at: new Date().toISOString(),

                }
            })
        }

        // Delete old documents for this chat cause we only want context from the lastest uploaded pdf
        await qdrant.delete(collectionName, {
            filter: {
                must: [
                    {
                        key: "chat_id",
                        match: {
                            value: chatId
                        }
                    }
                ]
            }
        }).catch(err => {
            // If delete fails (e.g., no index yet), just log and continue
            console.log("Delete error (may be normal):", err.message);
        });

        // store embeddings
        if (points.length > 0) {
            await qdrant.upsert(collectionName, { points })
        }

        return {
            success: true,
            chunks: chunks.length,
            totalPages,
            textLength: text.length
        }
    } catch (error) {
        console.error("PDF processing error:", error.data?.status?.error || error.message);

        return { success: false, error: error.message };
    }
}

async function searchPDFContext(query, userId, chatId) {
    try {
        const collectionName = getUserCollection(userId)

        const collections = await qdrant.getCollections()
        const exists = collections.collections.find(c => c.name === collectionName)

        if (!exists) {
            return []
        }

        const queryEmbedding = await getEmbeddings(query)

        const searchResult = await qdrant.search(collectionName, {
            vector: queryEmbedding,
            limit: 5,
            filter: {
                must: [
                    { key: "chat_id", match: { value: chatId } }
                ]
            }

        })

        console.log(searchResult, "this is your search result ")
        if (searchResult.length > 0) {
            return searchResult.map((point) => ({
                text: point.payload.text,
                score: point.score
            }))
        }

        return [];
    } catch (error) {
        console.error("PDF search error:", error.data?.status?.error || error.message);
        // return [];
        return [];
    }
}

async function createChatIdIndex(userId) {
    try {
        const collectionName = getUserCollection(userId);
        await qdrant.createIndex(collectionName, {
            field_name: "chat_id",
            field_type: "keyword"
        });
        console.log(`Created index for chat_id in collection: ${collectionName}`);
    } catch (error) {
        // Index might already exist
        console.log("Index for chat_id may already exist:", error.message);
    }
}


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


