import Lead from "../../models/leadModel.js";
import Appointment from "../../models/appointmentModel.js";
import { checkForAppointment } from "./extractAppointment.js";
import { sendTelegramMessage } from "../telegram/sendTelegramMessage.js";
import schedule from "node-schedule";
import moment from "moment-timezone";
// import { makeCall } from "../twilio/makeCall.js";
import { sendSlickTextMessage } from "../slicktext/sendSlickTextMessage.js";
import { CONFIG } from "../../config/index.js";
import axios from "axios";

const { TELEGRAM: { ADMIN_CHAT_ID, API_URL }, EXTERNAL_CALL_ENDPOINT } = CONFIG;

export const checkAllLeadsForAppointments = async () => {
  try {
    const leads = await Lead.find();
    for (const lead of leads) {
      if (lead.unsubscribed || !lead.slickTextContactId) continue;

      const existingAppt = await Appointment.findOne({
        phoneNumber: lead.phoneNumber,
        called: false,
      });
      if (existingAppt) continue;

      const result = await checkForAppointment(lead.messages);
      if (!result?.hasAppointment) continue;

      const dtString = result.appointmentDateTime?.trim();
      let userTZ = result.timeZone?.trim() || "";
      if (!dtString) {
        console.log("No parseable date/time from user. Skipping.");
        continue;
      }

      let finalTimeZone = userTZ || "America/New_York";
      // let finalTimeZone = userTZ || "Asia/Kolkata";
      if ((userTZ.toUpperCase() === "IST")) {
        finalTimeZone = "Asia/Kolkata";
      } else if (userTZ.toUpperCase() === "CST") {
        finalTimeZone = "America/Chicago";
      } else if (userTZ.toUpperCase() === "EST" || userTZ.toUpperCase() === "ET") {
        finalTimeZone = "America/New_York";
      } else if (userTZ === "ET") {
        finalTimeZone = "America/New_York";
      } 

      const parsed = moment.tz(dtString, finalTimeZone);
      if (!parsed.isValid() || parsed.isBefore(moment())) {
        console.log("Invalid date/time or in past:", dtString);
        continue;
      }

      try {
        const appt = new Appointment({
          phoneNumber: lead.phoneNumber,
          slickTextContactId: lead.slickTextContactId,
          telegramUserId: lead.telegramUserId || null,
          username: lead.username || null,
          appointmentDate: parsed.utc().toDate(),
          timeZone: finalTimeZone,
          called: false
        });
        await appt.save();

        await sendSlickTextMessage(
          lead.slickTextContactId,
          `📅 Your appointment has been confirmed for ${parsed.format("YYYY-MM-DD HH:mm z")} (${finalTimeZone})`
        );

        const msgId = await sendTelegramMessage(
          ADMIN_CHAT_ID,
          `📅 *New Appointment Booked*\nPhone: ${lead.phoneNumber}\nDate & Time: ${parsed.format("YYYY-MM-DD HH:mm z")} (${finalTimeZone})`,
          { parse_mode: "Markdown" }
        );

        if (typeof msgId === "number") {
          await pinMessage(ADMIN_CHAT_ID, msgId);
        }
        console.log("Created new appointment:", appt);
      } catch (err) {
        if (err.code === 11000) {
          await sendSlickTextMessage(
            lead.slickTextContactId,
            `⚠️ You already have an appointment scheduled for ${dtString}.`
          );
        } else {
          console.error("Error saving appointment:", err);
        }
      }
    }
  } catch (error) {
    console.error("Error checking leads for appointments:", error);
  }
};

export const scheduleAppointmentReminders = () => {
  schedule.scheduleJob("*/1 * * * *", async () => {
    try {
      const now = new Date();
      
      // First, mark old uncalled appointments as called
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      await Appointment.updateMany(
        {
          called: false,
          appointmentDate: { $lt: fiveMinutesAgo }
        },
        {
          $set: { called: true }
        }
      );

      // Then process current appointments as usual
      const dueAppointments = await Appointment.find({
        called: false,
        appointmentDate: { $lte: now },
      });

      for (const appt of dueAppointments) {
        try {
          const localTime = moment(appt.appointmentDate).tz(appt.timeZone).format("YYYY-MM-DD HH:mm z");
          
          await sendSlickTextMessage(
            appt.slickTextContactId,
            `🔔 Hi! It's time for your scheduled appointment on ${localTime}.`
          );

          const adminMsg = await sendTelegramMessage(
            ADMIN_CHAT_ID,
            `🔔 *Appointment Reminder*\nPhone: ${appt.phoneNumber}\n*Date & Time:* ${localTime} (${appt.timeZone})`,
            { parse_mode: "Markdown" }
          );

          if (adminMsg?.message_id) {
            await pinMessage(ADMIN_CHAT_ID, adminMsg.message_id);
          }

          // await makeCall(appt._id, appt.phoneNumber);
          
          try {
            // Make the external call
            await axios.post(EXTERNAL_CALL_ENDPOINT, {
              phoneNumber: appt.phoneNumber,
              appointmentId: appt._id
            });

            // Send Telegram notification directly
            await sendTelegramMessage(
              ADMIN_CHAT_ID,
              `📞 *Call Initiated*\nPhone: ${appt.phoneNumber}\nScheduled Time: ${localTime} (${appt.timeZone})`,
              { parse_mode: "Markdown" }
            );

          } catch (err) {
            console.error(`Error making call for appointment ${appt._id}:`, err);
          }

          // Mark as called
          await Appointment.findByIdAndUpdate(
            appt._id,
            { $set: { called: true } }
          );

          console.log(`Successfully marked appointment ${appt._id} for ${appt.phoneNumber} as called=true`);
        } catch (err) {
          console.error(`Error processing appointment ${appt._id}:`, err);
          // Continue with next appointment even if one fails
        }
      }
    } catch (err) {
      console.error("Error in appointment reminders:", err);
    }
  });
};

const pinMessage = async (chatId, messageId) => {
  try {
    await axios.post(`${API_URL}/pinChatMessage`, {
      chat_id: chatId,
      message_id: messageId,
      disable_notification: true
    });
    console.log(`Pinned message ID ${messageId} in chat ID ${chatId}.`);
  } catch (error) {
    console.error("Error pinning Telegram message:", error.response?.data || error.message);
  }
};
