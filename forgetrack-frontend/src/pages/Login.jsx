import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, User, Cpu, Zap, Fingerprint } from 'lucide-react';

export const Login = () => {
  const [role, setRole] = useState('mentor'); 
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && profile) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, profile, authLoading, navigate, location]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const email = (role === 'student' ? `${identifier}@forge.local` : identifier).toLowerCase();
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      // Wait for profile to be loaded by AuthContext
      let profileReady = false;
      for (let i = 0; i < 40; i++) {
        const { data } = await supabase.from('users').select('role').eq('id', authUser.id).maybeSingle();
        if (data) {
          profileReady = true;
          break;
        }
        await new Promise(r => setTimeout(r, 200));
      }

      if (role === 'student' && password === identifier) {
        navigate('/change-password', { replace: true });
        return;
      }
      
      const from = location.state?.from?.pathname || (role === 'mentor' ? '/dashboard' : '/me/attendance');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Access Denied: Invalid Credentials' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Aura Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[10%] left-[10%] w-[40rem] h-[40rem] bg-accent-primary/10 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[40rem] h-[40rem] bg-accent-primary/5 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="mb-12 text-center relative z-10 flex flex-col items-center gap-6">
        <div className="flex items-center gap-4 group">
          <div className="w-2 h-10 bg-accent-primary rounded-full shadow-[0_0_30px_rgba(215,241,74,0.6)] transition-all group-hover:scale-y-125"></div>
          <h1 className="text-5xl font-display font-bold tracking-tighter text-white uppercase">ForgeTrack</h1>
        </div>
        <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 flex items-center gap-3">
          <Cpu className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="text-[10px] font-bold tracking-[0.3em] text-fg-tertiary uppercase">Advanced Program Engine</span>
        </div>
      </div>

      <div className="aura-card max-w-md w-full p-10 relative z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/5 blur-[60px] pointer-events-none"></div>
        
        <div className="flex bg-white/5 p-1.5 rounded-[22px] mb-10 border border-white/5 shadow-inner">
          <button type="button" onClick={() => { setRole('mentor'); setIdentifier(''); setError(''); }}
            className={`flex-1 py-3 px-4 rounded-[18px] text-[10px] font-black tracking-widest transition-all duration-500 ${role === 'mentor' ? 'bg-accent-primary text-bg-primary shadow-lg shadow-accent-primary/20' : 'text-fg-tertiary hover:text-white/60'}`}>
            MENTOR PORTAL
          </button>
          <button type="button" onClick={() => { setRole('student'); setIdentifier(''); setError(''); }}
            className={`flex-1 py-3 px-4 rounded-[18px] text-[10px] font-black tracking-widest transition-all duration-500 ${role === 'student' ? 'bg-accent-primary text-bg-primary shadow-lg shadow-accent-primary/20' : 'text-fg-tertiary hover:text-white/60'}`}>
            STUDENT NODE
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[11px] font-bold tracking-widest text-fg-tertiary uppercase ml-1 opacity-50">
              {role === 'mentor' ? 'Credential Identity' : 'Member USN'}
            </label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-tertiary" />
              <input type={role === 'mentor' ? 'email' : 'text'} value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-14 py-5 text-white placeholder:text-white/10 focus:outline-none focus:border-white/10 focus:bg-white/[0.08] transition-all font-medium"
                placeholder={role === 'mentor' ? 'name@boringpeople.in' : '4SH24CS001'} required disabled={loading} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-[11px] font-bold tracking-widest text-fg-tertiary uppercase opacity-50">Security Hash</label>
            </div>
            <div className="relative">
              <Fingerprint className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-tertiary" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-14 py-5 text-white placeholder:text-white/10 focus:outline-none focus:border-white/10 focus:bg-white/[0.08] transition-all"
                placeholder="••••••••" required disabled={loading} />
            </div>
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger text-[11px] font-bold uppercase tracking-wider py-4 px-5 rounded-2xl flex items-center gap-3">
              <Lock className="w-4 h-4" /> {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className={`w-full h-16 rounded-[18px] font-black text-xs tracking-widest transition-all duration-500 shadow-2xl flex items-center justify-center gap-3 ${role === 'mentor' ? 'bg-accent-primary text-bg-primary shadow-accent-primary/20 hover:scale-[1.02]' : 'bg-accent-primary text-bg-primary shadow-accent-primary/20 hover:scale-[1.02]'} disabled:opacity-30 disabled:scale-100`}>
            {loading ? <Zap className="w-5 h-5 animate-pulse" /> : 'INITIALIZE SESSION'}
          </button>
        </form>
      </div>

      <div className="mt-12 flex flex-col items-center gap-4 opacity-30">
        <div className="flex gap-8">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-primary"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-accent-primary"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan"></div>
        </div>
        <p className="text-[10px] font-black tracking-[0.4em] uppercase text-fg-tertiary">ForgeGuard Protocol Active</p>
      </div>
    </div>
  );
};
