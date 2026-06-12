import cookieParser from "cookie-parser"
import jwt from "jsonwebtoken"
import User from "../models/User.model.js"
import {
  TYPING,
  CONNECTED_EVENT,
  JOIN_CHAT_EVENT,
  DISCONNECT_EVENT,
  NEW_MESSAGE_EVENT,
  NEW_MESSAGE_ALERT,
  TOGGLE_REACTION_EVENT,
  USER_ONLINE_EVENT,
  USER_OFFLINE_EVENT,
  CHECK_ONLINE_EVENT
} from "../constants/events.js"
import ChatModel from "../models/Chat.model.js"
import MessageModel from "../models/Message.model.js"
import mongoose, { Mongoose } from "mongoose"
import UserModel from "../models/User.model.js"
import { pub, redisClient, sub } from "../config/redis.config.js"


const onlineUsers = new Map()

async function notifyUsersOnline(uid, io) {
  const chats = await ChatModel.find({ participants: new mongoose.Types.ObjectId(uid) }).select("participants").lean()


  for (const chat of chats) {
    for (const p of chat.participants) {
      const pId = p.toString()
      if (pId !== uid) {
        // io.to(pId).emit(USER_ONLINE_EVENT, {
        //   userId: uid,
        //   online: true
        // })
        await pub.publish("user-online", JSON.stringify({
          userId: uid,
          online: true,
          pId
        }))
      }
    }
  }


}

async function handleUserDisconnect(uid, io) {
  const chats = await ChatModel.find({ participants: new mongoose.Types.ObjectId(uid) }).select("participants").lean()
  const date = new Date()
  await UserModel.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(uid) }, {
    lastSeen: date
  })


  for (const chat of chats) {
    for (const p of chat.participants) {
      const pId = p.toString()
      if (pId !== uid) {
        pub.publish("user-offline", JSON.stringify({
          pId,
          userId: uid,
          online: false,
          lastSeen: date
        }))

        // io.to(pId).emit(USER_OFFLINE_EVENT, {
        //   userId: uid,
        //   online: false,
        //   lastSeen: date
        // })
      }
    }
  }


}


