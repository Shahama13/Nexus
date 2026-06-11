import mongoose from "mongoose";
const { Schema, model } = mongoose;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, default: null },
  googleId: { type: String, default: null },
  name: { type: String, required: true },
  provider: { type: String, enum: ['local', 'google'], default: 'local' },
  lastSeen: { type: Date, default: null }
});

export default model("User", userSchema);


