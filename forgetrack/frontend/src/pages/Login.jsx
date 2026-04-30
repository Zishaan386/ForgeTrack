import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Login = () => {
  const [role, setRole] = useState('mentor'); // 'mentor' or 'student'
  const [identifier, setIdentifier] = useState(''); // email or usn
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && profile) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, profile, authLoading, navigate, location]);

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("Login attempt started for:", role, identifier);
    setLoading(true);
    setError('');

    const email = role === 'student' ? `${identifier}@forge.local` : identifier;

    try {
      console.log("Calling Supabase signInWithPassword...");
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error("Auth error caught:", authError);
        throw authError;
      }

      console.log("Auth successful, data:", data);

      // Wait for AuthContext to fetch the profile
      console.log("Waiting for profile to be fetched...");
      let attempts = 0;
      while (!profile && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }
      
      console.log("Profile state after waiting:", profile ? "Found" : "Missing");

      // Check for first-time student login
      if (role === 'student' && password === identifier) {
        console.log("Redirecting to change-password...");
        navigate('/change-password', { replace: true });
        return;
      }

      const from = location.state?.from?.pathname || '/';
      console.log("Redirecting to:", from);
      navigate(from, { replace: true });

    } catch (err) {
      console.error("Catch block caught error:", err);
      setError(err.message === 'Invalid login credentials' ? 'Invalid credentials' : err.message || 'An error occurred.');
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="mb-12 text-center relative z-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-1.5 h-8 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.8)]"></div>
          <h1 className="text-4xl font-bold tracking-tighter text-white">ForgeTrack</h1>
        </div>
        <p className="text-muted-foreground font-medium tracking-tight">The ultimate program management engine.</p>
      </div>

      <div className="premium-card max-w-md w-full p-10 relative z-10 border-white/[0.05]">
        <div className="flex bg-white/[0.03] p-1.5 rounded-2xl mb-10 border border-white/[0.05]">
          <button
            type="button"
            onClick={() => { setRole('mentor'); setIdentifier(''); setError(''); }}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold tracking-widest transition-all duration-300 ${
              role === 'mentor' 
                ? 'bg-white text-black shadow-xl shadow-white/10' 
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            MENTOR
          </button>
          <button
            type="button"
            onClick={() => { setRole('student'); setIdentifier(''); setError(''); }}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold tracking-widest transition-all duration-300 ${
              role === 'student' 
                ? 'bg-white text-black shadow-xl shadow-white/10' 
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            STUDENT
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-bold tracking-[0.25em] text-white/30 uppercase ml-1">
              {role === 'mentor' ? 'Email Address' : 'USN'}
            </label>
            <input
              type={role === 'mentor' ? 'email' : 'text'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
              placeholder={role === 'mentor' ? 'name@company.com' : '4SH24CS001'}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold tracking-[0.25em] text-white/30 uppercase">
                Password
              </label>
              <button type="button" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest">
                Forgot?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm py-4 px-5 rounded-2xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-2xl shadow-white/10 disabled:opacity-50 disabled:hover:scale-100 mt-4"
          >
            {loading ? 'AUTHENTICATING...' : 'SIGN IN'}
          </button>
        </form>
      </div>

      <p className="mt-12 text-white/20 text-xs font-medium tracking-[0.1em] uppercase">
        Protected by ForgeGuard Secure Auth
      </p>
    </div>
  );
};
