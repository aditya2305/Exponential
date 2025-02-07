import axios from "axios";
import { CONFIG } from "../../config/index.js";
// import { createOrGetContact } from "./contactManagement.js";

export const sendSlickTextMessage = async (contactId, message) => {
  try {
    const response = await axios.post(
      `${CONFIG.SLICKTEXT.BASE_URL}/brands/${CONFIG.SLICKTEXT.BRAND_ID}/messages`,
      {
        contact_id: contactId,
        body: message,
        media_url: null
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.SLICKTEXT.API_KEY}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error("Error sending SlickText message:", error.response?.data || error);
    throw error;
  }
};
