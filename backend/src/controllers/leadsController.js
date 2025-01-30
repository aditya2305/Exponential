import Lead from "../../models/leadModel.js";
import { sendTelegramMessage } from "../../jobs/telegram/sendTelegramMessage.js";


export const addNewLead = async (req, res) => {
  try {
    const { phoneNumber, telegramUserId } = req.body;
    const lead = new Lead({ phoneNumber, telegramUserId });
    await lead.save();

    if (telegramUserId) {
        try {
            await sendTelegramMessage( telegramUserId, "Thank you for your application for health insurance. Are you looking for yourself or the family today? Press STOP to end.");
        } catch (telegramError) {
            console.error("Error sending Telegram message:", telegramError);
        }
    }

    return res.status(200).json({
      success: true,
      message: "New lead added and message sent.",
      data: lead,
    });
  } catch (error) {
    console.error("Error in addNewLead:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
