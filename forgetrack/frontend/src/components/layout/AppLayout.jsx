import { FloatingNav } from './FloatingNav';
import { TopBar } from './TopBar';
import { Outlet } from 'react-router-dom';

export const AppLayout = () => {
  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="flex flex-col relative min-h-screen">
        <TopBar />
        <main className="flex-1 px-6 lg:px-12 py-10 pb-32 max-w-[1400px] mx-auto w-full">
          <Outlet />
        </main>
        <FloatingNav />
      </div>
    </div>
  );
};
