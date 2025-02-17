import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });


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

  ZIP_CODES: {
    '00600-00799': 'Puerto Rico',
    '00800-00899': 'Virgin Islands',
    '00900-00999': 'Puerto Rico',
    '01000-02799': 'Massachusetts',
    '02800-02999': 'Rhode Island',
    '03000-03899': 'New Hampshire',
    '03900-04999': 'Maine',
    '05000-05999': 'Vermont',
    '06000-06999': 'Connecticut',
    '07000-08999': 'New Jersey',
    '10000-14999': 'New York',
    '15000-19699': 'Pennsylvania',
    '19700-19999': 'Delaware',
    '20000-20599': 'District of Columbia',
    '20600-21999': 'Maryland',
    '22000-24699': 'Virginia',
    '24700-26899': 'West Virginia',
    '27000-28999': 'North Carolina',
    '29000-29999': 'South Carolina',
    '30000-31999': 'Georgia',
    '32000-34999': 'Florida',
    '35000-36999': 'Alabama',
    '37000-38599': 'Tennessee',
    '38600-39999': 'Mississippi',
    '40000-42799': 'Kentucky',
    '43000-45999': 'Ohio',
    '46000-47999': 'Indiana',
    '48000-49999': 'Michigan',
    '50000-52999': 'Iowa',
    '53000-54999': 'Wisconsin',
    '55000-56799': 'Minnesota',
    '57000-57799': 'South Dakota',
    '58000-58899': 'North Dakota',
    '59000-59999': 'Montana',
    '60000-62999': 'Illinois',
    '63000-65899': 'Missouri',
    '66000-67999': 'Kansas',
    '68000-69999': 'Nebraska',
    '70000-71599': 'Louisiana',
    '71600-72999': 'Arkansas',
    '73000-74999': 'Oklahoma',
    '75000-79999': 'Texas',
    '80000-81699': 'Colorado',
    '82000-83199': 'Wyoming',
    '83200-83999': 'Idaho',
    '84000-84799': 'Utah',
    '85000-86999': 'Arizona',
    '87000-88499': 'New Mexico',
    '88900-89899': 'Nevada',
    '90000-96699': 'California',
    '96700-96899': 'Hawaii',
    '97000-97999': 'Oregon',
    '98000-99499': 'Washington',
    '99500-99999': 'Alaska'
  },

  AGED_LEADS_LIMIT: 10,
};

// Timezone utilities
export const getTimezoneFromPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return CONFIG.DEFAULT_TIMEZONE;
  
  // Get first 3 digits (area code)
  const areaCode = phoneNumber.substring(0, 3);
  
  // Return mapped timezone or default
  return CONFIG.US_TIMEZONE_MAP[areaCode] || CONFIG.DEFAULT_TIMEZONE;
};

// Add utility function to get state from zip code
export const getStateFromZipCode = (zipCode) => {
  if (!zipCode) return null;
  
  const numericZip = parseInt(zipCode);
  
  for (const [range, state] of Object.entries(CONFIG.ZIP_CODES)) {
    const [min, max] = range.split('-').map(num => parseInt(num));
    if (numericZip >= min && numericZip <= max) {
      return state;
    }
  }
  
  return null;
};

// Add a function to update config values
export const updateConfig = () => {
  CONFIG.PORT = process.env.PORT || 3000;
  CONFIG.BASE_URL = process.env.BASE_URL;
  CONFIG.MONGODB_URI = process.env.MONGODB_URI;

  CONFIG.TELEGRAM.BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  CONFIG.TELEGRAM.ADMIN_CHAT_ID = process.env.ADMIN_TELEGRAM_ID;
  CONFIG.TELEGRAM.API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

  CONFIG.TWILIO.ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  CONFIG.TWILIO.AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  CONFIG.TWILIO.CALLER_NUMBER = process.env.TWILIO_CALLER_NUMBER;
  CONFIG.TWILIO.FORWARD_NUMBER = process.env.FORWARD_NUMBER;

  CONFIG.SLICKTEXT.API_KEY = process.env.SLICKTEXT_API_KEY;
  CONFIG.SLICKTEXT.BRAND_ID = process.env.BRAND_ID;
  CONFIG.SLICKTEXT.WEBHOOK_SECRET = process.env.SLICKTEXT_WEBHOOK_SECRET;

  CONFIG.ANTHROPIC.API_KEY = process.env.ANTHROPIC_API_KEY;
}; 