import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const RoleGuard = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-fg-secondary">Loading...</div>
      </div>
    );
  }

  // Not logged in
  if (!user || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but wrong role
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/403" replace />;
  }

  return children;
};
