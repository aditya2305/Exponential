import Lead from "../../models/leadModel.js";
import { sendTelegramMessage } from "./sendTelegramMessage.js";
import { getClaudeResponse } from "../claude/getClaudeResponse.js";
import moment from "moment-timezone";
import axios from "axios";
import ChangedResponse from "../../models/changedResponseModel.js";
import mongoose from "mongoose";
import { CONFIG, getTimezoneFromPhoneNumber } from "../../config/index.js";
import { sendSlickTextMessage } from "../slicktext/sendSlickTextMessage.js";
import { processLeadsCsv } from '../csv/csvParser.js';

const { ADMIN_CHAT_ID, API_URL } = CONFIG.TELEGRAM;

// State management 
const pendingMessages = {
  changeMessageId: null,
  instructionMessageId: null,
  changeAdminMessageId: null,

  leadlistActive: false,
  leadlistTimeout: null,
  leadlistInstructionId: null
};

// Update deleteMessage helper to use config
const deleteMessage = async (messageId) => {
  try {
    await axios.post(`${CONFIG.TELEGRAM.API_URL}/deleteMessage`, {
      chat_id: CONFIG.TELEGRAM.ADMIN_CHAT_ID,
      message_id: messageId
    });
  } catch (error) {
    console.error("Error deleting message:", error);
  }
};

// Add helper to cleanup leadlist state
const cleanupLeadlistState = async () => {
  if (pendingMessages.leadlistInstructionId) {
    try {
      await deleteMessage(pendingMessages.leadlistInstructionId);
    } catch (error) {
      console.error("Error deleting leadlist instruction message:", error);
    }
  }
  pendingMessages.leadlistActive = false;
  pendingMessages.leadlistInstructionId = null;
  if (pendingMessages.leadlistTimeout) {
    clearTimeout(pendingMessages.leadlistTimeout);
    pendingMessages.leadlistTimeout = null;
  }
};

export const handleTelegramUpdate = async (update) => {
  try {
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return;
    }

    if (!update.message) return;

    const chatId = update.message.chat.id;
    const text = update.message.text || "";
    const fromBot = update.message.from?.is_bot;
    const userTgUsername = update.message.from?.username || null;
    const replyToMessage = update.message.reply_to_message;

    if (String(chatId) === String(CONFIG.TELEGRAM.ADMIN_CHAT_ID)) {
      if (fromBot) return;
      
      // Handle /leadlist command
      if (text === '/leadlist') {
        // Clean up any existing leadlist state
        await cleanupLeadlistState();
        
        // Set new leadlist state
        pendingMessages.leadlistActive = true;
        
        // Send instruction message
        const instructionMsg = await sendTelegramMessage(
          CONFIG.TELEGRAM.ADMIN_CHAT_ID,
          "Please send the CSV file with columns: name, phoneNumber, zipcode\n\nThis request will expire in 60 seconds."
        );
        
        pendingMessages.leadlistInstructionId = instructionMsg;
        
        // Set timeout to clear the state after 60 seconds
        pendingMessages.leadlistTimeout = setTimeout(async () => {
          if (pendingMessages.leadlistActive) {
            const expiredMsg = await sendTelegramMessage(
              CONFIG.TELEGRAM.ADMIN_CHAT_ID,
              "❌ CSV upload request expired. Please send /leadlist command again."
            );
            
            // Delete expired message after 3 seconds
            setTimeout(() => deleteMessage(expiredMsg), 3000);
            
            await cleanupLeadlistState();
          }
        }, 60000); // 60 seconds
        
        return;
      }

      // Handle CSV file upload
      if (update.message.document) {
        const fileId = update.message.document.file_id;
        const fileName = update.message.document.file_name;
        
        if (fileName.toLowerCase().endsWith('.csv')) {
          // Check if leadlist command is active
          if (!pendingMessages.leadlistActive) {
            const warningMsg = await sendTelegramMessage(
              CONFIG.TELEGRAM.ADMIN_CHAT_ID,
              "⚠️ Please send /leadlist command first before uploading CSV file."
            );
            setTimeout(() => deleteMessage(warningMsg), 2000);
            return;
          }

          try {
            // Get file path from Telegram
            const fileInfo = await axios.get(
              `${CONFIG.TELEGRAM.API_URL}/getFile?file_id=${fileId}`
            );
            
            const filePath = fileInfo.data.result.file_path;
            const fileUrl = `https://api.telegram.org/file/bot${CONFIG.TELEGRAM.BOT_TOKEN}/${filePath}`;
            
            // Download and process CSV
            const response = await axios.get(fileUrl);
            const leads = await processLeadsCsv(response.data);
            
            const successMsg = await sendTelegramMessage(
              CONFIG.TELEGRAM.ADMIN_CHAT_ID,
              `✅ Successfully processed ${leads.length} leads from CSV file`
            );

            setTimeout(() => deleteMessage(successMsg), 5000);

            // Clean up leadlist state after successful processing
            await cleanupLeadlistState();
          } catch (error) {
            console.error("Error processing CSV:", error);
            const errorMsg = await sendTelegramMessage(
              CONFIG.TELEGRAM.ADMIN_CHAT_ID,
              "❌ Error processing CSV file. Please ensure correct format: name, phoneNumber, zipcode"
            );
    
            setTimeout(() => deleteMessage(errorMsg), 10000);
            
            // Clean up state on error too
            await cleanupLeadlistState();
          }
          return;
        }
        else {
          const invalidFileMsg = await sendTelegramMessage(
            CONFIG.TELEGRAM.ADMIN_CHAT_ID,
            "❌ Invalid file type. Please send a CSV file with columns: name, phoneNumber, zipcode"
          );

          setTimeout(() => deleteMessage(invalidFileMsg), 10000);
        }
      }
      
      if (replyToMessage && pendingMessages.changeMessageId) {
        await changeNextPendingMessage(text, replyToMessage.message_id, update.message.message_id);
      } else {
        const warningMsg = await sendTelegramMessage(
          CONFIG.TELEGRAM.ADMIN_CHAT_ID,
          "Direct messages are not accepted in this group."
        );

        setTimeout(() => {
          deleteMessage(update.message.message_id);
          deleteMessage(warningMsg);
        }, 2000);
      }
      return;
    }

    await handleUserMessage(chatId, text, userTgUsername);
  } catch (error) {
    console.error("Error in handleTelegramUpdate:", error);
  }
};

