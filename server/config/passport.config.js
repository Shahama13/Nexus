import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.model.js";
import Chat from "../models/Chat.model.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { mem0 } from "./ai.config.js";

dotenv.config();

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const user = await User.findOne({ email });
        if (!user || !user.password || user.provider !== 'local') {
            return done(null, false, { message: 'Incorrect email or password' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return done(null, false, { message: 'Incorrect email or password' });
        }
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    const email = profile.emails[0].value;

    let user = await User.findOne({ email });
    if (user && user.provider === "local") {
        return done(null, false, {
            message: "This email is registered with email and password. Use local login."
        });
    }

    if (!user) {
        user = await User.create({
            email,
            provider: "google",
            googleId: profile.id,
            name: profile.displayName,
        });


        await Chat.create({
            name: "Nexus AI",
            isGroupChat: false,
            participants: [user._id, new mongoose.Types.ObjectId(process.env.BOT_USER_ID)],
            admin: new mongoose.Types.ObjectId(process.env.BOT_USER_ID)
        });

        mem0.add([{ role: "user", content: `My name is ${user.name}` }], {
            user_id: user._id.toString()
        })

    }

    return done(null, user);
}
)
);
