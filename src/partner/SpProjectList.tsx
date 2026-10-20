import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppStatusBadge, EmptyState, LevelBadge } from '../components/ui';
import { findApp, fmtDeadline, fmtRange, partnerViewStatus, remaining } from '../lib';
import { useCurrentPartner, useStore } from '../store/AppStore';
import type { PartnerViewStatus, Project } from '../types';
import { useVisibleProjects } from './SpLayout';

type Tab = '新着' | '応募済み' | '決定' | '見送り' | 'すべて';
const TAB_MATCH: Record<Tab, PartnerViewStatus[] | null> = {
  新着: ['未回答'],
  応募済み: ['応募済み'],
  決定: ['決定', '施工中', '完了'],
  見送り: ['見送り'],
  すべて: null,
};

export function SpProjectList() {
  const { state } = useStore();
  const partner = useCurrentPartner();
  const projects = useVisibleProjects();
  const [tab, setTab] = useState<Tab>('新着');

  const items = projects
    .map((p) => {
      const app = findApp(state, p.id, partner.id);
      return { p, app, view: partnerViewStatus(p, app) };
    })
    // 新着は募集中のもののみ
    .filter((x) => !(x.view === '未回答' && x.p.status !== '募集中'))
    .sort((a, b) => a.p.startAt.localeCompare(b.p.startAt));

  const count = (t: Tab) => items.filter((x) => !TAB_MATCH[t] || TAB_MATCH[t]!.includes(x.view)).length;
  const list = items.filter((x) => !TAB_MATCH[tab] || TAB_MATCH[tab]!.includes(x.view));
  const unseen = items.filter((x) => x.app && !x.app.partnerSeenResult);

  return (
    <div className="sp-page">
      <h1 className="sp-title">案件一覧</h1>

      {unseen.length > 0 && (
        <Link to={`/sp/projects/${unseen[0].p.id}`} className="sp-alert">
          <span>🔔</span>
          <span>
            選定結果が{unseen.length}件届いています
            <small>{unseen[0].p.title}</small>
          </span>
          <span>›</span>
        </Link>
      )}

      <div className="sp-tabs">
        {(Object.keys(TAB_MATCH) as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
            {count(t) > 0 && <span className="sp-tab-count">{count(t)}</span>}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={tab === '新着' ? '📭' : '🗒'} title={tab === '新着' ? '新着の案件はありません' : `${tab}の案件はありません`}>
          {tab === '新着' && 'RASTAQから案件が通知されると、ここに表示されます。'}
        </EmptyState>
      ) : (
        <div className="sp-cards">
          {list.map(({ p, app, view }) => (
            <ProjectCard key={p.id} p={p} view={view} unseen={!!app && !app.partnerSeenResult} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ p, view, unseen }: { p: Project; view: PartnerViewStatus; unseen: boolean }) {
  const r = remaining(p.deadline);
  const open = p.status === '募集中' && !r.passed;
  return (
    <Link to={`/sp/projects/${p.id}`} className={`sp-card status-${view}`}>
      <div className="sp-card-top">
        <AppStatusBadge status={view} />
        {view === '未回答' && <span className="new-dot">NEW</span>}
        {unseen && <span className="new-dot result">結果あり</span>}
        <span className="spacer" />
        <LevelBadge level={p.difficulty} />
      </div>
      <div className="sp-card-title">{p.title}</div>
      <div className="sp-card-cat">{p.workCategory}</div>
      <dl className="sp-card-info">
        <div>
          <dt>📍 場所</dt>
          <dd>{p.address}</dd>
        </div>
        <div>
          <dt>🗓 日時</dt>
          <dd>{fmtRange(p.startAt, p.endAt)}</dd>
        </div>
        <div>
          <dt>👷 人数</dt>
          <dd>{p.requiredCount}名募集</dd>
        </div>
        <div>
          <dt>⏰ 締切</dt>
          <dd>
            {fmtDeadline(p.deadline)}
            {open && !r.invalid && <span className={`remain sm ${r.urgent ? 'urgent' : ''}`}>{r.text}</span>}
          </dd>
        </div>
      </dl>
      {view === '応募済み' && <div className="sp-card-foot wait">RASTAQによる選定待ちです</div>}
      {view === '決定' && <div className="sp-card-foot ok">ご依頼が決定しました</div>}
      {view === '未回答' && <div className="sp-card-foot cta">詳細を見て応募する ›</div>}
    </Link>
  );
}
