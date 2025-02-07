import mongoose from "mongoose";
import { CONFIG } from "./config/index.js";
import Lead from "./models/leadModel.js";
import { checkAllLeadsForAppointments, scheduleAppointmentReminders } from "./jobs/appointments/scheduleAppointments.js";

(async () => {
  try {
    await mongoose.connect(CONFIG.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB for Appointments.");

    // Schedule appointment reminders
    scheduleAppointmentReminders();

    // Initial check for appointments
    await checkAllLeadsForAppointments();

    // Periodic check for new appointments
    setInterval(async () => {
      console.log("Checking leads for new appointments...");
      try {
        const leads = await Lead.find({ unsubscribed: false });
        console.log(`Found ${leads.length} active leads to check`);
        
        for (const lead of leads) {
          try {
            // Only process leads with SlickText contact IDs
            if (!lead.slickTextContactId) {
              console.log(`Skipping lead ${lead._id} - no SlickText contact ID`);
              continue;
            }
            
            console.log(`Checking appointments for lead ${lead._id}`);
            console.log('Messages count:', lead.messages?.length || 0);
            
            await checkAllLeadsForAppointments();
          } catch (error) {
            console.error(`Error processing lead ${lead._id}:`, error);
            // Continue with next lead
          }
        }
      } catch (error) {
        console.error("Error in appointment check interval:", error);
      }
    }, 10 * 60 * 1000); // Every 10 minutes

    console.log("Appointment system started.");
  } catch (error) {
    console.error("Error in mainAppointments.js:", error);
  }
})();
