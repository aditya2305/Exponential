import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    telegramUserId: {
      type: String,
      required: true,
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
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

appointmentSchema.index(
  { telegramUserId: 1, appointmentDate: 1 },
  { unique: true }
);

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
