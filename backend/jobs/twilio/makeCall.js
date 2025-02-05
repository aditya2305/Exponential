import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_CALLER_NUMBER,
  FORWARD_NUMBER,
  BASE_URL
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
