import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/login/LoginPage';
import { UserList } from './pages/users/UserList';
import { TierMatrix } from './pages/tiers/TierMatrix';
import { WorkspaceList } from './pages/workspaces/WorkspaceList';
import { WorkspaceDetail } from './pages/workspaces/WorkspaceDetail';
import { AuditLogList } from './pages/audit-logs/AuditLogList';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/users" replace />} />
            <Route path="users" element={<UserList />} />
            <Route path="tier-matrix" element={<TierMatrix />} />
            <Route path="workspaces" element={<WorkspaceList />} />
            <Route path="workspaces/:id" element={<WorkspaceDetail />} />
            <Route path="audit-logs" element={<AuditLogList />} />
          </Route>
          <Route path="*" element={<Navigate to="/users" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
