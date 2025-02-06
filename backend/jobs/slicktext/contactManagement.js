import axios from "axios";

export const sendInitialMessage = async (phoneNumber) => {
  try {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    // Send message using the messages endpoint
    const response = await axios.post(
      `https://dev.slicktext.com/v1/brands/${process.env.BRAND_ID}/messages`,
      {
        'body': "Thank you for your interest! How can I assist you today?",
        'to': `+${normalizedPhone}`,  // Add the + prefix
        'media_url': null
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SLICKTEXT_API_KEY}`
        }
      }
    );
    
    // Return the contact_id from the response
    return response.data.contact.contact_id;
  } catch (error) {
    console.error("Error sending initial message:", error.response?.data || error);
    throw error;
  }
};