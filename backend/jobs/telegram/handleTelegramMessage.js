import Lead from "../../models/leadModel.js";
import { sendTelegramMessage } from "./sendTelegramMessage.js";
import { getClaudeResponse } from "../claude/getClaudeResponse.js";
import moment from "moment-timezone";
import axios from "axios";
import dotenv from "dotenv";
import ChangedResponse from "../../models/changedResponseModel.js";
import mongoose from "mongoose";
// import { sendSlickTextMessage } from "../slicktext/sendSlickTextMessage.js";
dotenv.config();

const ADMIN_CHAT_ID = process.env.ADMIN_TELEGRAM_ID;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

const countryCodeToTimezone = {
  "91": "Asia/Kolkata",
  "1": "America/New_York",
  "44": "Europe/London"
};

const getTimezoneFromPhoneNumber = (phoneNumber) => {
  const digits = phoneNumber.replace(/\D/g, "");
  for (let len = 1; len <= 3; len++) {
    const code = digits.substring(0, len);
    if (countryCodeToTimezone[code]) return countryCodeToTimezone[code];
  }
  return "Asia/Kolkata";
};

let pendingChangeMessageId = null;
let pendingInstructionMessageId = null;
let pendingChangeAdminMessageId = null;

export const handleTelegramUpdate = async (update) => {
  try {
    // Handle callback queries (button clicks)
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

    if (String(chatId) === String(ADMIN_CHAT_ID)) {
      if (fromBot) return;
      
      // Check if this is a reply to a message and we have a pending change
      if (replyToMessage && pendingChangeMessageId) {
        await changeNextPendingMessage(text, replyToMessage.message_id, update.message.message_id);
      } else {
        // Send warning message and delete both messages
        const warningMsg = await sendTelegramMessage(
          ADMIN_CHAT_ID,
          "Direct messages are not accepted in this group."
        );

        // Delete both the user's message and the warning message
        setTimeout(async () => {
          try {
            // Delete user's message
            await axios.post(`${TELEGRAM_API_URL}/deleteMessage`, {
              chat_id: ADMIN_CHAT_ID,
              message_id: update.message.message_id
            });

            // Delete warning message
            await axios.post(`${TELEGRAM_API_URL}/deleteMessage`, {
              chat_id: ADMIN_CHAT_ID,
              message_id: warningMsg
            });
          } catch (error) {
            console.error("Error deleting messages:", error);
          }
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

    const [action, messageId] = callbackQuery.data.split(':');
    const messageToHandle = await Lead.findOne({ 
      "messages.messageId": messageId 
    });

    if (!messageToHandle) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "Message not found.");
      return;
    }

    await axios.post(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
      callback_query_id: callbackQuery.id
    });

    const adminMessageId = callbackQuery.message.message_id;

    if (action === 'approve') {
      await approveMessage(messageId, adminMessageId);
    } else if (action === 'reject') {
      await rejectMessage(messageId, adminMessageId);
    } else if (action === 'change') {
      pendingChangeMessageId = messageId;
      pendingChangeAdminMessageId = adminMessageId;
      const instructionMsg = await sendTelegramMessage(
        ADMIN_CHAT_ID,
        "Please reply to the original message with your updated text.",
        { reply_to_message_id: adminMessageId }
      );
      
      pendingInstructionMessageId = instructionMsg;
    }

  } catch (error) {
    console.error("Error handling callback query:", error);
    pendingChangeMessageId = null;
    pendingInstructionMessageId = null;
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

    lead.messages.push({ role: "user", content: userText });
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
      role: "assistant",
      content: assistantText,
      approved: false
    };

    lead.messages.push(assistantMessage);
    await lead.save();

    const approvalText = `New message from User (${lead.username ? `Username: ${lead.username},` : ""} ID: ${chatId}):\n"${userText}"\n\nClaude suggests:\n"${assistantText}"`;
    
    const buttons = {
      inline_keyboard: [[
        { text: '✅ Approve', callback_data: `approve:${assistantMessage.messageId}` },
        { text: '❌ Reject', callback_data: `reject:${assistantMessage.messageId}` },
        { text: '✏️ Change', callback_data: `change:${assistantMessage.messageId}` }
      ]]
    };

    await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
      chat_id: ADMIN_CHAT_ID,
      text: approvalText,
      reply_markup: buttons
    });

  } catch (error) {
    console.error("Error in handleUserMessage:", error);
    // ... error handling
  }
};

const approveMessage = async (messageId, adminMessageId) => {
  try {
    const lead = await Lead.findOne({ "messages.messageId": messageId });
    if (!lead) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "Message not found.");
      return;
    }

    const message = lead.messages.find(m => m.messageId === messageId);
    if (!message) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "Message not found.");
      return;
    }

    message.approved = true;
    await lead.save();

    await sendTelegramMessage(lead.telegramUserId, message.content);
    
    // Delete the admin message
    await axios.post(`${TELEGRAM_API_URL}/deleteMessage`, {
      chat_id: ADMIN_CHAT_ID,
      message_id: adminMessageId
    });

    // Send and delete confirmation message
    const confirmationMsg = await sendTelegramMessage(
      ADMIN_CHAT_ID,
      `✅ Message approved and sent to ${lead.username ? `@${lead.username}` : `Chat ID: ${lead.telegramUserId}`}`
    );

    // Delete confirmation message after 2 seconds
    setTimeout(async () => {
      try {
        await axios.post(`${TELEGRAM_API_URL}/deleteMessage`, {
          chat_id: ADMIN_CHAT_ID,
          message_id: confirmationMsg
        });
      } catch (error) {
        console.error("Error deleting confirmation message:", error);
      }
    }, 2000);

  } catch (error) {
    console.error("Error in approveMessage:", error);
    await sendTelegramMessage(ADMIN_CHAT_ID, "Error approving the message.");
  }
};

