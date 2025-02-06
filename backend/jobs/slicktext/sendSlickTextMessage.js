import axios from "axios";
import dotenv from "dotenv";
// import { createOrGetContact } from "./contactManagement.js";
dotenv.config();

export const sendSlickTextMessage = async (contactId, message) => {
  try {
    const response = await axios.post(
      `https://dev.slicktext.com/v1/brands/${process.env.BRAND_ID}/messages`,
      {
        contact_id: contactId,
        body: message,
        media_url: null
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SLICKTEXT_API_KEY}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error("Error sending SlickText message:", error.response?.data || error);
    throw error;
  }
};
