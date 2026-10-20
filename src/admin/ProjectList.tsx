import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState, LevelBadge, ProjectStatusBadge } from '../components/ui';
import { WORK_CATEGORIES } from '../data/master';
import { appliedCount, compareDeadline, decidedCount, projectAlerts, fmtDeadline, fmtRange, remaining } from '../lib';
import { useStore } from '../store/AppStore';
import type { Project, ProjectStatus } from '../types';
import { PageHeader } from './AdminLayout';

/** ダッシュボードからの遷移用のまとめステータス */
const GROUPS: Record<string, ProjectStatus[]> = {
  選定待ち: ['応募締め切り', '選定中'],
  手配済み: ['手配完了', '施工中'],
  進行中: ['募集中', '応募締め切り', '選定中', '手配完了', '施工中'],
};

/** 一覧の表示区分（既存の案件ステータスとの対応） */
type ViewKey = 'active' | 'draft' | 'closed' | 'all';
const VIEWS: { key: ViewKey; label: string }[] = [
  { key: 'active', label: '進行中' },
  { key: 'draft', label: '下書き' },
  { key: 'closed', label: '完了・中止' },
  { key: 'all', label: 'すべて' },
];
const viewOf = (s: ProjectStatus): Exclude<ViewKey, 'all'> => (s === '下書き' ? 'draft' : s === '完了' || s === '中止' ? 'closed' : 'active');
const isViewKey = (v: string | null): v is ViewKey => VIEWS.some((x) => x.key === v);

/** 更新日時（旧データで欠けている場合は登録日時で代替） */
const updatedOf = (p: Project) => p.updatedAt || p.createdAt || '';

/**
 * 区分ごとの標準の並び順
 * - 進行中：作業開始日が近い順（施工中など開始済みの案件が上）。同日は更新が新しい順
 * - 下書き：更新が新しい順
 * - 完了・中止：更新が新しい順（完了・中止の日時は保持していないため、ステータス変更時に更新される更新日時を使用）
 * - すべて：進行中 → 下書き → 完了・中止 の順にまとめ、各区分内は上記
 */
const VIEW_ORDER: Exclude<ViewKey, 'all'>[] = ['active', 'draft', 'closed'];
const standardOrder = (a: Project, b: Project) => {
  const va = viewOf(a.status);
  const vb = viewOf(b.status);
  if (va !== vb) return VIEW_ORDER.indexOf(va) - VIEW_ORDER.indexOf(vb);
  if (va === 'active') return (a.startAt || '').localeCompare(b.startAt || '') || updatedOf(b).localeCompare(updatedOf(a));
  return updatedOf(b).localeCompare(updatedOf(a));
};

type SortKey = 'standard' | 'startAt' | 'deadline' | 'createdAt';

const SORT_NOTE: Record<ViewKey, string> = {
  active: '作業日が近い順',
  draft: '更新が新しい順',
  closed: '更新が新しい順',
  all: '区分ごと',
};

