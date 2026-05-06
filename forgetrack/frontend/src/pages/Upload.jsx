import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Papa from 'papaparse';
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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

    if (isCsv) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid CSV file.');
      setFile(null);
    }
  };

  const processCSV = () => {
    if (!file) return;

    setUploading(true);
    setResults(null);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          if (importType === 'students') {
            await importStudents(results.data);
          } else {
            await importAttendance(results.data);
          }
        } catch (err) {
          setError(err.message || 'Error importing data.');
        } finally {
          setUploading(false);
        }
      },
      error: (err) => {
        setError('Error parsing CSV: ' + err.message);
        setUploading(false);
      }
    });
  };

  const importStudents = async (data) => {
    console.log('Importing students:', data.length);
    
    // Expected headers: name, usn, email, branch_code, admission_number
    const students = data.map(row => ({
      name: row.name || row.Name,
      usn: (row.usn || row.USN)?.toUpperCase(),
      email: row.email || row.Email,
      branch_code: row.branch_code || row.Branch || 'CSE',
      admission_number: row.admission_number || row.AdmissionNo,
      batch: row.batch || '2024-2028',
      is_active: true
    })).filter(s => s.name && s.usn);

    if (students.length === 0) throw new Error('No valid student records found in CSV.');

    const { data: inserted, error: insertError } = await supabase
      .from('students')
      .upsert(students, { onConflict: 'usn' })
      .select();

    if (insertError) throw insertError;

    setResults({
      type: 'Students',
      total: data.length,
      imported: inserted.length,
      skipped: data.length - inserted.length
    });
  };

  const importAttendance = async (data) => {
    console.log('Importing attendance:', data.length);
    
    // Expected headers: date, usn, present (true/false or 1/0)
    // 1. Group by date to find/create sessions
    const dates = [...new Set(data.map(row => row.date || row.Date))].filter(Boolean);
    
    let totalImported = 0;

    for (const date of dates) {
      // Find or create session
      let { data: session } = await supabase
        .from('sessions')
        .select('id')
        .eq('date', date)
        .maybeSingle();

      if (!session) {
        const { data: newSession, error: sessError } = await supabase
          .from('sessions')
          .insert({ date, topic: 'Imported Session', month_number: new Date(date).getMonth() + 1 })
          .select()
          .single();
        
        if (sessError) continue;
        session = newSession;
      }

      // Prepare attendance records for this date
      const sessionData = data.filter(row => (row.date || row.Date) === date);
      
      // Get student IDs from USNs
      const usns = sessionData.map(row => (row.usn || row.USN)?.toUpperCase());
      const { data: students } = await supabase
        .from('students')
        .select('id, usn')
        .in('usn', usns);

      const usnToId = Object.fromEntries(students.map(s => [s.usn, s.id]));

      const attendanceRecords = sessionData.map(row => {
        const usn = (row.usn || row.USN)?.toUpperCase();
        const studentId = usnToId[usn];
        if (!studentId) return null;

        const presentVal = String(row.present || row.Present).toLowerCase();
        const isPresent = presentVal === 'true' || presentVal === '1' || presentVal === 'p' || presentVal === 'present';

        return {
          student_id: studentId,
          session_id: session.id,
          present: isPresent,
          marked_by: profile?.display_name || 'import'
        };
      }).filter(Boolean);

      if (attendanceRecords.length > 0) {
        const { data: inserted, error: attError } = await supabase
          .from('attendance')
          .upsert(attendanceRecords, { onConflict: 'student_id,session_id' })
          .select();
        
        if (!attError) totalImported += inserted.length;
      }
    }

    setResults({
      type: 'Attendance',
      total: data.length,
      imported: totalImported,
      skipped: data.length - totalImported
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div>
        <h1 className="text-7xl font-display font-medium leading-[1.1] tracking-tighter text-fg-primary mb-4">Upload Data</h1>
        <p className="text-h3 text-fg-tertiary">Bulk import students or attendance records via CSV.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Choose Type */}
        <div className={`premium-card p-8 flex flex-col gap-6 cursor-pointer border-2 transition-all ${importType === 'students' ? 'border-indigo-500 bg-indigo-500/5 shadow-[0_0_30px_rgba(99,102,241,0.1)]' : 'border-white/5 hover:border-white/10'}`} onClick={() => setImportType('students')}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${importType === 'students' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-fg-tertiary'}`}>
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-h3 text-fg-primary mb-1">Import Students</div>
            <p className="text-body-sm text-fg-tertiary">Required headers: name, usn, email, branch_code</p>
          </div>
        </div>

        <div className={`premium-card p-8 flex flex-col gap-6 cursor-pointer border-2 transition-all ${importType === 'attendance' ? 'border-indigo-500 bg-indigo-500/5 shadow-[0_0_30px_rgba(99,102,241,0.1)]' : 'border-white/5 hover:border-white/10'}`} onClick={() => setImportType('attendance')}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${importType === 'attendance' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-fg-tertiary'}`}>
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-h3 text-fg-primary mb-1">Import Attendance</div>
            <p className="text-body-sm text-fg-tertiary">Required headers: date (YYYY-MM-DD), usn, present</p>
          </div>
        </div>
      </div>

      <div className="premium-card p-12">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl p-16 bg-white/[0.01] hover:bg-white/[0.02] transition-colors relative group">
          <input 
            type="file" 
            accept=".csv" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            onChange={handleFileChange}
          />
          <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <UploadIcon className="w-10 h-10 text-indigo-400" />
          </div>
          <div className="text-h3 text-fg-primary mb-2">
            {file ? file.name : 'Select CSV file to upload'}
          </div>
          <div className="text-body-sm text-fg-tertiary">
            Drag and drop or click to browse
          </div>
        </div>

        {error && (
          <div className="mt-8 p-4 rounded-2xl bg-danger-bg border border-danger-border flex items-center gap-3 text-danger-text">
            <AlertCircle className="w-5 h-5" />
            <span className="text-body-sm font-medium">{error}</span>
          </div>
        )}

        {results && (
          <div className="mt-8 p-6 rounded-3xl bg-success-bg border border-success-border space-y-4">
            <div className="flex items-center gap-3 text-success-text">
              <CheckCircle className="w-6 h-6" />
              <span className="text-h3">Import Successful</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/5">
                <div className="text-caption text-fg-tertiary mb-1 uppercase tracking-wider">Total Rows</div>
                <div className="text-h3 text-fg-primary">{results.total}</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5">
                <div className="text-caption text-fg-tertiary mb-1 uppercase tracking-wider">Imported</div>
                <div className="text-h3 text-success-text">{results.imported}</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5">
                <div className="text-caption text-fg-tertiary mb-1 uppercase tracking-wider">Skipped</div>
                <div className="text-h3 text-amber-400">{results.skipped}</div>
              </div>
            </div>
          </div>
        )}

        <button 
          onClick={processCSV}
          disabled={!file || uploading}
          className={`btn-primary w-full h-16 mt-10 text-body font-semibold flex items-center justify-center gap-3 ${(!file || uploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <UploadIcon className="w-5 h-5" />
              Start Import
            </>
          )}
        </button>
      </div>
    </div>
  );
};