const handleCallbackQuery = async (callbackQuery) => {
  try {
    if (!callbackQuery.data.includes(':')) {
      const action = callbackQuery.data;
      return;
    }

    // Updated to handle both old and new formats
    const parts = callbackQuery.data.split(':');
    const action = parts[0];
    const messageId = parts[1];
    const leadId = parts.length > 2 ? parts[2] : null;

    let messageToHandle;
    
    if (leadId) {
      // New approach - direct lead lookup
      messageToHandle = await Lead.findById(leadId);
    } else {
      // Legacy approach
      messageToHandle = await Lead.findOne({ "messages.messageId": messageId });
    }

    if (!messageToHandle) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "Message not found.");
      return;
    }

    // Check if message has already been acted upon
    const message = messageToHandle.messages.find(m => m.messageId === messageId);
    if (!message) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "Message not found.");
      return;
    }

    // Add check for already processed messages
    if (message.processed) {
      const processedMsg = await sendTelegramMessage(ADMIN_CHAT_ID, "This message has already been processed.");
      setTimeout(() => deleteMessage(processedMsg), 2000);
      return;
    }

    await axios.post(`${API_URL}/answerCallbackQuery`, {
      callback_query_id: callbackQuery.id
    });

    const adminMessageId = callbackQuery.message.message_id;

    // Mark message as processed before taking action
    message.processed = true;
    await messageToHandle.save();

    if (action === 'approve') {
      await approveMessage(messageId, adminMessageId, leadId);
    } else if (action === 'reject') {
      await rejectMessage(messageId, adminMessageId, leadId);
    } else if (action === 'change') {
      pendingMessages.changeMessageId = messageId;
      pendingMessages.changeAdminMessageId = adminMessageId;
      pendingMessages.leadId = leadId; // Add leadId to pending messages
      const instructionMsg = await sendTelegramMessage(
        ADMIN_CHAT_ID,
        "Please reply to the original message with your updated text.",
        { reply_to_message_id: adminMessageId }
      );
      
      pendingMessages.instructionMessageId = instructionMsg;
    }

  } catch (error) {
    console.error("Error handling callback query:", error);
    pendingMessages.changeMessageId = null;
    pendingMessages.instructionMessageId = null;
    pendingMessages.leadId = null;
  }
};

