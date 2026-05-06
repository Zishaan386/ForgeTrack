import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Activity, Award, Flame, TrendingUp, ArrowUpRight, CheckCircle2, Clock, Calendar as CalendarIcon, List, Zap, MapPin, Sparkles, ChevronLeft, ChevronRight, Ban } from 'lucide-react';
import { format, parseISO, isToday, addMonths, subMonths, startOfMonth, endOfMonth, getDaysInMonth, getDay } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const StudentAttendance = () => {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search');
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ percentage: 0, currentStreak: 0, maxStreak: 0, totalSessions: 0 });
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDaySessions, setSelectedDaySessions] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (profile?.student_id) {
      fetchStudentData();
    }
  }, [profile?.student_id, searchQuery]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const { data: attData } = await supabase
        .from('attendance')
        .select('present, sessions(id, date, topic, session_type, duration_hours, month_number)')
        .eq('student_id', profile.student_id);

      let formattedHistory = (attData || [])
        .filter(h => h.sessions)
        .map(h => ({ ...h.sessions, present: h.present }));

      if (searchQuery) {
        formattedHistory = formattedHistory.filter(h => 
          h.topic.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      formattedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

      setHistory(formattedHistory);
      calculateStats(formattedHistory);
    } catch (err) {
      console.error('Error fetching student data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (history) => {
    if (!history?.length) {
      setStats({ percentage: 0, currentStreak: 0, maxStreak: 0, totalSessions: 0 });
      return;
    }
    const presentCount = history.filter(h => h.present).length;
    const percentage = Math.round((presentCount / history.length) * 100);
    
    let maxStreak = 0, tempStreak = 0;
    [...history].reverse().forEach(h => {
      if (h.present) { 
        tempStreak++; 
        if (tempStreak > maxStreak) maxStreak = tempStreak; 
      } else { 
        tempStreak = 0; 
      }
    });

    setStats({ 
      percentage, 
      currentStreak: tempStreak, 
      maxStreak,
      totalSessions: history.length 
    });
  };

  const renderCalendar = () => {
    const startOfCurrentMonth = startOfMonth(currentMonth);
    const daysInMonthCount = getDaysInMonth(currentMonth);
    const startingDay = getDay(startOfCurrentMonth);
    
    const days = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonthCount; i++) days.push(i);

    return (
      <div className="max-w-2xl mx-auto relative group/cal">
        <div className="flex items-center justify-between mb-8 px-2 relative z-10">
          <div className="flex items-center gap-4">
            <h4 className="text-xl font-display font-medium text-white tracking-tight">
              {format(currentMonth, 'MMMM')} <span className="text-accent-primary opacity-40">{format(currentMonth, 'yyyy')}</span>
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-fg-secondary hover:bg-white/10 hover:text-white transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className="px-4 h-10 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-fg-secondary hover:bg-white/10 hover:text-white transition-all"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-fg-secondary hover:bg-white/10 hover:text-white transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="absolute -inset-10 bg-accent-primary/5 blur-[120px] rounded-full pointer-events-none group-hover/cal:bg-accent-primary/10 transition-all duration-1000"></div>
        
        <div className="grid grid-cols-7 gap-3 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-fg-tertiary mb-2 opacity-60">{d}</div>
          ))}
          {days.map((day, i) => {
            if (!day) return <div key={i} className="aspect-square opacity-0"></div>;
            
            const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const dateStr = format(dayDate, 'yyyy-MM-dd');
            const daySessions = history.filter(h => h.date.split('T')[0] === dateStr);
            const hasAbsence = daySessions.some(s => !s.present);
            const isTodayDate = isToday(dayDate);
            
            return (
              <div key={i} 
                onClick={() => {
                  setSelectedDay(dayDate);
                  setSelectedDaySessions(daySessions);
                }}
                className={`aspect-square aura-card p-0 flex flex-col items-center justify-center relative overflow-hidden group transition-all duration-500 border border-white/[0.08] cursor-pointer hover:scale-105 active:scale-95 shadow-xl
                  ${daySessions.length > 0 
                    ? 'bg-gradient-to-br from-white/[0.05] to-transparent hover:border-accent-primary/30 hover:shadow-accent-primary/10' 
                    : 'opacity-40 hover:opacity-100 hover:border-white/20'
                  }
                  ${isTodayDate ? 'ring-2 ring-accent-primary/50 border-accent-primary/40 opacity-100' : ''}
                `}
              >
                <span className={`text-base font-display font-medium transition-colors duration-500 
                  ${isTodayDate ? 'text-accent-primary' : 'text-white'}
                  ${daySessions.length > 0 ? 'group-hover:text-accent-primary' : ''}
                `}>
                  {day}
                </span>

                {hasAbsence && (
                  <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-danger shadow-[0_0_12px_rgba(244,63,94,1)] animate-pulse"></div>
                )}

                {daySessions.length > 0 && (
                  <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/[0.03] overflow-hidden">
                    <div className={`h-full transition-all duration-700 
                      ${hasAbsence ? 'bg-danger shadow-[0_0_15px_rgba(244,63,94,0.6)]' : 'bg-accent-primary opacity-40 group-hover:opacity-80'} 
                      w-full`}
                    ></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent-primary" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-primary">Performance Hub</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-display font-medium tracking-tight text-white mb-2">
            My <span className="text-accent-primary">Presence</span>
          </h1>
          <p className="text-lg text-fg-secondary font-medium">Tracking your academic consistency and program engagement.</p>
        </div>
        
        <div className="flex bg-white/5 p-1.5 rounded-[22px] border border-white/10 shadow-2xl backdrop-blur-xl">
          <button 
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-6 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${viewMode === 'list' ? 'bg-accent-primary text-bg-primary shadow-lg shadow-accent-primary/30' : 'text-fg-tertiary hover:text-white hover:bg-white/5'}`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
          <button 
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-6 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${viewMode === 'calendar' ? 'bg-accent-primary text-bg-primary shadow-lg shadow-accent-primary/30' : 'text-fg-tertiary hover:text-white hover:bg-white/5'}`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Calendar
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Attendance Rate', value: `${stats.percentage}%`, icon: Award, color: 'text-accent-primary', bg: 'bg-accent-primary/10' },
          { label: 'Current Streak', value: stats.currentStreak, icon: Flame, color: 'text-accent-primary', bg: 'bg-accent-primary/10' },
          { label: 'Total Sessions', value: stats.totalSessions, icon: BookOpen, color: 'text-accent-cyan', bg: 'bg-accent-cyan/10' },
          { label: 'Performance', value: stats.percentage > 85 ? 'Elite' : 'Steady', icon: Activity, color: 'text-success', bg: 'bg-success/10' },
        ].map((stat, i) => (
          <div key={i} className="stat-tile group overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/[0.02] rounded-full blur-2xl group-hover:bg-accent-primary/5 transition-all duration-700"></div>
            <div className={`icon-bubble ${stat.bg} border-none`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-widest text-fg-tertiary uppercase mb-1">{stat.label}</div>
              <div className="text-4xl font-display font-medium text-white group-hover:text-accent-primary transition-colors duration-500">
                {loading ? <div className="w-16 h-8 bg-white/5 animate-pulse rounded-lg"></div> : stat.value}
              </div>
            </div>
            <ArrowUpRight className="absolute top-6 right-6 w-4 h-4 text-white/10 group-hover:text-accent-primary transition-all duration-500" />
          </div>
        ))}
      </div>

      {/* View Content */}
      <div className="aura-card p-12 min-h-[600px] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-primary/5 blur-[150px] pointer-events-none group-hover:bg-accent-primary/10 transition-all duration-1000"></div>

        <div className="flex items-center justify-between mb-12 relative z-10">
          <div className="flex items-center gap-4">
            <h3 className="text-3xl font-display font-medium text-white">
              {viewMode === 'list' 
                ? (searchQuery ? `Search Results for "${searchQuery}"` : 'Session Archive')
                : (
                  <div className="flex items-center gap-3">
                    <span className="text-accent-primary">{format(currentMonth, 'MMMM')}</span>
                    <span>Timeline</span>
                  </div>
                )
              }
            </h3>
            <div className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse"></div>
          </div>
          <div className="flex items-center gap-8 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-accent-primary shadow-[0_0_10px_rgba(215,241,74,0.5)]"></div>
              <span className="text-[10px] font-black text-fg-tertiary uppercase tracking-[0.2em]">Active</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-danger shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
              <span className="text-[10px] font-black text-fg-tertiary uppercase tracking-[0.2em]">Absent</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-32 text-center relative z-10">
             <div className="w-16 h-16 border-t-2 border-accent-primary rounded-full animate-spin mx-auto mb-8 opacity-40"></div>
             <div className="text-xs font-bold text-fg-tertiary uppercase tracking-[0.3em] animate-pulse">Retrieving Session Matrix...</div>
          </div>
        ) : viewMode === 'calendar' ? (
          renderCalendar()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {history.length === 0 ? (
              <div className="col-span-full py-32 text-center opacity-40 flex flex-col items-center gap-4">
                <BookOpen className="w-12 h-12 text-fg-tertiary" />
                <div className="text-sm font-medium">No records found {searchQuery ? 'matching your search' : 'yet'}.</div>
              </div>
            ) : (
              history.map((h, i) => (
                <div key={i} className="p-8 rounded-[32px] bg-white/[0.03] border border-white/5 flex items-center justify-between group/item hover:bg-white/[0.06] hover:border-accent-primary/20 transition-all duration-500 shadow-xl">
                  <div className="flex items-center gap-8">
                    <div className={`w-1.5 h-16 rounded-full transition-all duration-500 ${h.present ? 'bg-accent-primary shadow-[0_0_20px_rgba(215,241,74,0.4)]' : 'bg-danger shadow-[0_0_20px_rgba(244,63,94,0.4)] group-hover/item:scale-y-110'}`}></div>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2 group-hover/item:text-accent-primary transition-colors duration-500">{h.topic}</h4>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-fg-tertiary uppercase tracking-widest">{format(parseISO(h.date), 'MMM d, yyyy')}</span>
                        <div className="w-1 h-1 rounded-full bg-white/10"></div>
                        <span className="text-[10px] font-black text-accent-primary uppercase tracking-widest bg-accent-primary/5 px-3 py-1 rounded-lg border border-accent-primary/10">{h.session_type}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[12px] font-black uppercase tracking-widest transition-all duration-500 ${h.present ? 'text-accent-primary bg-accent-primary/10 group-hover/item:bg-accent-primary group-hover/item:text-bg-primary' : 'text-danger bg-danger/10'}`}>
                    {h.present ? 'P' : 'A'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="aura-card border border-white/10 w-[95vw] sm:max-w-5xl p-10 animate-in zoom-in duration-500 bg-bg-card-solid/95 backdrop-blur-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-4xl font-display font-medium text-white mb-10 flex items-center gap-4">
               {selectedDay && format(selectedDay, 'MMM d')} <span className="text-accent-primary">Overview</span>
               <div className="flex-1 h-px bg-white/5"></div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-10">
            {selectedDaySessions.length > 0 ? (
              <>
                <div className="text-[10px] font-black tracking-[0.3em] text-fg-tertiary uppercase mb-2 flex items-center gap-3">
                  <Activity className="w-3 h-3 text-accent-primary" />
                  Session Logs
                </div>
                <div className="flex gap-5 overflow-x-auto pb-6 custom-scrollbar snap-x snap-mandatory">
                  {selectedDaySessions.map((s, i) => (
                    <div key={i} className={`flex-shrink-0 w-[280px] snap-start p-8 rounded-[28px] border transition-all duration-500 group/modal ${s.present ? 'bg-white/[0.03] border-white/10 hover:border-accent-primary/20' : 'bg-danger/[0.03] border-danger/10 hover:bg-danger/[0.05]'}`}>
                      <div className="flex items-center justify-between mb-6">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg ${s.present ? 'bg-accent-primary/10 text-accent-primary shadow-accent-primary/5' : 'bg-danger/20 text-danger shadow-danger/10'}`}>
                          {s.present ? 'Present' : 'Absent'}
                        </span>
                        <span className="text-[10px] font-black text-fg-tertiary uppercase tracking-widest opacity-40 group-hover/modal:opacity-100 transition-opacity">{s.session_type}</span>
                      </div>
                      <h4 className="text-xl font-bold text-white mb-2 group-hover/modal:text-accent-primary transition-colors line-clamp-2 min-h-[3.5rem]">{s.topic}</h4>
                      <div className="flex items-center gap-3 text-[10px] font-black text-fg-tertiary uppercase tracking-widest mt-4">
                        <Clock className="w-3.5 h-3.5" />
                        {s.duration_hours} Hour Session
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-20 text-center bg-white/[0.02] border border-white/5 rounded-[32px] group/empty">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 group-hover/empty:scale-110 transition-transform duration-700">
                  <Ban className="w-12 h-12 text-fg-tertiary opacity-30" />
                </div>
                <div className="text-2xl font-display font-medium text-white mb-3">No Classes</div>
                <div className="text-[10px] font-black text-fg-tertiary uppercase tracking-[0.3em] opacity-40">Nothing scheduled for this day</div>
              </div>
            )}

            {selectedDaySessions.length > 0 && (
              <div className="pt-10 border-t border-white/5">
                <div className="text-[10px] font-black tracking-[0.3em] text-fg-tertiary uppercase mb-6 flex items-center gap-3">
                  <Sparkles className="w-3 h-3 text-accent-primary" />
                  Day Summary
                </div>
                <div className="flex gap-3 flex-wrap">
                  {selectedDaySessions.map((s, i) => (
                    <div key={i} className={`px-5 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest border transition-all duration-500 ${s.present ? 'bg-white/[0.03] border-white/10 text-fg-secondary hover:border-accent-primary/30 hover:text-white' : 'bg-danger/10 border-danger/20 text-danger shadow-lg shadow-danger/5'}`}>
                      {s.topic}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