export function ProjectList() {
  const { state } = useStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  // ダッシュボードからの遷移（?status=募集中 など）は、表示区分内の追加の絞り込みとして扱う
  const status = params.get('status') ?? '';
  const statusList: ProjectStatus[] = status ? (GROUPS[status] ?? [status as ProjectStatus]) : [];
  const viewParam = params.get('view');
  const statusViews = [...new Set(statusList.map(viewOf))];
  const view: ViewKey = isViewKey(viewParam) ? viewParam : statusViews.length === 0 ? 'active' : statusViews.length === 1 ? statusViews[0] : 'all';
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<SortKey>('standard');

  const setView = (v: ViewKey) => {
    const next = new URLSearchParams(params);
    next.delete('status');
    if (v === 'active') next.delete('view');
    else next.set('view', v);
    setParams(next, { replace: true });
  };
  const setStatus = (v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set('status', v);
    else next.delete('status');
    setParams(next, { replace: true });
  };

  const counts = useMemo(() => {
    const c: Record<ViewKey, number> = { active: 0, draft: 0, closed: 0, all: state.projects.length };
    state.projects.forEach((p) => c[viewOf(p.status)]++);
    return c;
  }, [state.projects]);

  const rows = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return state.projects
      .filter((p) => {
        if (view !== 'all' && viewOf(p.status) !== view) return false;
        if (statusList.length > 0 && !statusList.includes(p.status)) return false;
        if (category && p.workCategory !== category) return false;
        if (kw && ![p.title, p.address, p.prefecture, p.workDetail, p.workCategory].some((t) => t.toLowerCase().includes(kw))) return false;
        return true;
      })
      .sort((a, b) =>
        sort === 'standard' ? standardOrder(a, b) : sort === 'createdAt'
            ? b.createdAt.localeCompare(a.createdAt)
            : sort === 'deadline'
              ? compareDeadline(a.deadline, b.deadline)
              : a[sort].localeCompare(b[sort]),
      );
  }, [state.projects, q, view, statusList.join(), category, sort]);

  const clear = () => {
    setQ('');
    setCategory('');
    setStatus('');
  };

  return (
    <>
      <PageHeader
        title="案件一覧"
        sub="登録済みの案件と応募状況を確認できます"
        actions={
          <Link to="/admin/projects/new" className="btn btn-primary">
            ＋ 新規案件を登録
          </Link>
        }
      />

      <div className="status-tabs">
        {VIEWS.map((v) => (
          <button key={v.key} className={view === v.key && !status ? 'active' : view === v.key ? 'current' : ''} onClick={() => setView(v.key)}>
            {v.label}
            <span className="tab-count">{counts[v.key]}</span>
          </button>
        ))}
        {status && (
          <button className="active" onClick={() => setStatus('')} title="この絞り込みを解除">
            {status}
            <span className="tab-count">{rows.length}</span> ×
          </button>
        )}
      </div>

      <div className="card">
        <div className="filters">
          <div className="search">
            <span className="search-icon">⌕</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="案件名・住所・作業内容で検索" />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">作業内容：すべて</option>
            {WORK_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="standard">並び順：標準（{SORT_NOTE[view]}）</option>
            <option value="startAt">並び順：作業日が近い順</option>
            <option value="deadline">並び順：締め切りが近い順</option>
            <option value="createdAt">並び順：登録が新しい順</option>
          </select>
          {(q || category || status) && (
            <button className="btn btn-ghost btn-sm" onClick={clear}>
              条件をクリア
            </button>
          )}
          <div className="filters-count">{rows.length}件</div>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon="🔍" title="条件に一致する案件はありません">
            検索条件を変更するか、
            <button className="link-btn" onClick={clear}>
              条件をクリア
            </button>
            してください。
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>案件名 / 作業内容</th>
                  <th>作業場所</th>
                  <th>作業日時</th>
                  <th className="num">必要人数</th>
                  <th className="num">応募</th>
                  <th>回答締め切り</th>
                  <th>ステータス</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const n = appliedCount(state, p.id);
                  const d = decidedCount(state, p.id);
                  const r = remaining(p.deadline);
                  const showRemain = p.status === '募集中' && !r.invalid; // 締め切りが未設定・不正なら残りは出さない
                  const alerts = projectAlerts(state, p);
                  const top = alerts[0];
                  return (
                    <tr key={p.id} className={`clickable${top ? ` row-alert ${top.level}` : ''}`} onClick={() => navigate(`/admin/projects/${p.id}`)}>
                      <td>
                        {top && (
                          <div className={`alert-label ${top.level}`} title={alerts.map((a) => `・${a.label}：${a.detail}`).join('\n')}>
                            <span aria-hidden="true">{top.level === 'danger' ? '⚠' : '!'}</span>
                            {top.label}
                            {alerts.length > 1 && <span className="alert-more">他{alerts.length - 1}件</span>}
                          </div>
                        )}
                        <Link to={`/admin/projects/${p.id}`} className="cell-link" onClick={(e) => e.stopPropagation()}>
                          {p.title}
                        </Link>
                        <div className="cell-sub">
                          {p.workCategory} <LevelBadge level={p.difficulty} />
                        </div>
                      </td>
                      <td>
                        {p.prefecture}
                        <div className="cell-sub ellipsis">{p.address}</div>
                      </td>
                      <td className="nowrap">{fmtRange(p.startAt, p.endAt)}</td>
                      <td className="num">{p.requiredCount}名</td>
                      <td className="num">
                        <span className={`applied ${n === 0 ? 'zero' : n >= p.requiredCount ? 'full' : ''}`}>{n}社</span>
                        {d > 0 && <div className="cell-sub">決定 {d}社</div>}
                      </td>
                      <td className="nowrap">
                        {fmtDeadline(p.deadline)}
                        {showRemain && <div className={`cell-sub ${r.urgent || r.passed ? 'text-danger' : ''}`}>{r.text}</div>}
                      </td>
                      <td>
                        <ProjectStatusBadge status={p.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
