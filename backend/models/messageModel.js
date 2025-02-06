import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
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

// Index for faster message lookups
messageSchema.index({ messageId: 1 });

export default messageSchema; 