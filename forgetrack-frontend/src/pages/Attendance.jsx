import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Save, AlertTriangle, ArrowLeft, BookOpen, Clock, Layout, Trash2, ChevronLeft, ChevronRight, Activity, Zap, PlusCircle, CheckCircle2 } from 'lucide-react';
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
      const { data: studentsData } = await supabase.from('students').select('*').eq('is_active', true).order('name');
      setStudents(studentsData || []);
      const { data: sessionsData } = await supabase.from('sessions').select('*').eq('date', dateStr).order('created_at', { ascending: true });
      setSessions(sessionsData || []);
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
      const { data: attData } = await supabase.from('attendance').select('*').eq('session_id', sessionId);
      const attMap = {};
      attData?.forEach(a => { attMap[a.student_id] = a.present; });
      setExistingCount(attData?.length || 0);
      const newAttMap = { ...attMap };
      students.forEach(s => {
        if (newAttMap[s.id] === undefined) newAttMap[s.id] = true;
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
      const { data, error } = await supabase.from('sessions').insert({
        date: format(date, 'yyyy-MM-dd'),
        topic: newTopic,
        duration_hours: parseFloat(newDuration),
        session_type: newType,
        month_number: date.getMonth() + 1
      }).select().single();
      if (error) throw error;
      setSessions(prev => [...prev, data]);
      setSession(data);
      setNewTopic('');
      fetchAllSessions();
    } catch (err) {
      alert(`Failed to create session: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    setLoading(true);
    try {
      await supabase.from('sessions').delete().eq('id', sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (session?.id === sessionId) setSession(null);
      fetchAllSessions();
    } catch (err) {
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
      await supabase.from('attendance').upsert(records, { onConflict: 'student_id,session_id' });
      setExistingCount(records.length);
      alert('Attendance saved!');
    } catch (err) {
      alert('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <h1 className="text-6xl md:text-7xl font-display font-medium tracking-tight text-white mb-2">Mark Attendance</h1>
          <p className="text-lg text-fg-secondary font-medium">Session management for {format(date, 'MMMM do, yyyy')}</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowCalendarModal(true)}
            className="btn-secondary flex items-center gap-2 group"
          >
            <CalendarIcon className="w-4 h-4 text-accent-primary group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Open Roadmap</span>
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button className="btn-secondary flex items-center gap-2 px-6">
                <Clock className="w-4 h-4 text-accent-primary" />
                <span className="text-xs font-bold uppercase tracking-widest">{format(date, 'MMM d')}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-bg-card-solid border-white/5 rounded-2xl" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                disabled={(d) => isAfter(d, new Date()) || isBefore(d, PROGRAM_START)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {showCalendarModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
          <div className="absolute inset-0 bg-bg-primary/80 backdrop-blur-md" onClick={() => setShowCalendarModal(false)}></div>
          <div className="relative w-full max-w-6xl max-h-[95vh] overflow-y-auto custom-scrollbar bg-gradient-to-br from-[#0a0a0c] via-[#0d0d12] to-[#110f1a] border border-white/10 rounded-[2.5rem] shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)]">
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-accent-primary/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-accent-primary/10 blur-[120px] rounded-full pointer-events-none"></div>
            
            <div className="relative p-6 flex items-center justify-between border-b border-white/5 sticky top-0 bg-[#0a0a0c]/80 backdrop-blur-xl z-10">
              <div>
                <h2 className="text-3xl font-display font-medium tracking-tighter text-white mb-1">{format(currentCalendarMonth, 'MMMM yyyy')}</h2>
                <div className="text-[10px] font-bold tracking-[0.3em] text-accent-primary uppercase">Academic Roadmap</div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCurrentCalendarMonth(subMonths(currentCalendarMonth, 1))} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={() => setCurrentCalendarMonth(addMonths(currentCalendarMonth, 1))} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10"><ChevronRight className="w-5 h-5" /></button>
                <button onClick={() => setShowCalendarModal(false)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-danger/20 hover:text-danger ml-2 transition-all"><Layout className="rotate-45 w-4 h-4" /></button>
              </div>
            </div>

            <div className="relative p-6">
              <div className="grid grid-cols-7 gap-3 mb-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="text-center text-xs font-bold text-fg-tertiary uppercase tracking-widest opacity-40">{day}</div>
                ))}
              </div>
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
                      <div key={day.toString()} onClick={() => { setDate(day); setShowCalendarModal(false); }}
                        className={`relative min-h-[80px] rounded-xl cursor-pointer transition-all duration-300 flex flex-col p-3 group ${!isCurrentMonth ? 'opacity-10 grayscale pointer-events-none' : 'opacity-100'} ${hasSessions ? 'bg-accent-primary/5 border border-accent-primary/20 shadow-[inset_0_0_20px_rgba(215,241,74,0.05)]' : 'bg-white/[0.01] border border-white/5 hover:border-accent-primary/30 hover:bg-accent-primary/5'} ${isSelected ? 'border-accent-primary/50 bg-accent-primary/5 ring-1 ring-accent-primary/20' : ''} ${isToday ? 'ring-1 ring-accent-primary/50 ring-offset-2 ring-offset-[#0a0a0c]' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-lg font-display font-medium ${hasSessions ? 'text-accent-primary' : 'text-fg-tertiary'}`}>{format(day, 'd')}</span>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-accent-primary shadow-[0_0_12px_#D7F14A]"></div>}
                        </div>
                        <div className="flex flex-col gap-1 overflow-hidden">
                          {daySessions.slice(0, 2).map((s, i) => (
                            <div key={i} className="text-[9px] leading-tight text-fg-primary truncate font-medium"><span className="text-accent-primary mr-1">•</span> {s.topic}</div>
                          ))}
                        </div>
                        {hasSessions && day.getDate() % 10 === 0 && <Activity className="w-3 h-3 text-accent-primary/10 absolute bottom-2 right-2" />}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Areas */}
      {!loading && !session && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Create Session Card */}
          <div className="lg:col-span-2 aura-card px-8 py-6 relative overflow-hidden group">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-accent-primary/5 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center mb-6">
                <BookOpen className="w-7 h-7 text-accent-primary" />
              </div>
              <h2 className="text-3xl font-display font-medium text-white mb-2">Initialize Session</h2>
              <p className="text-fg-secondary font-medium mb-6">Set up a session tracker for today.</p>
              
              <form onSubmit={handleCreateSession} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-bold tracking-widest text-fg-tertiary uppercase">Session Topic</label>
                  <div className="relative">
                    <Layout className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-fg-tertiary" />
                    <input type="text" className="w-full pl-14 pr-6 h-14 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:border-accent-primary/30 focus:bg-white/[0.08] transition-all text-white font-medium" value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="e.g. System Design Foundations" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold tracking-widest text-fg-tertiary uppercase">Hours</label>
                    <input type="number" step="0.5" className="w-full px-6 h-14 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:border-accent-primary/30 text-white font-medium" value={newDuration} onChange={e => setNewDuration(e.target.value)} required />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold tracking-widest text-fg-tertiary uppercase">Environment</label>
                    <select className="w-full px-6 h-14 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:border-accent-primary/30 text-white font-medium appearance-none" value={newType} onChange={e => setNewType(e.target.value)}>
                      <option value="offline">Offline</option>
                      <option value="online">Online</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full h-16 flex items-center justify-center gap-3 text-lg">
                  <Zap className="w-5 h-5" /> Launch Tracker
                </button>
              </form>
            </div>
          </div>

          {/* Timeline / Session List */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-display font-medium text-white">Today's Timeline</h2>
              <div className="px-4 py-1.5 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-xs font-bold uppercase tracking-widest">{sessions.length} RECORDED</div>
            </div>
            <div className="space-y-4">
              {sessions.length === 0 ? (
                <div className="aura-card p-20 text-center flex flex-col items-center gap-6 opacity-40">
                  <Clock className="w-12 h-12" />
                  <p className="font-medium">No sessions live yet.</p>
                </div>
              ) : (
                sessions.map((s, idx) => (
                  <div key={s.id} className="aura-card px-8 py-5 flex items-center justify-between group hover:border-accent-primary/30">
                    <div className="flex items-center gap-8">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-white/20 font-display text-sm font-bold">
                        <span className="text-[10px] opacity-40 uppercase">0{idx+1}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1 group-hover:text-accent-primary transition-colors">{s.topic}</h3>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-bold text-fg-tertiary uppercase tracking-widest">{s.session_type}</span>
                          <div className="w-1 h-1 rounded-full bg-white/10"></div>
                          <span className="text-[10px] font-bold text-fg-tertiary uppercase tracking-widest">{s.duration_hours} HOURS</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={() => handleDeleteSession(s.id)} className="w-12 h-12 rounded-2xl bg-danger/5 border border-danger/10 flex items-center justify-center text-danger/40 hover:bg-danger hover:text-white transition-all"><Trash2 className="w-5 h-5" /></button>
                      <button onClick={() => setSession(s)} className="w-12 h-12 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary hover:bg-accent-primary hover:text-white transition-all"><ArrowLeft className="w-5 h-5 rotate-180" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Interface */}
      {!loading && session && (
        <div className="aura-card px-8 py-6 space-y-6 animate-in slide-in-from-bottom-8 duration-500">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/5">
            <div className="flex items-center gap-8">
              <button onClick={() => setSession(null)} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-fg-tertiary hover:bg-white/10 hover:text-white transition-all group">
                <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
              </button>
              <div>
                <div className="text-[10px] font-bold tracking-widest text-accent-primary uppercase mb-1">Live Tracking</div>
                <h2 className="text-4xl font-display font-medium text-white">{session.topic}</h2>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => toggleAll(true)} className="btn-secondary h-12">Present All</button>
              <button onClick={() => toggleAll(false)} className="btn-secondary h-12">Absent All</button>
              <button onClick={executeSave} disabled={saving} className="btn-primary h-12 flex items-center gap-2">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Finalize Attendance'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {students.map(s => {
              const isPresent = attendance[s.id];
              return (
                <div key={s.id} onClick={() => toggleStudent(s.id)} 
                  className={`flex items-center justify-between p-5 rounded-[22px] border-2 cursor-pointer transition-all duration-300 ${isPresent ? 'bg-success/5 border-success/30 shadow-[0_0_20px_rgba(34,197,94,0.05)]' : 'bg-danger/5 border-danger/30 shadow-[0_0_20px_rgba(244,63,94,0.05)]'}`}>
                  <div>
                    <div className={`text-lg font-bold ${isPresent ? 'text-success' : 'text-danger'}`}>{s.name}</div>
                    <div className="text-xs font-mono text-fg-tertiary mt-1 opacity-60 uppercase">{s.usn}</div>
                  </div>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black border-2 ${isPresent ? 'bg-success border-success text-white' : 'bg-danger border-danger text-white'}`}>
                    {isPresent ? 'P' : 'A'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
