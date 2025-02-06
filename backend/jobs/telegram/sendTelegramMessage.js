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
      parse_mode: options.parse_mode || 'HTML'
    };

    // Add buttons if withButtons is true
    if (options.withButtons) {
      messageData.reply_markup = {
        inline_keyboard: [[
          { text: '✅ Approve', callback_data: 'approve' },
          { text: '❌ Reject', callback_data: 'reject' },
          { text: '✏️ Change', callback_data: 'change' }
        ]]
      };
    }

    const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, messageData);
    return response.data?.result?.message_id;

  } catch (error) {
    console.error("Error sending Telegram message:", error.response?.data || error.message);
    throw error;
  }
};
