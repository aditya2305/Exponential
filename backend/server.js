import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import mongoose from "mongoose"
import { addNewLead } from "./controllers/leadsController.js";
import { setWebhook } from "./jobs/telegram/setWebhook.js";
import { handleTelegramUpdate } from "./jobs/telegram/handleTelegramMessage.js";

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

app.post("/add-lead", addNewLead);

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);

  await setWebhook();
  console.log("Webhook set.");
});
