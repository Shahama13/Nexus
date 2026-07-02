# Nexus 

**Real-time chat platform with a built-in AI assistant you can @mention anytime.**

Nexus is a full-stack messaging app supporting 1:1 and group chats over WebSockets, with an AI assistant (`@Nexus`) that can be summoned mid-conversation to answer questions, read PDFs, process images, search the web, and remember context across chats — all without leaving the conversation.

The `@Nexus` feature was born out of a real need: understanding fast-moving conversations with non-native English-speaking clients in real time, without breaking flow to open a separate translation or search tab.

🔗 **Live demo:** [Add your deployed link here]

---

## ✨ Features

- **Real-time messaging** — 1:1 and group chats powered by WebSockets, with instant delivery and typing/online-status updates
- **`@Nexus` in-chat AI assistant** — tag the bot in any personal or group conversation to get instant help
  - Has memory across the conversation (powered by Mem0)
  - Can answer questions from uploaded PDFs
  - Can process and understand images
  - Can perform live web search (via Tavily) for up-to-date answers
- **Google OAuth login** — quick sign-in via Google, backed by JWT-based sessions
- **Redis caching** — for session/data caching and performance
- **Cloudinary integration** — for image uploads and media handling
- **Vector search** — Qdrant-backed embeddings for RAG-style retrieval over documents
- **Fully containerized** — Docker + Docker Compose for local dev and deployment
- **CI/CD pipeline** — GitHub Actions automates build and deployment to AWS ECS via ECR

---

## 🏗️ Tech Stack

**Frontend**
- React + Vite
- WebSocket client for real-time updates

**Backend**
- Node.js + Express
- Socket-based real-time layer
- MongoDB (data store)
- Redis (caching & Pub/Sub)
- JWT + Google OAuth (auth)

**AI / RAG Layer**
- OpenAI API (LLM responses)
- Google API (Gemini/other Google AI services)
- Qdrant (vector database for document retrieval)
- Mem0 (conversational memory)
- Tavily (real-time web search)

**Infra / DevOps**
- Docker & Docker Compose
- AWS ECR + ECS (container registry & deployment)
- GitHub Actions (CI/CD)
- Cloudinary (media storage/CDN)

---

## 📂 Project Structure

```
Nexus/
├── client/                 # React + Vite frontend
│   ├── public/
│   ├── src/
│   ├── .env.example
│   └── vite.config.js
├── server/                 # Node/Express backend
│   ├── config/
│   ├── constants/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── service/
│   ├── socket/
│   ├── validators/
│   ├── .env.example
│   └── server.js
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js (v18+)
- Docker & Docker Compose
- MongoDB instance (local or Atlas)
- Redis instance
- API keys for: Google OAuth, OpenAI, Google AI, Qdrant Cloud, Mem0, Cloudinary, Tavily

### 1. Clone the repo

```bash
git clone https://github.com/Shahama13/Nexus.git
cd Nexus
```

### 2. Set up environment variables

**`client/.env`**

```env
VITE_API_URL="http://localhost:3000"
```

**`server/.env`**

```env
# Auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
JWT_SECRET=
EXPIRES_IN=7

# App
FRONTEND_URL=http://localhost:5173
SERVER_PORT=3000

# Database
MONGO_URI=

# Redis
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
REDIS_DB=

# AI Assistant
BOT_USER_ID=
GOOGLE_API_KEY=
OPENAI_API_KEY=
QDRANT_ENDPOINT=
QDRANT_CLOUD_API_KEY=
MEM0_API_KEY=
TAVILY_API_KEY=

# Media
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

> Copy `.env.example` in both `client/` and `server/` to `.env` and fill in your own values. Never commit real secrets.

### 3. Run locally (without Docker)

```bash
# In one terminal — start the server
cd server
npm install
npm run dev

# In another terminal — start the client
cd client
npm install
npm run dev
```

### 4. Run with Docker

```bash
docker-compose up --build
```

---

## 🚀 Deployment

Nexus is containerized with Docker and deployed to **AWS ECS** using images pushed to **AWS ECR**. **GitHub Actions** handles the CI/CD pipeline — every push triggers a build, and a successful build is deployed automatically.
