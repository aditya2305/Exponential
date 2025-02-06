import Lead from "../../models/leadModel.js";
import { getClaudeResponse } from "../claude/getClaudeResponse.js";
import { sendTelegramMessage } from "../telegram/sendTelegramMessage.js";
import axios from "axios";

const getContactPhone = async (contactId) => {
  try {
    // Get contact details directly from contacts endpoint
    const response = await axios.get(
      `https://dev.slicktext.com/v1/brands/${process.env.BRAND_ID}/contacts/${contactId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SLICKTEXT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Get phone number from contact details
    const phoneNumber = response.data.phone_number;  // Format: "+13147507658"
    return phoneNumber;
  } catch (error) {
    console.error("Error getting contact phone:", error);
    throw error;
  }
};

export const handleSlickTextReply = async (webhookData) => {
  try {
    const { data } = webhookData;
    
    // Extract contact ID from webhook data
    const contactId = data.contact_id;
    const message = data.last_message;
    
    if (!contactId || !message) {
      console.error("Missing required webhook data");
      return;
    }

    // Get phone number using messages endpoint
    const phoneNumber = await getContactPhone(contactId);
    const normalizedPhone = phoneNumber.replace(/\D/g, '');

    // Find or create lead
    let lead = await Lead.findOne({ phoneNumber: normalizedPhone });
    if (!lead) {
      console.warn(`No lead found for phone ${normalizedPhone}`);
      return;
    }

    // Add user message to conversation history
    lead.messages.push({ 
      role: "user", 
      content: message,
      timestamp: new Date(data.last_message_sent)
    });
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
