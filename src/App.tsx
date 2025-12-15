import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Pages
import { MainDashboard } from './pages/MainDashboard';
import { MapView } from './pages/MapView';
import { Overview } from './pages/Overview';
import { MonitorList } from './pages/MonitorList';
import { MonitorDetails } from './pages/MonitorDetails';
import { Performance } from './pages/Performance';
import { WidgetDetail } from './pages/WidgetDetail';
import { Analytics } from './pages/Analytics';
import { Alerts } from './pages/Alerts';
import { ServerUtilization } from './pages/ServerUtilization';
import { LiveUtilization } from './pages/LiveUtilization';
import { CpuUtilization } from './pages/CpuUtilization';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <MainDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <MainDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <Layout>
                  <MapView />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/overview"
            element={
              <ProtectedRoute>
                <Layout>
                  <Overview />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitors"
            element={
              <ProtectedRoute>
                <Layout>
                  <MonitorList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitors/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <MonitorDetails />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/performance"
            element={
              <ProtectedRoute>
                <Layout>
                  <Performance />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/widgets/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <WidgetDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Layout>
                  <Analytics />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <Layout>
                  <Alerts />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/server-utilization"
            element={
              <ProtectedRoute>
                <Layout>
                  <ServerUtilization />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/live-utilization"
            element={
              <ProtectedRoute>
                <Layout>
                  <LiveUtilization />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cpu-utilization"
            element={
              <ProtectedRoute>
                <Layout>
                  <CpuUtilization />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

