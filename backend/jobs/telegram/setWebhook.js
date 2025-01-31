// jobs/telegram/setWebhook.js
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export const setWebhook = async () => {
  try {
    const baseUrl = process.env.BASE_URL;
    const webhookUrl = `${baseUrl}/webhook/telegram`;

    const response = await axios.post(`${TELEGRAM_API_URL}/setWebhook`, {
      url: webhookUrl,
    });

    if (!response.data.ok) {
      console.error("Failed to set webhook:", response.data);
    } else {
      console.log("Webhook set successfully:", response.data);
    }
  } catch (error) {
    console.error("Error setting Telegram webhook:", error.response?.data || error.message);
  }
};
