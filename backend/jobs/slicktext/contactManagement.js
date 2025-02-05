import axios from "axios";

export const createOrGetContact = async (phoneNumber) => {
  try {
    // First try to get existing contact
    const existingContactsResponse = await axios.get(
      `https://dev.slicktext.com/v1/contacts`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SLICKTEXT_API_KEY}`
        },
        params: {
          mobile_number: `+${phoneNumber}`
        }
      }
    );

    if (existingContactsResponse.data?.data?.length > 0) {
      return existingContactsResponse.data.data[0].contact_id;
    }

    // Create new contact if not found
    const createContactResponse = await axios.post(
      `https://dev.slicktext.com/v1/contacts`,
      {
        mobile_number: `+${phoneNumber}`,
        opt_in_status: "subscribed",
        source: "api"
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SLICKTEXT_API_KEY}`
        }
      }
    );
    
    return createContactResponse.data.contact_id;
  } catch (error) {
    console.error("Error in contact management:", error);
    throw error;
  }
};