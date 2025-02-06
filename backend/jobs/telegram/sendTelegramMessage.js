import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export const sendTelegramMessage = async (chatId, text, options = {}) => {
  try {
    const messageData = {
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode || 'Markdown'
    };

    const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, messageData);
    return response.data?.result?.message_id;

  } catch (error) {
    console.error("Error sending Telegram message:", error.response?.data || error.message);
    throw error;
  }
};
