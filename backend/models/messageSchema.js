import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ["user", "assistant"]
  },
  content: {
    type: String,
    required: true
  },
  approved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default messageSchema; 