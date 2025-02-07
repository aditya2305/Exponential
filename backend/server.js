import express from "express"
import cors from "cors"
import mongoose from "mongoose"
import { CONFIG } from "./config/index.js"
import { setWebhook } from "./jobs/telegram/setWebhook.js";
import { handleTelegramUpdate } from "./jobs/telegram/handleTelegramMessage.js";
import { handleSlickTextReply } from "./jobs/slicktext/handleSlickTextReplies.js";
import { addNewLeadSlickText } from "./controllers/leadsController.js";
import { handleTwilioStatus, handleTwilioVoice } from "./jobs/twilio/handleTwilioWebhook.js";
import { makeCall } from "./jobs/twilio/makeCall.js";

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(CONFIG.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
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
    
    // Only process first attempt of webhooks
    if (req.body.attempts !== 1) {
      return res.sendStatus(200);
    }

    // Only process inbox_message_received events
    if (req.body.name === 'inbox_message_received') {
      console.log('Processing inbox message');
      await handleSlickTextReply(req.body);
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error("Error in /webhook/slicktext:", error, error.stack);
    res.sendStatus(200); // Always return 200 to acknowledge receipt
  }
});

app.listen(CONFIG.PORT, async () => {
  console.log(`Server listening on port ${CONFIG.PORT}`);

  await setWebhook();
  console.log("Webhook set.");
});
