import mongoose from "mongoose";
import schedule from "node-schedule";
import moment from "moment-timezone";
import { CONFIG } from "../config/index.js";
import Lead from "../models/leadModel.js";
import { sendSlickTextMessage } from "./slicktext/sendSlickTextMessage.js";
import { checkLeadInterest } from "./claude/checkInterest.js";

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

const processFollowUps = async () => {
  try {
    const oneDayAgo = moment().subtract(24, 'hours').toDate();
    
    const leads = await Lead.find({
      unsubscribed: false,
      followedUp: false,
      interested: { $ne: false },
      messages: { 
        $exists: true,
        $not: { $size: 0 }
      },
      $expr: {
        $and: [
          { $gte: [{ $size: "$messages" }, 2] },
          { 
            $eq: [
              { $arrayElemAt: ["$messages.role", -1] },
              "assistant"
            ]
          },
          {
            $lt: [
              { $arrayElemAt: ["$messages.createdAt", -1] },
              oneDayAgo
            ]
          }
        ]
      }
    }).select('messages slickTextContactId fullName');

    for (const lead of leads) {
      try {
        console.log(`\nProcessing lead ${lead._id}:`);
        if (!lead.slickTextContactId) {
          continue;
        }

        // Get only approved messages
        const approvedMessages = lead.messages.filter(m => m.approved);
        if (approvedMessages.length < 2) {
          continue;
        }
        
        // Check if lead showed interest
        const interestCheck = await checkLeadInterest(approvedMessages);
        console.log("interestCheck - ", interestCheck);
        if (!interestCheck.interested) {
          await Lead.findByIdAndUpdate(lead._id, { interested: false });
          continue;
        }
  
        // Send follow-up message
        const followUpMessage = "Hello, I noticed you were interested in health coverage. Have you given up on this? I'd still love to help you find the best rates.";

        try {
          await sendSlickTextMessage(lead.slickTextContactId, followUpMessage);
        } catch (error) {
          console.error(`Error sending follow-up message to lead ${lead._id}:`);
          continue;
        }

        lead.interested = true;
        // Add message to lead's history and mark as followed up
        lead.messages.push({
          role: 'assistant',
          content: followUpMessage,
          approved: true,
          processed: true,
          leadId: lead._id
        });
        lead.followedUp = true;
        await lead.save();


        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing follow-up for lead ${lead._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in processFollowUps:', error);
  }
};

// Scheduled job to run at 11 AM ET daily
const job = schedule.scheduleJob({
  hour: 11,
  minute: 0,
  tz: 'America/New_York'
}, processFollowUps);

// MongoDB connection confirmation only
mongoose.connection.once('open', () => {
  console.log('MongoDB connected successfully for follow-ups');
});

// Connect to MongoDB
const main = async () => {
  try {
    await mongoose.connect(CONFIG.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

// Run the main function
main();

