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

const app = express()


app.use(express.json())
app.use(express.urlencoded({ extended: true, limit: "20kb" }))
app.use(cookieParser())
app.use(cors({
  origin: ["http://localhost:5173"],
  credentials: true
}))
app.use(passport.initialize())

app.use("/api/v1/auth", authRouter)
app.use("/api/v1", chatRouter)
app.use("/api/v1", messageRouter)
app.use("/api/v1", attachmentRouter)
app.use("/api/v1/ai", aiRoute)

app.get('/', (req, res) => {
  res.send('Hello World!')
})


app.use(errorMiddleware)

export default app