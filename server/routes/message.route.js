import express from "express"
import { authenticateToken } from "../middlewares/auth.middleware.js"
import { getMessages, readMessages, sendAttachment } from "../controllers/message.controller.js"
import upload from "../middlewares/multer.middleware.js"

const router = express.Router()

router.use(authenticateToken)

router.route("/messages/:chatId").get(getMessages)
router.get("/read/messages/:chatId", readMessages)
router.post("/messages/send-attachment", upload.array('attachments', 5), sendAttachment)
// router.get('/attachment/:messageId', getAttachmentUrl);

export default router
