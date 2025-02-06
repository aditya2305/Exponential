import Lead from "../../models/leadModel.js";
import { sendTelegramMessage } from "./sendTelegramMessage.js";
import { getClaudeResponse } from "../claude/getClaudeResponse.js";
import moment from "moment-timezone";
import axios from "axios";
import dotenv from "dotenv";
import ChangedResponse from "../../models/changedResponseModel.js";
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

    if (String(chatId) === String(ADMIN_CHAT_ID)) {
      if (fromBot) return;
      
      // Only handle text that starts with /change
      if (text.startsWith('/change ')) {
        const newText = text.slice(8).trim();
        await changeNextPendingMessage(newText);
      } else {
        // Send message for any other text or commands
        await sendTelegramMessage(
          ADMIN_CHAT_ID,
          "Direct messages are not accepted in this group."
        );
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
    const action = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;
    
    // Answer callback query to remove loading state
    await axios.post(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
      callback_query_id: callbackQuery.id
    });

    if (action === 'approve') {
      await approveNextPendingMessage();
    } else if (action === 'reject') {
      await rejectNextPendingMessage();
    } else if (action === 'change') {
      // Send message prompting for new text
      await sendTelegramMessage(
        ADMIN_CHAT_ID,
        "Please send the new message text with /change followed by your message"
      );
    }

    // Remove inline keyboard after action
    await axios.post(`${TELEGRAM_API_URL}/editMessageReplyMarkup`, {
      chat_id: ADMIN_CHAT_ID,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] }
    });

  } catch (error) {
    console.error("Error handling callback query:", error);
  }
};

const handleUserMessage = async (chatId, userText, userTgUsername) => {
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

  const approvalText = `New message from User (${lead.username ? `Username: ${lead.username},` : ""} ID: ${chatId}):\n"${userText}"\n\nClaude suggests:\n"${assistantText}"`;
  
  // Use the updated sendTelegramMessage with options
  await sendTelegramMessage(ADMIN_CHAT_ID, approvalText, { withButtons: true });

  lead.messages.push({ role: "assistant", content: assistantText, approved: false });
  await lead.save();
};

const approveNextPendingMessage = async () => {
  try {
    const lead = await Lead.findOne({
      "messages.role": "assistant",
      "messages.approved": false,
    })
      .sort({ "messages.createdAt": 1 })
      .lean();

    if (!lead) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "No pending assistant messages to approve.");
      return;
    }

    const msgIndex = lead.messages.findIndex(
      (m) => m.role === "assistant" && m.approved === false
    );

    if (msgIndex === -1) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "No pending assistant messages to approve.");
      return;
    }

    const leadToUpdate = await Lead.findOne({ telegramUserId: lead.telegramUserId });
    if (!leadToUpdate) {
      await sendTelegramMessage(ADMIN_CHAT_ID, `Lead not found for ${leadToUpdate.username ? `Username: ${leadToUpdate.username},` : ""} Chat ID: ${lead.telegramUserId}.`);
      return;
    }

    leadToUpdate.messages[msgIndex].approved = true;
    await leadToUpdate.save();

    const userChatId = leadToUpdate.telegramUserId;
    const assistantMessage = leadToUpdate.messages[msgIndex].content;

    // Send message on Telegram
    await sendTelegramMessage(userChatId, assistantMessage);

    await sendTelegramMessage(
      ADMIN_CHAT_ID,
      `Message approved and sent to ${leadToUpdate.username ? `@${leadToUpdate.username}` : `Chat ID: ${userChatId}`}`
    );

    // if (leadToUpdate.phoneNumber) {
    //   // await sendSlickTextMessage(leadToUpdate.phoneNumber, assistantMessage);
    //   // await sendTelegramMessage( ADMIN_CHAT_ID, `Approved and sent SMS to +${leadToUpdate.phoneNumber}`)
    // }
    
  } catch (error) {
    console.error("Error in approveNextPendingMessage:", error);
    await sendTelegramMessage(ADMIN_CHAT_ID, "Error approving the message.");
  }
};

