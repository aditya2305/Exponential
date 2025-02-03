import Lead from "../../models/leadModel.js";
import { getClaudeResponse } from "../claude/getClaudeResponse.js";
import { sendTelegramMessage } from "../telegram/sendTelegramMessage.js"; 
// // For admin approval
// import moment from "moment";

export const handleSlickTextReply = async (inboundMessage) => {
  try {
    const { phone_number, text } = inboundMessage; 
    if (!phone_number || !text) return;

    let lead = await Lead.findOne({ phoneNumber: phone_number });
    if (!lead) {
      lead = new Lead({ phoneNumber: phone_number });
      await lead.save();
    }

    lead.messages.push({ role: "user", content: text });
    await lead.save();

    const claudeResp = await getClaudeResponse(lead.messages);
    if (!claudeResp) return;

    const assistantText = claudeResp.content?.[0]?.text || "[No text returned]";

    const approvalText = `New SMS from +${phone_number}:\n"${text}"\n\nClaude suggests:\n"${assistantText}"\nReply with "/approve", "/reject", or "/change <your response>" to finalize.`;
    await sendTelegramMessage(process.env.ADMIN_TELEGRAM_ID, approvalText);

    lead.messages.push({ role: "assistant", content: assistantText, approved: false });
    await lead.save();
  } catch (error) {
    console.error("Error handling SlickText reply:", error);
  }
};
