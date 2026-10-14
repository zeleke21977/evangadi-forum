/**
 * Route map: public pages live outside `Layout`; forum tools use `Layout` + `ProtectedRoute`.
 * Add new `<Route>` entries here, then wire navigation in `Sidebar.jsx` and
 * `Layout.jsx` (`getTitle` / `getSubtitle`) so the shell stays in sync.
 */
import React from 'react';
import { ConfirmProvider } from './contexts/ConfirmContext.jsx';
import { MessageProvider } from './contexts/MessageContext.jsx';
import { SocketProvider } from './contexts/SocketContext.jsx';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Auth from './pages/Auth/Auth';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import Dashboard from './pages/Dashboard/Dashboard';
import Landing from './pages/Landing/Landing';
import MyQuestions from './pages/MyQuestions/MyQuestions';
import PostQuestion from './pages/PostQuestion/PostQuestion';
import QuestionDetail from './pages/QuestionDetail/QuestionDetail';
import RagDocuments from "./pages/RagDocuments/RagDocuments";
import SavedQuestions from './pages/SavedQuestions/SavedQuestions.jsx';
import Profile from './pages/Profile/Profile.jsx';

import DiscussionRooms from './pages/DiscussionRooms/DiscussionRooms.jsx';
import PrivateChat from './pages/PrivateChat/PrivateChat.jsx';

function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <ConfirmProvider>
        <SocketProvider>
        <MessageProvider>
        <NotificationProvider>
        <Routes>
          {/* Public routes */}
          <Route path='/' element={<Landing />} />
          <Route path='/auth' element={<Auth />} />
          <Route path='/forgot-password' element={<ForgotPassword />} />
          <Route path='/reset-password' element={<ResetPassword />} />

          {/* Protected routes with Layout */}
          <Route element={<Layout />}>
            <Route path='/discussion-rooms' element={<ProtectedRoute><DiscussionRooms /></ProtectedRoute>} />
            <Route path='/private-chat' element={<ProtectedRoute><PrivateChat /></ProtectedRoute>} />
            <Route
              path='/dashboard'
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path='/questions/ask'
              element={
                <ProtectedRoute>
                  <PostQuestion />
                </ProtectedRoute>
              }
            />
            <Route
              path='/my-questions'
              element={
                <ProtectedRoute>
                  <MyQuestions />
                </ProtectedRoute>
              }
            />
            <Route path='/saved-questions' element={<ProtectedRoute><SavedQuestions /></ProtectedRoute>} />
            <Route path='/profile' element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route
              path='/questions/:questionHash'
              element={
                <ProtectedRoute>
                  <QuestionDetail />
                </ProtectedRoute>
              }
            />
            {/* Backward-compatible singular route used by older links/screenshots. */}
            <Route
              path='/question/:questionHash'
              element={
                <ProtectedRoute>
                  <QuestionDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path='/rag-documents'
              element={
                <ProtectedRoute>
                  <RagDocuments />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all redirect */}
          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
        </NotificationProvider>
        </MessageProvider>
        </SocketProvider>
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
