import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState, LevelBadge, RegStatusBadge } from '../components/ui';
import { fmtAreas, fmtDateTime } from '../lib';
import { useStore } from '../store/AppStore';
import { PageHeader } from './AdminLayout';

type Filter = '審査中' | '差し戻し' | 'すべて';

export function ReviewList() {
  const { state } = useStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('審査中');

  // 新規登録フォームから申請された業者
  const applicants = state.partners
    .filter((p) => p.fromRegistrationForm)
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  const rows = applicants.filter((p) => filter === 'すべて' || p.registrationStatus === filter);
  const count = (f: Filter) => applicants.filter((p) => f === 'すべて' || p.registrationStatus === f).length;

  return (
    <>
      <PageHeader
        title="新規登録業者の審査"
        sub="新規登録フォームから届いた申請を確認し、承認・差し戻し・利用停止を行います"
        actions={
          <Link to="/register" className="btn btn-outline">
            📝 登録フォームを開く（デモ）
          </Link>
        }
      />
      <div className="status-tabs">
        {(['審査中', '差し戻し', 'すべて'] as Filter[]).map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f}
            <span className="tab-count">{count(f)}</span>
          </button>
        ))}
      </div>
      <div className="card">
        {rows.length === 0 ? (
          <EmptyState icon="🗂" title={`${filter}の申請はありません`}>
            新規登録フォームから申請すると、ここに表示されます。
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>申請日時</th>
                  <th>会社名 / お名前</th>
                  <th>業種</th>
                  <th>対応エリア</th>
                  <th>熟練度</th>
                  <th>質問事項</th>
                  <th>ステータス</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="clickable" onClick={() => navigate(`/admin/reviews/${p.id}`)}>
                    <td className="nowrap">{fmtDateTime(p.registeredAt)}</td>
                    <td>
                      <span className="cell-link">{p.companyName}</span>
                      <div className="cell-sub">{p.contactName}</div>
                    </td>
                    <td className="small">{p.industry}</td>
                    <td className="small">{fmtAreas(p.areas)}</td>
                    <td>
                      <LevelBadge level={p.skillLevel} />
                    </td>
                    <td className="small comment">{p.question || <span className="muted">なし</span>}</td>
                    <td>
                      <RegStatusBadge status={p.registrationStatus} />
                    </td>
                    <td>
                      <span className="btn btn-outline btn-sm">確認する</span>
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
