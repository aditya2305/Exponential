import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
  // Server config
  PORT: process.env.PORT || 3000,
  BASE_URL: process.env.BASE_URL,
  MONGODB_URI: process.env.MONGODB_URI,

  EXTERNAL_CALL_ENDPOINT: "https://twilio.getoverseer.io/autoforwards",

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

  DEFAULT_TIMEZONE: "America/New_York",

  US_TIMEZONE_MAP: {
    // Eastern Time
    "212": "America/New_York", "347": "America/New_York", "516": "America/New_York",
    // Central Time  
    "312": "America/Chicago", "469": "America/Chicago", "214": "America/Chicago",
    // Pacific Time
    "213": "America/Los_Angeles", "310": "America/Los_Angeles", "408": "America/Los_Angeles",
    // Mountain Time
    "303": "America/Denver", "480": "America/Denver", "505": "America/Denver",
  },
};

// Timezone utilities
export const getTimezoneFromPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return CONFIG.DEFAULT_TIMEZONE;
  
  // Get first 3 digits (area code)
  const areaCode = phoneNumber.substring(0, 3);
  
  // Return mapped timezone or default
  return CONFIG.US_TIMEZONE_MAP[areaCode] || CONFIG.DEFAULT_TIMEZONE;
}; 