import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },

  approved: { type: Boolean, default: true }
});

const leadSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: false },
  telegramUserId: { type: String, required: false },
  messages: {
    type: [messageSchema],
    default: [],
  },

  username: { type: String, default: null },

  unsubscribed: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Lead", leadSchema);
