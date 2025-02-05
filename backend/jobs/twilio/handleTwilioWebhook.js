import Appointment from "../../models/appointmentModel.js";
import twilio from 'twilio';

const { twiml: TwiML } = twilio;

export const handleTwilioVoice = async (req, res) => {
  try {

    const FORWARD_NUMBER = process.env.FORWARD_NUMBER;

    const voiceResponse = new TwiML.VoiceResponse();
    voiceResponse.dial(
      {
        callerId: process.env.TWILIO_CALLER_NUMBER
      },
      FORWARD_NUMBER
    );

    res.type("text/xml");
    res.send(voiceResponse.toString());
  } catch (error) {
    console.error("Error in handleTwilioVoice:", error);
    res.type("text/xml");
    res.send("<Response><Say>Sorry, an error occurred.</Say></Response>");
  }
};

export const handleTwilioStatus = async (req, res) => {
  try {
    const { appointmentId } = req.query;
    const { CallStatus, CallDuration, RecordingUrl } = req.body; 
    // possible statuses: 'completed', 'no-answer', 'failed', etc.

    const appt = await Appointment.findById(appointmentId);
    if (!appt) {
        console.log("Appointment not found for ID:", appointmentId);
      return res.sendStatus(200);
    }

    if (CallStatus === "completed") {
      appt.pickedUp = true;
      appt.callDuration = CallDuration || 0;
      appt.recordingUrl = RecordingUrl || "";
    } else {
      appt.pickedUp = false;
    }
    await appt.save();

    // If they didn't pick up, you could e.g. send an SMS or store that info.
    res.sendStatus(200);
  } catch (error) {
    console.error("Error in handleTwilioStatus:", error);
    res.sendStatus(200);
  }
};
