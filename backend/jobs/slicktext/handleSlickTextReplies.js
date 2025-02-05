import Lead from "../../models/leadModel.js";
import { getClaudeResponse } from "../claude/getClaudeResponse.js";
import { sendTelegramMessage } from "../telegram/sendTelegramMessage.js";
import { sendSlickTextMessage } from "./sendSlickTextMessage.js";
import moment from "moment-timezone";

export const handleSlickTextReply = async (inboundMessage) => {
  try {
    const { phone_number, message } = inboundMessage;
    if (!phone_number || !message) return;

    // Normalize phone number
    const normalizedPhone = phone_number.replace(/\D/g, '');

    // Find or create lead
    let lead = await Lead.findOne({ phoneNumber: normalizedPhone });
    if (!lead) {
      lead = new Lead({ phoneNumber: normalizedPhone });
    }

    // Handle STOP command
    if (message.trim().toLowerCase() === 'stop') {
      lead.unsubscribed = true;
      await lead.save();
      return;
    }

    // Add user message to conversation history
    lead.messages.push({ role: "user", content: message });
    await lead.save();

    // Get Claude's response
    const claudeResp = await getClaudeResponse(lead.messages);
    
    if (!claudeResp?.content?.[0]?.text) {
      console.error("No response from Claude");
      return;
    }

    const assistantText = claudeResp.content[0].text;

    // Send to admin Telegram for approval
    const approvalText = `New SMS from +${phone_number}:\n"${message}"\n\nClaude suggests:\n"${assistantText}"\n\nReply with "/approve", "/reject", or "/change <your response>" to finalize.`;
    await sendTelegramMessage(process.env.ADMIN_TELEGRAM_ID, approvalText);

    // Save Claude's response as pending
    lead.messages.push({ role: "assistant", content: assistantText, approved: false });
    await lead.save();

  } catch (error) {
    console.error("Error handling SlickText reply:", error);
  }
};
