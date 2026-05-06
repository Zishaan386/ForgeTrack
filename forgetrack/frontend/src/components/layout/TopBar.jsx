import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, User } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const routeNames = {
  '/dashboard': 'Dashboard',
  '/attendance': 'Mark Attendance',
  '/history': 'Student History',
  '/materials': 'Materials',
  '/upload': 'Upload CSV',
  '/profile': 'User Profile',
  '/me/attendance': 'My Attendance',
  '/me/upcoming': 'Upcoming',
  '/me/materials': 'Materials'
};

export const TopBar = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const currentRouteName = routeNames[location.pathname] || 'Overview';

  useEffect(() => {
    if (searchQuery.length > 1) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  const fetchSuggestions = async () => {
    if (profile?.role === 'mentor') {
      const { data } = await supabase
        .from('students')
        .select('id, name, usn')
        .or(`name.ilike.%${searchQuery}%,usn.ilike.%${searchQuery}%`)
        .limit(5);
      setSuggestions(data || []);
    } else {
      const { data } = await supabase
        .from('sessions')
        .select('id, topic, date')
        .ilike('topic', `%${searchQuery}%`)
        .limit(5);
      setSuggestions(data || []);
    }
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      executeSearch(searchQuery);
    }
  };

  const executeSearch = (query) => {
    if (profile?.role === 'mentor') {
      navigate(`/history?search=${encodeURIComponent(query)}`);
    } else {
      navigate(`/me/attendance?search=${encodeURIComponent(query)}`);
    }
    setSearchQuery('');
    setShowSuggestions(false);
  };

  return (
    <header className="h-24 flex items-center justify-between px-6 lg:px-12 z-40 relative">
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-1.5 h-7 bg-accent-primary rounded-full shadow-[0_0_20px_rgba(215,241,74,0.4)] transition-all group-hover:scale-y-110"></div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-white uppercase">ForgeTrack</h1>
        </Link>
        
        <div className="hidden lg:flex items-center gap-2 text-[11px] font-bold tracking-widest text-fg-tertiary uppercase opacity-40">
          <span>{currentRouteName}</span>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="relative hidden md:block">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-tertiary pointer-events-none group">
            <Search className="w-4 h-4 transition-colors group-focus-within:text-accent-primary" />
          </div>
          <input 
            type="text" 
            placeholder={profile?.role === 'mentor' ? 'Search students...' : 'Search session topics...'} 
            className="w-72 pl-12 pr-4 h-11 bg-white/5 border border-white/5 rounded-xl text-sm transition-all focus:outline-none focus:border-white/10 focus:bg-white/[0.08] focus:w-80"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleSearch}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-4 bg-bg-card-solid/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden z-[100]">
              <div className="text-[10px] font-bold tracking-[0.2em] text-fg-tertiary px-4 pt-4 pb-2 uppercase opacity-40">Quick Results</div>
              {suggestions.map(s => (
                <div 
                  key={s.id} 
                  className="px-4 py-3 hover:bg-white/[0.05] cursor-pointer flex flex-col border-b border-white/5 last:border-0 transition-colors group"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeSearch(s.usn);
                  }}
                >
                  <div className="text-sm font-medium text-fg-primary group-hover:text-accent-primary transition-colors">
                    {profile?.role === 'mentor' ? s.name : s.topic}
                  </div>
                  <div className="text-[11px] text-fg-tertiary font-mono">
                    {profile?.role === 'mentor' ? s.usn : new Date(s.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-6">
          <Link to="/profile" className="flex items-center gap-4 group">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-white group-hover:text-accent-primary transition-colors">{profile?.display_name}</div>
              <div className="text-[10px] font-bold tracking-widest text-fg-tertiary uppercase opacity-40">{profile?.role}</div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-lg font-display font-bold group-hover:border-accent-primary/50 transition-all overflow-hidden shadow-lg">
              {profile?.display_name?.charAt(0) || <User className="w-5 h-5 text-fg-tertiary" />}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};
