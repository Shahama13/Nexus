import express from 'express'
import { errorMiddleware } from './middlewares/error.middleware.js'
import authRouter from './routes/auth.route.js'
import chatRouter from './routes/chat.route.js'
import messageRouter from './routes/message.route.js'
import attachmentRouter from './routes/attachment.route.js'
import aiRoute from './routes/ai.route.js'
import cors from "cors"
import passport from 'passport'
import cookieParser from 'cookie-parser'
import path from "path"
import { fileURLToPath } from "url";

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true, limit: "20kb" }))
app.use(cookieParser())
app.use(cors({
  origin: [process.env.FRONTEND_URL],
  credentials: true
}))
app.use(passport.initialize())

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.static(path.join(__dirname, '../client/dist')))

app.use("/api/v1/auth", authRouter)
app.use("/api/v1", chatRouter)
app.use("/api/v1", messageRouter)
app.use("/api/v1", attachmentRouter)
app.use("/api/v1/ai", aiRoute)

app.get('/health', (req, res) => {
  res.send('Hello World!')
})

app.get('/*path', function (req, res) {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'))
});

app.use(errorMiddleware)

export default app