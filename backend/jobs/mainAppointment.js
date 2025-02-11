import mongoose from "mongoose";
import { CONFIG } from "../config/index.js";
import { checkAllLeadsForAppointments } from "./appointments/scheduleAppointments.js";

// This will ONLY handle booking appointments from conversations
(async () => {
  try {
    await mongoose.connect(CONFIG.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB for Appointment Booking.");

    await checkAllLeadsForAppointments(); // start check on run once 

    // Check for new appointments every 10 minutes
    setInterval(async () => {
      console.log("Checking leads for new appointments...");
      await checkAllLeadsForAppointments();
    }, 10 * 60 * 1000);

    // Initial check
    await checkAllLeadsForAppointments();

  } catch (error) {
    console.error("Error in mainAppointment.js:", error);
    process.exit(1);
  }
})();
