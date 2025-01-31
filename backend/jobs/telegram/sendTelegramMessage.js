import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export const sendTelegramMessage = async (chatId, text) => {
  try {
    const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
      chat_id: chatId,
      text,
    });

    const messageId = response.data?.result?.message_id;
    return messageId;

  } catch (error) {
    console.error("Error sending Telegram message:", error.response?.data || error.message);
    throw error;
  }
};
