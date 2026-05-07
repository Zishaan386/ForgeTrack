import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AIAgentService } from '../services/AIAgentService';
import * as XLSX from 'xlsx';
import { 
  Upload as UploadIcon, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  Layers, 
  Brain, 
  Calendar, 
  History, 
  Sparkles,
  ChevronRight,
  Database,
  X
} from 'lucide-react';
import { format, parse } from 'date-fns';

export const Upload = () => {
  const { profile } = useAuth();
  const fileInputRef = useRef(null);

  // Wizard State
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  
  // AI & Data State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiMapping, setAiMapping] = useState(null);
  const [processedData, setProcessedData] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [results, setResults] = useState(null);

  // Date Inference State
  const [useInference, setUseInference] = useState(false);
  const [weeklyPattern, setWeeklyPattern] = useState('Mon, Wed, Fri');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setWorkbook(wb);
        setSheets(wb.SheetNames);
        setFile(selectedFile);
        if (wb.SheetNames.length === 1) {
          handleSheetSelection(wb.SheetNames[0]);
        } else {
          setStep(2);
        }
        setLoading(false);
      };
      reader.readAsBinaryString(selectedFile);
    } catch (err) {
      setError("Failed to read file. Ensure it's a valid XLSX or CSV.");
      setLoading(false);
    }
  };

  const handleSheetSelection = (sheetName) => {
    setSelectedSheet(sheetName);
    analyzeWithAI(sheetName);
  };

  const analyzeWithAI = async (sheetName) => {
    setLoading(true);
    setStep(3);
    try {
      const ws = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      // Find the header row (sometimes spreadsheets have empty rows at top)
      let headerIdx = 0;
      while (headerIdx < rawData.length && (!rawData[headerIdx] || rawData[headerIdx].length < 2)) {
        headerIdx++;
      }
      
      const headers = rawData[headerIdx];
      const samples = rawData.slice(headerIdx + 1, headerIdx + 6);
      const fullData = rawData.slice(headerIdx + 1);

      const mapping = await AIAgentService.analyzeHeaders(headers, samples);
      setAiMapping({ ...mapping, headers }); // Include headers for manual override dropdowns
      setProcessedData(fullData);
      
      // Check for date inference need
      const missingDates = mapping.sessions.some(s => !s.detected_date);
      if (missingDates) setUseInference(true);

    } catch (err) {
      setError(err.message || "AI Analysis failed. Check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const handleInference = async () => {
    setLoading(true);
    try {
      const sessionHeaders = aiMapping.sessions.map(s => s.raw_header);
      const projectedDates = await AIAgentService.inferDates(sessionHeaders, weeklyPattern, startDate);
      
      const updatedMapping = { ...aiMapping };
      updatedMapping.sessions = updatedMapping.sessions.map((s, i) => ({
        ...s,
        detected_date: projectedDates[i] || s.detected_date
      }));
      
      setAiMapping(updatedMapping);
      setUseInference(false);
      checkConflicts(updatedMapping);
    } catch (err) {
      setError("Inference failed.");
    } finally {
      setLoading(false);
    }
  };

  const checkConflicts = async (mapping) => {
    setLoading(true);
    try {
      const dates = mapping.sessions.map(s => s.detected_date).filter(Boolean);
      if (dates.length === 0) {
        setConflicts([]);
        setStep(4);
        return;
      }
      
      const { data: existing } = await supabase
        .from('sessions')
        .select('date, topic')
        .in('date', dates);
      
      setConflicts(existing || []);
      setStep(4);
    } catch (err) {
      setError("Conflict check failed.");
    } finally {
      setLoading(false);
    }
  };

  const executeImport = async () => {
    if (!aiMapping || !processedData) {
      setError("Data matrix missing. Restarting sequence.");
      setStep(1);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let totalImported = 0;
      let sessionDetails = [];
      
      // Batch process sessions
      for (const sessionMapping of aiMapping.sessions) {
        const date = sessionMapping.detected_date;
        if (!date) continue;

        // 1. Create or Get Session
        let { data: session, error: sGetErr } = await supabase
          .from('sessions')
          .select('id')
          .eq('date', date)
          .maybeSingle();
        
        if (sGetErr) throw new Error(`Database error fetching session for ${date}`);

        if (!session) {
          const { data: newSession, error: sErr } = await supabase
            .from('sessions')
            .insert({ 
              date, 
              topic: sessionMapping.raw_header, 
              month_number: new Date(date).getMonth() + 1 
            })
            .select()
            .single();
          if (sErr) throw new Error(`Failed to create session for ${date}: ${sErr.message}`);
          session = newSession;
        }

        // 2. Prepare Attendance Records
        const attendanceRecords = processedData.map((row, idx) => {
          const usn = row[aiMapping.mapping.usn_col_index];
          if (!usn) return null;

          const val = String(row[sessionMapping.col_index] || "").toLowerCase();
          const isPresent = aiMapping.indicators.present_values.some(p => val.includes(p.toLowerCase()));
          
          return { usn, isPresent };
        }).filter(Boolean);

        if (attendanceRecords.length === 0) continue;

        // 3. Resolve Student IDs (Bulk)
        const usns = [...new Set(attendanceRecords.map(r => r.usn))];
        const { data: students, error: stuErr } = await supabase
          .from('students')
          .select('id, usn')
          .in('usn', usns);
        
        if (stuErr) throw new Error(`Failed to fetch student IDs: ${stuErr.message}`);
        
        const usnToId = Object.fromEntries(students.map(s => [s.usn, s.id]));

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

        if (finalAttendance.length > 0) {
          const { error: attErr } = await supabase
            .from('attendance')
            .upsert(finalAttendance, { onConflict: 'student_id,session_id' });
          
          if (attErr) throw new Error(`Failed to upsert attendance: ${attErr.message}`);
          totalImported += finalAttendance.length;
          sessionDetails.push({ date, topic: sessionMapping.raw_header, count: finalAttendance.length });
        }
      }

      setResults({ total: totalImported, details: sessionDetails });
      setStep(5);
    } catch (err) {
      console.error("ExecuteImport failure:", err);
      setError(err.message || "A catastrophic error occurred during sync.");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };


  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="relative group border-2 border-dashed border-white/5 rounded-[3rem] p-24 bg-white/[0.01] hover:bg-white/[0.02] hover:border-accent-primary/20 transition-all cursor-pointer flex flex-col items-center justify-center text-center shadow-2xl">
              <input type="file" accept=".csv,.xlsx" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileChange} />
              <div className="w-28 h-28 rounded-full bg-accent-primary/10 flex items-center justify-center mb-10 transition-all duration-700 group-hover:scale-110 shadow-[0_0_50px_rgba(215,241,74,0.1)]">
                <UploadIcon className="w-12 h-12 text-accent-primary" />
              </div>
              <h2 className="text-3xl font-display font-medium text-white mb-3">Initialize Archival Stream</h2>
              <p className="text-fg-tertiary font-medium">Stash CSV or XLSX files here to begin sequencing.</p>
              <div className="mt-10 flex gap-4">
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest opacity-40">Excel Ready</div>
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest opacity-40">AI-ML Enabled</div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-accent-primary" />
              </div>
              <h2 className="text-3xl font-display font-medium text-white">Select Working Matrix</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sheets.map(name => (
                <div key={name} onClick={() => handleSheetSelection(name)} className="aura-card p-8 flex items-center justify-between cursor-pointer group hover:bg-white/[0.05] hover:border-accent-primary/20 transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-accent-primary/10 transition-colors">
                      <FileText className="w-6 h-6 text-fg-tertiary group-hover:text-accent-primary" />
                    </div>
                    <span className="text-lg font-bold text-white">{name}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-fg-tertiary opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0" />
                </div>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="flex items-center gap-2 text-xs font-bold text-fg-tertiary uppercase tracking-widest hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Upload
            </button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-accent-primary" />
                </div>
                <h2 className="text-3xl font-display font-medium text-white">AI Reasoning Matrix</h2>
              </div>
              {loading && <div className="flex items-center gap-3 text-accent-primary text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
                <Sparkles className="w-4 h-4" /> Analyzing Headers
              </div>}
            </div>

            {aiMapping && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="aura-card p-10 space-y-8 bg-accent-primary/[0.02]">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-primary">Identified Schema (Manual Override Available)</h3>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-fg-tertiary uppercase tracking-widest">Student Name Column</label>
                      <select 
                        value={aiMapping.mapping.name_col_index}
                        onChange={(e) => setAiMapping({
                          ...aiMapping,
                          mapping: { ...aiMapping.mapping, name_col_index: parseInt(e.target.value) }
                        })}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-accent-primary/40 appearance-none cursor-pointer"
                      >
                        {aiMapping.headers?.map((h, idx) => (
                          <option key={idx} value={idx} className="bg-bg-card-solid">Col {idx + 1}: {h || 'Unnamed'}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-fg-tertiary uppercase tracking-widest">Student USN Column</label>
                      <select 
                        value={aiMapping.mapping.usn_col_index}
                        onChange={(e) => setAiMapping({
                          ...aiMapping,
                          mapping: { ...aiMapping.mapping, usn_col_index: parseInt(e.target.value) }
                        })}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-accent-primary/40 appearance-none cursor-pointer"
                      >
                        {aiMapping.headers?.map((h, idx) => (
                          <option key={idx} value={idx} className="bg-bg-card-solid">Col {idx + 1}: {h || 'Unnamed'}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-primary mb-6">Attendance Indicators</h3>
                    <div className="flex gap-3">
                      {aiMapping.indicators.present_values.map(v => (
                        <span key={v} className="px-4 py-2 rounded-xl bg-success/10 border border-success/20 text-success text-[10px] font-black uppercase tracking-widest">{v}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="aura-card p-10 space-y-8">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-fg-tertiary">Detected Sessions ({aiMapping.sessions.length})</h3>
                  <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {aiMapping.sessions.map((s, i) => (
                      <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{s.raw_header}</span>
                        {s.detected_date ? (
                          <span className="text-[10px] font-black text-accent-primary uppercase tracking-widest">{format(parse(s.detected_date, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')}</span>
                        ) : (
                          <span className="text-[10px] font-black text-warning uppercase tracking-widest">Date Missing</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {useInference && (
              <div className="aura-card p-10 bg-warning/[0.02] border-warning/20 animate-in zoom-in">
                <div className="flex items-center gap-4 mb-8 text-warning">
                  <Calendar className="w-6 h-6" />
                  <h3 className="text-xl font-display font-medium">Inference Required</h3>
                </div>
                <p className="text-sm text-fg-secondary mb-8">Some sessions are missing explicit dates. Provide your weekly pattern to project actual dates.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-fg-tertiary">Class Pattern</label>
                    <input value={weeklyPattern} onChange={e => setWeeklyPattern(e.target.value)} placeholder="e.g. Mon, Wed, Fri" className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:border-accent-primary/40" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-fg-tertiary">Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:border-accent-primary/40" />
                  </div>
                </div>
                <button onClick={handleInference} className="btn-primary w-full h-14 font-bold flex items-center justify-center gap-3">
                  <Brain className="w-5 h-5" /> Project Dates
                </button>
              </div>
            )}

            {!useInference && aiMapping && (
              <button onClick={() => checkConflicts(aiMapping)} className="btn-primary w-full h-16 text-lg font-bold flex items-center justify-center gap-3 shadow-xl shadow-accent-primary/20">
                Continue to Verification <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-accent-primary" />
              </div>
              <h2 className="text-3xl font-display font-medium text-white">Conflict Resolution</h2>
            </div>

            <div className="aura-card p-10 space-y-8">
              <h3 className="text-lg font-display font-medium text-white">Integrity Check Results</h3>
              {conflicts.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-6 rounded-2xl bg-warning/5 border border-warning/20 flex items-center gap-5">
                    <AlertCircle className="w-8 h-8 text-warning" />
                    <div>
                      <div className="text-sm font-bold text-white mb-1">Found {conflicts.length} overlapping sessions.</div>
                      <p className="text-xs text-fg-secondary">Importing will merge new data with existing records for these dates.</p>
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {conflicts.map((c, i) => (
                      <div key={i} className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{format(parseISO(c.date), 'MMM d, yyyy')}</span>
                        <span className="text-xs text-fg-tertiary italic">{c.topic}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-10 text-center bg-success/[0.02] border border-success/10 rounded-[2rem]">
                  <CheckCircle className="w-12 h-12 text-success mx-auto mb-4 opacity-40" />
                  <div className="text-lg font-bold text-success mb-1">Clean Slate</div>
                  <p className="text-sm text-fg-tertiary">No existing sessions found for these dates. Ready for full deployment.</p>
                </div>
              )}
            </div>

            <button onClick={executeImport} disabled={loading} className="btn-primary w-full h-20 text-xl font-bold flex items-center justify-center gap-4 shadow-2xl shadow-accent-primary/20">
              {loading ? <><Loader2 className="w-6 h-6 animate-spin" /> Sequencing Database...</> : <><Sparkles className="w-6 h-6" /> Execute Deployment</>}
            </button>
          </div>
        );

      case 5:
        return (
          <div className="space-y-12 animate-in zoom-in duration-700 text-center py-10">
            <div className="w-32 h-32 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(34,197,94,0.1)]">
              <CheckCircle className="w-16 h-16 text-success" />
            </div>
            <h2 className="text-5xl font-display font-medium text-white mb-2">Ingestion Complete</h2>
            <p className="text-xl text-fg-secondary max-w-xl mx-auto mb-10">Successfully synchronized <span className="text-accent-primary font-bold">{results?.total}</span> attendance records with the ForgeTrack matrix.</p>
            
            {results?.details && results.details.length > 0 && (
              <div className="max-w-2xl mx-auto text-left mb-12 aura-card p-8 bg-white/[0.02]">
                <h3 className="text-sm font-bold text-fg-tertiary uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Session Summary</h3>
                <div className="max-h-[250px] overflow-y-auto space-y-3 custom-scrollbar pr-2">
                  {results.details.map((detail, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <div>
                        <div className="text-[10px] font-black text-accent-primary uppercase tracking-widest mb-1">{format(parseISO(detail.date), 'MMM d, yyyy')}</div>
                        <div className="text-sm font-medium text-white">{detail.topic}</div>
                      </div>
                      <div className="text-2xl font-display font-bold text-success">+{detail.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <button onClick={() => {
                setStep(1);
                setFile(null);
                setWorkbook(null);
                setSheets([]);
                setSelectedSheet('');
                setAiMapping(null);
                setProcessedData([]);
                setConflicts([]);
                setResults(null);
              }} className="btn-primary px-10 h-16 text-lg font-bold flex items-center justify-center gap-3">
                 Start New Sequence
              </button>
              <button onClick={() => window.location.href = '/dashboard'} className="px-10 h-16 rounded-[22px] bg-white/5 border border-white/10 text-lg font-bold text-white hover:bg-white/10 transition-all flex items-center justify-center">
                Return to Dashboard
              </button>
            </div>
          </div>
        );


      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-6xl md:text-7xl font-display font-medium tracking-tight text-white mb-2">
            AI <span className="text-accent-primary">Import</span>
          </h1>
          <p className="text-lg text-fg-secondary font-medium">Neural processing for bulk archival streams.</p>
        </div>
        
        {/* Progress Tracker */}
        <div className="hidden lg:flex items-center gap-4">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`w-3 h-3 rounded-full transition-all duration-500 ${step >= s ? 'bg-accent-primary shadow-[0_0_10px_rgba(215,241,74,0.5)]' : 'bg-white/10'}`}></div>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-6 rounded-[22px] bg-danger/5 border border-danger/20 flex items-center justify-between text-danger animate-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-widest">{error}</span>
          </div>
          <button onClick={() => setError(null)}><X className="w-5 h-5" /></button>
        </div>
      )}

      <div className="min-h-[500px]">
        {renderStep()}
      </div>

      {loading && step !== 3 && step !== 4 && (
        <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center gap-8">
           <div className="w-24 h-24 border-t-2 border-accent-primary rounded-full animate-spin opacity-40"></div>
           <div className="text-xs font-black text-accent-primary uppercase tracking-[0.5em] animate-pulse">Initializing Neural Link...</div>
        </div>
      )}
    </div>
  );
};
