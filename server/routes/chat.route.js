import express from "express";
import {
    newGroupChat, newUserChat, getMyChats, addParticipant, removeParticipant, deleteGroup,
    getGroupChatDetails,
    searchAvailableUsers,
} from "../controllers/chat.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { newGroupChatValidator } from "../validators/chat.validator.js";


const router = express.Router()

router.use(authenticateToken)
router.post("/group/new", newGroupChatValidator, newGroupChat)
router.put("/group/add/:chatId/:participantId", addParticipant)
router.put("/group/remove/:chatId/:participantId", removeParticipant)
router.route("/group/:chatId").get(getGroupChatDetails).delete(deleteGroup)
router.post("/chat/new/:receiverId", newUserChat)
router.get("/chats/all", getMyChats)
router.get("/user/search", searchAvailableUsers)

export default router