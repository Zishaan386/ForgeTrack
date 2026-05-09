import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';

export const Forbidden = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleReturn = () => {
    if (profile?.role === 'mentor') {
      navigate('/dashboard');
    } else {
      navigate('/me/attendance');
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="card max-w-md text-center p-12 space-y-6">
        <div className="w-16 h-16 bg-danger-bg rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 text-danger-fg" />
        </div>
        <div>
          <h1 className="text-h2 font-display mb-2">Access Denied</h1>
          <p className="text-body text-fg-secondary">
            You don't have permission to view this page based on your current role.
          </p>
        </div>
        <button onClick={handleReturn} className="btn-primary">
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};
