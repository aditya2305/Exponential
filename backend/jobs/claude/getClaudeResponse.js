
import Anthropic from '@anthropic-ai/sdk';
import dotenv from "dotenv";
dotenv.config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export const getClaudeResponse = async (messages) => {
  try {

    const promptIntro = `Someone has submitted a quote for insurance, your goal is to try to book an appointment with them. Speak as if you are talking to them over sms.\n\nConversation so far:\n`;
    
    const conversationText = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const fullPrompt = promptIntro + conversationText;

    const msg = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: fullPrompt }],
    });

    console.log("CLAUDE RESPONSE - ", msg)

    return msg;
  } catch (error) {
    console.error("Error getting response from Claude:", error);
    return "";
  }
};