const rejectMessage = async (messageId, adminMessageId) => {
  try {
    const lead = await Lead.findOne({ "messages.messageId": messageId });
    if (!lead) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "Message not found.");
      return;
    }

    lead.messages = lead.messages.filter(m => m.messageId !== messageId);
    await lead.save();

    // Delete the admin message
    await axios.post(`${TELEGRAM_API_URL}/deleteMessage`, {
      chat_id: ADMIN_CHAT_ID,
      message_id: adminMessageId
    });

    // Send and delete confirmation message
    const confirmationMsg = await sendTelegramMessage(
      ADMIN_CHAT_ID,
      `❌ Rejected message for user ${lead.username ? `@${lead.username}` : `Chat ID: ${lead.telegramUserId}`}`
    );

    // Delete confirmation message after 2 seconds
    setTimeout(async () => {
      try {
        await axios.post(`${TELEGRAM_API_URL}/deleteMessage`, {
          chat_id: ADMIN_CHAT_ID,
          message_id: confirmationMsg
        });
      } catch (error) {
        console.error("Error deleting confirmation message:", error);
      }
    }, 2000);

  } catch (error) {
    console.error("Error in rejectMessage:", error);
    await sendTelegramMessage(ADMIN_CHAT_ID, "Error rejecting the message.");
  }
};

const changeNextPendingMessage = async (updatedText, replyToMessageId, adminReplyMessageId) => {
  try {
    if (!pendingChangeMessageId) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "No message selected for change. Please click the 'Change' button first.");
      return;
    }

    if (pendingChangeAdminMessageId !== replyToMessageId) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "Please reply to the original message that needs to be changed.");
      return;
    }

    const lead = await Lead.findOne({ "messages.messageId": pendingChangeMessageId });
    if (!lead) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "Message not found.");
      pendingChangeMessageId = null;
      return;
    }

    const message = lead.messages.find(m => m.messageId === pendingChangeMessageId);
    if (!message) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "Message not found.");
      pendingChangeMessageId = null;
      return;
    }

    // Store the change in changedResponse collection
    const changedResponse = new ChangedResponse({
      leadId: lead._id,
      originalMessage: lead.messages[lead.messages.indexOf(message) - 1],
      claudeResponse: message,
      changedResponse: {
        messageId: new mongoose.Types.ObjectId().toString(),
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

    // Send the message to the user first
    await sendTelegramMessage(lead.telegramUserId, updatedText);

    // Delete the original admin message if it exists
    if (pendingChangeAdminMessageId) {
      try {
        await axios.post(`${TELEGRAM_API_URL}/deleteMessage`, {
          chat_id: ADMIN_CHAT_ID,
          message_id: pendingChangeAdminMessageId
        });
      } catch (error) {
        console.error("Error deleting original admin message:", error);
      }
      pendingChangeAdminMessageId = null;
    }

    // Delete admin's reply message
    try {
      await axios.post(`${TELEGRAM_API_URL}/deleteMessage`, {
        chat_id: ADMIN_CHAT_ID,
        message_id: adminReplyMessageId
      });
    } catch (error) {
      console.error("Error deleting admin's reply message:", error);
    }

    // Send and delete confirmation message
    const confirmationMsg = await sendTelegramMessage(
      ADMIN_CHAT_ID,
      `✏️ Changed and sent updated message to user ${lead.username ? `@${lead.username}` : `Chat ID: ${lead.telegramUserId}`}`
    );

    // Delete confirmation message after 2 seconds
    setTimeout(async () => {
      try {
        await axios.post(`${TELEGRAM_API_URL}/deleteMessage`, {
          chat_id: ADMIN_CHAT_ID,
          message_id: confirmationMsg
        });
      } catch (error) {
        console.error("Error deleting confirmation message:", error);
      }
    }, 2000);

    // Delete the instruction message if it exists
    if (pendingInstructionMessageId) {
      try {
        await axios.post(`${TELEGRAM_API_URL}/deleteMessage`, {
          chat_id: ADMIN_CHAT_ID,
          message_id: pendingInstructionMessageId
        });
      } catch (error) {
        console.error("Error deleting instruction message:", error);
      }
      pendingInstructionMessageId = null;
    }

    pendingChangeMessageId = null;
  } catch (error) {
    console.error("Error in changeNextPendingMessage:", error);
    await sendTelegramMessage(ADMIN_CHAT_ID, "Error changing the message.");
    pendingChangeMessageId = null;
    pendingChangeAdminMessageId = null;
    pendingInstructionMessageId = null;
  }
};
