import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const SLICKTEXT_API_KEY = process.env.SLICKTEXT_API_KEY;

export const sendSlickTextMessage = async (phoneNumber, message) => {
  try {
    const response = await axios.post(
      "https://api.slicktext.com/v1/message",
      {
        phone_number: phoneNumber,
        message
      },
      {
        headers: {
          Authorization: `Bearer ${SLICKTEXT_API_KEY}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS via SlickText:", error.response?.data || error.message);
    throw error;
  }
};
