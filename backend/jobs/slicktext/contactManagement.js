import axios from "axios";
import { CONFIG } from "../../config/index.js";

export const sendInitialMessage = async (phoneNumber) => {
  try {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    // Create contact in SlickText
    const contactResponse = await axios.post(
      `${CONFIG.SLICKTEXT.BASE_URL}/brands/${CONFIG.SLICKTEXT.BRAND_ID}/contacts`,
      {
        mobile_number: `+${normalizedPhone}`,
        opt_in_status: "subscribed"
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.SLICKTEXT.API_KEY}`
        }
      }
    );

    const contactId = contactResponse.data.contact_id;
    
    // Send welcome message
    await axios.post(
      `${CONFIG.SLICKTEXT.BASE_URL}/brands/${CONFIG.SLICKTEXT.BRAND_ID}/messages`,
      {
        contact_id: contactId,
        body: "Thank you for your interest! How can I assist you today?",
        media_url: null
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.SLICKTEXT.API_KEY}`
        }
      }
    );
    
    return contactId;
  } catch (error) {
    console.error("Error in sendInitialMessage:", error.response?.data || error);
    throw error;
  }
};