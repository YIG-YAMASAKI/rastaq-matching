import { useEffect, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { unreadForRastaq } from '../lib';
import { useStore } from '../store/AppStore';

const SECTIONS: { path: string; label: string; icon: string; end?: boolean }[] = [
  { path: '/admin', label: 'ダッシュボード', icon: '▦', end: true },
  { path: '/admin/projects', label: '案件管理', icon: '☰' },
  { path: '/admin/chats', label: 'チャット', icon: '✉' },
  { path: '/admin/partners', label: '協力業者管理', icon: '⚑' },
  { path: '/admin/reviews', label: '新規登録審査', icon: '✔' },
  { path: '/admin/history', label: '通知・操作履歴', icon: '⏱' },
];

export function AdminLayout() {
  const { state } = useStore();
  const { pathname } = useLocation();
  const unread = unreadForRastaq(state).length;
  const reviewing = state.partners.filter((p) => p.registrationStatus === '審査中').length;
  const badge: Record<string, number> = { '/admin/chats': unread, '/admin/reviews': reviewing };
  const current =
    [...SECTIONS].reverse().find((s) => (s.end ? pathname === s.path : pathname.startsWith(s.path)))?.label ?? '';

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="admin">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">R</div>
          <div>
            <div className="brand-name">RASTAQ</div>
            <div className="brand-sub">案件マッチング管理</div>
          </div>
        </div>
        <NavLink to="/admin/projects/new" className="btn btn-primary sidebar-cta">
          ＋ 案件を登録
        </NavLink>
        <nav className="side-nav">
          {SECTIONS.map((s) => (
            <NavLink key={s.path} to={s.path} end={s.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-icon">{s.icon}</span>
              <span className="nav-label">{s.label}</span>
              {badge[s.path] > 0 && <span className="nav-badge">{badge[s.path]}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          デモ版 v0.1
          <br />
          データはこのブラウザ内に保存されます
        </div>
      </aside>
      <div className="admin-main">
        <header className="topbar">
          <div className="topbar-title">{current}</div>
          <div className="topbar-user">
            <div className="avatar">佐</div>
            <div>
              <div className="user-name">{state.adminUser}</div>
              <div className="user-role">案件担当者</div>
            </div>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export const PageHeader = ({
  title,
  sub,
  actions,
  back,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) => (
  <div className="page-header">
    <div className="page-header-main">
      {back && <div className="page-back">{back}</div>}
      <h1>{title}</h1>
      {sub && <div className="page-sub">{sub}</div>}
    </div>
    {actions && <div className="page-actions">{actions}</div>}
  </div>
);
