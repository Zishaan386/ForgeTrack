import { useAuth } from '../../contexts/AuthContext';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Users, BookOpen, Upload, UserCheck, Calendar, LogOut, User } from 'lucide-react';

export const FloatingNav = () => {
  const { profile, signOut } = useAuth();
  const isMentor = profile?.role === 'mentor';

  const mentorLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Attendance', path: '/attendance', icon: CheckSquare },
    { name: 'Students', path: '/history', icon: Users },
    { name: 'Materials', path: '/materials', icon: BookOpen },
    { name: 'Upload', path: '/upload', icon: Upload },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const studentLinks = [
    { name: 'Attendance', path: '/me/attendance', icon: UserCheck },
    { name: 'Upcoming', path: '/me/upcoming', icon: Calendar },
    { name: 'Materials', path: '/me/materials', icon: BookOpen },
  ];

  const links = isMentor ? mentorLinks : studentLinks;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
      <nav className="flex items-center gap-2 p-2 bg-[rgba(22,24,34,0.72)] backdrop-blur-[18px] border border-[rgba(255,255,255,0.08)] rounded-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-center w-[52px] h-[52px] rounded-[18px] transition-all duration-500 relative group ${
                  isActive 
                    ? 'bg-accent-primary text-[#111318] shadow-[0_0_20px_rgba(215,241,74,0.3)]' 
                    : 'text-fg-secondary hover:text-fg-primary hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  {/* Tooltip */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-bg-card-solid text-[11px] font-bold text-fg-primary rounded-lg border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap tracking-wider">
                    {item.name}
                  </div>
                  {/* Active Indicator Glow */}
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-primary blur-[2px]"></div>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
        
        <div className="w-[1px] h-8 bg-white/10 mx-1"></div>
        
        <button
          onClick={signOut}
          className="flex items-center justify-center w-[52px] h-[52px] rounded-[18px] text-danger hover:bg-danger/10 transition-all duration-500 group relative"
        >
          <LogOut className="w-5 h-5" strokeWidth={2} />
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-bg-card-solid text-[11px] font-bold text-danger rounded-lg border border-danger/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap tracking-wider">
            Logout
          </div>
        </button>
      </nav>
    </div>
  );
};
