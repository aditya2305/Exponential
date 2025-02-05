import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import mongoose from "mongoose"
import { setWebhook } from "./jobs/telegram/setWebhook.js";
import { handleTelegramUpdate } from "./jobs/telegram/handleTelegramMessage.js";
import { handleSlickTextReply } from "./jobs/slicktext/handleSlickTextReplies.js";
import { addNewLeadSlickText, createLead } from "./controllers/leadsController.js";
import { handleTwilioStatus, handleTwilioVoice } from "./jobs/twilio/handleTwilioWebhook.js";
import { makeCall } from "./jobs/twilio/makeCall.js";
import crypto from "crypto";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => {
    console.log('Database connection successful!');
})
.catch((err) => {
    console.error('Database connection error:', err);
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.post("/add-lead-slicktext", addNewLeadSlickText);
app.post("/create-lead", createLead);

app.get("/twilio/voice", handleTwilioVoice); 
app.post("/twilio/status", handleTwilioStatus);


app.get("/test-make-call", async (req, res) => {
  try {

    const { phone } = req.body; 
    if (!phone) {
      return res.status(400).send("Missing 'phone' query param");
    }

    // For testing, let's use a random ID or pass "testId"
    const appointmentId = "testTwilio123";

    const sid = await makeCall(appointmentId, phone);
    res.status(200).json({ success: true, sid });
  } catch (error) {
    console.error("Error in /test-make-call:", error);
    res.status(500).send("Internal error");
  }
});

app.post("/webhook/telegram", async (req, res) => {
  try {
    const update = req.body;
    await handleTelegramUpdate(update);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error in /webhook/telegram route:", error);
    res.sendStatus(200); 
  }
});

app.post("/webhook/slicktext", async (req, res) => {
  try {
    // Verify webhook signature
    const postData = JSON.stringify(req.body);
    const signature = req.headers['x-slicktext-signature'];
    const webhookSecret = process.env.SLICKTEXT_WEBHOOK_SECRET;

    const hmacDigest = crypto
      .createHmac('md5', webhookSecret)
      .update(postData)
      .digest('hex');

    if (hmacDigest !== signature) {
      console.error('Invalid webhook signature');
      return res.sendStatus(401);
    }

    // Handle different webhook events
    const eventName = req.body.name;
    switch(eventName) {
      case 'inbox_message_received':
        await handleSlickTextReply(req.body);
        break;
      case 'campaign_sent':
        console.log('Campaign sent successfully:', req.body.data);
        break;
      case 'campaign_failed':
        console.error('Campaign failed:', req.body.data);
        break;
      default:
        console.log('Unhandled SlickText event:', eventName);
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error("Error in /webhook/slicktext:", error);
    res.sendStatus(200); // Always return 200 to acknowledge receipt
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);

  await setWebhook();
  console.log("Webhook set.");
});
