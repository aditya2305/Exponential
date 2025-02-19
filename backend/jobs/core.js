import mongoose from 'mongoose';
import schedule from 'node-schedule';
import moment from 'moment-timezone';
import { CONFIG, getStateFromZipCode } from '../config/index.js';
import Lead from '../models/leadModel.js';
import { sendSlickTextMessage } from './slicktext/sendSlickTextMessage.js';
import { findExistingContact, sendInitialMessage } from './slicktext/contactManagement.js';

const AGED_LEADS_LIMIT = CONFIG.AGED_LEADS_LIMIT || 10; 

const processAgedLeads = async () => {
  try {
    // Find aged leads with no messages, sorted by creation date
    const leads = await Lead.find({
      aged: true,
      'messages.0': { $exists: false },
      unsubscribed: false,
    })
    .sort({ createdAt: 1 }) // 1 for ascending (oldest first), -1 for descending
    .limit(AGED_LEADS_LIMIT);

    console.log(`Processing ${leads.length} aged leads`);

    for (const lead of leads) {
      try {
        // Old message format:
        // let messageText = lead.fullName 
        //   ? `Hi ${lead.fullName.split(' ')[0]}, this is Julie.` 
        //   : "Hi, this is Julie.";
        // messageText += " Noticed your quote for health insurance you submitted a while ago.\n\n";
        // if (lead.zipcode) {
        //   const state = getStateFromZipCode(lead.zipcode);
        //   if (state) {
        //     messageText += `Some new 2025 ${state} rates have come across my desk so I wanted to reach out.`;
        //   } else {
        //     messageText += `I've just pulled up the top 2025 rates have come across my desk so I wanted to reach out.`;
        //   }
        // } else {
        //   messageText += `Some new 2025 rates have come across my desk so I wanted to reach out.`;
        // }
        // messageText += "\n\nWorth a look? Press STOP to end";

        // const messageText = lead.fullName 
        //   ? `Still looking for health insurance ${lead.fullName.split(' ')[0]}? STOP to end`
        //   : "Still looking for health insurance? STOP to end";

        // const messageText = "I noticed you submitted an application a while back for health insurance. You're probably covered, but you're probably not getting the best price possible. We took a look at your best rates for 2025, would you be available for a quick call to go over your options? Reply STOP to end.";
        
        const messageText = lead.fullName 
          ? `Hey ${lead.fullName.split(' ')[0]},\n\nThis is your friendly update for the health insurance quote you submitted a while back.\n\nI'm reaching out today because after getting the most up to date rates, I think you could be paying a lot less for good coverage.\n\nReply YES to discuss, or STOP to end`
          : `Hey there,\n\nThis is your friendly update for the health insurance quote you submitted a while back.\n\nI'm reaching out today because after getting the most up to date rates, I think you could be paying a lot less for good coverage.\n\nReply YES to discuss, or STOP to end`;

        const existingContact = await findExistingContact(lead.phoneNumber);

        if (existingContact) {
            lead.slickTextContactId = existingContact?.contact_id;
            await sendSlickTextMessage(existingContact.contact_id, messageText);
        } else {
            const contactId = await sendInitialMessage(
                lead.phoneNumber, 
                { fullName: lead.fullName, zipcode: lead.zipcode }, 
                messageText
            );
            lead.slickTextContactId = contactId;
        }

        // Add message to lead's history only if message was sent successfully
        lead.messages.push({
          role: 'assistant',
          content: messageText,
          approved: true,
          processed: true,
          leadId: lead._id
        });

        await lead.save();
        
        // Wait 1 second between messages to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing lead ${lead._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in processAgedLeads:', error);
  }
};

// Move scheduler inside MongoDB connection success handler
mongoose.connection.once('open', () => {
  console.log('MongoDB connected successfully');
  
  // Schedule job after connection is established
  const job = schedule.scheduleJob({
    hour: 11,
    minute: 0,
    tz: 'America/New_York'
  }, processAgedLeads);
  
  console.log('Aged leads processor scheduled for 11 AM EST');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// mongoose.connection.once('open', () => {
//   console.log('MongoDB connected successfully');
//   // Run the processor only after connection is established
//   console.log('Starting aged leads processor...');
// //   processAgedLeads();
// });

// Move the immediate execution inside a main function
const main = async () => {
  try {
    // Connect to MongoDB
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
