import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
    },
    slickTextContactId: {
      type: String, 
      required: true,
    },
    telegramUserId: {
      type: String,
      required: false,
    },
    username: {
      type: String,
      required: false,
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    timeZone: {
      type: String,
      default: "America/New_York",
    },
    called: { 
      type: Boolean, 
      default: false 
    },
    preCallNotified: {
      type: Boolean,
      default: false
    },
    pickedUp: { 
      type: Boolean, 
      default: false 
    },
    callDuration: { 
      type: Number, 
      default: 0 
    },
    recordingUrl: { 
      type: String, 
      default: "" 
    },
    morningReminder: {
      type: Boolean,
      default: false
    },
    hourReminder: {
      type: Boolean,
      default: false
    },
    lastMessageCount: {
      type: Number,
      default: 0
    },
    processing: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

appointmentSchema.index(
  { phoneNumber: 1, appointmentDate: 1 },
  { unique: true }
);

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
