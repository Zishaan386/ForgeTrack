import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from '../contexts/AuthContext';

export const Attendance = () => {
  const { profile } = useAuth();
  const [date, setDate] = useState(new Date());
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // { student_id: boolean }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingCount, setExistingCount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  // New session form
  const [newTopic, setNewTopic] = useState('');
  const [newDuration, setNewDuration] = useState('2.0');
  const [newType, setNewType] = useState('offline');

  const PROGRAM_START = new Date('2025-08-04');

  useEffect(() => {
    fetchData(date);
  }, [date]);

  const fetchData = async (selectedDate) => {
    setLoading(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    try {
      // 1. Fetch all active students
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      setStudents(studentsData || []);

      // 2. Fetch session for date
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .eq('date', dateStr)
        .single();
        
      setSession(sessionData || null);

      if (sessionData && studentsData) {
        // 3. Fetch existing attendance
        const { data: attData } = await supabase
          .from('attendance')
          .select('*')
          .eq('session_id', sessionData.id);
          
        const attMap = {};
        attData?.forEach(a => {
          attMap[a.student_id] = a.present;
        });
        
        setExistingCount(attData?.length || 0);
        
        // Initialize all students as present by default if no existing records
        if (!attData || attData.length === 0) {
          studentsData.forEach(s => { attMap[s.id] = true; });
        } else {
          // If a student doesn't have a record, default to present
          studentsData.forEach(s => { 
            if (attMap[s.id] === undefined) attMap[s.id] = true; 
          });
        }
        setAttendance(attMap);
      } else if (studentsData) {
        // Initialize all to present for a new session
        const attMap = {};
        studentsData.forEach(s => { attMap[s.id] = true; });
        setAttendance(attMap);
        setExistingCount(0);
      }

    } catch (err) {
      if (err.code !== 'PGRST116') { // not found is okay for session
        console.error('Error fetching data:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          date: format(date, 'yyyy-MM-dd'),
          topic: newTopic,
          duration_hours: parseFloat(newDuration),
          session_type: newType,
          month_number: 4 // Hardcoded to 4 for demo, realistically calculate based on date
        })
        .select()
        .single();

      if (error) throw error;
      setSession(data);
      setNewTopic('');
    } catch (err) {
      console.error('Error creating session:', err);
      alert('Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = (present) => {
    const newAtt = {};
    students.forEach(s => { newAtt[s.id] = present; });
    setAttendance(newAtt);
  };

  const toggleStudent = (id) => {
    setAttendance(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveClick = () => {
    if (existingCount > 0) {
      setShowConfirm(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    setSaving(true);
    setShowConfirm(false);
    try {
      const records = students.map(s => ({
        student_id: s.id,
        session_id: session.id,
        present: attendance[s.id],
        marked_by: profile?.display_name || 'Mentor'
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'student_id,session_id' });

      if (error) throw error;
      
      // Update existing count
      setExistingCount(records.length);
      alert('Attendance saved successfully!');
    } catch (err) {
      console.error('Error saving attendance:', err);
      alert('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="mb-10">
          <h1 className="text-7xl font-display font-medium leading-[1.1] tracking-tighter text-fg-primary mb-4">Mark Attendance</h1>
          <p className="text-h3 text-fg-tertiary">Select a date and manage session records.</p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[240px] justify-start text-left font-normal bg-surface border-border-default h-11"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-surface border-border-default" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              disabled={(d) => isAfter(d, new Date()) || isBefore(d, PROGRAM_START)}
              initialFocus
              className="text-fg-primary"
            />
          </PopoverContent>
        </Popover>
      </div>

      {!loading && !session && (
        <div className="card max-w-2xl">
          <h2 className="text-h3 mb-4">No Session Scheduled</h2>
          <p className="text-body-sm text-fg-secondary mb-6">There is no session logged for {format(date, 'MMMM d, yyyy')}. Create one to mark attendance.</p>
          <form onSubmit={handleCreateSession} className="space-y-4">
            <div>
              <label className="block text-label text-fg-secondary mb-2">TOPIC</label>
              <input 
                type="text" 
                className="input w-full" 
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                placeholder="e.g. Agentic UI Integration" 
                required 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-label text-fg-secondary mb-2">DURATION (HOURS)</label>
                <input 
                  type="number" 
                  step="0.5" 
                  className="input w-full" 
                  value={newDuration}
                  onChange={e => setNewDuration(e.target.value)}
                  required 
                />
              </div>
              <div>
                <label className="block text-label text-fg-secondary mb-2">TYPE</label>
                <select 
                  className="input w-full appearance-none bg-surface"
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                >
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary">Create Session</button>
          </form>
        </div>
      )}

      {!loading && session && (
        <div className="card space-y-6">
          <div className="flex items-center justify-between pb-6 border-b border-border-subtle">
            <div>
              <div className="text-label text-fg-tertiary mb-1">SESSION TOPIC</div>
              <h2 className="text-h2 text-fg-primary">{session.topic}</h2>
            </div>
            <div className="flex gap-3">
              <button onClick={() => toggleAll(true)} className="pill bg-surface border border-border-default hover:bg-surface-raised transition-colors text-fg-primary cursor-pointer">Select All Present</button>
              <button onClick={() => toggleAll(false)} className="pill bg-surface border border-border-default hover:bg-surface-raised transition-colors text-fg-primary cursor-pointer">Select All Absent</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {students.map(s => {
              const isPresent = attendance[s.id];
              return (
                <div 
                  key={s.id} 
                  onClick={() => toggleStudent(s.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                    isPresent 
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]' 
                      : 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_15px_-5px_rgba(244,63,94,0.3)]'
                  }`}
                >
                  <div>
                    <div className={`text-body font-bold ${isPresent ? 'text-emerald-400' : 'text-rose-400'}`}>{s.name}</div>
                    <div className="text-caption text-fg-tertiary font-mono">{s.usn}</div>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border-2 ${
                    isPresent ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-rose-500 border-rose-400 text-white'
                  }`}>
                    {isPresent ? 'P' : 'A'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-border-subtle flex justify-end">
            <button 
              onClick={handleSaveClick} 
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-surface border-border-default text-fg-primary">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger-fg">
              <AlertTriangle className="w-5 h-5" />
              Overwrite Attendance?
            </DialogTitle>
            <DialogDescription className="text-fg-secondary pt-2">
              Attendance records already exist for this session. Saving will overwrite the previous entries. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" className="bg-surface-raised border-border-subtle" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button className="bg-danger-fg text-white hover:bg-danger-fg/90" onClick={executeSave}>
              Yes, Overwrite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
