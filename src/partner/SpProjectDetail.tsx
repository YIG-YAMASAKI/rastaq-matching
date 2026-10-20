import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppStatusBadge, Badge, ConfirmDialog, EmptyState, LevelBadge } from '../components/ui';
import { RASTAQ_OFFICE } from '../data/geo';
import { levelDef } from '../data/master';
import { findApp, fmtDateTime, fmtDeadline, fmtFull, fmtRange, partnerViewStatus, remaining, yen } from '../lib';
import { useCurrentPartner, useStore } from '../store/AppStore';
import { SpSubHeader } from './SpLayout';

export function SpProjectDetail() {
  const { id } = useParams();
  const { state, actions } = useStore();
  const partner = useCurrentPartner();
  const project = state.projects.find((p) => p.id === id);
  const app = project ? findApp(state, project.id, partner.id) : undefined;
  const [dialog, setDialog] = useState<null | 'apply' | 'decline'>(null);
  const [comment, setComment] = useState('');
  const [count, setCount] = useState(1);

  // 結果を表示したら既読にする
  useEffect(() => {
    if (project && app && !app.partnerSeenResult) actions.markResultSeen(project.id, partner.id);
  }, [project, app, partner.id, actions]);

  if (!project || !project.notifiedPartnerIds.includes(partner.id) || project.status === '下書き') {
    return (
      <>
        <SpSubHeader title="案件詳細" />
        <EmptyState icon="❓" title="案件が見つかりません">
          <Link to="/sp">案件一覧に戻る</Link>
        </EmptyState>
      </>
    );
  }

  const view = partnerViewStatus(project, app);
  const r = remaining(project.deadline);
  const accepting = project.status === '募集中' && !r.passed;
  const canApply = accepting && (view === '未回答' || view === '辞退');
  const canDecline = accepting && (view === '未回答' || view === '応募済み');
  const lv = levelDef(project.difficulty);
  const rate = project.customRate ?? partner.baseRate;
  const unread = state.messages.filter((m) => m.projectId === project.id && m.partnerId === partner.id && m.sender === 'rastaq' && !m.readByPartner).length;

  const openDialog = (d: 'apply' | 'decline') => {
    setComment('');
    setCount(Math.min(project.requiredCount, Math.max(1, app?.availableCount || 1)));
    setDialog(d);
  };

  return (
    <>
      <SpSubHeader
        title="案件詳細"
        right={
          <Link to={`/sp/chats/${project.id}`} className="sp-chat-link" aria-label="チャット">
            💬{unread > 0 && <span className="sp-nav-badge">{unread}</span>}
          </Link>
        }
      />
      <div className="sp-page with-action">
        {/* ===== 応募状況パネル ===== */}
        <StatusPanel view={view} appliedAt={app?.appliedAt} notifiedAt={app?.resultNotifiedAt ?? null} accepting={accepting} />

        <div className="sp-detail-head">
          <div className="sp-detail-badges">
            <Badge tone="navy">{project.workCategory}</Badge>
            <LevelBadge level={project.difficulty} withName />
          </div>
          <h2>{project.title}</h2>
          {project.workDetail && <p className="muted">{project.workDetail}</p>}
        </div>

        <section className="sp-section highlight">
          <div className="sp-kv big">
            <span>作業日時</span>
            <strong>{fmtRange(project.startAt, project.endAt)}</strong>
          </div>
          <div className="sp-kv big">
            <span>回答締め切り</span>
            <strong>
              {fmtDeadline(project.deadline)}
              {project.status === '募集中' && !r.invalid && <span className={`remain sm ${r.urgent || r.passed ? 'urgent' : ''}`}>{r.text}</span>}
            </strong>
          </div>
          <div className="sp-kv big">
            <span>必要人数</span>
            <strong>{project.requiredCount}名</strong>
          </div>
        </section>

        <section className="sp-section">
          <h3>作業場所</h3>
          <p>{project.address}</p>
          <div className="sp-map">🗺 地図（デモでは表示のみ）</div>
        </section>

        <section className="sp-section">
          <h3>集合</h3>
          <div className="sp-kv">
            <span>集合方法</span>
            <strong>{project.meetingMethod}</strong>
          </div>
          {project.meetingMethod === 'RASTAQ 東京オフィスに集合' && (
            <div className="sp-kv">
              <span>集合先</span>
              <strong>
                {RASTAQ_OFFICE.name}
                <br />〒{RASTAQ_OFFICE.zip} {RASTAQ_OFFICE.address}
              </strong>
            </div>
          )}
          <div className="sp-kv">
            <span>集合場所・時刻</span>
            <strong>{project.meetingPlace}</strong>
          </div>
          <div className="sp-kv">
            <span>交通費</span>
            <strong>実費支給</strong>
          </div>
        </section>

        <section className="sp-section">
          <h3>難易度</h3>
          <p>
            <LevelBadge level={project.difficulty} withName />
            {lv.provisional && <Badge tone="amber">仮の説明</Badge>}
          </p>
          <p className="muted small">{lv.description}</p>
        </section>

        <section className="sp-section">
          <h3>単価</h3>
          {rate ? (
            <p>
              <strong>{yen(rate)}</strong>／人日 {project.customRate !== null ? <Badge tone="amber">本案件の個別単価</Badge> : <span className="muted small">（基本単価）</span>}
            </p>
          ) : (
            <p className="muted">別途ご連絡します</p>
          )}
          <p className="muted small">※ デモ上の仮の金額です</p>
        </section>

        {project.notes && (
          <section className="sp-section">
            <h3>特記事項</h3>
            <p className="pre">{project.notes}</p>
          </section>
        )}

        {project.attachments.length > 0 && (
          <section className="sp-section">
            <h3>添付資料</h3>
            <ul className="sp-files">
              {project.attachments.map((f) => (
                <li key={f}>
                  {/\.(jpe?g|png|gif|heic)$/i.test(f) ? '🖼' : '📄'} {f}
                </li>
              ))}
            </ul>
          </section>
        )}

        {app && app.status !== '辞退' && app.comment && (
          <section className="sp-section">
            <h3>応募時のコメント</h3>
            <p className="pre">{app.comment}</p>
            <p className="muted small">派遣可能人数：{app.availableCount}名</p>
          </section>
        )}

        <Link to={`/sp/chats/${project.id}`} className="btn btn-outline btn-block btn-lg">
          💬 この案件についてRASTAQに質問する
        </Link>
      </div>

      {/* ===== 画面下部の操作ボタン ===== */}
      {(canApply || canDecline) && (
        <div className="sp-action-bar">
          {canDecline && (
            <button className="btn btn-outline btn-lg" onClick={() => openDialog('decline')}>
              {view === '応募済み' ? '応募を取り下げる' : '辞退する'}
            </button>
          )}
          {canApply && (
            <button className="btn btn-primary btn-lg grow" onClick={() => openDialog('apply')}>
              {view === '辞退' ? '改めて応募する' : '応募する'}
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={dialog === 'apply'}
        title="この案件に応募しますか？"
        confirmLabel="応募する"
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          actions.apply(project.id, partner.id, comment.trim(), count);
          setDialog(null);
        }}
      >
        <p className="dialog-lead">
          <strong>{project.title}</strong>
          <br />
          {fmtFull(project.startAt)}〜
        </p>
        <label className="field-label">派遣可能人数</label>
        <div className="stepper">
          <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label="減らす">
            −
          </button>
          <span>{count}名</span>
          <button type="button" onClick={() => setCount((c) => Math.min(20, c + 1))} aria-label="増やす">
            ＋
          </button>
        </div>
        <label className="field-label" style={{ marginTop: 12 }}>
          コメント（任意）
        </label>
        <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="対応可能な内容、持参できる機材など" />
        <p className="muted small">応募後、締め切りまでに集まった応募者の中からRASTAQが選定します（先着順ではありません）。</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'decline'}
        title={view === '応募済み' ? '応募を取り下げますか？' : 'この案件を辞退しますか？'}
        tone="danger"
        confirmLabel={view === '応募済み' ? '取り下げる' : '辞退する'}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          actions.decline(project.id, partner.id, comment.trim());
          setDialog(null);
        }}
      >
        <p className="dialog-lead">
          <strong>{project.title}</strong>
        </p>
        <label className="field-label">理由（任意）</label>
        <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="例）当日別現場のため" />
        <p className="muted small">締め切り前であれば、あとから改めて応募することもできます。</p>
      </ConfirmDialog>
    </>
  );
}

