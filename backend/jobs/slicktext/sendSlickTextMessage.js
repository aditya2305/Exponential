import axios from "axios";
import dotenv from "dotenv";
import { createOrGetContact } from "./contactManagement.js";
dotenv.config();

export const sendSlickTextMessage = async (phoneNumber, message) => {
  try {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    // Create a campaign to send the message
    const response = await axios.post(
      `https://dev.slicktext.com/v1/brands/${process.env.BRAND_ID}/campaigns`,
      {
        name: `Message to ${normalizedPhone}`,
        body: message,
        media_url: null,
        status: "send", // sends immediately
        audience: {
          all: true  // Send to all contacts
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
