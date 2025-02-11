import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { sendSlickTextMessage } from "./slicktext/sendSlickTextMessage.js";
import { sendTelegramMessage } from "./telegram/sendTelegramMessage.js";
import { CONFIG } from "../config/index.js";
import Appointment from "../models/appointmentModel.js";

const { MONGODB_URI, ADMIN_CHAT_ID } = CONFIG;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB for Pre-Call Notifications'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const checkAndNotifyUpcomingAppointments = async () => {
  try {
    const now = moment();
    const fiveMinutesFromNow = moment().add(5, 'minutes');

    // Find appointments that:
    // 1. Haven't been called yet
    // 2. Are happening in ~5 minutes
    // 3. Haven't been pre-notified
    const upcomingAppointments = await Appointment.find({
      called: false,
      preCallNotified: { $ne: true },
      appointmentDate: {
        $gt: now.toDate(),
        $lte: fiveMinutesFromNow.toDate()
      }
    });

    for (const appt of upcomingAppointments) {
      try {
        const localTime = moment(appt.appointmentDate)
          .tz(appt.timeZone)
          .format('YYYY-MM-DD HH:mm z');

        // Send message to user
        await sendSlickTextMessage(
          appt.slickTextContactId,
          "Hey, just circling back. Will be giving you call in the next 5 minutes for the appointment."
        );

        // Notify admin via Telegram
        await sendTelegramMessage(
          ADMIN_CHAT_ID,
          `🔔 *Pre-Call Notification Sent*\nPhone: ${appt.phoneNumber}\nScheduled Time: ${localTime} (${appt.timeZone})`,
          { parse_mode: "Markdown" }
        );

        // Mark appointment as pre-notified
        await Appointment.findByIdAndUpdate(
          appt._id,
          { $set: { preCallNotified: true } }
        );

        console.log(`Pre-call notification sent for appointment ${appt._id}`);
      } catch (err) {
        console.error(`Error processing pre-call notification for appointment ${appt._id}:`, err);
      }
    }
  } catch (err) {
    console.error("Error in pre-call notifications:", err);
  }
};

// Run the check every minute
setInterval(checkAndNotifyUpcomingAppointments, 60 * 1000);

// Also run immediately on startup
checkAndNotifyUpcomingAppointments();
