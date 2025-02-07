import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from '../../config/index.js';

const client = new Anthropic({
  apiKey: CONFIG.ANTHROPIC.API_KEY
});

export const getClaudeResponse = async (messages, currentDate, currentTimeZone) => {
  try {

    const conversationText = "messages=[\n" + messages.map(m => {
      const escapedContent = m.content.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
      return `  {\n    "role": "${m.role}",\n    "content": [\n      {\n        "type": "text",\n        "text": "${escapedContent}"\n      }\n    ]\n  }`;
    }).join(",\n") + "\n]";

    const promptIntro = `Today is ${currentDate} Timezone - (${currentTimeZone}).
    Someone has submitted a quote for insurance and is trying to book an appointment. Your goal is to book an appointment with them. You have today's date and timezone; you can interpret relative dates like tomorrow accordingly. If either of (Today or Timezone) is undefined, make sure you have full details (exact date, time, and timezone) either by extraction or by asking directly if needed. Speak as if you are talking to them over SMS.
    Here is the conversation so far:
    ${conversationText}`;

    const fullPrompt = promptIntro;

    const msg = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: fullPrompt }],
    });

    console.log("GENERATED CLAUDE RESPONSE")

    return msg;
  } catch (error) {
    console.error("Error getting response from Claude:", error);
    return "";
  }
};