export const initSocket = io => {
  try {
    io.use(async (socket, next) => {
      cookieParser()(
        socket.request,
        socket.request.res,
        async () => {
          try {
            const token = socket.request.cookies?.token
            if (!token) return next(new Error("Access denied"))

            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            const user = await User.findById(decoded.id).select("-password")
            if (!user) return next(new Error("Access denied"))

            socket.user = user
            next()
          } catch {
            next(new Error("Authentication failed"))
          }
        }
      )
    })

    sub.subscribe("chat-message");
    sub.subscribe("toggle-reaction");
    sub.subscribe("typing");
    sub.subscribe("new-message-alert");
    sub.subscribe("user-online");
    sub.subscribe("user-offline");

    sub.on("message", (channel, message) => {
      const data = JSON.parse(message);

      if (channel === "chat-message") {
        io.to(data.chatId).emit(NEW_MESSAGE_EVENT, data);
      }
      if (channel === "toggle-reaction") {
        io.to(data.chatId).emit(TOGGLE_REACTION_EVENT, data);
      }
      if (channel === "typing") {
        io.to(data.participantId).emit(TYPING, data);
      }
      if (channel === "new-message-alert") {
        io.to(data.participantId).emit(NEW_MESSAGE_ALERT, data);
      }
      if (channel === "user-online") {
        io.to(data.pId).emit(USER_ONLINE_EVENT, data);
      }
      if (channel === "user-offline") {
        io.to(data.pId).emit(USER_OFFLINE_EVENT, data);
      }

    });

    io.on("connection", async (socket) => {
      const user = socket.user;
      const uid = user._id.toString()

      console.log("User connected:", uid);

      // personal room (for notifications later)
      socket.join(uid);




      await redisClient.sadd(`online:${uid}`, socket.id)


      // if (!onlineUsers.has(uid)) onlineUsers.set(uid, new Set())
      // onlineUsers.get(uid).add(socket.id)

      socket.emit(CONNECTED_EVENT);

      socket.on(JOIN_CHAT_EVENT, chatId => {
        socket.join(chatId);
        console.log("Joined chat: ", chatId);
      });

      notifyUsersOnline(uid, io)

      socket.on(CHECK_ONLINE_EVENT, async ({ userId }, cb) => {
        // const isOnline =
        //   onlineUsers.has(userId) &&
        //   onlineUsers.get(userId).size > 0;
        const isOnline = (await redisClient.scard(`online:${userId}`)) > 0
        let lastSeen = null
        if (!isOnline) {
          lastSeen = await UserModel.findById(userId).select("lastSeen")
        }
        cb?.({ userId, online: isOnline, lastSeen });
      });

      socket.on(TOGGLE_REACTION_EVENT, async ({ action, chatId, messageId, reaction }) => {
        try {

          const chat = await ChatModel.findById(chatId);
          if (!chat) return;

          // FIX: ObjectId-safe participant check
          const isParticipant = chat.participants?.some((id) => id.equals(user._id));
          if (!isParticipant) return;

          const message = await MessageModel.findOne({ _id: messageId, chat: chatId });
          if (!message) return;

          // Schema is Map already, so use the existing map; don't create a plain Map unless missing
          const reactions = message.reactions ?? new Map();

          // FIX: use string consistently inside arrays
          const uid = user._id.toString();

          if (action === "add") {
            if (!reactions.has(reaction)) reactions.set(reaction, []);

            // FIX: move user out of any other bucket
            for (const [key, users] of reactions.entries()) {
              const arr = users || [];
              const idx = arr.indexOf(uid);
              if (idx > -1 && key !== reaction) {
                arr.splice(idx, 1);
                if (arr.length === 0) reactions.delete(key);
                else reactions.set(key, arr);
                break;
              }
            }

            // FIX: prevent duplicates in target bucket
            const target = reactions.get(reaction) || [];
            if (!target.includes(uid)) target.push(uid);
            reactions.set(reaction, target);
          }

          if (action === "remove") {

            for (const [key, users] of reactions.entries()) {
              const arr = users || [];
              const idx = arr.indexOf(uid);
              if (idx > -1) {
                arr.splice(idx, 1);
                if (arr.length === 0) reactions.delete(key);
                else reactions.set(key, arr);
                break;
              }
            }

          }

          // keep it simple: save the mutated map
          message.reactions = reactions;
          const updatedMessage = await message.save();

          await pub.publish('toggle-reaction',
            JSON.stringify({
              chatId,
              messageId,
              reactions: updatedMessage.reactions,
              action,
            })
          )
          // io.to(chatId).emit(TOGGLE_REACTION_EVENT, {
          //   chatId,
          //   messageId,
          //   reactions: updatedMessage.reactions,
          //   action,
          // });
        } catch (error) {
          console.log(error);
        }
      }
      );

      socket.on(NEW_MESSAGE_EVENT, async msg => {
        try {
          const { chatId, content, tempId, threadId } = msg;

          const chat = await ChatModel.findById(chatId);
          if (!chat) return;
          const isParticipant = chat.participants.some(
            id => id.equals(user._id)
          );

          if (!isParticipant) return;
          const savedMessage = await MessageModel.create({
            sender: user._id,
            content,
            chat: chatId,
            threadId: threadId ? new mongoose.Types.ObjectId(threadId.id) : null
          });

          const cacheMessage = {
            _id: savedMessage._id,
            sender: {
              _id: user._id,
              name: user.name
            },
            chat: chatId,
            content: savedMessage.content,
            createdAt: savedMessage.createdAt,
            threadId: threadId
              ? {
                _id: threadId.id,
                sender: threadId.sender,
                content: threadId.text
              }
              : null
          }

          const redisKey = `chat:${chatId}:recent`;

          await Promise.all([
            redisClient.rpush(
              redisKey,
              JSON.stringify(cacheMessage)
            )
            ,
            redisClient.ltrim(
              redisKey,
              -30,
              -1
            )
          ])



          await ChatModel.findByIdAndUpdate(chatId, {
            $set: {
              lastMessage: new mongoose.Types.ObjectId(savedMessage._id)
            }
          })

          await pub.publish(
            "chat-message",
            JSON.stringify({
              id: savedMessage._id,
              chatId,
              sender: { _id: user._id, name: user.name },
              text: savedMessage.content,
              createdAt: savedMessage.createdAt,
              threadId: threadId ? { _id: threadId.id, sender: threadId.sender, content: threadId.text } : null,
              tempId
            })
          );

          // io.to(chatId).emit(NEW_MESSAGE_EVENT, {
          //   id: savedMessage._id,
          //   chatId,
          //   sender: { _id: user._id, name: user.name },
          //   text: savedMessage.content,
          //   createdAt: savedMessage.createdAt,
          //   threadId: threadId ? { _id: threadId.id, sender: threadId.sender, content: threadId.text } : null,
          //   tempId
          // });

          for (const participantId of chat.participants) {
            // if (participantId.toString() !== user._id.toString()) {
            await pub.publish("new-message-alert", JSON.stringify({
              participantId: participantId.toString(),
              chatId, sender: user, content
            }))
            // io.to(participantId.toString()).emit(NEW_MESSAGE_ALERT, { chatId, sender: user, content });
            // }
          }


        } catch (error) {
          console.error("Error in NEW_MESSAGE_EVENT:", error);
          socket.emit("message_error", {
            tempId,
            error: error.message || "Failed to send message"
          });
        }

      });

      socket.on(TYPING, async ({ chatId, typing }) => {
        const chat = await ChatModel.findById(chatId)

        if (!chat) return

        for (const participantId of chat.participants) {
          if (participantId.toString() !== socket.user._id.toString()) {
            await pub.publish('typing', JSON.stringify({
              chatId,
              typing,
              participantId: participantId.toString()
            }))

            // io.to(participantId.toString()).emit(TYPING, {
            //   chatId,
            //   typing
            // })
          }

        }


      })

      socket.on("disconnect", async () => {
        console.log("User disconnected:", uid);

        // const set = onlineUsers.get(uid);
        // if (!set) return;
        // set.delete(socket.id);

        // on disconnect
        await redisClient.srem(`online:${uid}`, socket.id)

        const count = await redisClient.scard(`online:${uid}`)
        if (count === 0) {
          await redisClient.del(`online:${uid}`)
          handleUserDisconnect(uid, io)
        }
        // if (set.size === 0) {
        //   onlineUsers.delete(uid);
        //   handleUserDisconnect(uid, io)
        // }
      });
    });

  } catch (error) {
    console.log("Something went wrong while connecting to the socket."
    );
  }
}

export const emitEvent = (req, roomIds, event, payload) => {
  try {
    const io = req.app.get("io");

    if (Array.isArray(roomIds)) {
      roomIds.forEach(id => {
        io.in(id.toString()).emit(event, payload);
      });
    } else {
      io.in(roomIds.toString()).emit(event, payload);
    }
  } catch (error) {
    console.log(error)
  }
};