const rejectNextPendingMessage = async () => {
  try {
    const lead = await Lead.findOne({
      "messages.role": "assistant",
      "messages.approved": false,
    })
      .sort({ "messages.createdAt": 1 })
      .lean();

    if (!lead) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "No pending assistant messages to reject.");
      return;
    }

    const msgIndex = lead.messages.findIndex(
      (m) => m.role === "assistant" && m.approved === false
    );

    if (msgIndex === -1) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "No pending assistant messages to reject.");
      return;
    }

    const leadToUpdate = await Lead.findOne({ telegramUserId: lead.telegramUserId });
    if (!leadToUpdate) {
      await sendTelegramMessage(ADMIN_CHAT_ID, `Lead not found for ${leadToUpdate.username ? `Username: ${leadToUpdate.username},` : ""} Chat ID: ${lead.telegramUserId}.`);
      return;
    }

    leadToUpdate.messages.splice(msgIndex, 1);
    await leadToUpdate.save();

    const userChatId = leadToUpdate.telegramUserId;
    await sendTelegramMessage(ADMIN_CHAT_ID, `Rejected message for user ${leadToUpdate.username ? `@${leadToUpdate.username}` : `Chat ID: ${userChatId}`}`);

    // await sendTelegramMessage(
    //   userChatId,
    //   "Your message was reviewed and rejected. Please let us know how we can help further."
    // );
  } catch (error) {
    console.error("Error in rejectNextPendingMessage:", error);
    await sendTelegramMessage(ADMIN_CHAT_ID, "Error rejecting the next pending message.");
  }
};

const changeNextPendingMessage = async (updatedText) => {
  try {
    const lead = await Lead.findOne({
      "messages.role": "assistant",
      "messages.approved": false,
    })
      .sort({ "messages.createdAt": 1 })
      .lean();

    if (!lead) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "No pending assistant messages to change.");
      return;
    }

    const msgIndex = lead.messages.findIndex(
      (m) => m.role === "assistant" && m.approved === false
    );

    if (msgIndex === -1) {
      await sendTelegramMessage(ADMIN_CHAT_ID, "No pending assistant messages to change.");
      return;
    }

    // Create changed response record
    const changedResponse = new ChangedResponse({
      leadId: lead._id,
      originalMessage: lead.messages[msgIndex - 1],    // User's message
      claudeResponse: lead.messages[msgIndex],         // Claude's response
      changedResponse: {                               // Admin's modified response
        role: "assistant",
        content: updatedText,
        approved: true
      }
    });
    await changedResponse.save();

    // Update the lead's message as before
    const leadToUpdate = await Lead.findOne({ telegramUserId: lead.telegramUserId });
    if (!leadToUpdate) {
      await sendTelegramMessage(ADMIN_CHAT_ID, `Lead not found for ${lead.username ? `Username: ${lead.username},` : ""} Chat ID: ${lead.telegramUserId}.`);
      return;
    }

    leadToUpdate.messages[msgIndex].content = updatedText;
    leadToUpdate.messages[msgIndex].approved = true;
    await leadToUpdate.save();

    const userChatId = leadToUpdate.telegramUserId;
    await sendTelegramMessage(userChatId, updatedText);
    await sendTelegramMessage(
      ADMIN_CHAT_ID,
      `Changed and sent updated message to user ${leadToUpdate.username ? `@${leadToUpdate.username}` : `Chat ID: ${userChatId}`}`
    );

    // // Send via SlickText instead of Telegram if phone number exists
    // if (leadToUpdate.phoneNumber) {
    //   await sendSlickTextMessage(leadToUpdate.phoneNumber, updatedText);
    //   await sendTelegramMessage(
    //     ADMIN_CHAT_ID,
    //     `Changed and sent SMS to +${leadToUpdate.phoneNumber}`
    //   );
    // }
    // else{
    //   console.log("Phone number not found for user", leadToUpdate.username, leadToUpdate.telegramUserId);
    // }
  } catch (error) {
    console.error("Error in changeNextPendingMessage:", error);
    await sendTelegramMessage(ADMIN_CHAT_ID, "Error changing the next pending message.");
  }
};
