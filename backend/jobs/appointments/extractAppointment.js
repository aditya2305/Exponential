import { getClaudeResponse } from "../claude/getClaudeResponse.js";

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
   - Set hasAppointment to true
   - Set appointmentDateTime to the exact date/time string in format "YYYY-MM-DD HH:mm"
   - Set timeZone to the mentioned timezone (like "EST" or "IST") or leave empty
   - Use year 2025 for all dates
   - If date/time is in past, use next occurrence

4. If no clear appointment:
   - Set hasAppointment to false
   - Leave appointmentDateTime empty
   - Leave timeZone empty

CONVERSATION TO ANALYZE:
${conversation.map((m) => `${m.role}: ${m.content}`).join("\n")}

REMEMBER: Return ONLY the JSON object. Any other text will cause an error.`;

    const extractionResult = await getClaudeResponse([
      { role: "user", content: prompt },
    ]);

    // // Debug logging
    // console.log("=== CLAUDE RESPONSE DEBUG ===");
    // console.log("Raw Response:", JSON.stringify(extractionResult, null, 2));

    if (!extractionResult?.content?.[0]?.text) {
      console.log("Invalid Claude response structure");
      return null;
    }

    const text = extractionResult.content[0].text.trim();
    
    // Try to extract JSON if it's wrapped in other text
    let jsonText = text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    // console.log("Attempting to parse JSON:", jsonText);
    
    try {
      const parsed = JSON.parse(jsonText);
      
      // Validate parsed object structure
      if (typeof parsed.hasAppointment !== 'boolean' ||
          typeof parsed.appointmentDateTime !== 'string' ||
          typeof parsed.timeZone !== 'string') {
        console.error("Invalid JSON structure - missing required fields");
        return null;
      }
      
      return parsed;
    } catch (err) {
      console.error("Error parsing JSON from Claude:", err);
      console.error("Invalid JSON text:", jsonText);
      return null;
    }
  } catch (error) {
    console.error("Error checking for appointment:", error);
    return null;
  }
};
