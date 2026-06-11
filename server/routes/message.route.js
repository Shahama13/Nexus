import express from "express"
import { authenticateToken } from "../middlewares/auth.middleware.js"
import { getMessages, readMessages } from "../controllers/message.controller.js"

const router = express.Router()

router.use(authenticateToken)
router.route("/messages/:chatId").get(getMessages)
router.get("/read/messages/:chatId", readMessages)

export default router
