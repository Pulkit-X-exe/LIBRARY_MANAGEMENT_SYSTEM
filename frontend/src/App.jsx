import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import DashboardLayout from './layouts/DashboardLayout';

// Auth & Profile Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import Profile from './pages/profile/Profile';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import BrowseBooks from './pages/student/BrowseBooks';
import MyLoans from './pages/student/MyLoans';
import ReservationsView from './pages/student/ReservationsView';
import FinesView from './pages/student/FinesView';
import WishlistView from './pages/student/WishlistView';
import DigitalLibraryView from './pages/student/DigitalLibraryView';
import DigitalCardPage from './pages/student/DigitalCardPage';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';

// Librarian Pages
import LibrarianDashboard from './pages/librarian/LibrarianDashboard';
import CirculationDesk from './pages/librarian/CirculationDesk';
import BookManager from './pages/librarian/BookManager';
import ReservationManager from './pages/librarian/ReservationManager';
import FineManager from './pages/librarian/FineManager';
import InventoryHealth from './pages/librarian/InventoryHealth';
import AnnouncementsManager from './pages/librarian/AnnouncementsManager';
import StudentsManager from './pages/librarian/StudentsManager';
import IssuedBooksManager from './pages/librarian/IssuedBooksManager';
import DefaultersManager from './pages/librarian/DefaultersManager';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManager from './pages/admin/UserManager';
import MasterCatalog from './pages/admin/MasterCatalog';
import RulesAndSettings from './pages/admin/RulesAndSettings';
import ReportsAnalytics from './pages/admin/ReportsAnalytics';
import ActivityLogsView from './pages/admin/ActivityLogsView';
import BackupRestore from './pages/admin/BackupRestore';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their own dashboard
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'librarian') return <Navigate to="/librarian" replace />;
    if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
    return <Navigate to="/student" replace />;
  }

  return children;
};

// Index Redirection based on role
const RootRedirect = () => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'librarian') return <Navigate to="/librarian" replace />;
  if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
  return <Navigate to="/student" replace />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<Navigate to="/forgot-password" replace />} />
              <Route path="/signup" element={<Navigate to="/register" replace />} />

              {/* Protected App Routes wrapped in DashboardLayout */}
              <Route
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                {/* Root & Dashboard Routes */}
                <Route path="/" element={<RootRedirect />} />
                <Route path="/dashboard" element={<RootRedirect />} />
                <Route path="/profile" element={<Profile />} />

                {/* Student Routes */}
                <Route path="/student" element={<StudentDashboard />} />
                <Route path="/student/books" element={<BrowseBooks />} />
                <Route path="/student/loans" element={<MyLoans />} />
                <Route path="/student/reservations" element={<ReservationsView />} />
                <Route path="/student/wishlist" element={<WishlistView />} />
                <Route path="/student/fines" element={<FinesView />} />
                <Route path="/student/digital" element={<DigitalLibraryView />} />
                <Route path="/student/card" element={<DigitalCardPage />} />

                {/* Teacher Routes */}
                <Route path="/teacher" element={<TeacherDashboard />} />
                <Route path="/teacher/books" element={<BrowseBooks />} />
                <Route path="/teacher/loans" element={<MyLoans />} />
                <Route path="/teacher/reservations" element={<ReservationsView />} />
                <Route path="/teacher/digital" element={<DigitalLibraryView />} />

                {/* Librarian Routes */}
                <Route
                  path="/librarian"
                  element={
                    <ProtectedRoute allowedRoles={['librarian', 'admin']}>
                      <LibrarianDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/librarian/students"
                  element={
                    <ProtectedRoute allowedRoles={['librarian', 'admin']}>
                      <StudentsManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/librarian/circulation"
                  element={
                    <ProtectedRoute allowedRoles={['librarian', 'admin']}>
                      <CirculationDesk />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/librarian/books"
                  element={
                    <ProtectedRoute allowedRoles={['librarian', 'admin']}>
                      <BookManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/librarian/reservations"
                  element={
                    <ProtectedRoute allowedRoles={['librarian', 'admin']}>
                      <ReservationManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/librarian/fines"
                  element={
                    <ProtectedRoute allowedRoles={['librarian', 'admin']}>
                      <FineManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/librarian/inventory-health"
                  element={
                    <ProtectedRoute allowedRoles={['librarian', 'admin']}>
                      <InventoryHealth />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/librarian/announcements"
                  element={
                    <ProtectedRoute allowedRoles={['librarian', 'admin']}>
                      <AnnouncementsManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/librarian/issued-books"
                  element={
                    <ProtectedRoute allowedRoles={['librarian', 'admin']}>
                      <IssuedBooksManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/librarian/defaulters"
                  element={
                    <ProtectedRoute allowedRoles={['librarian', 'admin']}>
                      <DefaultersManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/librarian/reports"
                  element={
                    <ProtectedRoute allowedRoles={['librarian', 'admin']}>
                      <ReportsAnalytics />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <UserManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/catalog"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <MasterCatalog />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/circulation"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <CirculationDesk />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/fines"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <FineManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/rules"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <RulesAndSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <ReportsAnalytics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/activity-logs"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <ActivityLogsView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/backup"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <BackupRestore />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
