import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChatThread } from '../components/ChatThread';
import { AppStatusBadge, EmptyState, ProjectStatusBadge } from '../components/ui';
import { fmtDateTime, findApp } from '../lib';
import { useStore } from '../store/AppStore';
import { PageHeader } from './AdminLayout';

interface Thread {
  key: string;
  projectId: string;
  partnerId: string;
  lastText: string;
  lastAt: string;
  unread: number;
}

export function ChatPage() {
  const { projectId, partnerId } = useParams();
  const { state } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);

  const threads = useMemo(() => {
    const map = new Map<string, Thread>();
    [...state.messages]
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt))
      .forEach((m) => {
        const key = `${m.projectId}/${m.partnerId}`;
        const t = map.get(key) ?? { key, projectId: m.projectId, partnerId: m.partnerId, lastText: '', lastAt: '', unread: 0 };
        t.lastText = m.text;
        t.lastAt = m.sentAt;
        if (m.sender === 'partner' && !m.readByRastaq) t.unread++;
        map.set(key, t);
      });
    // 応募者一覧などから新規にチャットを開いた場合
    if (projectId && partnerId && !map.has(`${projectId}/${partnerId}`)) {
      map.set(`${projectId}/${partnerId}`, { key: `${projectId}/${partnerId}`, projectId, partnerId, lastText: '（新規チャット）', lastAt: new Date().toISOString(), unread: 0 });
    }
    return [...map.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }, [state.messages, projectId, partnerId]);

  const name = (pid: string) => state.partners.find((p) => p.id === pid)?.companyName ?? '';
  const title = (pid: string) => state.projects.find((p) => p.id === pid)?.title ?? '';
  const kw = q.trim();
  const visible = threads.filter((t) => (!onlyUnread || t.unread > 0) && (!kw || name(t.partnerId).includes(kw) || title(t.projectId).includes(kw)));

  const project = state.projects.find((p) => p.id === projectId);
  const partner = state.partners.find((p) => p.id === partnerId);
  const app = project && partner ? findApp(state, project.id, partner.id) : undefined;

  return (
    <>
      <PageHeader title="チャット" sub="案件ごとに協力業者と個別にやり取りできます" />
      <div className="chat-layout card no-pad">
        <aside className="thread-list">
          <div className="thread-tools">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="業者名・案件名で検索" />
            <label className="inline-check small">
              <input type="checkbox" checked={onlyUnread} onChange={(e) => setOnlyUnread(e.target.checked)} />
              未読のみ
            </label>
          </div>
          {visible.length === 0 && <div className="muted small pad">該当するチャットはありません</div>}
          {visible.map((t) => (
            <button
              key={t.key}
              className={`thread ${t.projectId === projectId && t.partnerId === partnerId ? 'active' : ''} ${t.unread ? 'has-unread' : ''}`}
              onClick={() => navigate(`/admin/chats/${t.key}`)}
            >
              <div className="thread-top">
                <span className="thread-name">{name(t.partnerId)}</span>
                {t.unread > 0 && <span className="nav-badge">{t.unread}</span>}
              </div>
              <div className="thread-project">{title(t.projectId)}</div>
              <div className="thread-last">
                <span>{t.lastText}</span>
                <span className="thread-at">{fmtDateTime(t.lastAt)}</span>
              </div>
            </button>
          ))}
        </aside>
        <section className="thread-main">
          {project && partner ? (
            <>
              <div className="thread-head">
                <div>
                  <div className="thread-head-name">{partner.companyName}</div>
                  <div className="muted small">
                    <Link to={`/admin/projects/${project.id}`}>{project.title}</Link> <ProjectStatusBadge status={project.status} />{' '}
                    {app && <AppStatusBadge status={app.status} />}
                  </div>
                </div>
                <div className="muted small">
                  担当：{partner.contactName} ／ {partner.phone}
                </div>
              </div>
              <ChatThread key={`${project.id}/${partner.id}`} projectId={project.id} partnerId={partner.id} viewer="rastaq" />
            </>
          ) : (
            <EmptyState icon="💬" title="チャットを選択してください">
              左の一覧からスレッドを選択するか、案件詳細の応募者一覧から「チャット」を開いてください。
            </EmptyState>
          )}
        </section>
      </div>
    </>
  );
}