const handleUserMessage = async (chatId, userText, userTgUsername) => {
  try {
    let lead = await Lead.findOne({ telegramUserId: chatId });
    
    const normalizedText = userText.trim().toLowerCase();

    if (normalizedText === "/start") {
      await sendTelegramMessage(chatId, "Hello! Thanks for reaching out.");

      if (!lead) {
        lead = new Lead({ telegramUserId: chatId, username: userTgUsername || null });
        await lead.save(); 
      } else{
        if (lead.username !== userTgUsername) {
          lead.username = userTgUsername || null;
          await lead.save();
        }
      }
      
      return; 
    }

    if (!lead) {
      lead = new Lead({ telegramUserId: chatId, username: userTgUsername || null });
      await lead.save();
    }
    else{
      if (lead.username !== userTgUsername){
        lead.username = userTgUsername || null;
      }
    }

    if (normalizedText === "stop") {
      lead.unsubscribed = true;
      await lead.save();
      await sendTelegramMessage(chatId, "You have unsubscribed. Thank you!");
      return;
    }

    if (userText.trim() === "") {
      // Ignore empty messages
      return;
    }

    lead.messages.push({ 
      role: "user", 
      content: userText,
      approved: true,
      processed: true,
      leadId: lead._id
    });
    await lead.save();
    
    const now = moment();
    const currentDate = now.format("YYYY-MM-DD");
    const currentTimeZone = lead.phoneNumber ? getTimezoneFromPhoneNumber(lead.phoneNumber) : "Asia/Kolkata"; //"America/New_York";

    const claudeReplyObject = await getClaudeResponse(lead.messages, currentDate, currentTimeZone);
    if (!claudeReplyObject) {
      console.error("Claude did not return a reply");
      return;
    }

    const assistantText = claudeReplyObject?.content?.[0]?.text || "[No text returned]";

    // Create assistant message with messageId
    const assistantMessage = {
      messageId: new mongoose.Types.ObjectId().toString(),
      leadId: lead._id,
      role: "assistant",
      content: assistantText,
      approved: false
    };

    lead.messages.push(assistantMessage);
    await lead.save();

    const approvalText = `New message from User (${lead.username ? `Username: ${lead.username},` : ""} ID: ${chatId}):\n"${userText}"\n\nClaude suggests:\n"${assistantText}"`;
    
    const buttons = {
      inline_keyboard: [[
        { text: '✅ Approve', callback_data: `approve:${assistantMessage.messageId}:${lead._id}` },
        { text: '❌ Reject', callback_data: `reject:${assistantMessage.messageId}:${lead._id}` },
        { text: '✏️ Change', callback_data: `change:${assistantMessage.messageId}:${lead._id}` }
      ]]
    };

    await axios.post(`${API_URL}/sendMessage`, {
      chat_id: ADMIN_CHAT_ID,
      text: approvalText,
      reply_markup: buttons
    });

  } catch (error) {
    console.error("Error in handleUserMessage:", error);
    // ... error handling
  }
};

const approveMessage = async (messageId, adminMessageId, leadId = null) => {
  try {
    let lead;
    if (leadId) {
      // New approach - direct lead lookup
      lead = await Lead.findById(leadId);
    } else {
      // Legacy approach
      lead = await Lead.findOne({ "messages.messageId": messageId });
    }
    
    if (!lead) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "Message not found.");
      return;
    }

    const message = lead.messages.find(m => m.messageId === messageId);
    if (!message) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "Message not found.");
      return;
    }

    // Update message with approval
    message.approved = true;
    if(message.leadId != lead._id) message.leadId = lead._id;
    await lead.save();

    // Send via SlickText
    await sendSlickTextMessage(lead.slickTextContactId, message.content);
    // Comment out Telegram send
    // await sendTelegramMessage(lead.telegramUserId, message.content);
    
    // Delete the admin message
    await deleteMessage(adminMessageId);

    const confirmationMsg = await sendTelegramMessage(
      ADMIN_CHAT_ID,
      `✅ Message approved and sent to ${lead.phoneNumber ? `Phone: ${lead.phoneNumber}` : `Contact ID: ${lead.slickTextContactId}`}`
    );

    setTimeout(() => deleteMessage(confirmationMsg), 2000);
  } catch (error) {
    console.error("Error in approveMessage:", error);
    await sendTelegramMessage(ADMIN_CHAT_ID, "Error approving the message.");
  }
};

