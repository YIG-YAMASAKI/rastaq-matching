import { Link, useParams } from 'react-router-dom';
import { ChatThread } from '../components/ChatThread';
import { EmptyState } from '../components/ui';
import { fmtDateTime } from '../lib';
import { useCurrentPartner, useStore } from '../store/AppStore';
import { SpSubHeader, useVisibleProjects } from './SpLayout';

/** 案件別チャット一覧（RASTAQ側と同じメッセージデータを共有） */
export function SpChatList() {
  const { state } = useStore();
  const partner = useCurrentPartner();
  const projects = useVisibleProjects();

  const threads = projects
    .map((p) => {
      const msgs = state.messages.filter((m) => m.projectId === p.id && m.partnerId === partner.id).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
      const last = msgs[msgs.length - 1];
      return { p, last, unread: msgs.filter((m) => m.sender === 'rastaq' && !m.readByPartner).length };
    })
    .filter((t) => t.last)
    .sort((a, b) => b.last!.sentAt.localeCompare(a.last!.sentAt));
  const others = projects.filter((p) => !threads.some((t) => t.p.id === p.id) && !['完了', '中止'].includes(p.status));

  return (
    <div className="sp-page">
      <h1 className="sp-title">チャット</h1>
      {threads.length === 0 && <EmptyState icon="💬" title="まだやり取りはありません" />}
      <ul className="sp-threads">
        {threads.map(({ p, last, unread }) => (
          <li key={p.id}>
            <Link to={`/sp/chats/${p.id}`} className={unread ? 'has-unread' : ''}>
              <div className="sp-thread-avatar">R</div>
              <div className="sp-thread-body">
                <div className="sp-thread-top">
                  <strong>{p.title}</strong>
                  <span className="muted small">{fmtDateTime(last!.sentAt)}</span>
                </div>
                <div className="sp-thread-last">
                  <span>
                    {last!.sender === 'partner' ? 'あなた：' : ''}
                    {last!.text}
                  </span>
                  {unread > 0 && <span className="sp-nav-badge static">{unread}</span>}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {others.length > 0 && (
        <>
          <h2 className="sp-subtitle">案件を選んで質問する</h2>
          <ul className="sp-threads plain">
            {others.map((p) => (
              <li key={p.id}>
                <Link to={`/sp/chats/${p.id}`}>
                  <div className="sp-thread-body">
                    <strong>{p.title}</strong>
                  </div>
                  <span className="muted">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function SpChatThread() {
  const { projectId } = useParams();
  const { state } = useStore();
  const partner = useCurrentPartner();
  const project = state.projects.find((p) => p.id === projectId && p.notifiedPartnerIds.includes(partner.id));

  if (!project) {
    return (
      <>
        <SpSubHeader title="チャット" back="/sp/chats" />
        <EmptyState icon="❓" title="チャットが見つかりません" />
      </>
    );
  }
  return (
    <div className="sp-chat-page">
      <SpSubHeader title="RASTAQ" back="/sp/chats" />
      <Link to={`/sp/projects/${project.id}`} className="sp-chat-project">
        <span>案件：{project.title}</span>
        <span>詳細 ›</span>
      </Link>
      <ChatThread key={`${project.id}/${partner.id}`} projectId={project.id} partnerId={partner.id} viewer="partner" />
    </div>
  );
}
