import { useEffect, useRef, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { unreadForPartner } from '../lib';
import { useCurrentPartner, useStore } from '../store/AppStore';

/** 協力業者が閲覧できる案件（通知済み・下書き以外） */
export const useVisibleProjects = () => {
  const { state } = useStore();
  const partner = useCurrentPartner();
  return state.projects.filter((p) => p.status !== '下書き' && p.notifiedPartnerIds.includes(partner.id));
};

export function SpLayout() {
  const { state } = useStore();
  const partner = useCurrentPartner();
  const unread = unreadForPartner(state, partner.id).length;
  const visible = useVisibleProjects();
  const newCount = visible.filter(
    (p) => p.status === '募集中' && !state.applications.some((a) => a.projectId === p.id && a.partnerId === partner.id),
  ).length;
  const resultCount = state.applications.filter((a) => a.partnerId === partner.id && !a.partnerSeenResult).length;
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  // 画面遷移時にスクロール位置を先頭へ戻す
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  if (partner.registrationStatus !== '承認済み') {
    return (
      <div className="sp">
        <div className="sp-blocked">
          <div className="empty-icon">🔒</div>
          <h2>ご利用いただけません</h2>
          <p>
            {partner.companyName} は現在「{partner.registrationStatus}」のため、案件を閲覧できません。
            <br />
            RASTAQまでお問い合わせください。
          </p>
          <p className="small muted">上部のバーで別のログイン業者を選択してください。</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { to: '/sp', label: '案件', icon: '📋', badge: newCount + resultCount, end: true },
    { to: '/sp/applications', label: '応募履歴', icon: '🗂', badge: 0 },
    { to: '/sp/chats', label: 'チャット', icon: '💬', badge: unread },
    { to: '/sp/profile', label: '自社情報', icon: '🏢', badge: 0 },
  ];

  return (
    <div className="sp">
      <header className="sp-header">
        <Link to="/sp" className="sp-brand">
          <span className="brand-logo sm">R</span>
          <span>RASTAQ 協力業者</span>
        </Link>
        <span className="sp-company">{partner.companyName.replace(/株式会社|有限会社|合同会社/g, '').trim()}</span>
      </header>
      <main className="sp-main" ref={mainRef}>
        <Outlet />
      </main>
      <nav className="sp-nav">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="sp-nav-icon">
              <span className="sp-nav-emoji">{t.icon}</span>
              {t.badge > 0 && <span className="sp-nav-badge">{t.badge}</span>}
            </span>
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** スマホ画面のサブページ見出し（戻るボタン付き） */
export function SpSubHeader({ title, back = '/sp', right }: { title: string; back?: string; right?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="sp-subheader">
      <button className="sp-back" onClick={() => navigate(back)} aria-label="戻る">
        ‹
      </button>
      <h1>{title}</h1>
      <div className="sp-subheader-right">{right}</div>
    </div>
  );
}
