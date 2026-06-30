import { QdrantClient } from "@qdrant/js-client-rest";
import { MemoryClient } from "mem0ai";
import { tavily } from "@tavily/core";
import { OpenAI } from "openai";
import { config } from "dotenv";
config()

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

export {
    client,
    qdrant,
    mem0,
    Tavily
}