
import Lead from "../models/leadModel.js";
import { addContactToCampaign } from "../jobs/slicktext/addContactToCampaign.js"
import { sendSlickTextMessage } from "../jobs/slicktext/sendSlickTextMessage.js";

export const addNewLeadSlickText = async (req, res) => {
  try {
    const { phoneNumber, campaignId } = req.body;
    if (!phoneNumber || !campaignId) {
      return res.status(400).json({ success: false, message: "Missing phoneNumber or campaignId" });
    }

    let lead = await Lead.findOne({ phoneNumber });
    if (!lead) {
      lead = new Lead({ phoneNumber });
      await lead.save();
    }

    await addContactToCampaign(phoneNumber, campaignId);

    await sendSlickTextMessage(
      phoneNumber,
      "Thank you for your application for health insurance, are you looking for yourself or the family today? Reply STOP to end."
    );

    return res.json({ success: true, message: "Lead added & first SMS sent." });
  } catch (error) {
    console.error("Error in addNewLeadSlickText:", error);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
};
