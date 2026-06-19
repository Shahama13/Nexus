import express from "express";
import { streamChat } from "../service/ai.service.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";

const router = express.Router()

router.use(authenticateToken)
router.post("/chat", upload.single("pdfFile"), streamChat)

export default router