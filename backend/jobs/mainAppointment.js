import mongoose from "mongoose";
import { CONFIG } from "../config/index.js";
import { checkAllLeadsForAppointments, scheduleAppointmentReminders } from "./appointments/scheduleAppointments.js";

const MONGODB_URI = CONFIG.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined in environment variables or CONFIG");
  process.exit(1);
}

try {
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to MongoDB for Appointment Booking.");

  await checkAllLeadsForAppointments(); // start check on run once 
  scheduleAppointmentReminders(); 

  // Check for new appointments every 10 minutes
  setInterval(async () => {
    console.log("Checking leads for new appointments...");
    await checkAllLeadsForAppointments();
  }, 10 * 60 * 1000);

} catch (error) {
  console.error("Error in mainAppointment.js:", error);
  process.exit(1);
}

