import { Navigate, Route, Routes } from 'react-router';
import { useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { DesignPage } from './pages/DesignPage';
import { ExerciseEditorPage } from './pages/ExerciseEditorPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { LimitsPage } from './pages/LimitsPage';
import { LoginPage } from './pages/LoginPage';
import { ProgramEditorPage } from './pages/ProgramEditorPage';
import { ProgramsPage } from './pages/ProgramsPage';
import { TextsPage } from './pages/TextsPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { UsersPage } from './pages/UsersPage';

export function App() {
  const { isAuthed } = useAuth();
  if (!isAuthed) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="exercises" element={<ExercisesPage />} />
        <Route path="exercises/:id" element={<ExerciseEditorPage />} />
        <Route path="programs" element={<ProgramsPage />} />
        <Route path="programs/:id" element={<ProgramEditorPage />} />
        <Route path="design" element={<DesignPage />} />
        <Route path="texts" element={<TextsPage />} />
        <Route path="limits" element={<LimitsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
