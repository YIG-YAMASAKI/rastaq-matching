import { Link } from 'react-router-dom';
import { EmptyState, ProjectStatusBadge } from '../components/ui';
import { appliedCount, decidedCount, fmtDateTime, fmtRange, isPast, remaining, unreadForRastaq } from '../lib';
import { useStore } from '../store/AppStore';
import { PageHeader } from './AdminLayout';

type Todo = { key: string; tone: string; label: string; text: string; to: string; at: string };

export function Dashboard() {
  const { state } = useStore();
  const ps = state.projects;
  const recruiting = ps.filter((p) => p.status === '募集中');
  const accepting = recruiting.filter((p) => !isPast(p.deadline));
  const unassigned = ps.filter((p) => p.status === '応募締め切り' || p.status === '選定中');
  const arranged = ps.filter((p) => p.status === '手配完了' || p.status === '施工中');

  const recent = [...ps].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const deadlineSoon = accepting.slice().sort((a, b) => a.deadline.localeCompare(b.deadline));

  // ===== 対応が必要な事項 =====
  const todos: Todo[] = [];
  unassigned.forEach((p) =>
    todos.push({
      key: `sel-${p.id}`,
      tone: 'purple',
      label: '選定待ち',
      text: `「${p.title}」応募${appliedCount(state, p.id)}社から選定してください`,
      to: `/admin/projects/${p.id}`,
      at: p.updatedAt,
    }),
  );
  recruiting
    .filter((p) => isPast(p.deadline))
    .forEach((p) =>
      todos.push({ key: `dl-${p.id}`, tone: 'amber', label: '締切超過', text: `「${p.title}」の回答締め切りを過ぎています。応募を締め切ってください`, to: `/admin/projects/${p.id}`, at: p.deadline }),
    );
  const threads = new Map<string, { count: number; at: string; partnerId: string; projectId: string }>();
  unreadForRastaq(state).forEach((m) => {
    const k = `${m.projectId}/${m.partnerId}`;
    threads.set(k, { count: (threads.get(k)?.count ?? 0) + 1, at: m.sentAt, partnerId: m.partnerId, projectId: m.projectId });
  });
  threads.forEach((t, k) => {
    const partner = state.partners.find((p) => p.id === t.partnerId);
    const project = state.projects.find((p) => p.id === t.projectId);
    todos.push({ key: `msg-${k}`, tone: 'blue', label: '未読メッセージ', text: `${partner?.companyName}（${project?.title}）から${t.count}件`, to: `/admin/chats/${k}`, at: t.at });
  });
  state.history
    .filter((h) => h.type === '応募' && h.projectId && Date.now() - new Date(h.at).getTime() < 3 * 86400000)
    .slice(0, 3)
    .forEach((h) => todos.push({ key: `app-${h.id}`, tone: 'green', label: '新着応募', text: `${h.actor}が${h.message}`, to: `/admin/projects/${h.projectId}`, at: h.at }));
  state.partners
    .filter((p) => p.registrationStatus === '審査中')
    .forEach((p) =>
      todos.push({ key: `rv-${p.id}`, tone: 'orange', label: '登録審査', text: `${p.companyName} から新規登録申請があります`, to: `/admin/reviews/${p.id}`, at: p.registeredAt }),
    );

  const stats = [
    { label: '募集中の案件', value: recruiting.length, note: 'ステータス「募集中」', to: '/admin/projects?status=募集中', tone: 'blue' },
    { label: '応募受付中の案件', value: accepting.length, note: '募集中かつ回答締め切り前', to: '/admin/projects?status=募集中', tone: 'sky' },
    { label: '未割り当ての案件', value: unassigned.length, note: '応募締め切り・選定中（人員未確定）', to: '/admin/projects?status=選定待ち', tone: 'purple' },
    { label: '決定済み・施工中', value: arranged.length, note: '手配完了／施工中', to: '/admin/projects?status=手配済み', tone: 'green' },
  ];

  return (
    <>
      <PageHeader
        title="ダッシュボード"
        sub={`${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })} 時点の状況`}
      />
      <div className="stats">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className={`stat stat-${s.tone}`}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">
              {s.value}
              <span>件</span>
            </div>
            <div className="stat-note">{s.note}</div>
          </Link>
        ))}
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>対応が必要な応募・連絡</h2>
            <span className="count-pill">{todos.length}</span>
          </div>
          {todos.length === 0 ? (
            <EmptyState icon="✅" title="対応が必要な事項はありません" />
          ) : (
            <ul className="todo-list">
              {todos.map((t) => (
                <li key={t.key}>
                  <Link to={t.to}>
                    <span className={`badge badge-${t.tone}`}>{t.label}</span>
                    <span className="todo-text">{t.text}</span>
                    <span className="todo-at">{fmtDateTime(t.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>締め切りが近い案件</h2>
            <Link to="/admin/projects" className="link-sm">
              すべて見る →
            </Link>
          </div>
          {deadlineSoon.length === 0 ? (
            <EmptyState icon="🗓" title="締め切り前の募集中案件はありません" />
          ) : (
            <ul className="deadline-list">
              {deadlineSoon.map((p) => {
                const r = remaining(p.deadline);
                return (
                  <li key={p.id}>
                    <Link to={`/admin/projects/${p.id}`}>
                      <div className="dl-main">
                        <div className="dl-title">{p.title}</div>
                        <div className="dl-sub">
                          締切 {fmtDateTime(p.deadline)} ・ 応募 {appliedCount(state, p.id)}社 ／ 必要 {p.requiredCount}名
                        </div>
                      </div>
                      <span className={`remain ${r.urgent ? 'urgent' : ''}`}>{r.text}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>最近登録された案件</h2>
          <Link to="/admin/projects" className="link-sm">
            案件一覧へ →
          </Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>案件名</th>
                <th>作業日時</th>
                <th className="num">必要人数</th>
                <th className="num">応募</th>
                <th className="num">決定</th>
                <th>ステータス</th>
                <th>登録日時</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/admin/projects/${p.id}`} className="cell-link">
                      {p.title}
                    </Link>
                    <div className="cell-sub">{p.prefecture}</div>
                  </td>
                  <td>{fmtRange(p.startAt, p.endAt)}</td>
                  <td className="num">{p.requiredCount}名</td>
                  <td className="num">{appliedCount(state, p.id)}社</td>
                  <td className="num">{decidedCount(state, p.id)}社</td>
                  <td>
                    <ProjectStatusBadge status={p.status} />
                  </td>
                  <td>{fmtDateTime(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
