import { CONFIG } from '../../config/index.js';
import Anthropic from '@anthropic-ai/sdk';
import Lead from '../../models/leadModel.js';

const client = new Anthropic({
  apiKey: CONFIG.ANTHROPIC.API_KEY
});

export const checkLeadInterest = async (approvedMessages) => {
  try {
    
    const conversationText = "messages=[\n" + approvedMessages.map(m => {
      const escapedContent = m.content.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
      return `  {\n    "role": "${m.role}",\n    "content": [\n      {\n        "type": "text",\n        "text": "${escapedContent}"\n      }\n    ],\n    "timestamp": "${m.createdAt}"\n  }`;
    }).join(",\n") + "\n]";

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: "You are a JSON-only response bot. Never include explanatory text.",
      messages: [{
        role: "user",
        content: `Analyze this conversation and determine if the user expressed explicit disinterest. Return ONLY a JSON object.

RULES:
1. Give priority to the most recent messages (check timestamps)
2. Default to assuming interest UNLESS there are clear signs of disinterest
3. Look for explicit disinterest indicators like:
   - Clear "no" responses
   - Statements like "not interested", "don't contact me"
   - Requests to stop communication
   - Explicit rejection of the service
4. Ignore:
   - Vague or non-committal responses (these should not count as disinterest)
   - Neutral responses (these should not count as disinterest)
   
CONVERSATION TO ANALYZE:
${conversationText}

Return ONLY this JSON structure:
{
  "interested": boolean,
}

NOTE: Return "interested": false ONLY if there is clear, explicit disinterest. Otherwise, return "interested": true.
REMEMBER: Return ONLY the JSON object. Any other text will cause an error.`
      }]
    });

    const result = JSON.parse(response.content[0].text);
    return result;
  } catch (error) {
    console.error("Error checking lead interest:", error);
    return { interested: false, lastUserMessage: null, confidence: 0 };
  }
}; 