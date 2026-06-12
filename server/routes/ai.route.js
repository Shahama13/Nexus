import express from "express";
import { streamChat } from "../service/ai.service.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = express.Router()

router.use(authenticateToken)
router.post("/chat", streamChat)


export default router