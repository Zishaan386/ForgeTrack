import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Check, ChevronsUpDown, User, Award, Flame, Plus, Trash2, X } from 'lucide-react';
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
import { format } from 'date-fns';

export const History = () => {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentData, setStudentData] = useState(null); // includes profile + attendance history
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ percentage: 0, currentStreak: 0, maxStreak: 0 });
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search');
  
  // Student management
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', usn: '', branch_code: '', batch: '2024-2028' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentHistory(selectedStudentId);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    if (searchQuery && students.length > 0) {
      const match = students.find(s => 
        s.usn.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (match) {
        setSelectedStudentId(match.id);
      }
    }
  }, [searchQuery, students]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('students')
        .select('id, name, usn')
        .order('name');
      setStudents(data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('students')
        .insert([newStudent]);
      
      if (error) throw error;
      setShowAddModal(false);
      setNewStudent({ name: '', usn: '', branch_code: '', batch: '2024-2028' });
      fetchStudents();
    } catch (err) {
      console.error('Error adding student:', err);
      alert('Failed to add student: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this student? All their history will be deleted.')) return;
    
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchStudents();
    } catch (err) {
      console.error('Error deleting student:', err);
      alert('Failed to delete student');
    }
  };

  const fetchStudentHistory = async (studentId) => {
    setLoading(true);
    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      // Fetch attendance joined with sessions
      const { data: history } = await supabase
        .from('attendance')
        .select(`
          present,
          sessions (
            id, date, topic, session_type
          )
        `)
        .eq('student_id', studentId)
        .order('sessions(date)', { ascending: false });

      // Flatten and sort history
      const formattedHistory = (history || [])
        .filter(h => h.sessions) // safeguard against orphaned records
        .map(h => ({
          ...h.sessions,
          present: h.present
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setStudentData({ profile, history: formattedHistory });
      calculateStats(formattedHistory);
    } catch (err) {
      console.error('Error fetching student history:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (history) => {
    if (!history || history.length === 0) {
      setStats({ percentage: 0, currentStreak: 0, maxStreak: 0 });
      return;
    }

    const presentCount = history.filter(h => h.present).length;
    const percentage = Math.round((presentCount / history.length) * 100);

    // Calculate streaks (history is sorted newest first)
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    // Traverse oldest to newest for accurate streak calculation
    const chronological = [...history].reverse();
    
    for (let i = 0; i < chronological.length; i++) {
      if (chronological[i].present) {
        tempStreak++;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }
    
    // Current streak is just tempStreak at the end of chronological traversal
    currentStreak = tempStreak;

    setStats({ percentage, currentStreak, maxStreak });
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-7xl font-display font-medium leading-[1.1] tracking-tighter text-fg-primary mb-4">Student History</h1>
          <p className="text-h3 text-fg-tertiary">Track performance and session analytics across the program.</p>
        </div>
        {!selectedStudentId && (
          <Button 
            onClick={() => setShowAddModal(true)}
            className="btn-premium flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Student
          </Button>
        )}
      </div>

      {!selectedStudentId && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-10">
          {students.map((student) => (
            <div 
              key={student.id} 
              className="premium-card p-8 flex flex-col items-center text-center gap-4 cursor-pointer hover:border-indigo-500/30 group relative overflow-hidden"
              onClick={() => setSelectedStudentId(student.id)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <button 
                onClick={(e) => handleDeleteStudent(e, student.id)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 border border-white/10 text-fg-tertiary hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 opacity-0 group-hover:opacity-100 transition-all z-10"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl font-display font-medium text-indigo-400 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all shadow-lg shadow-indigo-500/10">
                {student.name.charAt(0)}
              </div>
              <div className="relative z-10">
                <div className="text-h3 text-fg-primary group-hover:text-indigo-400 transition-colors">{student.name}</div>
                <div className="text-label text-fg-tertiary font-mono">{student.usn}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
          <div className="premium-card w-full max-w-lg p-8 space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-h2 text-fg-primary">Add New Student</h2>
              <button onClick={() => setShowAddModal(false)} className="text-fg-tertiary hover:text-fg-primary transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="space-y-2">
                <label className="text-label text-fg-secondary">FULL NAME</label>
                <input 
                  type="text" 
                  className="input w-full"
                  required
                  value={newStudent.name}
                  onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                  placeholder="e.g. John Doe"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-label text-fg-secondary">USN</label>
                  <input 
                    type="text" 
                    className="input w-full font-mono"
                    required
                    value={newStudent.usn}
                    onChange={e => setNewStudent({...newStudent, usn: e.target.value})}
                    placeholder="e.g. 1FT24CS001"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-label text-fg-secondary">BRANCH CODE</label>
                  <input 
                    type="text" 
                    className="input w-full"
                    required
                    value={newStudent.branch_code}
                    onChange={e => setNewStudent({...newStudent, branch_code: e.target.value})}
                    placeholder="e.g. CSE"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-label text-fg-secondary">BATCH</label>
                <input 
                  type="text" 
                  className="input w-full"
                  required
                  value={newStudent.batch}
                  onChange={e => setNewStudent({...newStudent, batch: e.target.value})}
                  placeholder="e.g. 2024-2028"
                />
              </div>

              <div className="pt-4 flex gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="btn-premium flex-1 border-0"
                  disabled={saving}
                >
                  {saving ? 'Creating...' : 'Create Student'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Selector */}
      <div className="card max-w-md">
        <label className="block text-label text-fg-secondary mb-2">SELECT STUDENT</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between bg-surface-inset border-border-default h-11 text-fg-primary hover:bg-surface hover:text-fg-primary"
            >
              {selectedStudent
                ? `${selectedStudent.usn} - ${selectedStudent.name}`
                : "Search student..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0 bg-surface border-border-default">
            <Command className="bg-transparent">
              <CommandInput placeholder="Search by name or USN..." className="text-fg-primary" />
              <CommandList>
                <CommandEmpty>No student found.</CommandEmpty>
                <CommandGroup>
                  {students.map((student) => (
                    <CommandItem
                      key={student.id}
                      value={`${student.usn} ${student.name}`}
                      onSelect={() => {
                        setSelectedStudentId(student.id);
                        setOpen(false);
                      }}
                      className="text-fg-primary aria-selected:bg-surface-raised aria-selected:text-fg-primary cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedStudentId === student.id ? "opacity-100 text-accent-glow" : "opacity-0"
                        )}
                      />
                      <span className="font-medium mr-2">{student.usn}</span>
                      <span className="text-fg-secondary">{student.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {studentData && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="card col-span-1 space-y-6">
              <div className="flex items-center gap-4 border-b border-border-subtle pb-4">
                <div className="w-16 h-16 rounded-full bg-surface-raised border border-border-default flex items-center justify-center">
                  <User className="w-8 h-8 text-fg-tertiary" />
                </div>
                <div>
                  <h2 className="text-h3">{studentData.profile.name}</h2>
                  <div className="text-body-sm text-fg-secondary">{studentData.profile.usn}</div>
                </div>
              </div>
              <div>
                <div className="text-label text-fg-tertiary mb-1">BRANCH & BATCH</div>
                <div className="text-body-sm">{studentData.profile.branch_code} • {studentData.profile.batch}</div>
              </div>
            </div>

            {/* Stats */}
            <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-4">
              <div className="card flex flex-col justify-center items-center text-center p-4">
                <div className="w-10 h-10 rounded-full bg-info-bg flex items-center justify-center mb-2">
                  <Award className="w-5 h-5 text-info-fg" />
                </div>
                <div className="text-display-md text-fg-primary">{stats.percentage}%</div>
                <div className="text-label text-fg-tertiary">OVERALL ATTENDANCE</div>
              </div>
              <div className="card flex flex-col justify-center items-center text-center p-4">
                <div className="w-10 h-10 rounded-full bg-warning-bg flex items-center justify-center mb-2">
                  <Flame className="w-5 h-5 text-warning-fg" />
                </div>
                <div className="text-display-md text-fg-primary">{stats.currentStreak}</div>
                <div className="text-label text-fg-tertiary">CURRENT STREAK</div>
              </div>
              <div className="card flex flex-col justify-center items-center text-center p-4">
                <div className="w-10 h-10 rounded-full bg-surface-inset border border-border-subtle flex items-center justify-center mb-2">
                  <Flame className="w-5 h-5 text-fg-tertiary" />
                </div>
                <div className="text-display-md text-fg-primary">{stats.maxStreak}</div>
                <div className="text-label text-fg-tertiary">MAX STREAK</div>
              </div>
            </div>
          </div>

          <div className="card space-y-6">
            <h3 className="text-h3 border-b border-border-subtle pb-4">Attendance Heatmap</h3>
            <div className="flex flex-wrap gap-2">
              {studentData.history.length === 0 ? (
                <div className="text-body-sm text-fg-tertiary">No sessions recorded yet.</div>
              ) : (
                [...studentData.history].reverse().map((h, i) => (
                  <div 
                    key={h.id} 
                    title={`${h.date}: ${h.topic} - ${h.present ? 'Present' : 'Absent'}`}
                    className={`w-6 h-6 rounded-sm border ${
                      h.present 
                        ? 'bg-success-bg border-success-border' 
                        : 'bg-danger-bg border-danger-border'
                    }`}
                  ></div>
                ))
              )}
            </div>
          </div>

          <div className="card overflow-hidden p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-inset">
                  <th className="p-4 text-label text-fg-secondary font-medium">DATE</th>
                  <th className="p-4 text-label text-fg-secondary font-medium">TOPIC</th>
                  <th className="p-4 text-label text-fg-secondary font-medium">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {studentData.history.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-4 text-center text-body-sm text-fg-tertiary">No records found.</td>
                  </tr>
                ) : (
                  studentData.history.map((h) => (
                    <tr key={h.id} className="border-b border-border-subtle hover:bg-surface-inset transition-colors">
                      <td className="p-4 text-body-sm text-fg-secondary">
                        {format(new Date(h.date), 'MMM d, yyyy')}
                      </td>
                      <td className="p-4 text-body-sm">{h.topic}</td>
                      <td className="p-4">
                        <span className={`pill ${h.present ? 'pill-success' : 'pill-danger'}`}>
                          {h.present ? 'Present' : 'Absent'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
