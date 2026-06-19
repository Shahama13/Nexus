import express from "express"
import upload from "../middlewares/multer.middleware.js";
import { getAttachmentUrl, uploadPdf } from "../controllers/attachment.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = express.Router()

router.use(authenticateToken)
router.post('/attachment', upload.single('attachment'), getAttachmentUrl);
router.post(
    "/upload-pdf",
    upload.single("pdf"),
    uploadPdf
)

export default router;