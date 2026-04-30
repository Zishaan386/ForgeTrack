import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Outlet } from 'react-router-dom';

export const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-canvas selection:bg-accent-glow/30">
      <Sidebar />
      <div className="flex-1 flex flex-col relative app-main overflow-x-hidden">
        <TopBar />
        <main className="flex-1 px-8 lg:px-20 py-12 max-w-[1600px] mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

