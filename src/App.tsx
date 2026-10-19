import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './admin/AdminLayout';
import { ChatPage } from './admin/ChatPage';
import { Dashboard } from './admin/Dashboard';
import { HistoryPage } from './admin/HistoryPage';
import { PartnerDetail } from './admin/PartnerDetail';
import { PartnerList } from './admin/PartnerList';
import { ProjectDetail } from './admin/ProjectDetail';
import { ProjectForm } from './admin/ProjectForm';
import { ProjectList } from './admin/ProjectList';
import { ReviewList } from './admin/ReviewList';
import { DemoBar } from './components/DemoBar';
import { Toasts } from './components/ui';
import { PhoneFrame } from './partner/PhoneFrame';
import { SpApplications } from './partner/SpApplications';
import { SpChatList, SpChatThread } from './partner/SpChat';
import { SpLayout } from './partner/SpLayout';
import { SpProfile } from './partner/SpProfile';
import { SpProjectDetail } from './partner/SpProjectDetail';
import { SpProjectList } from './partner/SpProjectList';
import { RegisterDone, RegisterForm } from './partner/RegisterForm';

export default function App() {
  return (
    <>
      <DemoBar />
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* A. RASTAQ側 PC管理画面 */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<ProjectList />} />
          <Route path="projects/new" element={<ProjectForm />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="projects/:id/edit" element={<ProjectForm />} />
          <Route path="chats" element={<ChatPage />} />
          <Route path="chats/:projectId/:partnerId" element={<ChatPage />} />
          <Route path="partners" element={<PartnerList />} />
          <Route path="partners/:id" element={<PartnerDetail />} />
          <Route path="reviews" element={<ReviewList />} />
          <Route path="reviews/:id" element={<PartnerDetail review />} />
          <Route path="history" element={<HistoryPage />} />
        </Route>

        {/* B. 協力業者側 スマホ画面 */}
        <Route element={<PhoneFrame />}>
          <Route path="/sp" element={<SpLayout />}>
            <Route index element={<SpProjectList />} />
            <Route path="projects/:id" element={<SpProjectDetail />} />
            <Route path="applications" element={<SpApplications />} />
            <Route path="chats" element={<SpChatList />} />
            <Route path="chats/:projectId" element={<SpChatThread />} />
            <Route path="profile" element={<SpProfile />} />
          </Route>
          {/* ログイン不要の新規登録フォーム（URL/QRからアクセス想定） */}
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/register/done" element={<RegisterDone />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
      <Toasts />
    </>
  );
}
