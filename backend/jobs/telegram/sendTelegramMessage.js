
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv"

dotenv.config()

const token = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

export const sendTelegramMessage = async (chatId, text) => {

  try {
    const response = await bot.sendMessage(chatId, text);
    return response;
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    throw error;
  }
};
