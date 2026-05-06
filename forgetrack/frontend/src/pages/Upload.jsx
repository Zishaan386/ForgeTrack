import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Papa from 'papaparse';
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, Loader2, ArrowUpRight } from 'lucide-react';

export const Upload = () => {
  const { profile } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [importType, setImportType] = useState('students'); // 'students' or 'attendance'

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    const isCsv = selectedFile && (
      selectedFile.type === 'text/csv' || 
      selectedFile.type === 'application/vnd.ms-excel' || 
      selectedFile.name.toLowerCase().endsWith('.csv')
    );
    if (isCsv) { setFile(selectedFile); setError(null); } 
    else { setError('Invalid format. Please select a CSV file.'); setFile(null); }
  };

  const processCSV = () => {
    if (!file) return;
    setUploading(true); setResults(null); setError(null);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (res) => {
        try {
          if (importType === 'students') await importStudents(res.data);
          else await importAttendance(res.data);
        } catch (err) { setError(err.message || 'Error importing data.'); } 
        finally { setUploading(false); }
      },
      error: (err) => { setError('Parsing failed: ' + err.message); setUploading(false); }
    });
  };

  const importStudents = async (data) => {
    const students = data.map(row => ({
      name: row.name || row.Name,
      usn: (row.usn || row.USN)?.toUpperCase(),
      email: row.email || row.Email,
      branch_code: row.branch_code || row.Branch || 'CSE',
      admission_number: row.admission_number || row.AdmissionNo,
      batch: row.batch || '2024-2028',
      is_active: true
    })).filter(s => s.name && s.usn);
    if (students.length === 0) throw new Error('No valid student records found.');
    const { data: inserted, error: insertError } = await supabase.from('students').upsert(students, { onConflict: 'usn' }).select();
    if (insertError) throw insertError;
    setResults({ type: 'Students', total: data.length, imported: inserted.length, skipped: data.length - inserted.length });
  };

  const importAttendance = async (data) => {
    const dates = [...new Set(data.map(row => row.date || row.Date))].filter(Boolean);
    let totalImported = 0;
    for (const date of dates) {
      let { data: session } = await supabase.from('sessions').select('id').eq('date', date).maybeSingle();
      if (!session) {
        const { data: newSession, error: sessError } = await supabase.from('sessions').insert({ date, topic: 'Imported Session', month_number: new Date(date).getMonth() + 1 }).select().single();
        if (sessError) continue;
        session = newSession;
      }
      const sessionData = data.filter(row => (row.date || row.Date) === date);
      const usns = sessionData.map(row => (row.usn || row.USN)?.toUpperCase());
      const { data: students } = await supabase.from('students').select('id, usn').in('usn', usns);
      const usnToId = Object.fromEntries(students.map(s => [s.usn, s.id]));
      const attendanceRecords = sessionData.map(row => {
        const studentId = usnToId[(row.usn || row.USN)?.toUpperCase()];
        if (!studentId) return null;
        const presentVal = String(row.present || row.Present).toLowerCase();
        return { student_id: studentId, session_id: session.id, present: ['true', '1', 'p', 'present'].includes(presentVal), marked_by: profile?.display_name || 'import' };
      }).filter(Boolean);
      if (attendanceRecords.length > 0) {
        const { data: inserted, error: attError } = await supabase.from('attendance').upsert(attendanceRecords, { onConflict: 'student_id,session_id' }).select();
        if (!attError) totalImported += inserted.length;
      }
    }
    setResults({ type: 'Attendance', total: data.length, imported: totalImported, skipped: data.length - totalImported });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24 animate-in fade-in duration-700">
      <div>
        <h1 className="text-6xl md:text-7xl font-display font-medium tracking-tight text-white mb-2">Import Center</h1>
        <p className="text-lg text-fg-secondary font-medium">Bulk initialize students or attendance logs via CSV.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div onClick={() => setImportType('students')} 
          className={`aura-card p-10 flex flex-col gap-8 cursor-pointer transition-all duration-500 relative overflow-hidden group ${importType === 'students' ? 'border-accent-primary/40 bg-accent-primary/[0.03] ring-1 ring-accent-primary/20 shadow-[0_20px_50px_-10px_rgba(215,241,74,0.15)]' : 'hover:border-white/10'}`}>
          <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all duration-500 ${importType === 'students' ? 'bg-accent-primary text-bg-primary scale-110' : 'bg-white/5 text-fg-tertiary group-hover:bg-white/10'}`}>
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-2xl font-display font-medium text-white mb-2">Member Roster</h3>
            <p className="text-sm text-fg-secondary leading-relaxed">Headers: <span className="font-mono text-[10px] opacity-60">name, usn, email, branch_code</span></p>
          </div>
          <ArrowUpRight className={`absolute bottom-10 right-10 w-5 h-5 transition-all duration-500 ${importType === 'students' ? 'text-accent-primary opacity-100 translate-x-0' : 'text-white/5 opacity-0 translate-x-2'}`} />
        </div>

        <div onClick={() => setImportType('attendance')} 
          className={`aura-card p-10 flex flex-col gap-8 cursor-pointer transition-all duration-500 relative overflow-hidden group ${importType === 'attendance' ? 'border-accent-primary/40 bg-accent-primary/[0.03] ring-1 ring-accent-primary/20 shadow-[0_20px_50px_-10px_rgba(215,241,74,0.15)]' : 'hover:border-white/10'}`}>
          <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all duration-500 ${importType === 'attendance' ? 'bg-accent-primary text-bg-primary scale-110' : 'bg-white/5 text-fg-tertiary group-hover:bg-white/10'}`}>
            <CheckCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-2xl font-display font-medium text-white mb-2">Historical Logs</h3>
            <p className="text-sm text-fg-secondary leading-relaxed">Headers: <span className="font-mono text-[10px] opacity-60">date, usn, present</span></p>
          </div>
          <ArrowUpRight className={`absolute bottom-10 right-10 w-5 h-5 transition-all duration-500 ${importType === 'attendance' ? 'text-accent-primary opacity-100 translate-x-0' : 'text-white/5 opacity-0 translate-x-2'}`} />
        </div>
      </div>

      <div className="aura-card p-12">
        <div className="relative group border-2 border-dashed border-white/5 rounded-[3rem] p-20 bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/10 transition-all cursor-pointer flex flex-col items-center justify-center text-center">
          <input type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileChange} />
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 transition-all duration-700 ${file ? 'bg-accent-primary/10 scale-110 shadow-[0_0_30px_rgba(215,241,74,0.1)]' : 'bg-white/5 opacity-40 group-hover:opacity-100'}`}>
            <UploadIcon className={`w-10 h-10 ${file ? 'text-accent-primary' : 'text-fg-tertiary'}`} />
          </div>
          <div className="text-2xl font-display font-medium text-white mb-2">{file ? file.name : 'Stash CSV here'}</div>
          <p className="text-sm text-fg-tertiary font-medium">Drag-and-drop or click to locate file</p>
        </div>

        {error && (
          <div className="mt-10 p-6 rounded-[22px] bg-danger/5 border border-danger/20 flex items-center gap-4 text-danger animate-in slide-in-from-top-4">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-widest">{error}</span>
          </div>
        )}

        {results && (
          <div className="mt-10 aura-card p-8 bg-success/[0.02] border-success/20 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-4 text-success mb-8">
              <CheckCircle className="w-7 h-7" />
              <span className="text-2xl font-display font-medium">Archiving Complete</span>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: 'Identified', value: results.total, color: 'text-white' },
                { label: 'Imported', value: results.imported, color: 'text-success' },
                { label: 'Skipped', value: results.skipped, color: 'text-warning' },
              ].map((r, i) => (
                <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
                  <div className="text-[10px] font-bold text-fg-tertiary uppercase tracking-[0.2em] mb-2">{r.label}</div>
                  <div className={`text-3xl font-display font-bold ${r.color}`}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={processCSV} disabled={!file || uploading} 
          className={`btn-primary w-full h-16 mt-12 text-lg font-bold flex items-center justify-center gap-3 shadow-xl transition-all ${(!file || uploading) ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95 shadow-accent-primary/20'}`}>
          {uploading ? <><Loader2 className="w-6 h-6 animate-spin" /> Sequencing...</> : <><UploadIcon className="w-5 h-5" /> Execute Upload</>}
        </button>
      </div>
    </div>
  );
};
