import Lead from "../../models/leadModel.js";
import { getClaudeResponse } from "../claude/getClaudeResponse.js";
import { sendTelegramMessage } from "../telegram/sendTelegramMessage.js";
import mongoose from "mongoose";

export const handleSlickTextReply = async (webhookData) => {
  try {
    const { data } = webhookData;
    // The contact_id is in _contact_id in the webhook data
    const contactId = data._contact_id;
    // The message is in last_message
    const message = data.last_message;
    
    console.log("Processing message:", { contactId, message });
    
    if (!contactId || !message) {
      console.error("Missing required webhook data:", { contactId, message });
      return;
    }

    // Find lead by SlickText contact ID
    let lead = await Lead.findOne({ slickTextContactId: contactId.toString() });
    if (!lead) {
      console.warn(`No lead found for contact ID ${contactId}`);
      return;
    }

    // Add user message to conversation history
    lead.messages.push({ 
      messageId: new mongoose.Types.ObjectId().toString(),
      role: "user", 
      content: message,
      timestamp: new Date()
    });
    await lead.save();

    console.log("Getting Claude response for lead:", lead._id);

    // Get Claude's response
    const claudeResp = await getClaudeResponse(lead.messages);
    
    if (!claudeResp?.content?.[0]?.text) {
      console.error("No response from Claude:", claudeResp);
      return;
    }

    const assistantText = claudeResp.content[0].text;

    // Create assistant message with messageId
    const assistantMessage = {
      messageId: new mongoose.Types.ObjectId().toString(),
      role: "assistant",
      content: assistantText,
      approved: false
    };

    lead.messages.push(assistantMessage);
    await lead.save();

    // Send to admin Telegram for approval
    const approvalText = `New SMS from ${lead.phoneNumber ? `Phone: ${lead.phoneNumber}` : `Contact ID: ${contactId}`}:\n"${message}"\n\nClaude suggests:\n"${assistantText}"`;
    
    const buttons = {
      inline_keyboard: [[
        { text: '✅ Approve', callback_data: `approve:${assistantMessage.messageId}` },
        { text: '❌ Reject', callback_data: `reject:${assistantMessage.messageId}` },
        { text: '✏️ Change', callback_data: `change:${assistantMessage.messageId}` }
      ]]
    };

    console.log("Sending approval request to admin");
    
    // Send approval request to admin via Telegram
    await sendTelegramMessage(process.env.ADMIN_TELEGRAM_ID, approvalText, { reply_markup: buttons });

  } catch (error) {
    console.error("Error handling SlickText reply:", error);
  }
};
