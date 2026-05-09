import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export const AIAgentService = {
  analyzeHeaders: async (headers, samples) => {
    if (!API_KEY || API_KEY === 'your_gemini_api_key_here') {
      throw new Error("Gemini API Key is missing. Please configure VITE_GEMINI_API_KEY in your .env file.");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      You are an expert data engineer. Analyze the following spreadsheet headers and sample data from an attendance sheet.
      
      Headers: ${JSON.stringify(headers)}
      Samples: ${JSON.stringify(samples)}
      
      Tasks:
      1. Identify the column index for "Student Name" or "Candidate Name".
      2. Identify the column index for "USN" or "ID".
      3. Identify columns that represent "Attendance Sessions" (look for dates like DD/MM/YYYY or headers like "Session X").
      4. For each session column, extract the date if present.
      5. Identify the "Present" vs "Absent" indicators (e.g., is "true" present? Is a number a score or attendance?).
      
      Return ONLY a JSON object in this format:
      {
        "mapping": {
          "name_col_index": number,
          "usn_col_index": number,
          "email_col_index": number | null
        },
        "sessions": [
          { "col_index": number, "raw_header": "string", "detected_date": "YYYY-MM-DD" | null }
        ],
        "indicators": {
          "present_values": ["string"],
          "absent_values": ["string"],
          "is_boolean": boolean
        },
        "reasoning": "brief explanation"
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI failed to return valid JSON mapping.");
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error("AIAgent analyzeHeaders error:", err);
      throw err;
    }
  },

  inferDates: async (sessionHeaders, weeklyPattern, startDate) => {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      Given a start date of "${startDate}" and a weekly class pattern of "${weeklyPattern}", project actual dates for the following session headers:
      ${JSON.stringify(sessionHeaders)}
      
      Return ONLY a JSON array of dates in "YYYY-MM-DD" format, matching the order of the session headers.
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const jsonStr = text.replace(/```json|```/g, "").trim();
      return JSON.parse(jsonStr);
    } catch (err) {
      console.error("AIAgent inferDates error:", err);
      throw err;
    }
  }
};
