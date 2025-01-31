import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { checkAllLeadsForAppointments, scheduleAppointmentReminders } from "./jobs/appointments/scheduleAppointments.js";

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB for Appointments.");

    scheduleAppointmentReminders();

    await checkAllLeadsForAppointments();

    // setInterval(async () => {
    //   console.log("Checking leads for new appointments...");
    //   await checkAllLeadsForAppointments();
    // },2 * 60 * 1000);

    console.log("Appointment system started.");
  } catch (error) {
    console.error("Error in mainAppointments.js:", error);
  }
})();
