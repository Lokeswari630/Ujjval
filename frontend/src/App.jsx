import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, AuthContext } from "./contexts/AuthContext";
import { useContext } from "react";

/* ------------------- Pages ------------------- */
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";

/* Dashboards */
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import PharmacistDashboard from "./pages/PharmacistDashboard";
import AdminDashboard from "./pages/AdminDashboard";

/* Profiles */
import PatientProfile from "./pages/PatientProfile";
import DoctorProfile from "./pages/DoctorProfile";
import AdminProfile from "./pages/AdminProfile";
import PharmacistProfile from "./pages/PharmacistProfile";

/* Appointments */
import Appointments from "./pages/Appointments";
import SendPrescriptionToPharmacy from "./pages/SendPrescriptionToPharmacy";

/* Doctor Features */
import DoctorQueue from "./pages/DoctorQueue";
import DoctorPatientInsights from "./pages/DoctorPatientInsights";
import DoctorHealthPredictions from "./pages/DoctorHealthPredictions";

/* Patient Features */
import PatientHealthPredictions from "./pages/PatientHealthPredictions";
import EmergencyIncident from "./pages/EmergencyIncident";

/* Pharmacist Features */
import PharmacistQueue from "./pages/PharmacistQueue";
import PharmacistInventory from "./pages/PharmacistInventory";
import PharmacistAnalytics from "./pages/PharmacistAnalytics";
import PharmacistAI from "./pages/PharmacistAI";

/* Global Components */
import FloatingNLPWidget from "./components/chat/FloatingNLPWidget";

/* ------------------- Query Client ------------------- */
const queryClient = new QueryClient();

/* ------------------- Protected Route ------------------- */
const ProtectedRoute = ({ children, allowedRole, allowedRoles }) => {
  const authContext = useContext(AuthContext);
  const { isAuthenticated, user, isLoading } = authContext || {};

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-b-2 border-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  if (allowedRole && user?.role !== allowedRole)
    return <Navigate to="/dashboard" replace />;

  if (allowedRoles && !allowedRoles.includes(user?.role))
    return <Navigate to="/dashboard" replace />;

  return children;
};

/* ------------------- Role Redirect ------------------- */
const RoleHomeRedirect = () => {
  const { user, isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  switch (user?.role) {
    case "patient":
      return <Navigate to="/patient" replace />;
    case "doctor":
      return <Navigate to="/doctor" replace />;
    case "pharmacist":
      return <Navigate to="/pharmacist" replace />;
    case "admin":
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/auth" replace />;
  }
};

/* ------------------- Feature Redirects ------------------- */

const HealthPredictionRedirect = () => {
  const { user } = useContext(AuthContext);

  if (user?.role === "patient")
    return <Navigate to="/patient/health-predictions" replace />;

  if (user?.role === "doctor")
    return <Navigate to="/health-predictions" replace />;

  return <Navigate to="/dashboard" replace />;
};

const PharmacyRedirect = () => {
  const { user } = useContext(AuthContext);

  if (user?.role === "patient")
    return <Navigate to="/patient?tab=prescriptions" replace />;

  if (user?.role === "pharmacist")
    return <Navigate to="/pharmacist" replace />;

  return <Navigate to="/dashboard" replace />;
};

const RoleProfileRedirect = () => {
  const { user, isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  if (user?.role === 'patient') return <Navigate to="/patient/profile" replace />;
  if (user?.role === 'doctor') return <Navigate to="/doctor-profile" replace />;
  if (user?.role === 'pharmacist') return <Navigate to="/pharmacist/profile" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin-profile" replace />;

  return <Navigate to="/dashboard" replace />;
};

/* ------------------- Main App ------------------- */

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App relative min-h-screen overflow-x-hidden">
            
            {/* Background Overlay */}
            <div className="hospital-bg-overlay" />

            <div className="relative z-10">

              <Routes>

                {/* -------- Public Routes -------- */}

                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Auth />} />
                <Route path="/register" element={<Auth />} />
                <Route path="/auth" element={<Auth />} />

                {/* -------- Dashboard Redirect -------- */}

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <RoleHomeRedirect />
                    </ProtectedRoute>
                  }
                />

                {/* -------- Appointments -------- */}

                <Route
                  path="/appointments"
                  element={
                    <ProtectedRoute allowedRoles={["patient","doctor","admin"]}>
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
                  path="/appointments/send-to-pharmacy"
                  element={
                    <ProtectedRoute allowedRoles={["patient", "doctor"]}>
                      <SendPrescriptionToPharmacy />
                    </ProtectedRoute>
                  }
                />

                {/* -------- Patient Routes -------- */}

                <Route
                  path="/patient"
                  element={
                    <ProtectedRoute allowedRole="patient">
                      <PatientDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/patient/profile"
                  element={
                    <ProtectedRoute allowedRole="patient">
                      <PatientProfile />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/patient/health-predictions"
                  element={
                    <ProtectedRoute allowedRole="patient">
                      <PatientHealthPredictions />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/emergency/incidents"
                  element={
                    <ProtectedRoute allowedRole="patient">
                      <EmergencyIncident />
                    </ProtectedRoute>
                  }
                />

                {/* -------- Doctor Routes -------- */}

                <Route
                  path="/doctor"
                  element={
                    <ProtectedRoute allowedRole="doctor">
                      <DoctorDashboard />
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
                  path="/doctor-queue"
                  element={
                    <ProtectedRoute allowedRole="doctor">
                      <DoctorQueue />
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

                {/* -------- Pharmacist Routes -------- */}

                <Route
                  path="/pharmacist"
                  element={
                    <ProtectedRoute allowedRole="pharmacist">
                      <PharmacistDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/pharmacist/queue"
                  element={
                    <ProtectedRoute allowedRole="pharmacist">
                      <PharmacistQueue />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/pharmacist/inventory"
                  element={
                    <ProtectedRoute allowedRole="pharmacist">
                      <PharmacistInventory />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/pharmacist/analytics"
                  element={
                    <ProtectedRoute allowedRole="pharmacist">
                      <PharmacistAnalytics />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/pharmacist/ai"
                  element={
                    <ProtectedRoute allowedRole="pharmacist">
                      <PharmacistAI />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/pharmacist/profile"
                  element={
                    <ProtectedRoute allowedRole="pharmacist">
                      <PharmacistProfile />
                    </ProtectedRoute>
                  }
                />

                {/* -------- Admin Routes -------- */}

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminDashboard />
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

                {/* -------- Smart Redirect Routes -------- */}

                <Route
                  path="/health-prediction"
                  element={
                    <ProtectedRoute>
                      <HealthPredictionRedirect />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/pharmacy"
                  element={
                    <ProtectedRoute>
                      <PharmacyRedirect />
                    </ProtectedRoute>
                  }
                />

                <Route path="/profile" element={<RoleProfileRedirect />} />

                {/* -------- Catch All -------- */}

                <Route path="*" element={<RoleHomeRedirect />} />

              </Routes>

              {/* Global AI NLP Widget */}
              <FloatingNLPWidget />

            </div>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;