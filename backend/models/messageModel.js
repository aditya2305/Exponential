import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: false
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
  },
  processed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

messageSchema.index({ messageId: 1 });

export default messageSchema; 