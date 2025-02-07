import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
  // Server config
  PORT: process.env.PORT || 3000,
  BASE_URL: process.env.BASE_URL,
  MONGODB_URI: process.env.MONGODB_URI,

  // Telegram config
  TELEGRAM: {
    BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    ADMIN_CHAT_ID: process.env.ADMIN_TELEGRAM_ID,
    API_URL: `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`,
  },

  // Twilio config
  TWILIO: {
    ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    CALLER_NUMBER: process.env.TWILIO_CALLER_NUMBER,
    FORWARD_NUMBER: process.env.FORWARD_NUMBER,
  },

  // SlickText config
  SLICKTEXT: {
    API_KEY: process.env.SLICKTEXT_API_KEY,
    BRAND_ID: process.env.BRAND_ID,
    WEBHOOK_SECRET: process.env.SLICKTEXT_WEBHOOK_SECRET,
    BASE_URL: 'https://dev.slicktext.com/v1',
  },

  // Anthropic/Claude config
  ANTHROPIC: {
    API_KEY: process.env.ANTHROPIC_API_KEY,
    MODEL: "claude-3-5-sonnet-20241022",
  },

  // Timezone mappings
  TIMEZONE_MAP: {
    "91": "Asia/Kolkata",
    "1": "America/New_York",
    "44": "Europe/London",
  },
}; 