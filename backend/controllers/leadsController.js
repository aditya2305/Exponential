
import Lead from "../models/leadModel.js";
// import { addContactToCampaign } from "../jobs/slicktext/addContactToCampaign.js"
import { sendSlickTextMessage } from "../jobs/slicktext/sendSlickTextMessage.js";

export const addNewLeadSlickText = async (req, res) => {
  try {
    const { phoneNumber, textword } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing phoneNumber" 
      });
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/\D/g, '');

    // Create or update lead in your database
    let lead = await Lead.findOne({ phoneNumber: normalizedPhone });
    if (!lead) {
      lead = new Lead({ phoneNumber: normalizedPhone });
      await lead.save();
    }

    // Send initial message via SlickText
    await sendSlickTextMessage(
      normalizedPhone,
      "Thank you for your application for health insurance, are you looking for yourself or the family today? Reply STOP to end."
    );

    return res.json({ 
      success: true, 
      message: "Lead added & first SMS sent." 
    });
  } catch (error) {
    console.error("Error in addNewLeadSlickText:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal error" 
    });
  }
};