const rejectMessage = async (messageId, adminMessageId, leadId = null) => {
  try {
    let lead;
    if (leadId) {
      lead = await Lead.findById(leadId);
    } else {
      lead = await Lead.findOne({ "messages.messageId": messageId });
    }

    if (!lead) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "Message not found.");
      return;
    }

    lead.messages = lead.messages.filter(m => m.messageId !== messageId);
    await lead.save();

    await deleteMessage(adminMessageId);

    // // Send rejection notification via SlickText
    // if (lead.slickTextContactId) {
    //   await sendSlickTextMessage(
    //     lead.slickTextContactId,
    //     "I apologize, but I need to revise my previous response. I'll get back to you shortly with a better answer."
    //   );
    // }
    // Comment out Telegram notification
    // await sendTelegramMessage(lead.telegramUserId, "I apologize, but I need to revise my previous response. I'll get back to you shortly with a better answer.");

    // Send and delete confirmation message for admin
    const confirmationMsg = await sendTelegramMessage(
      ADMIN_CHAT_ID,
      `❌ Rejected message for user ${lead.phoneNumber ? `Phone: ${lead.phoneNumber}` : `Contact ID: ${lead.slickTextContactId}`}`
    );

    setTimeout(() => deleteMessage(confirmationMsg), 2000);
  } catch (error) {
    console.error("Error in rejectMessage:", error);
    await sendTelegramMessage(ADMIN_CHAT_ID, "Error rejecting the message.");
  }
};

const changeNextPendingMessage = async (updatedText, replyToMessageId, adminReplyMessageId) => {
  try {
    if (!pendingMessages.changeMessageId) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "No message selected for change. Please click the 'Change' button first.");
      return;
    }

    if (pendingMessages.changeAdminMessageId !== replyToMessageId) {
      const warningMsg = await sendTelegramMessage(ADMIN_CHAT_ID, "Please reply to the original message that needs to be changed.");
      setTimeout(() => {
        deleteMessage(adminReplyMessageId);
        deleteMessage(warningMsg);
      }, 2000);
      return;
    }

    let lead;
    if (pendingMessages.leadId) {
      lead = await Lead.findById(pendingMessages.leadId);
    } else {
      lead = await Lead.findOne({ "messages.messageId": pendingMessages.changeMessageId });
    }

    if (!lead) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "Message not found.");
      pendingMessages.changeMessageId = null;
      pendingMessages.leadId = null;
      return;
    }

    const message = lead.messages.find(m => m.messageId === pendingMessages.changeMessageId);
    if (!message) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "Message not found.");
      pendingMessages.changeMessageId = null;
      pendingMessages.leadId = null;
      return;
    }

    // Store the change in changedResponse collection
    const changedResponse = new ChangedResponse({
      leadId: lead._id,
      originalMessage: lead.messages[lead.messages.indexOf(message) - 1],
      claudeResponse: message,
      changedResponse: {
        messageId: new mongoose.Types.ObjectId().toString(),
        leadId: lead._id,
        role: "assistant",
        content: updatedText,
        approved: true
      }
    });
    await changedResponse.save();

    // Update the message
    message.content = updatedText;
    message.approved = true;
    await lead.save();

    // Send the message to the user via SlickText
    if (lead.slickTextContactId) {
      await sendSlickTextMessage(lead.slickTextContactId, updatedText);
    }
    // Comment out Telegram send
    // await sendTelegramMessage(lead.telegramUserId, updatedText);

    // Delete the original admin message if it exists
    if (pendingMessages.changeAdminMessageId) {
      try {
        await deleteMessage(pendingMessages.changeAdminMessageId);
      } catch (error) {
        console.error("Error deleting original admin message:", error);
      }
      pendingMessages.changeAdminMessageId = null;
    }

    // Delete admin's reply message
    try {
      await deleteMessage(adminReplyMessageId);
    } catch (error) {
      console.error("Error deleting admin's reply message:", error);
    }

    // Send and delete confirmation message
    const confirmationMsg = await sendTelegramMessage(
      ADMIN_CHAT_ID,
      `✏️ Changed and sent updated message to ${lead.phoneNumber ? `Phone: ${lead.phoneNumber}` : `Contact ID: ${lead.slickTextContactId}`}`
    );

    // Delete confirmation message after 2 seconds
    setTimeout(async () => {
      await deleteMessage(confirmationMsg);
    }, 2000);

    // Delete the instruction message if it exists
    if (pendingMessages.instructionMessageId) {
      try {
        await deleteMessage(pendingMessages.instructionMessageId);
      } catch (error) {
        console.error("Error deleting instruction message:", error);
      }
      pendingMessages.instructionMessageId = null;
    }

    pendingMessages.changeMessageId = null;
    pendingMessages.leadId = null;
  } catch (error) {
    console.error("Error in changeNextPendingMessage:", error);
    await sendTelegramMessage(ADMIN_CHAT_ID, "Error changing the message.");
    pendingMessages.changeMessageId = null;
    pendingMessages.changeAdminMessageId = null;
    pendingMessages.instructionMessageId = null;
    pendingMessages.leadId = null;
  }
};

