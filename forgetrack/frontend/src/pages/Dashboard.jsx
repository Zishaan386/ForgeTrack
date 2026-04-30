import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PlusCircle, Users, BookOpen, Clock, Activity, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const fetchInProgress = useRef(false);
  const lastProfileId = useRef(null);
  const [stats, setStats] = useState({
    totalSessions: 0,
    overallAttendance: 0,
    activeStudents: 0,
    lastSessionDate: '-'
  });
  const [todaySession, setTodaySession] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState({ present: 0, total: 0, absentees: [] });
  const [recentActivity, setRecentActivity] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (profile?.id && !fetchInProgress.current && lastProfileId.current !== profile.id) {
      console.log('Dashboard: Triggering fetch for profile:', profile.id);
      fetchDashboardData();
    }
  }, [profile?.id]);

  const fetchDashboardData = async () => {
    if (fetchInProgress.current) return;
    
    try {
      fetchInProgress.current = true;
      lastProfileId.current = profile.id;
      console.log('Dashboard: Fetching data starting...');
      setLoading(true);
      setError(null);

      // 1. Active Students
      const { count: studentCount, error: studentError } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (studentError) throw studentError;

      // 2. Sessions
      const { data: sessions, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false });
        
      if (sessionError) throw sessionError;

      const totalSessions = sessions?.length || 0;
      const lastSessionDate = totalSessions > 0 ? sessions[0].date : '-';

      // 3. Attendance Overall - Using count queries for performance
      const { count: presentCount, error: presentErr } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('present', true);
        
      const { count: totalAttendance, error: totalErr } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true });
        
      if (presentErr || totalErr) throw presentErr || totalErr;

      const overallAttendance = totalAttendance 
        ? Math.round((presentCount / totalAttendance) * 100) 
        : 0;

      setStats({
        totalSessions,
        overallAttendance,
        activeStudents: studentCount || 0,
        lastSessionDate
      });

      // 4. Today's Session
      const today = new Date().toISOString().split('T')[0];
      const todaySess = sessions?.find(s => s.date === today);
      setTodaySession(todaySess || null);

      if (todaySess && studentCount) {
        const { data: attData, error: todayAttError } = await supabase
          .from('attendance')
          .select('present, students(name)')
          .eq('session_id', todaySess.id);

        if (todayAttError) throw todayAttError;

        const present = attData?.filter(a => a.present).length || 0;
        const absentees = attData?.filter(a => !a.present) || [];
        setTodayAttendance({ present, total: studentCount, absentees });
      }

      // 5. Recent Activity
      const { data: recentAtt, error: recentError } = await supabase
        .from('attendance')
        .select('marked_at, marked_by')
        .order('marked_at', { ascending: false })
        .limit(5);
        
      if (recentError) throw recentError;
      setRecentActivity(recentAtt || []);

      console.log('Dashboard: Data fetched successfully');

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
      console.log('Dashboard: Fetching data finished.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-7xl font-display font-medium leading-[1.1] tracking-tighter text-fg-primary mb-4">Welcome Back, {profile?.display_name?.split(' ')[0]}</h1>
          <p className="text-h3 text-fg-tertiary">Here's what's happening with the program today.</p>
        </div>
        <button 
          onClick={fetchDashboardData} 
          disabled={loading}
          className="btn-secondary h-12 px-6 flex items-center gap-3 rounded-2xl"
        >
          <Activity className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-danger-bg border border-danger-border flex items-center justify-between text-danger-text">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span className="text-body-sm font-medium">{error}</span>
          </div>
          <button onClick={fetchDashboardData} className="text-body-sm underline font-semibold">Try Again</button>
        </div>
      )}

      {/* Ticker Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Total Sessions', value: stats.totalSessions, icon: BookOpen, color: 'text-blue-400' },
          { label: 'Overall Attendance', value: `${stats.overallAttendance}%`, icon: Activity, color: 'text-emerald-400' },
          { label: 'Active Students', value: stats.activeStudents, icon: Users, color: 'text-indigo-400' },
          { label: 'Last Session', value: stats.lastSessionDate, icon: Clock, color: 'text-amber-400' },
        ].map((stat, i) => (
          <div key={i} className="premium-card p-10 flex flex-col gap-6 group overflow-hidden relative">
            <div className={`w-16 h-16 rounded-3xl glass-panel flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:bg-white/5`}>
              <stat.icon className={`w-8 h-8 ${stat.color} drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]`} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground uppercase mb-2">{stat.label}</div>
              <div className="text-5xl font-display font-medium tabular-nums tracking-tighter">
                {loading ? (
                  <div className="w-24 h-12 bg-muted animate-pulse rounded-xl"></div>
                ) : stat.value}
              </div>
            </div>
            {/* Background highlight */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/[0.01] rounded-full blur-3xl group-hover:bg-white/[0.03] transition-all duration-700"></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Today's Session */}
        <Card className="bg-surface border-border-default">
          <CardHeader>
            <CardTitle className="text-h3">Today's Session</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-fg-secondary">Loading...</div>
            ) : todaySession ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-surface-inset border border-border-subtle">
                  <div className="text-h3 text-fg-primary mb-1">{todaySession.topic}</div>
                  <div className="text-body-sm text-fg-secondary flex gap-2">
                    <span className="pill pill-success capitalize">{todaySession.session_type}</span>
                    <span className="pill bg-surface-raised border border-border-subtle text-fg-secondary">{todaySession.duration_hours} Hrs</span>
                  </div>
                </div>
                <Link to="/attendance" className="btn-primary w-full inline-block text-center mt-2">
                  Mark Attendance
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-surface-inset rounded-full flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6 text-fg-tertiary" />
                </div>
                <div className="text-body font-medium mb-1">No session scheduled</div>
                <div className="text-body-sm text-fg-tertiary mb-4">Create a session to start tracking attendance.</div>
                <Link to="/attendance" className="btn-primary inline-flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" />
                  Create Session
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Today's Attendance */}
        <Card className="bg-surface border-border-default">
          <CardHeader>
            <CardTitle className="text-h3">Today's Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-fg-secondary">Loading...</div>
            ) : !todaySession ? (
              <div className="text-fg-tertiary text-center py-8">Waiting for a session to be created...</div>
            ) : todayAttendance.present === 0 && todayAttendance.absentees.length === 0 ? (
              <div className="text-fg-tertiary text-center py-8">Attendance not marked yet.</div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-body-sm mb-2">
                    <span className="text-fg-secondary">Present</span>
                    <span className="font-medium text-fg-primary">{todayAttendance.present} / {todayAttendance.total}</span>
                  </div>
                  <div className="h-2 bg-surface-inset rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent-glow" 
                      style={{ width: `${(todayAttendance.present / todayAttendance.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                {todayAttendance.absentees.length > 0 && (
                  <div>
                    <div className="text-label text-fg-tertiary mb-2">ABSENTEES</div>
                    <div className="space-y-2">
                      {todayAttendance.absentees.slice(0, 5).map((a, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                          <div>
                            <div className="text-body-sm font-bold text-rose-400">{a.students?.name || 'Unknown Student'}</div>
                            <div className="text-[10px] text-fg-tertiary font-mono uppercase tracking-wider">{a.students?.usn}</div>
                          </div>
                          <div className="w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-rose-500/20">
                            A
                          </div>
                        </div>
                      ))}
                      {todayAttendance.absentees.length > 5 && (
                        <div className="text-caption text-fg-tertiary text-center pt-2">
                          + {todayAttendance.absentees.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
