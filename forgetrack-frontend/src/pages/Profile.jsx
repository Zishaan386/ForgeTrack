import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Mail, Shield, Calendar, Fingerprint, Activity, GraduationCap, Hash, BookOpen } from 'lucide-react';

export const Profile = () => {
  const { profile } = useAuth();
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.role === 'student' && profile?.student_id) {
      fetchStudentInfo();
    }
  }, [profile]);

  const fetchStudentInfo = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('id', profile.student_id)
        .single();
      setStudentInfo(data);
    } catch (err) {
      console.error('Error fetching student info:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  const displayData = [
    { label: 'Network Identity', value: profile.email, icon: Mail, color: 'text-accent-cyan', bg: 'bg-accent-cyan/10' },
    { label: 'Access Protocol', value: `${profile.role} privileges`, icon: Shield, color: 'text-accent-primary', bg: 'bg-accent-primary/10' },
    { label: 'Alias', value: profile.display_name, icon: User, color: 'text-accent-primary', bg: 'bg-accent-primary/10' },
    { label: 'System Hash', value: profile.id, icon: Fingerprint, color: 'text-fg-tertiary', bg: 'bg-white/5', isMono: true },
  ];

  if (profile.role === 'student' && studentInfo) {
    displayData.push(
      { label: 'Academic USN', value: studentInfo.usn, icon: Hash, color: 'text-accent-primary', bg: 'bg-accent-primary/10' },
      { label: 'Program Branch', value: studentInfo.branch_code, icon: GraduationCap, color: 'text-accent-cyan', bg: 'bg-accent-cyan/10' },
      { label: 'Batch Sequence', value: studentInfo.batch, icon: BookOpen, color: 'text-warning', bg: 'bg-warning/10' }
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24 animate-in fade-in duration-700">
      <div>
        <h1 className="text-6xl md:text-7xl font-display font-medium tracking-tight text-white mb-2">Member Profile</h1>
        <p className="text-lg text-fg-secondary font-medium">Verified credentials and system access identity.</p>
      </div>

      <div className="aura-card p-12 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-accent-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-10 mb-16 relative z-10">
          <div className="w-32 h-32 rounded-[3.5rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-5xl font-display font-bold text-white shadow-2xl group-hover:scale-105 transition-transform duration-700">
            {profile.display_name?.charAt(0)}
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-4xl font-display font-medium text-white mb-2">{profile.display_name}</h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <span className="px-4 py-1.5 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-[10px] font-black uppercase tracking-widest">{profile.role}</span>
              <div className="w-1 h-1 rounded-full bg-white/20"></div>
              <span className="text-xs font-bold text-fg-tertiary uppercase tracking-widest">Sequenced {new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-12 border-t border-white/5 relative z-10">
          {displayData.map((item, i) => (
            <div key={i} className="flex items-start gap-6 group/item">
              <div className={`w-14 h-14 rounded-2xl ${item.bg} border border-white/5 flex items-center justify-center shrink-0 group-hover/item:scale-110 transition-all`}>
                <item.icon className={`w-6 h-6 ${item.color}`} strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold tracking-widest text-fg-tertiary uppercase mb-1">{item.label}</div>
                <div className={`text-lg font-medium text-white truncate ${item.isMono ? 'font-mono text-xs opacity-60' : ''}`}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="aura-card p-10 bg-warning/[0.02] border-warning/10 flex items-center gap-8 group">
        <div className="w-16 h-16 rounded-full bg-warning/5 border border-warning/10 flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform">
          <Activity className="w-7 h-7 text-warning opacity-60" />
        </div>
        <div>
          <div className="text-lg font-bold text-warning mb-1">Security Subsystem</div>
          <p className="text-sm text-warning/50 font-medium">Credential modifications are currently locked. System administrators hold master override permissions.</p>
        </div>
      </div>
    </div>
  );
};

