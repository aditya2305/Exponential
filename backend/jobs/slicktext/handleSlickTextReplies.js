import Lead from "../../models/leadModel.js";
import { getClaudeResponse } from "../claude/getClaudeResponse.js";
import { sendTelegramMessage } from "../telegram/sendTelegramMessage.js";


export const handleSlickTextReply = async (webhookData) => {
  try {
    const { data } = webhookData;
    
    // Extract phone number and message from webhook data
    const phoneNumber = data.contact_id;
    const message = data.body;
    
    if (!phoneNumber || !message) {
      console.error("Missing required webhook data");
      return;
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/\D/g, '');

    // Find or create lead
    let lead = await Lead.findOne({ phoneNumber: normalizedPhone });
    if (!lead) {
      lead = new Lead({ 
        phoneNumber: normalizedPhone,
        source: 'slicktext'
      });
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
    const approvalText = `New SMS from +${normalizedPhone}:\n"${message}"\n\nClaude suggests:\n"${assistantText}"\n\nReply with "/approve", "/reject", or "/change <your response>" to finalize.`;
    await sendTelegramMessage(process.env.ADMIN_TELEGRAM_ID, approvalText);

    // Save Claude's response as pending
    lead.messages.push({ role: "assistant", content: assistantText, approved: false });
    await lead.save();

  } catch (error) {
    console.error("Error handling SlickText reply:", error);
  }
};
