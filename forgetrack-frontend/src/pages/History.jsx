import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Check, ChevronsUpDown, User, Award, Flame, Plus, Trash2, X, Search, Activity, ArrowUpRight, TrendingUp, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';

export const History = () => {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ percentage: 0, currentStreak: 0, maxStreak: 0 });
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', usn: '', branch_code: '', batch: '2024-2028' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudentId) fetchStudentHistory(selectedStudentId);
  }, [selectedStudentId]);

  useEffect(() => {
    if (searchQuery && students.length > 0) {
      const match = students.find(s => 
        s.usn.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (match) setSelectedStudentId(match.id);
    }
  }, [searchQuery, students]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('students').select('id, name, usn').order('name');
      setStudents(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await supabase.from('students').insert([newStudent]);
      setShowAddModal(false);
      setNewStudent({ name: '', usn: '', branch_code: '', batch: '2024-2028' });
      fetchStudents();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Remove student and all history?')) return;
    await supabase.from('students').delete().eq('id', id);
    fetchStudents();
    if (selectedStudentId === id) setSelectedStudentId(null);
  };

  const fetchStudentHistory = async (studentId) => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('students').select('*').eq('id', studentId).single();
      const { data: history } = await supabase.from('attendance').select('present, sessions(id, date, topic, session_type)').eq('student_id', studentId);
      const formattedHistory = (history || []).filter(h => h.sessions).map(h => ({ ...h.sessions, present: h.present })).sort((a, b) => new Date(b.date) - new Date(a.date));
      setStudentData({ profile, history: formattedHistory });
      calculateStats(formattedHistory);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (history) => {
    if (!history?.length) {
      setStats({ percentage: 0, currentStreak: 0, maxStreak: 0 });
      return;
    }
    const percentage = Math.round((history.filter(h => h.present).length / history.length) * 100);
    let currentStreak = 0, maxStreak = 0, tempStreak = 0;
    [...history].reverse().forEach(h => {
      if (h.present) { tempStreak++; if (tempStreak > maxStreak) maxStreak = tempStreak; } else { tempStreak = 0; }
    });
    setStats({ percentage, currentStreak: tempStreak, maxStreak });
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-24">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <h1 className="text-6xl md:text-7xl font-display font-medium tracking-tight text-white mb-2">Student Directory</h1>
          <p className="text-lg text-fg-secondary font-medium">Analytics and history tracking for program members.</p>
        </div>
        <div className="flex gap-4">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button className="btn-secondary flex items-center gap-3 w-64 justify-between">
                <span className="truncate">{selectedStudentId ? students.find(s => s.id === selectedStudentId)?.name : 'Search Student'}</span>
                <Search className="w-4 h-4 opacity-40" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 bg-bg-card-solid border-white/5 rounded-lg overflow-hidden shadow-2xl">
              <Command className="bg-transparent">
                <CommandInput placeholder="Type name or USN..." className="text-fg-primary h-12" />
                <CommandList className="custom-scrollbar">
                  <CommandEmpty className="p-4 text-xs font-bold text-fg-tertiary uppercase tracking-widest text-center">No results found</CommandEmpty>
                  <CommandGroup>
                    {students.map((s) => (
                      <CommandItem key={s.id} value={`${s.usn} ${s.name}`} onSelect={() => { setSelectedStudentId(s.id); setOpen(false); }} className="p-3 text-fg-primary aria-selected:bg-accent-primary aria-selected:text-bg-primary cursor-pointer transition-colors">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{s.name}</span>
                          <span className="text-[10px] opacity-60 font-mono tracking-tighter uppercase">{s.usn}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> <span className="text-xs font-bold uppercase tracking-widest">Add Member</span>
          </button>
        </div>
      </div>

      {/* Grid of students if none selected */}
      {!selectedStudentId && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {students.map((s) => (
            <div key={s.id} onClick={() => setSelectedStudentId(s.id)} className="aura-card p-8 flex flex-col items-center text-center gap-6 cursor-pointer group relative">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => handleDeleteStudent(e, s.id)} className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center hover:bg-danger hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="w-20 h-20 rounded-[2.5rem] bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-3xl font-display font-medium text-accent-primary group-hover:scale-110 group-hover:bg-accent-primary/20 transition-all shadow-xl shadow-accent-primary/10">
                {s.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-accent-primary transition-colors">{s.name}</h3>
                <p className="text-[10px] font-bold tracking-widest text-fg-tertiary uppercase opacity-60">{s.usn}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-white/5 group-hover:text-white/40 absolute bottom-6 right-6 transition-colors" />
            </div>
          ))}
        </div>
      )}

      {/* Selected Student Dashboard */}
      {studentData && !loading && (
        <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
          <button 
            onClick={() => { setSelectedStudentId(null); setStudentData(null); }}
            className="flex items-center gap-3 text-fg-tertiary hover:text-white transition-colors w-fit group"
          >
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Directory</span>
          </button>
          {/* Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 aura-card p-10 flex items-center gap-8 group">
              <div className="w-24 h-24 rounded-[3rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-4xl font-display font-bold text-white shadow-2xl">
                {studentData.profile.name.charAt(0)}
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-widest text-accent-primary uppercase mb-1">Active Member</div>
                <h2 className="text-3xl font-display font-medium text-white mb-1">{studentData.profile.name}</h2>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-fg-tertiary uppercase">{studentData.profile.usn}</span>
                  <div className="w-1 h-1 rounded-full bg-white/10"></div>
                  <span className="text-[11px] font-bold text-fg-tertiary uppercase tracking-widest">{studentData.profile.branch_code}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 grid grid-cols-3 gap-6">
              {[
                { label: 'Attendance', value: `${stats.percentage}%`, icon: Award, color: 'text-accent-primary', bg: 'bg-accent-primary/10' },
                { label: 'Current Streak', value: stats.currentStreak, icon: Flame, color: 'text-accent-primary', bg: 'bg-accent-primary/10' },
                { label: 'Max Potential', value: stats.maxStreak, icon: TrendingUp, color: 'text-accent-cyan', bg: 'bg-accent-cyan/10' },
              ].map((stat, i) => (
                <div key={i} className="stat-tile">
                  <div className={`icon-bubble ${stat.bg} border-none`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className="mt-2">
                    <div className="text-[10px] font-bold tracking-widest text-fg-tertiary uppercase mb-1">{stat.label}</div>
                    <div className="text-3xl font-display font-medium text-white">{stat.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* History List */}
          <div className="aura-card p-10">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-display font-medium text-white">Attendance Archive</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  <span className="text-[10px] font-bold text-fg-tertiary uppercase tracking-widest">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-danger"></div>
                  <span className="text-[10px] font-bold text-fg-tertiary uppercase tracking-widest">Absent</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studentData.history.length === 0 ? (
                <div className="col-span-full py-20 text-center opacity-40">No records found.</div>
              ) : (
                studentData.history.map((h, i) => (
                  <div key={i} className="p-6 rounded-[22px] bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center gap-6">
                      <div className={`w-3 h-12 rounded-full ${h.present ? 'bg-success/40 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-danger/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]'}`}></div>
                      <div>
                        <h4 className="text-lg font-bold text-white mb-1">{h.topic}</h4>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-fg-tertiary uppercase tracking-widest">{format(parseISO(h.date), 'MMM d, yyyy')}</span>
                          <div className="w-1 h-1 rounded-full bg-white/10"></div>
                          <span className="text-[10px] font-bold text-accent-primary uppercase tracking-widest">{h.session_type}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${h.present ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
                      {h.present ? 'P' : 'A'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="aura-card w-full max-w-xl p-10 animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-display font-medium text-white">New Program Member</h2>
              <button onClick={() => setShowAddModal(false)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-fg-tertiary hover:text-white"><X /></button>
            </div>
            <form onSubmit={handleAddStudent} className="space-y-8">
              <div className="space-y-3"><label className="text-[11px] font-bold tracking-widest text-fg-tertiary uppercase">Full Name</label><input type="text" className="w-full px-6 h-14 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:border-accent-primary/30 text-white font-medium" required value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} placeholder="e.g. John Doe" /></div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3"><label className="text-[11px] font-bold tracking-widest text-fg-tertiary uppercase">USN</label><input type="text" className="w-full px-6 h-14 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:border-accent-primary/30 text-white font-mono uppercase" required value={newStudent.usn} onChange={e => setNewStudent({...newStudent, usn: e.target.value})} placeholder="1FT24CS001" /></div>
                <div className="space-y-3"><label className="text-[11px] font-bold tracking-widest text-fg-tertiary uppercase">Branch</label><input type="text" className="w-full px-6 h-14 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:border-accent-primary/30 text-white font-medium" required value={newStudent.branch_code} onChange={e => setNewStudent({...newStudent, branch_code: e.target.value})} placeholder="CSE" /></div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Enrolling...' : 'Enroll Member'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
