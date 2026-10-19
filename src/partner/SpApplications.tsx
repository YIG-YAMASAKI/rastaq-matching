import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppStatusBadge, EmptyState } from '../components/ui';
import { findApp, fmtDateTime, fmtRange, partnerViewStatus } from '../lib';
import { useCurrentPartner, useStore } from '../store/AppStore';
import type { PartnerViewStatus } from '../types';
import { useVisibleProjects } from './SpLayout';

const FILTERS: (PartnerViewStatus | 'すべて')[] = ['すべて', '未回答', '応募済み', '決定', '見送り', '辞退', '施工中', '完了'];

export function SpApplications() {
  const { state } = useStore();
  const partner = useCurrentPartner();
  const projects = useVisibleProjects();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('すべて');

  const items = projects
    .map((p) => {
      const app = findApp(state, p.id, partner.id);
      return { p, app, view: partnerViewStatus(p, app) };
    })
    .sort((a, b) => b.p.startAt.localeCompare(a.p.startAt));
  const list = items.filter((x) => filter === 'すべて' || x.view === filter);
  const decided = items.filter((x) => ['決定', '施工中', '完了'].includes(x.view)).length;
  const applied = items.filter((x) => x.app && x.app.status !== '辞退').length;

  return (
    <div className="sp-page">
      <h1 className="sp-title">応募履歴・進捗</h1>
      <div className="sp-summary">
        <div>
          <strong>{items.length}</strong>
          <span>通知された案件</span>
        </div>
        <div>
          <strong>{applied}</strong>
          <span>応募</span>
        </div>
        <div>
          <strong className="text-success">{decided}</strong>
          <span>決定</span>
        </div>
      </div>
      <div className="sp-chips">
        {FILTERS.map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState icon="🗂" title="該当する案件はありません" />
      ) : (
        <ul className="sp-history">
          {list.map(({ p, app, view }) => (
            <li key={p.id}>
              <Link to={`/sp/projects/${p.id}`}>
                <div className="sp-history-top">
                  <AppStatusBadge status={view} />
                  {app && !app.partnerSeenResult && <span className="new-dot result">結果あり</span>}
                  <span className="muted small">{fmtRange(p.startAt, p.endAt)}</span>
                </div>
                <div className="sp-history-title">{p.title}</div>
                <div className="muted small">
                  {app && view !== '未回答' ? `${view === '辞退' ? '回答' : '応募'} ${fmtDateTime(app.appliedAt)}` : `締切 ${fmtDateTime(p.deadline)}`}
                  {app?.resultNotifiedAt && ` ・ 結果通知 ${fmtDateTime(app.resultNotifiedAt)}`}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
