import mongoose from "mongoose";
import config from "./config/config.js";

import { checkAllLeadsForAppointments, scheduleAppointmentReminders } from "./jobs/appointments/scheduleAppointments.js";

(async () => {
  try {
    await mongoose.connect(config.mongodb.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB for Appointments.");

    scheduleAppointmentReminders();

    await checkAllLeadsForAppointments()

    setInterval(async () => {
      console.log("Checking leads for new appointments...");
      await checkAllLeadsForAppointments();
    },10 * 60 * 1000);

    console.log("Appointment system started.");
  } catch (error) {
    console.error("Error in mainAppointments.js:", error);
  }
})();
