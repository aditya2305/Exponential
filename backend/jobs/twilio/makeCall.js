import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_CALLER_NUMBER,
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
