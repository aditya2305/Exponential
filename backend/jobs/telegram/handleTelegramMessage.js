import Lead from "../../models/leadModel.js";
import { sendTelegramMessage } from "./sendTelegramMessage.js";
import { getClaudeResponse } from "../claude/getClaudeResponse.js";
import dotenv from "dotenv";
dotenv.config();

const ADMIN_CHAT_ID = process.env.ADMIN_TELEGRAM_ID;

export const handleTelegramUpdate = async (update) => {
  try {
    if (!update.message) return;

    const chatId = update.message.chat.id;
    const text = update.message.text || "";

    if (String(chatId) === String(ADMIN_CHAT_ID)) {
      await handleAdminMessage(text);
      return;
    }

    await handleUserMessage(chatId, text);
  } catch (error) {
    console.error("Error in handleTelegramUpdate:", error);
  }
};

const handleUserMessage = async (chatId, userText) => {
  let lead = await Lead.findOne({ telegramUserId: chatId });
  if (!lead) {
    lead = new Lead({ telegramUserId: chatId });
  }

  const normalizedText = userText.trim().toLowerCase();

  if (normalizedText === "/start") {
    return;
  }

  if (normalizedText === "stop") {
    lead.unsubscribed = true;
    await lead.save();
    await sendTelegramMessage(chatId, "You have unsubscribed. Thank you!");
    return;
  }

  lead.messages.push({ role: "user", content: userText });
  await lead.save();

  const claudeReplyObject = await getClaudeResponse(lead.messages);
  if (!claudeReplyObject) {
    console.error("Claude did not return a reply");
    return;
  }

  const assistantText = claudeReplyObject?.content?.[0]?.text || "[No text returned]";

  const approvalText = `New message from User (ID: ${chatId}):\n"${userText}"\n\nClaude suggests:\n"${assistantText}"\n\nReply with "/approve", "/reject", or "/change <your response>" to take action.`;
  await sendTelegramMessage(ADMIN_CHAT_ID, approvalText);

  lead.messages.push({ role: "assistant", content: assistantText, approved: false });
  await lead.save();
};

const handleAdminMessage = async (text) => {
  const parts = text.trim().split(" ");
  const command = parts[0].toLowerCase();
  const newText = parts.slice(1).join(" ");

  if (command === "/approve") {
    await approveNextPendingMessage();
  } else if (command === "/reject") {
    await rejectNextPendingMessage();
  } else if (command === "/change") {
    if (newText.trim() === "") {
      await sendTelegramMessage(ADMIN_CHAT_ID, "Usage: /change <your updated response>");
      return;
    }
    await changeNextPendingMessage(newText);
  } else {
    await sendTelegramMessage(ADMIN_CHAT_ID, `Unknown command: ${command}`);
  }
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
      await sendTelegramMessage(ADMIN_CHAT_ID, `Lead not found for Chat ID: ${lead.telegramUserId}.`);
      return;
    }

    leadToUpdate.messages[msgIndex].approved = true;
    await leadToUpdate.save();

    const userChatId = leadToUpdate.telegramUserId;
    const assistantMessage = leadToUpdate.messages[msgIndex].content;
    await sendTelegramMessage(userChatId, assistantMessage);
    await sendTelegramMessage(ADMIN_CHAT_ID, `Approved and sent message to user (Chat ID: ${userChatId}).`);
  } catch (error) {
    console.error("Error in approveNextPendingMessage:", error);
    await sendTelegramMessage(ADMIN_CHAT_ID, "Error approving the next pending message.");
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
      await sendTelegramMessage(ADMIN_CHAT_ID, `Lead not found for Chat ID: ${lead.telegramUserId}.`);
      return;
    }

    leadToUpdate.messages.splice(msgIndex, 1);
    await leadToUpdate.save();

    const userChatId = leadToUpdate.telegramUserId;
    await sendTelegramMessage(ADMIN_CHAT_ID, `Rejected message for user (Chat ID: ${userChatId}).`);
    await sendTelegramMessage(userChatId, "Your recent message was reviewed and rejected. Please let us know how we can assist you further.");
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

    const leadToUpdate = await Lead.findOne({ telegramUserId: lead.telegramUserId });
    if (!leadToUpdate) {
      await sendTelegramMessage(ADMIN_CHAT_ID, `Lead not found for Chat ID: ${lead.telegramUserId}.`);
      return;
    }

    leadToUpdate.messages[msgIndex].content = updatedText;
    leadToUpdate.messages[msgIndex].approved = true;
    await leadToUpdate.save();

    const userChatId = leadToUpdate.telegramUserId;
    await sendTelegramMessage(userChatId, updatedText);
    await sendTelegramMessage(ADMIN_CHAT_ID, `Changed and sent updated message to user (Chat ID: ${userChatId}).`);
  } catch (error) {
    console.error("Error in changeNextPendingMessage:", error);
    await sendTelegramMessage(ADMIN_CHAT_ID, "Error changing the next pending message.");
  }
};
