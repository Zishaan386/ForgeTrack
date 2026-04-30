import { useAuth } from '../../contexts/AuthContext';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Users, BookOpen, Upload, UserCheck, Calendar, Settings, LogOut } from 'lucide-react';

export const Sidebar = () => {
  const { profile, signOut } = useAuth();

  const isMentor = profile?.role === 'mentor';

  const mentorLinks = [
    { label: 'Overview', items: [{ name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }] },
    { label: 'Activity', items: [
      { name: 'Mark Attendance', path: '/attendance', icon: CheckSquare },
      { name: 'Student History', path: '/history', icon: Users },
      { name: 'Materials', path: '/materials', icon: BookOpen }
    ]},
    { label: 'Data', items: [{ name: 'Upload CSV', path: '/upload', icon: Upload }] },
  ];

  const studentLinks = [
    { label: 'Overview', items: [
      { name: 'My Attendance', path: '/me/attendance', icon: UserCheck },
      { name: 'Upcoming', path: '/me/upcoming', icon: Calendar },
      { name: 'Materials', path: '/me/materials', icon: BookOpen }
    ]}
  ];

  const links = isMentor ? mentorLinks : studentLinks;

  return (
    <aside className="w-[300px] flex flex-col bg-[#07070A] border-r border-white/5 h-screen sticky top-0 z-50">
      <div className="p-10 pb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3 text-white">
          <div className="w-1.5 h-7 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.8)]"></div>
          ForgeTrack
        </h1>
      </div>
      
      <div className="px-6 py-8 mb-4">
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.05] group hover:border-indigo-500/30 transition-all duration-500">
          <div className="text-[10px] font-bold tracking-[0.2em] text-white/30 mb-2">AUTH-MEMBER</div>
          <div className="text-sm font-semibold text-white/90 truncate">{profile?.display_name}</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-6 space-y-10">
        {links.map((section) => (
          <div key={section.label}>
            <div className="text-[10px] font-bold tracking-[0.25em] text-white/20 mb-4 px-2 uppercase">{section.label}</div>
            <div className="space-y-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-4 px-4 py-4 rounded-2xl text-sm transition-all relative group ${
                        isActive 
                          ? 'bg-indigo-500/10 text-white shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]' 
                          : 'text-white/40 hover:text-white hover:bg-white/[0.03]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <div className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.6)]"></div>
                        )}
                        <Icon className={`w-5 h-5 transition-all duration-300 group-hover:scale-110 ${isActive ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]' : 'text-white/20 group-hover:text-white/60'}`} strokeWidth={isActive ? 2 : 1.5} />
                        <span className={`tracking-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.name}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <div className="text-label text-fg-tertiary mb-3 px-2">Account</div>
          <div className="space-y-1">
        <button
          onClick={() => {
            console.log('Sidebar: Logout button clicked');
            signOut();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-body text-fg-secondary hover:bg-surface transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5" strokeWidth={1.75} />
          Logout
        </button>
          </div>
        </div>
      </nav>
    </aside>
  );
};
