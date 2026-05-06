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
    const { data } = await supabase
      .from('students')
      .select('id, name, usn')
      .or(`name.ilike.%${searchQuery}%,usn.ilike.%${searchQuery}%`)
      .limit(5);
    setSuggestions(data || []);
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      executeSearch(searchQuery);
    }
  };

  const executeSearch = (query) => {
    console.log('TopBar: Searching for:', query);
    navigate(`/history?search=${encodeURIComponent(query)}`);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 lg:px-12 pt-8 pb-4">
      <div className="text-body-sm text-fg-tertiary flex items-center gap-2">
        <span>Overview</span>
        <span>/</span>
        <span className="text-fg-primary">{currentRouteName}</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary" />
          <input 
            type="text" 
            placeholder="Search students, sessions..." 
            className="input w-64 pl-10 h-10 bg-surface text-body-sm focus:ring-2 focus:ring-indigo-500/20"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleSearch}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-4 bg-[#0A0A0A]/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="text-[10px] font-bold tracking-[0.2em] text-fg-tertiary px-4 pt-4 pb-2 uppercase opacity-50">Results</div>
              {suggestions.map(s => (
                <div 
                  key={s.id} 
                  className="px-4 py-3 hover:bg-white/[0.05] cursor-pointer flex flex-col border-b border-white/5 last:border-0 transition-colors group"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeSearch(s.usn);
                  }}
                >
                  <div className="text-body-sm font-medium text-fg-primary group-hover:text-indigo-400 transition-colors">{s.name}</div>
                  <div className="text-[11px] text-fg-tertiary font-mono">{s.usn}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Link to="/profile" className="flex items-center gap-3 hover:bg-white/[0.03] p-1.5 rounded-xl transition-colors group">
          <div className="text-right hidden sm:block">
            <div className="text-body-sm font-medium group-hover:text-indigo-400 transition-colors">{profile?.display_name}</div>
            <div className="text-caption text-fg-tertiary capitalize">{profile?.role}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-raised border border-border-default flex items-center justify-center text-body-lg font-medium group-hover:border-indigo-500/50 transition-colors overflow-hidden">
            {profile?.display_name?.charAt(0) || <User className="w-5 h-5 text-fg-tertiary" />}
          </div>
        </Link>
      </div>
    </header>
  );
};
