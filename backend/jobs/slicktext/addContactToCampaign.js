import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const SLICKTEXT_API_KEY = process.env.SLICKTEXT_API_KEY; 

export const addContactToCampaign = async (phoneNumber, campaignId) => {
  try {
    const response = await axios.post(
      "https://api.slicktext.com/v1/contact", 
      {
        phone_number: phoneNumber,
        campaign_id: campaignId
      },
      {
        headers: {
          Authorization: `Bearer ${SLICKTEXT_API_KEY}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error adding contact to SlickText:", error.response?.data || error.message);
    throw error;
  }
};
