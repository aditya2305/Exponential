import twilio from "twilio";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_CALLER_NUMBER,
  FORWARD_NUMBER,
  BASE_URL,
  SLICKTEXT_API_KEY,
  BRAND_ID
} = process.env;

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export const makeCall = async (appointmentId, phoneNumber) => {
  try {
    if (!phoneNumber) {
      throw new Error("No phone number specified for makeCall()");
    }

    const call = await client.calls.create({
      to: phoneNumber,
      from: TWILIO_CALLER_NUMBER,
      record: true,
      url: `${BASE_URL}/twilio/voice?appointmentId=${appointmentId}`,
      statusCallback: `${BASE_URL}/twilio/status?appointmentId=${appointmentId}`,
      statusCallbackMethod: "POST"
    });
    console.log("Twilio call initiated. Call SID:", call.sid);
    return call.sid;
  } catch (error) {
    console.error("Error making Twilio call:", error);
    throw error;
  }
};

// POST https://dev.slicktext.com/v1/contacts
const createContact = async (phoneNumber) => {
  const response = await axios.post('https://dev.slicktext.com/v1/contacts', {
    mobile_number: phoneNumber,
    opt_in_status: "subscribed",
    source: "api"
  }, {
    headers: {
      'Authorization': `Bearer ${SLICKTEXT_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data;
};

// POST https://dev.slicktext.com/v1/brands/{{brand_id}}/campaigns/
const sendMessage = async (phoneNumber, message) => {
  const response = await axios.post(`https://dev.slicktext.com/v1/brands/${BRAND_ID}/campaigns/`, {
    name: `Message to ${phoneNumber}`,
    body: message,
    status: "send", // sends immediately
    audience: {
      contact_lists: [], // Specify the contact list ID where the user is added
      segments: [] // Or use segments if you've organized contacts that way
    }
  }, {
    headers: {
      'Authorization': `Bearer ${SLICKTEXT_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data;
};

// import twilio from "twilio";
// import dotenv from "dotenv";
// dotenv.config();

// /*
//  * CHANGES / COMMENTS:
//  * 1) We read your Twilio credentials from .env
//  * 2) The 'FORWARD_NUMBER' is the phone number Twilio calls if the user picks up
//  * 3) We create a call with "url" and "statusCallback" pointing to our new endpoints.
//  */

// const {
//   TWILIO_ACCOUNT_SID,
//   TWILIO_AUTH_TOKEN,
//   TWILIO_CALLER_NUMBER,
//   FORWARD_NUMBER,
//   BASE_URL
// } = process.env;

// const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// export const makeCall = async (appointment) => {
//   try {
//     if (!appointment.phoneNumber) {
//       throw new Error("No phoneNumber found on appointment.");
//     }

//     const call = await client.calls.create({
//       to: appointment.phoneNumber,
//       from: TWILIO_CALLER_NUMBER,
//       record: true,
//       url: `${BASE_URL}/twilio/voice?appointmentId=${appointment._id}`,
//       statusCallback: `${BASE_URL}/twilio/status?appointmentId=${appointment._id}`,
//       statusCallbackMethod: "POST"
//     });

//     console.log("Twilio call initiated. Call SID:", call.sid);
//     return call.sid;
//   } catch (error) {
//     console.error("Error making Twilio call:", error);
//     throw error;
//   }
// };
