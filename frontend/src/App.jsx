import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import Auth from './pages/Auth';
import LandingPage from './pages/LandingPage';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import PharmacistDashboard from './pages/PharmacistDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PatientProfile from './pages/PatientProfile';
import DoctorProfile from './pages/DoctorProfile';
import DoctorQueue from './pages/DoctorQueue';
import AdminProfile from './pages/AdminProfile';
import Appointments from './pages/Appointments';
import DoctorHealthPredictions from './pages/DoctorHealthPredictions';
import DoctorPatientInsights from './pages/DoctorPatientInsights';
import { useContext } from 'react';

// Create a client
const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children, allowedRole, allowedRoles }) => {
  const authContext = useContext(AuthContext);
  const { isAuthenticated, user, isLoading } = authContext || {};

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-10 w-10 rounded-full border-b-2 border-blue-600 animate-spin" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const RoleHomeRedirect = () => {
  const authContext = useContext(AuthContext);
  const { isAuthenticated, user, isLoading } = authContext || {};

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-10 w-10 rounded-full border-b-2 border-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (user?.role === 'patient') {
    return <Navigate to="/patient" replace />;
  }

  if (user?.role === 'doctor') {
    return <Navigate to="/doctor" replace />;
  }

  if (user?.role === 'pharmacist') {
    return <Navigate to="/pharmacist" replace />;
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Auth Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Auth />} />
              <Route path="/auth" element={<Auth />} />

              {/* Profile Routes */}
              <Route
                path="/patient-profile"
                element={
                  <ProtectedRoute allowedRole="patient">
                    <PatientProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor-profile"
                element={
                  <ProtectedRoute allowedRole="doctor">
                    <DoctorProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-profile"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminProfile />
                  </ProtectedRoute>
                }
              />
              
              {/* Dashboard Routes */}
              <Route 
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <RoleHomeRedirect />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/appointments"
                element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}>
                    <Appointments />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/appointments/book"
                element={
                  <ProtectedRoute allowedRole="patient">
                    <Appointments />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/doctor-queue"
                element={
                  <ProtectedRoute allowedRole="doctor">
                    <DoctorQueue />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/doctor-timeline"
                element={
                  <ProtectedRoute allowedRole="doctor">
                    <DoctorPatientInsights />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/patient-insights"
                element={
                  <ProtectedRoute allowedRole="doctor">
                    <DoctorPatientInsights />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/patients"
                element={
                  <ProtectedRoute allowedRole="doctor">
                    <DoctorPatientInsights />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/health-predictions"
                element={
                  <ProtectedRoute allowedRole="doctor">
                    <DoctorHealthPredictions />
                  </ProtectedRoute>
                }
              />

              {/* Route aliases for quick actions */}
              <Route path="/health-prediction" element={<RoleHomeRedirect />} />
              <Route path="/profile" element={<RoleHomeRedirect />} />
              <Route path="/pharmacy" element={<RoleHomeRedirect />} />
              <Route path="/doctors" element={<RoleHomeRedirect />} />
              <Route path="/inventory" element={<RoleHomeRedirect />} />
              <Route path="/orders" element={<RoleHomeRedirect />} />
              
              {/* Protected Routes */}
              <Route 
                path="/patient" 
                element={
                  <ProtectedRoute allowedRole="patient">
                    <PatientDashboard />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/doctor" 
                element={
                  <ProtectedRoute allowedRole="doctor">
                    <DoctorDashboard />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/pharmacist" 
                element={
                  <ProtectedRoute allowedRole="pharmacist">
                    <PharmacistDashboard />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              
              <Route path="*" element={<RoleHomeRedirect />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
