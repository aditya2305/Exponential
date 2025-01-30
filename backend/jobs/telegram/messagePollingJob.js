import { getNewUpdates } from './sendTelegramMessage';
import Lead from '../../models/leadModel';
import { getClaudeResponse } from '../claudeService';

let lastUpdateId = 0;

const processUserMessage = async (message) => {
  const lead = await Lead.findOne({ telegramUserId: message.chat.id.toString() });
  
  // Add user message
  lead.messages.push({
    role: 'user',
    content: message.text,
    status: 'pending'
  });
  
  // Get Claude response
  const claudeResponse = await getClaudeResponse(lead.messages);
  
  // Add pending response
  lead.messages.push({
    role: 'assistant',
    content: claudeResponse,
    status: 'needs_review'
  });
  
  await lead.save();
  
  // Notify admin
  await sendTelegramMessage(
    process.env.ADMIN_TELEGRAM_ID,
    `REVIEW NEEDED (${lead._id}):\nUser: ${message.text}\nAI: ${claudeResponse}\n\nApprove with /approve ${lead.messages.slice(-1)[0]._id}`
  );
};

export const checkMessagesJob = async () => {
  try {
    const updates = await getNewUpdates(lastUpdateId + 1);
    
    for (const update of updates) {
      if (update.message) {
        await processUserMessage(update.message);
        lastUpdateId = update.update_id;
      }
    }
  } catch (error) {
    console.error("Polling job error:", error);
  }
};