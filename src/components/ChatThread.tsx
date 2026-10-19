import { useEffect, useMemo, useRef, useState } from 'react';
import { fmtDate, fmtTime } from '../lib';
import { useStore } from '../store/AppStore';
import type { Sender } from '../types';

/**
 * 案件×協力業者ごとのチャット。RASTAQ側・協力業者側で同じメッセージデータを参照する。
 * TODO(本番): WebSocket等でリアルタイム受信、既読管理はサーバー側で行う
 */
export function ChatThread({ projectId, partnerId, viewer }: { projectId: string; partnerId: string; viewer: Sender }) {
  const { state, actions } = useStore();
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () =>
      state.messages
        .filter((m) => m.projectId === projectId && m.partnerId === partnerId)
        .sort((a, b) => a.sentAt.localeCompare(b.sentAt)),
    [state.messages, projectId, partnerId],
  );

  // 画面を開いた時点の未読位置を記憶して「ここから未読」を表示
  const [firstUnreadId] = useState(() => {
    const key = viewer === 'rastaq' ? 'readByRastaq' : 'readByPartner';
    return messages.find((m) => m.sender !== viewer && !m[key])?.id ?? null;
  });

  useEffect(() => {
    actions.markRead(projectId, partnerId, viewer);
  }, [messages.length, projectId, partnerId, viewer, actions]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    actions.sendMessage(projectId, partnerId, viewer, t);
    setText('');
  };

  let lastDay = '';
  return (
    <div className="chat">
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && <div className="chat-empty">まだメッセージはありません。最初のメッセージを送信してください。</div>}
        {messages.map((m) => {
          const mine = m.sender === viewer;
          const day = fmtDate(m.sentAt);
          const showDay = day !== lastDay;
          lastDay = day;
          const otherRead = viewer === 'rastaq' ? m.readByPartner : m.readByRastaq;
          return (
            <div key={m.id}>
              {showDay && <div className="chat-day">{day}</div>}
              {m.id === firstUnreadId && <div className="chat-unread-line">ここから未読</div>}
              <div className={`msg ${mine ? 'mine' : 'theirs'}`}>
                {!mine && <div className="msg-name">{m.senderName}</div>}
                <div className="msg-row">
                  <div className="msg-bubble">{m.text}</div>
                  <div className="msg-meta">
                    {mine && <span className={otherRead ? 'read' : 'unread'}>{otherRead ? '既読' : '未読'}</span>}
                    <span>{fmtTime(m.sentAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="chat-input">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="メッセージを入力"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="btn btn-primary" onClick={send} disabled={!text.trim()}>
          送信
        </button>
      </div>
      {viewer === 'rastaq' && <div className="chat-tip">Ctrl + Enter で送信</div>}
    </div>
  );
}
