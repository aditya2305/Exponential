import mongoose from 'mongoose';
import moment from 'moment-timezone';
import { sendSlickTextMessage } from "./slicktext/sendSlickTextMessage.js";
import { CONFIG } from "../config/index.js";
import Appointment from "../models/appointmentModel.js";
import { sendTelegramMessage } from "./telegram/sendTelegramMessage.js";

const { MONGODB_URI } = CONFIG;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB for Appointment Notifications'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const checkAndNotifyUpcomingAppointments = async () => {
  try {
    const now = moment();
    const oneHourFromNow = moment().add(1, 'hour');
    const fiveMinutesFromNow = moment().add(5, 'minutes');
    const endOfDay = moment().endOf('day');

    // Find all upcoming appointments for today that haven't been called
    const todaysAppointments = await Appointment.find({
      called: false,
      appointmentDate: {
        $gte: now.toDate(),
        $lte: endOfDay.toDate()
      }
    });

    for (const appt of todaysAppointments) {
      
      try {
        console.log("Processing appointment:", appt._id);

        // Validate timezone
        if (!moment.tz.zone(appt.timeZone)) {
          console.error(`Invalid timezone ${appt.timeZone} for appointment ${appt._id}`);
          continue;
        }

        const appointmentTime = moment(appt.appointmentDate).tz(appt.timeZone);
        const localTime = appointmentTime.format('h:mm A');
        
        // Get current time in appointment's timezone
        const nowInAppointmentTZ = moment().tz(appt.timeZone);
        
        // Morning reminder at 11 AM in appointment's timezone
        if (!appt.morningReminder && 
            nowInAppointmentTZ.hour() === 11 && 
            nowInAppointmentTZ.minute() < 5) {  // Only check in first 5 minutes of 11 AM
          const message = `Good morning, just confirming we will be speaking at ${localTime}. Look forward to speaking with you.`;
          await sendSlickTextMessage(
            appt.slickTextContactId,
            message
          );
          await sendTelegramMessage(
            CONFIG.TELEGRAM.ADMIN_CHAT_ID,
            `📬 Morning reminder sent to ${appt.slickTextContactId}\nMeeting at: ${localTime}\nMessage: "${message}"`
          );
          await Appointment.findByIdAndUpdate(appt._id, { 
            $set: { morningReminder: true }
          });
        }

        // 1-hour reminder
        if (!appt.hourReminder && 
            appointmentTime.isBetween(oneHourFromNow, oneHourFromNow.clone().add(5, 'minutes'))) {
          const message = "Hey, just circling back. Will be calling you within the hour";
          await sendSlickTextMessage(
            appt.slickTextContactId,
            message
          );
          await sendTelegramMessage(
            CONFIG.TELEGRAM.ADMIN_CHAT_ID,
            `⏰ 1-hour reminder sent to ${appt.slickTextContactId}\nMeeting at: ${localTime}\nMessage: "${message}"`
          );
          await Appointment.findByIdAndUpdate(appt._id, { 
            $set: { hourReminder: true }
          });
        }

        // 5-minute reminder
        if (!appt.preCallNotified && 
            appointmentTime.isBetween(fiveMinutesFromNow, fiveMinutesFromNow.clone().add(2, 'minutes'))) {
          const message = "Hi there, just a reminder of our meeting in about 5 min.";
          await sendSlickTextMessage(
            appt.slickTextContactId,
            message
          );
          await sendTelegramMessage(
            CONFIG.TELEGRAM.ADMIN_CHAT_ID,
            `⚡ 5-minute reminder sent to ${appt.slickTextContactId}\nMeeting at: ${localTime}\nMessage: "${message}"`
          );
          await Appointment.findByIdAndUpdate(appt._id, { 
            $set: { preCallNotified: true }
          });
        }

        console.log("Done");

      } catch (err) {
        console.error(`Error processing notifications for appointment ${appt._id}:`, err);
      }
    }
  } catch (err) {
    console.error("Error in appointment notifications:", err);
  }
};

// Run the check every 5 minutes
const FIVE_MINUTES = 5 * 60 * 1000;
setInterval(checkAndNotifyUpcomingAppointments, FIVE_MINUTES);

// Also run immediately on startup
checkAndNotifyUpcomingAppointments();