function StatusPanel({ view, appliedAt, notifiedAt, accepting }: { view: string; appliedAt?: string; notifiedAt: string | null; accepting: boolean }) {
  const steps = ['通知', '応募', '選定', '結果'];
  const stepIndex = view === '未回答' ? 1 : view === '応募済み' ? 2 : ['決定', '見送り', '施工中', '完了'].includes(view) ? 3 : 0;

  const panel: Record<string, { cls: string; title: string; text: string }> = {
    未回答: {
      cls: 'new',
      title: accepting ? '新着案件です' : '回答締め切りを過ぎました',
      text: accepting ? '内容を確認し、画面下のボタンから応募または辞退してください。' : 'この案件の応募受付は終了しています。',
    },
    応募済み: { cls: 'wait', title: '応募済み・RASTAQによる選定待ち', text: '締め切り後にRASTAQが応募者の中から選定し、結果をお知らせします。' },
    決定: { cls: 'ok', title: 'ご依頼が決定しました', text: '作業日時・集合場所をご確認ください。不明点はチャットでご連絡ください。' },
    施工中: { cls: 'ok', title: '施工中', text: '本日もよろしくお願いいたします。' },
    完了: { cls: 'done', title: '完了しました', text: 'ご協力ありがとうございました。' },
    見送り: { cls: 'ng', title: '今回は見送りとなりました', text: 'ご応募ありがとうございました。またの機会によろしくお願いいたします。' },
    辞退: { cls: 'muted', title: '辞退済み', text: accepting ? '締め切り前であれば改めて応募できます。' : '' },
    中止: { cls: 'ng', title: 'この案件は中止になりました', text: '詳細はRASTAQからの連絡をご確認ください。' },
  };
  const p = panel[view];
  return (
    <div className={`sp-status ${p.cls}`}>
      <div className="sp-status-head">
        <AppStatusBadge status={view as never} />
        <strong>{p.title}</strong>
      </div>
      {p.text && <p>{p.text}</p>}
      {view !== '辞退' && view !== '中止' && (
        <ol className="sp-steps">
          {steps.map((s, i) => (
            <li key={s} className={i < stepIndex ? 'done' : i === stepIndex ? 'current' : ''}>
              <span className="dot" />
              {s}
            </li>
          ))}
        </ol>
      )}
      <div className="sp-status-meta">
        {appliedAt && view !== '未回答' && <span>応募日時 {fmtDateTime(appliedAt)}</span>}
        {notifiedAt && <span>結果通知 {fmtDateTime(notifiedAt)}</span>}
      </div>
    </div>
  );
}
