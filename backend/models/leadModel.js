import mongoose from "mongoose";
import messageSchema from "./messageModel.js";

const leadSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: false },
  telegramUserId: { type: String, required: false, default: null },
  messages: {
    type: [messageSchema],
    default: [],
  },

  slickTextContactId: { type: String, required: false, default: null },

  username: { type: String, default: null },

  unsubscribed: { type: Boolean, default: false },
  
  source: { type: String, default: null },

  buyer: { type: String, default: null },

  date: { type: Date, default: Date.now },

  fullName: { type: String, default: null },

  email: { type: String, default: null },

  zipcode: { type: String, default: null },

  income: { type: Number, default: null },

  address: { type: String, default: null },

  gender: { 
    type: String, 
    enum: ['male', 'female', 'other', null],
    default: null 
  },

  familySize: { type: Number, default: null },

  age: { type: Number, default: null },

  preExisting: { type: Boolean, default: null },

}, {
  timestamps: true
});

// Index for phone number lookups
leadSchema.index({ phoneNumber: 1 });
// Index for email lookups
leadSchema.index({ email: 1 });

export default mongoose.model("Lead", leadSchema);
