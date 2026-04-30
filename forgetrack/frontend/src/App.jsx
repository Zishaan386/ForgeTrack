import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { RoleGuard } from './components/RoleGuard';

// Pages
import { Login } from './pages/Login';
import { ChangePassword } from './pages/ChangePassword';
import { Forbidden } from './pages/Forbidden';
import { Dashboard } from './pages/Dashboard';
import { Attendance } from './pages/Attendance';
import { History } from './pages/History';
import { Materials } from './pages/Materials';
import { 
  StudentAttendance, StudentUpcoming, StudentMaterials 
} from './pages/Placeholders';
import { Upload } from './pages/Upload';
import { Profile } from './pages/Profile';

const IndexRedirect = () => {
  const { profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-fg-secondary">Initializing ForgeTrack...</div>
      </div>
    );
  }
  
  if (profile?.role === 'mentor') {
    return <Navigate to="/dashboard" replace />;
  } else if (profile?.role === 'student') {
    return <Navigate to="/me/attendance" replace />;
  }
  
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/403" element={<Forbidden />} />
          
          {/* We protect change-password to ensure someone is logged in, but we don't care about their role as long as they are a student */}
          <Route 
            path="/change-password" 
            element={
              <RoleGuard allowedRoles={['student']}>
                <ChangePassword />
              </RoleGuard>
            } 
          />

          {/* Root Redirect */}
          <Route path="/" element={<IndexRedirect />} />

          {/* Mentor Routes */}
          <Route element={
            <RoleGuard allowedRoles={['mentor']}>
              <AppLayout />
            </RoleGuard>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/history" element={<History />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Student Routes */}
          <Route element={
            <RoleGuard allowedRoles={['student']}>
              <AppLayout />
            </RoleGuard>
          }>
            <Route path="/me/attendance" element={<StudentAttendance />} />
            <Route path="/me/upcoming" element={<StudentUpcoming />} />
            <Route path="/me/materials" element={<StudentMaterials />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
