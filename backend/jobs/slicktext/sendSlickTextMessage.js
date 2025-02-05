import axios from "axios";
import dotenv from "dotenv";
import { addContactToCampaign } from "./addContactToCampaign.js";
dotenv.config();

export const sendSlickTextMessage = async (phoneNumber, message) => {
  try {
    // Remove any non-numeric characters and ensure US format
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    // First, ensure contact exists using the existing function
    await addContactToCampaign(normalizedPhone);

    // Then send the message using the SMS endpoint
    const response = await axios.post(
      "https://dev.slicktext.com/v1/sms",
      {
        phone_number: normalizedPhone,
        message: message,
        type: "single"
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SLICKTEXT_API_KEY}`
        }
      }
    );

    console.log('SlickText Response:', response.data);
    
    // Log rate limiting info
    console.log('Rate Limit Status:', {
      limit: response.headers['x-ratelimit'],
      remaining: response.headers['x-ratelimit-remaining'],
      reset: response.headers['x-ratelimit-reset']
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      console.error("SlickText API Error:", {
        status: error.response.status,
        data: error.response.data,
        endpoint: error.config.url,
        requestData: error.config.data
      });
    } else {
      console.error("Network Error:", error.message);
    }
    throw error;
  }
};
