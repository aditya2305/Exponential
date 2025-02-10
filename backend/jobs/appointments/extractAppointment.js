import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from '../../config/index.js';
import moment from 'moment-timezone';

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

3. If you detect a call appointment:
   - Set hasAppointment to true when the assistant confirms a specific call time
   - Set hasAppointment to false if only suggesting times without confirmation
   - Set appointmentDateTime to the exact date/time string in format "YYYY-MM-DD HH:mm"
   - Common patterns to look for:
     * "will give you a quick call tomorrow at 2 PM"
     * "Does tomorrow at 2 PM work for you?"
     * "Confirmed! I'll call you on [date] at [time]"
     * When user says "Confirmed" in response to suggested time
   - For suggested times like "after 4 pm", do NOT set as appointment until confirmed
   - Use year 2025 for all dates
   - IMPORTANT: Always set dates to be in the future from today
   - If a date would be in the past, use the next occurrence of that date

4. For timeZone handling:
   - Extract timezone from phrases like "Timezone America/New_York" or "in EST"
   - Use IANA timezone names (VERY IMPORTANT):
     * For Eastern Time (EST/ET) use "America/New_York"
     * For Central Time (CST/CT) use "America/Chicago"
     * For Indian Time (IST) use "Asia/Kolkata"
   - If timezone is not mentioned, or not able to decode, leave empty

5. If no clear confirmed call appointment:
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
    console.log("=== CLAUDE RESPONSE DEBUG ===");
    console.log("Raw Response:", JSON.stringify(response, null, 2));

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

      // Add date validation
      if (parsed.hasAppointment && parsed.appointmentDateTime) {
        const appointmentDate = moment.tz(parsed.appointmentDateTime, parsed.timeZone || 'America/New_York');
        const now = moment();
        
        if (!appointmentDate.isValid()) {
          console.error("Invalid date/time format:", parsed.appointmentDateTime);
          return {
            hasAppointment: false,
            appointmentDateTime: "",
            timeZone: ""
          };
        }
        
        // Compare using Unix timestamps to avoid timezone issues
        if (appointmentDate.unix() < now.unix()) {
          console.error("Invalid date/time or in past:", parsed.appointmentDateTime);
          return {
            hasAppointment: false,
            appointmentDateTime: "",
            timeZone: ""
          };
        }
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
