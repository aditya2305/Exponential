import { getClaudeResponse } from "../claude/getClaudeResponse.js";

export const checkForAppointment = async (conversation) => {
  try {
    const prompt = `
You are an AI that extracts appointment info from a conversation.
You must respond with VALID JSON ONLY. No other text before or after.
Use exactly this format:

{
  "hasAppointment": true/false,
  "appointmentDateTime": "<exact date/time string or empty>",
  "timeZone": "<time zone if mentioned (like 'EST' or 'IST') or empty>"
}

Conversation:
${conversation
  .map((m) => `${m.role}: ${m.content}`)
  .join("\n")}

Has the user explicitly scheduled a day/time to talk? Return true if so, false otherwise.
If true, parse the date/time from their message. If the resulting date/time is in the past relative to "now," 
interpret it as the next occurrence in the future. Current year is 2025, the appointmentDateTime you give should have 2025 in it as year. 
If you can't parse it exactly, leave appointmentDateTime empty.
Also, if a time zone is mentioned, put it in "timeZone". If none is mentioned, keep it empty.

Remember: Return ONLY the JSON object, with no additional text.`;

    const extractionResult = await getClaudeResponse([
      { role: "user", content: prompt },
    ]);

    // Add detailed logging of Claude's response
    console.log("=== CLAUDE RESPONSE DEBUG ===");
    console.log("Raw Response:", JSON.stringify(extractionResult, null, 2));
    console.log("Content Type:", typeof extractionResult?.content);
    console.log("Content:", extractionResult?.content);
    if (extractionResult?.content?.[0]) {
      console.log("First Content Item:", extractionResult.content[0]);
      console.log("Text from First Item:", extractionResult.content[0].text);
    }
    console.log("=== END CLAUDE RESPONSE DEBUG ===");

    if (!extractionResult) {
      console.log("No extraction result received from Claude");
      return null;
    }

    const text = extractionResult?.content?.[0]?.text?.trim() || "";
    console.log("Attempting to parse text:", text);
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error("Error parsing JSON from Claude:", err);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("Error checking for appointment:", error);
    return null;
  }
};
