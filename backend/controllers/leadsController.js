import Lead from "../models/leadModel.js";
import { sendTelegramMessage } from "../jobs/telegram/sendTelegramMessage.js";

export const addNewLead = async (req, res) => {
  try {
    const { phoneNumber, telegramUserId } = req.body;

    let lead = await Lead.findOne({ telegramUserId });
    if (!lead) {
      lead = new Lead({ phoneNumber, telegramUserId });
      await lead.save();
    }

    if (telegramUserId) {
      await sendTelegramMessage(
        telegramUserId,
        "Thank you for your application for health insurance. Are you looking for yourself or the family today? Type STOP to end."
      );
    }

    res.status(200).json({
      success: true,
      message: "New lead added (or found) and initial message sent.",
      data: lead,
    });
  } catch (error) {
    console.error("Error in addNewLead:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};