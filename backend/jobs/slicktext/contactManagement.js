import axios from "axios";

export const sendInitialMessage = async (phoneNumber) => {
  try {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    // First create a contact to get the contact_id
    const contactResponse = await axios.post(
      `https://dev.slicktext.com/v1/brands/${process.env.BRAND_ID}/contacts`,
      {
        'phone': `+${normalizedPhone}`,  // Add the + prefix
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SLICKTEXT_API_KEY}`
        }
      }
    );

    const contactId = contactResponse.data.contact.contact_id;
    
    // Then send message using the messages endpoint with the contact_id
    const messageResponse = await axios.post(
      `https://dev.slicktext.com/v1/brands/${process.env.BRAND_ID}/messages`,
      {
        'body': "Thank you for your interest! How can I assist you today?",
        'to': contactId,  // Use contact_id instead of phone number
        'media_url': null
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SLICKTEXT_API_KEY}`
        }
      }
    );
    
    return contactId;
  } catch (error) {
    console.error("Error sending initial message:", error.response?.data || error);
    throw error;
  }
};