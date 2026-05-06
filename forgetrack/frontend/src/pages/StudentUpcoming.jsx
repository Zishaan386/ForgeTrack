import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, MapPin, ArrowUpRight, BookOpen, Zap } from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';

export const StudentUpcoming = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcoming();
  }, []);

  const fetchUpcoming = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .gte('date', today)
        .order('date', { ascending: true });
      
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching upcoming sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-700">
      <div>
        <h1 className="text-6xl md:text-7xl font-display font-medium tracking-tight text-white mb-2">
          Upcoming <span className="text-accent-primary">Nodes</span>
        </h1>
        <p className="text-lg text-fg-secondary font-medium">Synchronize your schedule with the program roadmap.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {loading ? (
          [1,2].map(n => <div key={n} className="h-48 bg-white/5 animate-pulse rounded-[2.5rem]"></div>)
        ) : sessions.length === 0 ? (
          <div className="col-span-full aura-card p-20 text-center flex flex-col items-center gap-6 opacity-40">
            <Calendar className="w-16 h-16" />
            <p className="text-xl font-display font-medium">No upcoming sessions detected in the timeline.</p>
          </div>
        ) : (
          sessions.map((s, i) => (
            <div key={s.id} className="aura-card p-10 relative overflow-hidden group hover:border-accent-primary/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/5 blur-[50px] rounded-full pointer-events-none transition-all group-hover:bg-accent-primary/10"></div>
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
                    <Zap className="w-7 h-7 text-accent-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-[0.2em] text-accent-primary uppercase mb-1">
                      {format(parseISO(s.date), 'EEEE')}
                    </div>
                    <div className="text-2xl font-display font-medium text-white">{format(parseISO(s.date), 'MMMM d, yyyy')}</div>
                  </div>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-fg-tertiary">
                  {s.session_type}
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                <h3 className="text-3xl font-display font-medium text-white group-hover:text-accent-primary transition-colors">{s.topic}</h3>
                
                <div className="flex items-center gap-8 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-fg-tertiary" />
                    <span className="text-sm font-bold text-fg-secondary uppercase tracking-widest">{s.duration_hours} Hours</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-fg-tertiary" />
                    <span className="text-sm font-bold text-fg-secondary uppercase tracking-widest">Cycle 0{s.month_number}</span>
                  </div>
                </div>
              </div>

              <ArrowUpRight className="absolute bottom-10 right-10 w-6 h-6 text-white/5 group-hover:text-accent-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
