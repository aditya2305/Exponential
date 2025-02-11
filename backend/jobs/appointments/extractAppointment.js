import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from '../../config/index.js';
import moment from 'moment-timezone';

const client = new Anthropic({
  apiKey: CONFIG.ANTHROPIC.API_KEY
});

export const checkForAppointment = async (conversation, currentDate, timezone) => {
  try {
    const now = moment().tz(timezone);
    
    const prompt = `You are a JSON-only appointment extractor. Analyze the conversation and return ONLY a JSON object.

CONTEXT:
- Current date and time: ${now.format('YYYY-MM-DD HH:mm')}
- Timezone: ${timezone}

RULES:
1. Return ONLY valid JSON - no explanations or other text
2. Use EXACTLY this format:
{
  "hasAppointment": false,
  "appointmentDateTime": "",
  "timeZone": "${timezone}"
}

3. For appointment detection:
   - Look for suggested call times in the messages
   - Common patterns:
     * "will give you a quick call tomorrow at 2 PM"
     * "Does tomorrow at 2 PM work for you?"
     * "next Monday at 2 PM"
     * "December 25th at 2 PM"
     * "let's do 4 PM on the 11th"
     * "2024-12-25 at 2 PM"
     * "can we do the 15th at 3 PM"
   - Convert relative dates to actual dates using current date (${now.format('YYYY-MM-DD')}) as reference:
     * "tomorrow at 2 PM" → next day at 14:00
     * "next Monday at 2 PM" → next Monday at 14:00
     * Just "2 PM" → assume tomorrow at 14:00
     * "December 25th at 2 PM" → 2025-12-25 14:00
     * "4 PM on the 11th" → current/next month 11th at 16:00
     * "2024-12-25 at 2 PM" → 2024-12-25 14:00
   - For dates mentioning only day (e.g., "the 11th", "on the 15th"):
     * If the day has passed this month, use next month
     * If the day hasn't passed, use current month
   - Set hasAppointment=true only when appointment is confirmed from assistant
   - Set hasAppointment to false if only suggesting times without confirmation
   - IMPORTANT: Set appointmentDateTime to the exact date/time string in format "YYYY-MM-DD HH:mm"
   - IMPORTANT: Always set dates to be in the future from today
   - Ignore vague times like "anytime" or "after 4 PM"
   - Use 2025 for the year
   - If a date would be in the past, use the next occurrence of that date

4. Examples (today is ${now.format('YYYY-MM-DD')}):
   Input: "will give you a quick call tomorrow at 2 PM"
   Output: {
     "hasAppointment": true,
     "appointmentDateTime": "${now.clone().add(1, 'day').format('YYYY-MM-DD')} 14:00",
     "timeZone": "${timezone}"
   }

   Input: "let's do 4 PM on the 11th"
   Output: {
     "hasAppointment": true,
     "appointmentDateTime": "${now.date() >= 11 ? now.clone().add(1, 'month').date(11).format('YYYY-MM-DD') : now.clone().date(11).format('YYYY-MM-DD')} 16:00",
     "timeZone": "${timezone}"
   }

   Input: "December 25th at 2 PM works for me"
   Output: {
     "hasAppointment": true,
     "appointmentDateTime": "2025-12-25 14:00",
     "timeZone": "${timezone}"
   }

   Input: "2024-12-25 at 2 PM"
   Output: {
     "hasAppointment": true,
     "appointmentDateTime": "2024-12-25 14:00",
     "timeZone": "${timezone}"
   }

   Input: "can we do the 15th at 3 PM"
   Output: {
     "hasAppointment": true,
     "appointmentDateTime": "${now.date() >= 15 ? now.clone().add(1, 'month').date(15).format('YYYY-MM-DD') : now.clone().date(15).format('YYYY-MM-DD')} 15:00",
     "timeZone": "${timezone}"
   }

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
