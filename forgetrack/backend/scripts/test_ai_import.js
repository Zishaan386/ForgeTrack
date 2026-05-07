const { GoogleGenerativeAI } = require('@google/generative-ai');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// 1. Setup
const SUPABASE_URL = 'https://lywfynijjbkcgifjkhux.supabase.co';
const SUPABASE_KEY = 'sb_publishable_--4HrjyIrxs93SFXoiCYaQ_P2v-XUYF';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const API_KEY = 'AIzaSyD0Jpk9Cn0zEE8k-boQxIuVFResUkeAsvI';
const genAI = new GoogleGenerativeAI(API_KEY);

async function simulateFlow() {
  console.log("=== STEP 1: READ FILE ===");
  const filePath = 'd:/ForgeTrack/docs/Data Engineering and AI - Actual Program.xlsx';
  const workbook = XLSX.readFile(filePath);
  const sheetName = 'Bootcamp Data';
  const ws = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  let headerIdx = 0;
  while (headerIdx < rawData.length && (!rawData[headerIdx] || rawData[headerIdx].length < 2)) {
    headerIdx++;
  }
  
  const headers = rawData[headerIdx];
  const samples = rawData.slice(headerIdx + 1, headerIdx + 6);
  const processedData = rawData.slice(headerIdx + 1);

  console.log("Found headers:", headers.length);

  console.log("\n=== STEP 2: AI REASONING ===");
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

  let aiMapping;
  try {
    const result = await model.generateContent(prompt);
    const text = await result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    aiMapping = JSON.parse(jsonMatch[0]);
    console.log("AI Mapping successful. Detected sessions:", aiMapping.sessions.length);
  } catch (err) {
    console.error("AI Mapping failed:", err);
    return;
  }

  console.log("\n=== STEP 3: EXECUTE IMPORT (SIMULATION) ===");
  let totalImported = 0;
  let sessionDetails = [];

  try {
    for (const sessionMapping of aiMapping.sessions) {
      const date = sessionMapping.detected_date;
      if (!date) {
        console.log(`Skipping ${sessionMapping.raw_header} due to missing date.`);
        continue;
      }

      console.log(`\nProcessing session: ${sessionMapping.raw_header} (${date})`);

      // Mock database fetch for session
      let session = { id: `mock-session-${date}`, date };

      // Prepare Attendance Records
      const attendanceRecords = processedData.map((row, idx) => {
        const usn = row[aiMapping.mapping.usn_col_index];
        if (!usn) return null;

        const val = String(row[sessionMapping.col_index] || "").toLowerCase();
        const isPresent = aiMapping.indicators.present_values.some(p => val.includes(p.toLowerCase()));
        
        return { usn, isPresent };
      }).filter(Boolean);

      console.log(`  Found ${attendanceRecords.length} records with USNs.`);
      if (attendanceRecords.length === 0) continue;

      // Mock student resolution
      const usns = [...new Set(attendanceRecords.map(r => r.usn))];
      // Simulate that some USNs are found
      const usnToId = {};
      usns.forEach((usn, i) => usnToId[usn] = `student-${i}`);

      const finalAttendance = attendanceRecords.map(r => {
        const studentId = usnToId[r.usn];
        if (!studentId) return null;
        return {
          student_id: studentId,
          session_id: session.id,
          present: r.isPresent,
          marked_by: 'AI Batch Import'
        };
      }).filter(Boolean);

      console.log(`  Final attendance to upsert: ${finalAttendance.length}`);
      
      // We skip actual upsert to not pollute DB, or we can use a try-catch to simulate it.
      if (finalAttendance.length > 0) {
        totalImported += finalAttendance.length;
        sessionDetails.push({ date, topic: sessionMapping.raw_header, count: finalAttendance.length });
      }
    }

    console.log("\n=== STEP 4: RESULTS ===");
    console.log("Total Imported:", totalImported);
    console.log("Details:", sessionDetails);
    console.log("\nSUCCESS: Flow completed without crashing.");

  } catch (err) {
    console.error("CRASH DURING EXECUTE IMPORT:", err);
  }
}

simulateFlow();
