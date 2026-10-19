import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/AppStore';
import { ConfirmDialog } from './ui';

/** デモ用の画面切替バー（本番では不要） */
export function DemoBar() {
  const { state, actions } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [resetOpen, setResetOpen] = useState(false);
  const loginable = state.partners.filter((p) => p.registrationStatus === '承認済み');
  const onSp = pathname.startsWith('/sp');

  return (
    <div className="demobar">
      <span className="demobar-tag">DEMO</span>
      <nav className="demobar-tabs">
        <NavLink to="/admin" className={({ isActive }) => (isActive ? 'active' : '')}>
          🖥 RASTAQ管理画面
        </NavLink>
        <NavLink to="/sp" className={({ isActive }) => (isActive ? 'active' : '')}>
          📱 協力業者スマホ画面
        </NavLink>
        <NavLink to="/register" className={({ isActive }) => (isActive ? 'active' : '')}>
          📝 新規登録フォーム
        </NavLink>
      </nav>
      <div className="demobar-right">
        <label className={`demobar-login ${onSp ? 'highlight' : ''}`}>
          <span>スマホ画面のログイン業者</span>
          <select
            value={state.currentPartnerId}
            onChange={(e) => {
              actions.setCurrentPartner(e.target.value);
              if (onSp) navigate('/sp');
            }}
          >
            {loginable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.companyName}
              </option>
            ))}
          </select>
        </label>
        <button className="demobar-reset" onClick={() => setResetOpen(true)}>
          データ初期化
        </button>
      </div>
      <ConfirmDialog
        open={resetOpen}
        title="デモデータの初期化"
        tone="danger"
        confirmLabel="初期化する"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          actions.resetDemo();
          setResetOpen(false);
        }}
      >
        デモ中に行った操作（案件登録・応募・選定・チャットなど）をすべて破棄し、初期データに戻します。よろしいですか？
      </ConfirmDialog>
    </div>
  );
}
