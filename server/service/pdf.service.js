import { client, qdrant, mem0, Tavily } from "../config/ai.config.js";

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


export async function processAndStorePdf(pdfBuffer, userId, chatId) {
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

export async function searchPDFContext(query, userId, chatId) {
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
