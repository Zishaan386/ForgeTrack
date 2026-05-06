import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PlusCircle, Users, BookOpen, Clock, Activity, AlertCircle, RefreshCw, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const fetchInProgress = useRef(false);
  const [stats, setStats] = useState({
    totalSessions: 0,
    overallAttendance: 0,
    activeStudents: 0,
    lastSessionDate: '-'
  });
  const [todaySessions, setTodaySessions] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState({ present: 0, total: 0, absentees: [] });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (profile?.id) {
      fetchDashboardData();
    }
  }, [profile?.id]);

  const fetchDashboardData = async () => {
    if (fetchInProgress.current) return;
    try {
      fetchInProgress.current = true;
      setLoading(true);
      setError(null);

      // 1. Fetch Student Count
      const { count: studentCount, error: sErr } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      if (sErr) throw sErr;

      // 2. Fetch Sessions
      const { data: sessions, error: sessErr } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false });
      if (sessErr) throw sessErr;

      const totalSessions = sessions?.length || 0;
      const lastSessionDate = totalSessions > 0 ? sessions[0].date : '-';

      // 3. Fetch Overall Attendance Stats
      const { count: presentCount, error: pErr } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('present', true);
      if (pErr) throw pErr;

      const { count: totalAttendance, error: tErr } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true });
      if (tErr) throw tErr;

      const overallAttendance = totalAttendance ? Math.round((presentCount / totalAttendance) * 100) : 0;

      setStats({
        totalSessions,
        overallAttendance,
        activeStudents: studentCount || 0,
        lastSessionDate
      });

      // 4. Fetch Today's Sessions and Attendance
      const today = new Date().toISOString().split('T')[0];
      const todaySessList = sessions?.filter(s => s.date === today) || [];
      setTodaySessions(todaySessList);

      if (todaySessList.length > 0 && studentCount) {
        const sessionIds = todaySessList.map(s => s.id);
        const { data: attData, error: attErr } = await supabase
          .from('attendance')
          .select('present, students(name, usn), sessions(topic)')
          .in('session_id', sessionIds);
        if (attErr) throw attErr;

        const present = attData?.filter(a => a.present).length || 0;
        const absentees = attData?.filter(a => !a.present) || [];
        setTodayAttendance({ 
          present, 
          total: studentCount * todaySessList.length, 
          absentees 
        });
      }
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  };

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <h1 className="text-6xl md:text-7xl font-display font-medium tracking-tight text-white mb-2">
            Welcome, <span className="text-accent-primary">{profile?.display_name?.split(' ')[0] || 'Member'}</span>
          </h1>
          <p className="text-lg text-fg-secondary font-medium">Your program overview for {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
        </div>
        <button 
          onClick={fetchDashboardData} 
          disabled={loading}
          className="btn-secondary flex items-center gap-2 group"
        >
          <RefreshCw className={`w-4 h-4 text-accent-primary ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          <span className="text-xs font-bold uppercase tracking-widest">Update Insights</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-between text-danger">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
          <button onClick={fetchDashboardData} className="text-xs underline font-bold uppercase tracking-wider">Retry</button>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Sessions', value: stats.totalSessions, icon: BookOpen, color: 'text-accent-primary', bg: 'bg-accent-primary/10' },
          { label: 'Overall Attendance', value: `${stats.overallAttendance}%`, icon: Activity, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Active Students', value: stats.activeStudents, icon: Users, color: 'text-accent-cyan', bg: 'bg-accent-cyan/10' },
          { label: 'Last Active', value: stats.lastSessionDate === '-' ? '-' : new Date(stats.lastSessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
        ].map((stat, i) => (
          <div key={i} className="stat-tile group">
            <div className={`icon-bubble ${stat.bg} border-none`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} strokeWidth={2} />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-[0.15em] text-fg-tertiary uppercase mb-1">{stat.label}</div>
              <div className="text-4xl font-display font-medium tracking-tight text-white">
                {loading ? <div className="w-16 h-8 bg-white/5 animate-pulse rounded-lg"></div> : stat.value}
              </div>
            </div>
            <ArrowUpRight className="absolute top-6 right-6 w-4 h-4 text-white/10 group-hover:text-white/40 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Today's Agenda */}
        <div className="lg:col-span-3 aura-card p-10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-primary/5 blur-[100px] pointer-events-none group-hover:bg-accent-primary/10 transition-all duration-700"></div>
          
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h2 className="text-2xl font-display font-medium text-white mb-1">Today's Agenda</h2>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-primary"></div>
                <span className="text-xs font-bold text-fg-secondary uppercase tracking-widest">{todaySessions.length} sessions scheduled</span>
              </div>
            </div>
            <Link to="/attendance" className="w-12 h-12 rounded-2xl bg-accent-primary flex items-center justify-center text-bg-primary hover:scale-110 transition-transform shadow-lg shadow-accent-primary/20">
              <PlusCircle className="w-6 h-6" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map(n => <div key={n} className="h-24 bg-white/5 animate-pulse rounded-2xl"></div>)}
            </div>
          ) : todaySessions.length > 0 ? (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
              {todaySessions.map((s, i) => (
                <div key={s.id} className="p-6 rounded-[22px] bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all group/item">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex flex-col items-center justify-center text-white/40 font-display text-sm font-bold border border-white/5">
                        <span className="text-[10px] opacity-40 uppercase">No.</span>
                        {i+1}
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white mb-1 group-hover/item:text-accent-primary transition-colors">{s.topic}</div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-accent-primary uppercase tracking-widest py-1 px-2.5 rounded-lg bg-accent-primary/10 border border-accent-primary/20">{s.session_type}</span>
                          <div className="w-1 h-1 rounded-full bg-white/10"></div>
                          <span className="text-[10px] font-bold text-fg-tertiary uppercase tracking-widest">{s.duration_hours} Hours</span>
                        </div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-white/5 group-hover/item:text-white/40 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center flex flex-col items-center gap-6 relative z-10">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                <BookOpen className="w-8 h-8 text-fg-tertiary opacity-30" />
              </div>
              <div>
                <p className="text-lg font-medium text-white mb-1">Your schedule is clear</p>
                <p className="text-sm text-fg-tertiary">No sessions are planned for today.</p>
              </div>
              <Link to="/attendance" className="btn-primary flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                Initialize Session
              </Link>
            </div>
          )}
        </div>

        {/* Live Attendance Pulse */}
        <div className="lg:col-span-2 aura-card p-10 flex flex-col group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-accent-primary/5 blur-[100px] pointer-events-none group-hover:bg-accent-primary/10 transition-all duration-700"></div>

          <h2 className="text-2xl font-display font-medium text-white mb-8 relative z-10">Attendance Pulse</h2>
          
          <div className="flex-1 flex flex-col relative z-10">
            {loading ? (
              <div className="space-y-8 animate-pulse">
                <div className="h-4 bg-white/5 rounded-full w-2/3"></div>
                <div className="h-32 bg-white/5 rounded-2xl"></div>
              </div>
            ) : todaySessions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10 opacity-40">
                <CheckCircle2 className="w-12 h-12 mb-4 text-fg-tertiary" />
                <p className="text-sm font-medium">Monitoring will start once a session is live.</p>
              </div>
            ) : (
              <div className="space-y-10">
                <div className="p-6 rounded-[22px] bg-white/[0.03] border border-white/5">
                  <div className="flex justify-between items-end mb-4">
                    <div className="text-[11px] font-bold tracking-widest text-fg-tertiary uppercase">Real-time Presence</div>
                    <div className="text-2xl font-display font-medium text-white">{todayAttendance.present} / {todayAttendance.total}</div>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <div 
                      className="h-full bg-accent-primary rounded-full shadow-[0_0_15px_rgba(215,241,74,0.4)] transition-all duration-1000" 
                      style={{ width: todayAttendance.total > 0 ? `${(todayAttendance.present / todayAttendance.total) * 100}%` : '0%' }}
                    ></div>
                  </div>
                </div>

                {todayAttendance.absentees.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold tracking-widest text-fg-tertiary uppercase">Absentees</div>
                      <div className="px-2 py-0.5 bg-danger/10 text-danger text-[10px] font-bold rounded-lg border border-danger/20">{todayAttendance.absentees.length} Flagged</div>
                    </div>
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                      {todayAttendance.absentees.map((a, i) => (
                        <Link 
                          key={i} 
                          to={`/history?search=${encodeURIComponent(a.students?.usn)}`}
                          className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all group/abs"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-2 h-2 rounded-full bg-danger"></div>
                            <div>
                              <div className="text-sm font-bold text-white group-hover/abs:text-accent-primary transition-colors">{a.students?.name}</div>
                              <div className="text-[10px] font-mono text-fg-tertiary">{a.students?.usn}</div>
                            </div>
                          </div>
                          <ArrowUpRight className="w-3.5 h-3.5 text-white/5 group-hover/abs:text-white/30 transition-colors" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
