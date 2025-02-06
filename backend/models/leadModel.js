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

  slickTextContactId: { type: String, required: false },

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

  createdAt: { type: Date, default: Date.now },
  
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Index for phone number lookups
leadSchema.index({ phoneNumber: 1 });
// Index for email lookups
leadSchema.index({ email: 1 });

export default mongoose.model("Lead", leadSchema);
