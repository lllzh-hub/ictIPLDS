import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import Layout from './components/layouts/Layout';
import AIAssistant from './components/features/AIAssistant';
import Dashboard from './pages/Dashboard';
import DefectManagement from './pages/DefectManagement';
import DefectDetailView from './pages/DefectDetailView';
import UAVManagement from './pages/UAVManagement';
import Login from './pages/Login';

function isAuthenticated(): boolean {
  return sessionStorage.getItem('gridEyeAuth') !== null;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  const authed = isAuthenticated();
  const onLoginPage = location.pathname === '/login';

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/defect/:id" element={
          <ProtectedRoute><DefectDetailView /></ProtectedRoute>
        } />

        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/defect-management" element={<DefectManagement />} />
                <Route path="/uav-management" element={<UAVManagement />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
      {authed && !onLoginPage && <AIAssistant />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
