import express from "express";
import passport from "passport";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/User.model.js";
import { CustomError, tryCatchWrapper } from "../middlewares/error.middleware.js";
import { body, validationResult } from "express-validator";
import { signUpValidator } from "../validators/auth.validator.js";
import mongoose from "mongoose";
import Chat from "../models/Chat.model.js";
const router = express.Router();

router.post("/signup", signUpValidator, tryCatchWrapper(
    async (req, res, next) => {

        const { email, password, name } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return next(new CustomError("User already exists", 404));
        }

        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({
            email,
            password: hash,
            provider: "local",
            name
        });
        await Chat.create({
            name: "Nexus AI",
            isGroupChat: false,
            participants: [user._id, new mongoose.Types.ObjectId(process.env.BOT_USER_ID)],
            admin: new mongoose.Types.ObjectId(process.env.BOT_USER_ID)

        });


        const token = jwt.sign({ id: user._id, name: user.name }, process.env.JWT_SECRET, { expiresIn: `${process.env.EXPIRES_IN}d` });
        res
            .cookie("token", token, { httpOnly: true, secure: false, maxAge: process.env.EXPIRES_IN * 24 * 60 * 60 * 1000 })
            .status(201)
            .json({ message: "User created", user });

    }
));

router.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) return next(err);

        if (!user) {
            return next(new CustomError(info?.message || "Login failed", 401));
        }

        const token = jwt.sign(
            { id: user._id, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: `${process.env.EXPIRES_IN}d` }
        );

        return res
            .cookie("token", token, { httpOnly: true, secure: false, maxAge: process.env.EXPIRES_IN * 24 * 60 * 60 * 1000 })
            .status(201)
            .json({ message: "Logged in", user });
    })(req, res, next);
});

router.get("/logout", (req, res) => {
    res
        .clearCookie("token")
        .status(200)
        .json({ message: "Logged out" });
});

router.get("/me", authenticateToken, (req, res) => {
    res.status(200).json({ user: req.user });
});

router.get(
    "/google",
    passport.authenticate("google", { scope: ["email", "profile"] })
);

router.get("/google/callback", (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
        if (err) return next(err);

        if (!user) {
            return res.redirect(
                `${process.env.FRONTEND_URL}/?error=${encodeURIComponent(info?.message)}`
            );
        }

        const token = jwt.sign({ id: user._id, name:user.name }, process.env.JWT_SECRET, { expiresIn: `${process.env.EXPIRES_IN}d` });

        return res
            .cookie("token", token, { httpOnly: true, secure: false, maxAge: process.env.EXPIRES_IN * 24 * 60 * 60 * 1000 })
            .redirect(process.env.FRONTEND_URL);
    })(req, res, next);
});

export default router;
