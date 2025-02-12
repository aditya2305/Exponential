import axios from "axios";
import { CONFIG, getStateFromZipCode } from "../../config/index.js";
import { sendSlickTextMessage } from "./sendSlickTextMessage.js";

export const sendInitialMessage = async (phoneNumber, contactData = {}, messageText) => {
  try {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    // Create contact in SlickText
    const contactResponse = await axios.post(
      `${CONFIG.SLICKTEXT.BASE_URL}/brands/${CONFIG.SLICKTEXT.BRAND_ID}/contacts`,
      {
        mobile_number: `+${normalizedPhone}`,
        first_name: contactData.fullName ? contactData.fullName.split(' ')[0] : null,
        last_name: contactData.fullName ? contactData.fullName.split(' ').slice(1).join(' ') : null,
        email: contactData.email,
        address: contactData.address,
        zip: contactData.zipcode,
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
    
    // Send the personalized message
    await sendSlickTextMessage(contactId, messageText);
    
    return contactId;
  } catch (error) {
    console.error("Error in sendInitialMessage:", error.response?.data || error);
    throw error;
  }
};

export const findExistingContact = async (phoneNumber) => {
  const normalizedPhone = phoneNumber.replace(/\D/g, '');
  const contactsResponse = await axios.get(
    `${CONFIG.SLICKTEXT.BASE_URL}/brands/${CONFIG.SLICKTEXT.BRAND_ID}/contacts/`,
    {
      headers: {
        'Authorization': `Bearer ${CONFIG.SLICKTEXT.API_KEY}`
      }
    }
  );

  return contactsResponse.data.data.find(
    contact => contact.mobile_number === `+1${normalizedPhone}`
  );
};