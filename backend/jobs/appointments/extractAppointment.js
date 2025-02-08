import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from '../../config/index.js';

const client = new Anthropic({
  apiKey: CONFIG.ANTHROPIC.API_KEY
});

export const checkForAppointment = async (conversation) => {
  try {
    const prompt = `You are a JSON-only appointment extractor. Your task is to analyze the conversation and return ONLY a JSON object.

RULES:
1. Return ONLY valid JSON - no explanations, no questions, no other text
2. Use EXACTLY this format:
{
  "hasAppointment": false,
  "appointmentDateTime": "",
  "timeZone": ""
}

3. If you detect an appointment:
   - Set hasAppointment to true ONLY if the assistant has explicitly confirmed or booked the appointment
   - Do NOT set hasAppointment true if the conversation is still ongoing without assistant's confirmation
   - Set appointmentDateTime to the exact date/time string in format "YYYY-MM-DD HH:mm"
   - For timeZone, use IANA timezone names:
     * For Eastern Time (EST/ET) use "America/New_York"
     * For Central Time (CST/CT) use "America/Chicago"
     * For Indian Time (IST) use "Asia/Kolkata"
     * If timezone is not mentioned or some unknown code not mentioned above, leave empty
   - Use year 2025 for all dates
   - If date/time is in past, use next occurrence

4. If no clear appointment or pending confirmation:
   - Set hasAppointment to false
   - Leave appointmentDateTime empty
   - Leave timeZone empty

CONVERSATION TO ANALYZE:
${conversation.map((m) => `${m.role}: ${m.content}`).join("\n")}

REMEMBER: Return ONLY the JSON object. Any other text will cause an error.`;

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: "You are a JSON-only response bot. Never include explanatory text.",
      messages: [
        { role: "user", content: prompt }
      ],
    });

    // // Debug logging
    // console.log("=== CLAUDE RESPONSE DEBUG ===");
    // console.log("Raw Response:", JSON.stringify(response, null, 2));

    if (!response?.content?.[0]?.text) {
      console.log("Invalid Claude response structure");
      return {
        hasAppointment: false,
        appointmentDateTime: "",
        timeZone: ""
      };
    }

    const text = response.content[0].text.trim();
    
    // Try to extract JSON if it's wrapped in other text
    let jsonText = text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonText);

      console.log("Parsed JSON:", parsed);
      
      // Validate parsed object structure
      if (typeof parsed.hasAppointment !== 'boolean' ||
          typeof parsed.appointmentDateTime !== 'string' ||
          typeof parsed.timeZone !== 'string') {
        console.error("Invalid JSON structure - missing required fields");
        return {
          hasAppointment: false,
          appointmentDateTime: "",
          timeZone: ""
        };
      }
      
      return parsed;
    } catch (err) {
      console.error("Error parsing JSON from Claude:", err);
      console.error("Invalid JSON text:", jsonText);
      return {
        hasAppointment: false,
        appointmentDateTime: "",
        timeZone: ""
      };
    }
  } catch (error) {
    console.error("Error checking for appointment:", error);
    return null;
  }
};
