import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export const addContactToCampaign = async (phoneNumber) => {
  try {
    const response = await axios.post(
      "https://dev.slicktext.com/v1/contacts", 
      {
        phone_number: phoneNumber,
        // Additional fields as needed
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
    console.error("Error adding contact to SlickText:", error.response?.data || error.message);
    throw error;
  }
};
