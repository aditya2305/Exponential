import axios from "axios";
import { CONFIG } from "../../config/index.js";

export const setWebhook = async () => {
  try {
    const webhookUrl = `${CONFIG.BASE_URL}/webhook/telegram`;

    const response = await axios.post(`${CONFIG.TELEGRAM.API_URL}/setWebhook`, {
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
