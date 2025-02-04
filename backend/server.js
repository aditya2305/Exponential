import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import mongoose from "mongoose"
import { setWebhook } from "./jobs/telegram/setWebhook.js";
import { handleTelegramUpdate } from "./jobs/telegram/handleTelegramMessage.js";
import { handleSlickTextReply } from "./jobs/slicktext/handleSlickTextReplies.js";
import { addNewLeadSlickText } from "./controllers/leadsController.js";
import { handleTwilioStatus, handleTwilioVoice } from "./jobs/twilio/handleTwilioWebhook.js";
import { makeCall } from "./jobs/twilio/makeCall.js";

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

app.get("/twilio/voice", handleTwilioVoice); 
app.post("/twilio/status", handleTwilioStatus);


app.get("/test-make-call", async (req, res) => {
  try {

    const { phone } = req.body; 
    if (!phone) {
      return res.status(400).send("Missing 'phone' query param");
    }

    // For testing, let's use a random ID or pass "testId"
    // In real usage, you'd pass an actual appointment._id
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
    await handleSlickTextReply(req.body); 
    res.sendStatus(200);
  } catch (error) {
    console.error("Error in /webhook/slicktext:", error);
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);

  await setWebhook();
  console.log("Webhook set.");
});
