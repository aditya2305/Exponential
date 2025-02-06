import axios from "axios";

export const createOrGetContact = async (phoneNumber) => {
  try {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    // Create a campaign with initial message
    const response = await axios.post(
      `https://dev.slicktext.com/v1/brands/${process.env.BRAND_ID}/campaigns`,
      {
        name: `Initial Message to ${normalizedPhone}`,
        body: "Thank you for your application for health insurance, are you looking for yourself or the family today? Reply STOP to end.",
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
    
    return response.data;
  } catch (error) {
    console.error("Error in contact management:", {
      status: error.response?.status,
      data: error.response?.data,
      endpoint: error.config?.url,
      requestData: error.config?.data
    });
    throw error;
  }
};