import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';
import { fmtFull } from '../lib';
import { useStore } from '../store/AppStore';
import type { HistoryType } from '../types';
import { PageHeader } from './AdminLayout';

const GROUPS: Record<string, HistoryType[]> = {
  案件: ['案件登録', '案件編集', '募集開始', '応募締め切り', 'ステータス変更'],
  '応募・選定': ['応募', '辞退', '決定', '見送り', '結果通知', '選定変更'],
  チャット: ['チャット送信'],
  協力業者: ['新規登録', '審査', '業者情報更新'],
};

const TYPE_TONE: Partial<Record<HistoryType, string>> = {
  募集開始: 'blue',
  応募: 'green',
  辞退: 'slate',
  決定: 'green',
  見送り: 'gray',
  結果通知: 'navy',
  選定変更: 'orange',
  新規登録: 'amber',
  審査: 'purple',
  チャット送信: 'teal',
};

export function HistoryPage() {
  const { state } = useStore();
  const [group, setGroup] = useState('');
  const [q, setQ] = useState('');
  const [projectId, setProjectId] = useState('');

  const rows = useMemo(() => {
    const kw = q.trim();
    return [...state.history]
      .sort((a, b) => b.at.localeCompare(a.at))
      .filter(
        (h) =>
          (!group || GROUPS[group].includes(h.type)) &&
          (!projectId || h.projectId === projectId) &&
          (!kw || h.message.includes(kw) || h.actor.includes(kw)),
      );
  }, [state.history, group, q, projectId]);

  return (
    <>
      <PageHeader title="通知・操作履歴" sub="案件登録・募集開始・応募・選定・チャットなどの操作がデモ内で記録されます" />
      <div className="status-tabs">
        {['', ...Object.keys(GROUPS)].map((g) => (
          <button key={g || 'all'} className={group === g ? 'active' : ''} onClick={() => setGroup(g)}>
            {g || 'すべて'}
          </button>
        ))}
      </div>
      <div className="card">
        <div className="filters">
          <div className="search">
            <span className="search-icon">⌕</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="内容・操作者で検索" />
          </div>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">案件：すべて</option>
            {state.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <div className="filters-count">{rows.length}件</div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon="🕘" title="該当する履歴はありません" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>日時</th>
                  <th>種別</th>
                  <th>内容</th>
                  <th>操作者</th>
                  <th>関連</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((h) => (
                  <tr key={h.id}>
                    <td className="nowrap">{fmtFull(h.at)}</td>
                    <td>
                      <span className={`badge badge-${TYPE_TONE[h.type] ?? 'gray'}`}>{h.type}</span>
                    </td>
                    <td>{h.message}</td>
                    <td className="small nowrap">{h.actor}</td>
                    <td className="nowrap small">
                      {h.projectId && <Link to={`/admin/projects/${h.projectId}`}>案件</Link>}
                      {h.projectId && h.partnerId && ' ・ '}
                      {h.partnerId && <Link to={`/admin/partners/${h.partnerId}`}>業者</Link>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
