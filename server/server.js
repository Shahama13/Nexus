import dotenv from 'dotenv'

dotenv.config()

import { Server } from "socket.io"
import http from "http"
import "./config/passport.config.js"
import connectDB from './config/connectDB.js'
import app from './app.js'
import { initSocket } from './socket/server.socket.js'

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL],
    credentials: true
  }
})
app.set("io", io)
initSocket(io)
connectDB()


const PORT = process.env.SERVER_PORT || 3000

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
