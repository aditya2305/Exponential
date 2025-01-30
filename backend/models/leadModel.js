import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "assistant"], 
    required: true,
  },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});


const leadSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: false },
  telegramUserId: { type: String, required: false },

  messages: {
    type: [messageSchema],
    default: [],
  },

  appointmentDate: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Lead", leadSchema);
