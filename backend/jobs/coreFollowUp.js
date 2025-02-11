import mongoose from "mongoose";
import moment from "moment-timezone";
import { CONFIG } from "../config/index.js";
import Lead from "../models/leadModel.js";
import { sendSlickTextMessage } from "./slicktext/sendSlickTextMessage.js";
import { sendTelegramMessage } from "./telegram/sendTelegramMessage.js";

const { MONGODB_URI, ADMIN_CHAT_ID } = CONFIG;

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB for Follow-up Service'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const checkAndSendFollowUps = async () => {
  try {
    const oneDayAgo = moment().subtract(24, 'hours').toDate();
    
    // Find leads that:
    // 1. Have messages (indicating interest)
    // 2. Haven't been messaged in 24 hours
    // 3. Haven't unsubscribed
    // 4. Have a SlickText contact ID
    const leads = await Lead.find({
      'messages.0': { $exists: true },
      'messages': {
        $not: {
          $elemMatch: {
            createdAt: { $gt: oneDayAgo }
          }
        }
      },
      unsubscribed: false,
      slickTextContactId: { $exists: true, $ne: null }
    });

    for (const lead of leads) {
      try {
        // Send follow-up message
        await sendSlickTextMessage(
          lead.slickTextContactId,
          "Hello, have you given up on this?"
        );

        // Notify admin
        await sendTelegramMessage(
          ADMIN_CHAT_ID,
          `📱 *Follow-up Sent*\nPhone: ${lead.phoneNumber}\nLast Message: ${moment(lead.messages[lead.messages.length - 1].createdAt).format('YYYY-MM-DD HH:mm')}`,
          { parse_mode: "Markdown" }
        );

        // Add the follow-up message to the lead's messages
        lead.messages.push({
          role: "assistant",
          content: "Hello, have you given up on this?",
          approved: true
        });
        await lead.save();

      } catch (err) {
        console.error(`Error processing follow-up for lead ${lead._id}:`, err);
      }
    }
  } catch (err) {
    console.error("Error in follow-up service:", err);
  }
};

// Check every hour
setInterval(checkAndSendFollowUps, 60 * 60 * 1000);

// Initial check on startup
checkAndSendFollowUps();

