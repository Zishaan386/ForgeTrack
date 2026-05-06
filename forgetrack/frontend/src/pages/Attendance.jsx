import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Save, AlertTriangle, ArrowLeft, BookOpen, Clock, Layout, Trash2, ChevronLeft, ChevronRight, Activity, Zap } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
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
  const [sessions, setSessions] = useState([]);
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
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [allSessions, setAllSessions] = useState([]);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  const PROGRAM_START = new Date('2025-08-04');

  useEffect(() => {
    fetchData(date);
    fetchAllSessions();
  }, [date]);

  const fetchAllSessions = async () => {
    const { data } = await supabase.from('sessions').select('date, topic, session_type');
    setAllSessions(data || []);
  };

  useEffect(() => {
    if (session && students.length > 0) {
      fetchAttendance(session.id);
    }
  }, [session?.id, students.length]);

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

      // 2. Fetch ALL sessions for date
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('*')
        .eq('date', dateStr)
        .order('created_at', { ascending: true });
        
      setSessions(sessionsData || []);
      
      // If we already have a session selected, keep it if it still exists in the new data
      if (session) {
        const stillExists = sessionsData?.find(s => s.id === session.id);
        if (!stillExists) setSession(null);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (sessionId) => {
    try {
      const { data: attData } = await supabase
        .from('attendance')
        .select('*')
        .eq('session_id', sessionId);
        
      const attMap = {};
      attData?.forEach(a => {
        attMap[a.student_id] = a.present;
      });
      
      setExistingCount(attData?.length || 0);
      
      // Initialize student attendance map
      const newAttMap = { ...attMap };
      students.forEach(s => {
        if (newAttMap[s.id] === undefined) {
          newAttMap[s.id] = true; // Default to present
        }
      });
      setAttendance(newAttMap);
    } catch (err) {
      console.error('Error fetching attendance:', err);
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
      setSessions(prev => [...prev, data]);
      setSession(data);
      setNewTopic('');
    } catch (err) {
      console.error('Error creating session:', err);
      alert(`Failed to create session: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm('Are you sure you want to delete this session and all its attendance records? This action cannot be undone.')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (session?.id === sessionId) setSession(null);
      
    } catch (err) {
      console.error('Error deleting session:', err);
      alert('Failed to delete session');
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

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowCalendarModal(true)}
            className="h-11 bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all gap-2"
          >
            <CalendarIcon className="w-4 h-4" />
            Full Calendar
          </Button>

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
      </div>

      {/* Futuristic Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowCalendarModal(false)}></div>
          
          <div className="relative w-full max-w-4xl bg-gradient-to-br from-[#0a0a0c] via-[#0d0d12] to-[#110f1a] border border-white/10 rounded-[2rem] shadow-[0_0_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
            {/* Animated Glow Elements */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-600/10 blur-[100px] rounded-full"></div>
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-cyan-600/10 blur-[100px] rounded-full"></div>
            
            {/* Header */}
            <div className="relative p-8 flex items-center justify-between border-b border-white/5">
              <div>
                <h2 className="text-3xl font-display font-medium tracking-tighter text-white mb-0.5">
                  {format(currentCalendarMonth, 'MMMM yyyy')}
                </h2>
                <div className="text-[9px] font-bold tracking-[0.25em] text-purple-400 uppercase">Interactive Roadmap</div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setCurrentCalendarMonth(subMonths(currentCalendarMonth, 1))}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setCurrentCalendarMonth(addMonths(currentCalendarMonth, 1))}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowCalendarModal(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-rose-500/20 hover:text-rose-400 transition-all ml-2"
                >
                  <Layout className="w-4 h-4 rotate-45" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-8">
              {/* Weekday Labels */}
              <div className="grid grid-cols-7 gap-3 mb-6">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="flex justify-center">
                    <span className="text-[10px] font-bold text-fg-tertiary uppercase tracking-widest opacity-40">
                      {day}
                    </span>
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-3">
                {(() => {
                  const monthStart = startOfMonth(currentCalendarMonth);
                  const monthEnd = endOfMonth(monthStart);
                  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
                  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
                  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

                  return days.map(day => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, new Date());
                    const isSelected = isSameDay(day, date);
                    const daySessions = allSessions.filter(s => isSameDay(parseISO(s.date), day));
                    const hasSessions = daySessions.length > 0;

                    return (
                      <div 
                        key={day.toString()}
                        onClick={() => {
                          setDate(day);
                          setShowCalendarModal(false);
                        }}
                        className={`relative min-h-[90px] rounded-xl cursor-pointer transition-all duration-300 flex flex-col p-3 group ${
                          !isCurrentMonth ? 'opacity-10 grayscale pointer-events-none' : 'opacity-100'
                        } ${
                          hasSessions 
                            ? 'bg-purple-500/5 border border-purple-500/20 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]' 
                            : 'bg-white/[0.01] border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/5'
                        } ${
                          isSelected ? 'border-cyan-500/50 bg-cyan-500/5 ring-1 ring-cyan-500/20' : ''
                        } ${
                          isToday ? 'ring-1 ring-purple-500/50 ring-offset-2 ring-offset-[#0a0a0c]' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-base font-display font-medium ${hasSessions ? 'text-purple-400' : 'text-fg-tertiary'}`}>
                            {format(day, 'd')}
                          </span>
                          {isSelected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></div>
                          )}
                        </div>

                        {/* Session Topics */}
                        <div className="flex flex-col gap-1 overflow-hidden">
                          {daySessions.slice(0, 2).map((s, i) => (
                            <div key={i} className="text-[11px] leading-tight text-fg-primary truncate group-hover:text-purple-300 transition-colors font-medium">
                              {s.topic}
                            </div>
                          ))}
                          {daySessions.length > 2 && (
                            <div className="text-[8px] text-purple-400 font-bold uppercase tracking-tighter mt-0.5">
                              + {daySessions.length - 2} more
                            </div>
                          )}
                        </div>

                        {/* Visual Flourish */}
                        {hasSessions && day.getDate() % 10 === 0 && (
                          <Activity className="w-3 h-3 text-purple-400/10 absolute bottom-2 right-2" />
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Footer / Legend */}
            <div className="p-6 bg-white/[0.01] border-t border-white/5 flex items-center justify-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/40"></div>
                <span className="text-[10px] font-bold text-fg-tertiary uppercase tracking-widest">Scheduled Session</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                <span className="text-[10px] font-bold text-fg-tertiary uppercase tracking-widest">Selected Date</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded ring-1 ring-purple-500 ring-offset-2 ring-offset-transparent"></div>
                <span className="text-[10px] font-bold text-fg-tertiary uppercase tracking-widest">Current Day</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !session && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left: Initialize Session Form */}
          <div className="premium-card p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                <BookOpen className="w-7 h-7 text-indigo-400" />
              </div>
              
              <h2 className="text-3xl font-display font-medium tracking-tighter text-fg-primary mb-2">Initialize Session</h2>
              <p className="text-body-sm text-fg-tertiary mb-8">Create a new session for {format(date, 'MMM d')}.</p>
              
              <form onSubmit={handleCreateSession} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-[0.2em] text-fg-secondary uppercase ml-1">Topic</label>
                  <div className="relative">
                    <Layout className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-fg-tertiary" />
                    <input 
                      type="text" 
                      className="input w-full pl-12 h-12 bg-white/[0.02]" 
                      value={newTopic}
                      onChange={e => setNewTopic(e.target.value)}
                      placeholder="e.g. System Design" 
                      required 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-[0.2em] text-fg-secondary uppercase ml-1">Duration</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      className="input w-full px-4 h-12 bg-white/[0.02]" 
                      value={newDuration}
                      onChange={e => setNewDuration(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-[0.2em] text-fg-secondary uppercase ml-1">Type</label>
                    <select 
                      className="input w-full px-4 h-12 bg-white/[0.02] appearance-none"
                      value={newType}
                      onChange={e => setNewType(e.target.value)}
                    >
                      <option value="offline">Offline</option>
                      <option value="online">Online</option>
                    </select>
                  </div>
                </div>
                
                <button type="submit" className="btn-premium w-full flex items-center justify-center gap-3 h-12">
                  <Save className="w-4 h-4" />
                  Launch Session
                </button>
              </form>
            </div>
          </div>

          {/* Right: Existing Sessions List (Timeline) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-display font-medium text-fg-primary">Today's Timeline</h2>
              <div className="pill bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-widest px-3">
                {sessions.length} Sessions
              </div>
            </div>

            <div className="space-y-4">
              {sessions.length === 0 ? (
                <div className="premium-card p-12 text-center border-dashed border-white/5 bg-transparent">
                  <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-5 h-5 text-fg-tertiary" />
                  </div>
                  <div className="text-fg-tertiary text-body-sm">No sessions recorded yet for this date.</div>
                </div>
              ) : (
                sessions.map((s, idx) => (
                  <div key={s.id} className="premium-card p-6 flex items-center justify-between group">
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-fg-tertiary font-mono text-xs">
                        0{idx + 1}
                      </div>
                      <div>
                        <h3 className="text-fg-primary font-medium group-hover:text-indigo-400 transition-colors">{s.topic}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-bold text-fg-tertiary uppercase tracking-wider">{s.session_type}</span>
                          <span className="w-1 h-1 rounded-full bg-white/10"></span>
                          <span className="text-[10px] font-bold text-fg-tertiary uppercase tracking-wider">{s.duration_hours} Hours</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDeleteSession(s.id)}
                        className="w-10 h-10 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-center text-rose-500/40 hover:bg-rose-500 hover:text-white transition-all"
                        title="Delete session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setSession(s)}
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-fg-tertiary hover:bg-indigo-500 hover:text-white hover:border-indigo-400 transition-all"
                      >
                        <ArrowLeft className="w-4 h-4 rotate-180" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && session && (
        <div className="card space-y-6">
          <div className="flex items-center justify-between pb-6 border-b border-border-subtle">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setSession(null)}
                className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-fg-tertiary hover:bg-white/10 hover:text-fg-primary transition-all group"
                title="Back to date selection"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </button>
              <div>
                <div className="text-[10px] font-bold tracking-[0.2em] text-fg-tertiary mb-1 uppercase opacity-50">Active Session</div>
                <h2 className="text-3xl font-display font-medium tracking-tight text-fg-primary">{session.topic}</h2>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleDeleteSession(session.id)} className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 hover:bg-rose-500 hover:text-white transition-all mr-2" title="Delete current session">
                <Trash2 className="w-5 h-5" />
              </button>
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
