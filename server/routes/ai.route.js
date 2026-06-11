import express from "express";
import { streamChat } from "../service/auth.service.js";

const router = express.Router()

// router.use(authenticateToken)
router.post("/chat", streamChat)


export default router