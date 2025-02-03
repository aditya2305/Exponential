import Lead from "../../models/leadModel.js";
import Appointment from "../../models/appointmentModel.js";
import { checkForAppointment } from "./extractAppointment.js";
import { sendTelegramMessage } from "../telegram/sendTelegramMessage.js";
import schedule from "node-schedule";
import moment from "moment-timezone";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const ADMIN_CHAT_ID = process.env.ADMIN_TELEGRAM_ID || process.env.ADMIN_CHAT_ID;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;


export const checkAllLeadsForAppointments = async () => {
  try {
    const leads = await Lead.find();
    for (const lead of leads) {
      if (lead.unsubscribed) continue;

      const existingAppt = await Appointment.findOne({
        telegramUserId: lead.telegramUserId,
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
      if ((userTZ.toUpperCase() === "IST")) {
        finalTimeZone = "Asia/Kolkata";
      } else if (userTZ.toUpperCase() === "CST") {
        finalTimeZone = "America/Chicago";
      }

      const parsed = moment.tz(dtString, finalTimeZone);
      if (!parsed.isValid()) {
        console.log("Parsed date/time invalid:", dtString, "with TZ:", finalTimeZone);
        continue;
      }

      if (parsed.isBefore(moment())) {
        console.log("Parsed date/time is in the past. Skipping appointment creation.");
        continue;
      }

      try {
        const appt = new Appointment({
          telegramUserId: lead.telegramUserId,
          username: lead.username || null,
          appointmentDate: parsed.utc().toDate(),
          timeZone: finalTimeZone,
          called: false // indicates not yet called
        });
        await appt.save();

        const msgId = await sendTelegramMessage(
          ADMIN_CHAT_ID,
          `📅 *New Appointment Booked*\n${lead.username ? `Username: ${lead.username}\n` : ""}User ID: ${lead.telegramUserId}\nDate & Time: ${parsed.format("YYYY-MM-DD HH:mm z")} (${finalTimeZone})`,
          { parse_mode: "Markdown" }
        );
        if (typeof msgId === "number") {
          await pinMessage(ADMIN_CHAT_ID, msgId);
        }
        console.log("Created new appointment:", appt);
      } catch (err) {
        if (err.code === 11000) {
          await sendTelegramMessage(
            lead.telegramUserId,
            `⚠️ *Duplicate Appointment*\nYou already have an appointment at ${dtString}.`,
            { parse_mode: "Markdown" }
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
      const dueAppointments = await Appointment.find({
        called: false,
        appointmentDate: { $lte: now },
      });
      for (const appt of dueAppointments) {
        const localTime = moment(appt.appointmentDate).tz(appt.timeZone).format("YYYY-MM-DD HH:mm z");
        await sendTelegramMessage(
          ADMIN_CHAT_ID,
          `🔔 *Appointment Reminder*\nIt's time for the appointment with ${appt.username ? `username *${appt.username}*\n` : ""}user ID *${appt.telegramUserId}*\n*Date & Time:* ${localTime} (${appt.timeZone})`,
          { parse_mode: "Markdown" }
        );
        await sendTelegramMessage(
          appt.telegramUserId,
          `🔔 *Appointment Reminder*\nHi! It's time for your scheduled appointment on ${localTime}.`,
          { parse_mode: "Markdown" }
        );
        appt.called = true;
        await appt.save();
        console.log(`Appointment with user ID ${appt.telegramUserId} at ${localTime} marked as called=true.`);
      }
    } catch (err) {
      console.error("Error in appointment reminders:", err);
    }
  });
};

const pinMessage = async (chatId, messageId) => {
  try {
    await axios.post(`${TELEGRAM_API_URL}/pinChatMessage`, {
      chat_id: chatId,
      message_id: messageId,
      disable_notification: true
    });
    console.log(`Pinned message ID ${messageId} in chat ID ${chatId}.`);
  } catch (error) {
    console.error("Error pinning Telegram message:", error.response?.data || error.message);
  }
};
