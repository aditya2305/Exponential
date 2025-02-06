import mongoose from "mongoose";
import messageSchema from "./messageModel.js";

const changedResponseSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  originalMessage: messageSchema,    // User's message
  claudeResponse: messageSchema,     // Claude's response
  changedResponse: messageSchema,    // Admin's modified response
}, {
  timestamps: true
});

export default mongoose.model("ChangedResponse", changedResponseSchema); 