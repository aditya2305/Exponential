import axios from "axios";
import dotenv from "dotenv";
import { createOrGetContact } from "./contactManagement.js";
dotenv.config();

export const sendSlickTextMessage = async (phoneNumber, message) => {
  try {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    // Use the extracted contact management function
    const contactId = await createOrGetContact(normalizedPhone);

    // Create and send campaign
    const response = await axios.post(
      `https://dev.slicktext.com/v1/brands/${process.env.BRAND_ID}/campaigns`,
      {
        name: `Message to ${normalizedPhone}`,
        body: message,
        status: "send",
        audience: {
          contacts: [contactId]
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SLICKTEXT_API_KEY}`
        }
      }
    );

    console.log('SlickText Campaign Created:', response.data);
    
    // Log rate limiting info
    console.log('Rate Limit Status:', {
      limit: response.headers['x-ratelimit'],
      remaining: response.headers['x-ratelimit-remaining'],
      reset: response.headers['x-ratelimit-reset']
    });

    return response.data;

  } catch (error) {
    console.error("SlickText API Error:", {
      status: error.response?.status,
      data: error.response?.data,
      endpoint: error.config?.url,
      requestData: error.config?.data
    });
    throw error;
  }
};
