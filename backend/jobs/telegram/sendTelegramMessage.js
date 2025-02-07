import axios from "axios";
import { CONFIG } from "../../config/index.js";

export const sendTelegramMessage = async (chatId, text, options = {}) => {
  try {
    const messageData = {
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode || 'Markdown',
      ...(options.reply_markup && { reply_markup: options.reply_markup })
    };

    const response = await axios.post(
      `${CONFIG.TELEGRAM.API_URL}/sendMessage`, 
      messageData
    );
    return response.data?.result?.message_id;

  } catch (error) {
    console.error("Error sending Telegram message:", error.response?.data || error.message);
    throw error;
  }
};
