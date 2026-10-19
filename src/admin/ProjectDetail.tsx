import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AppStatusBadge,
  Badge,
  ConfirmDialog,
  DemoNote,
  EmptyState,
  GeoStatus,
  InfoRow,
  LevelBadge,
  LevelMeter,
  DistanceLabel,
  MatchChips,
  ProjectStatusBadge,
} from '../components/ui';
import { levelDef } from '../data/master';
import { applicantRate, appsOf, byDistance, distanceTarget, fmtAreas, fmtDateTime, fmtFull, fmtRange, matchPartner, remaining, yen } from '../lib';
import { useStore } from '../store/AppStore';
import type { Application, Partner, ProjectStatus } from '../types';
import { PageHeader } from './AdminLayout';
import { RecruitDialog } from './RecruitDialog';

type Tab = 'applicants' | 'info' | 'targets' | 'history';
type SortKey = 'distance' | 'appliedAt' | 'skill';

export function ProjectDetail() {
  const { id } = useParams();
  const { state, actions } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const project = state.projects.find((p) => p.id === id);

  const [tab, setTab] = useState<Tab>('applicants');
  const [sort, setSort] = useState<SortKey>('distance');
  const [selected, setSelected] = useState<string[]>([]);
  const [recruitOpen, setRecruitOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | 'close' | 'startSelect' | 'select' | 'cancel' | 'start' | 'complete'>(null);
  const [changeTarget, setChangeTarget] = useState<{ app: Application; to: '決定' | '見送り' } | null>(null);

  // 登録画面から「保存して募集開始」で遷移してきた場合
  useEffect(() => {
    if ((location.state as { openRecruit?: boolean } | null)?.openRecruit) {
      setRecruitOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const rows = useMemo(() => {
    if (!project) return [];
    return appsOf(state, project.id)
      .map((a) => {
        const partner = state.partners.find((p) => p.id === a.partnerId)!;
        return { a, partner, m: matchPartner(project, partner) };
      })
      .filter((r) => r.partner);
  }, [state, project]);

  if (!project) {
    return (
      <div className="card">
        <EmptyState icon="❓" title="案件が見つかりません">
          <Link to="/admin/projects">案件一覧に戻る</Link>
        </EmptyState>
      </div>
    );
  }

  const active = rows
    .filter((r) => r.a.status !== '辞退')
    .sort((x, y) => {
      if (sort === 'distance') return byDistance(x.m, y.m) || x.a.appliedAt.localeCompare(y.a.appliedAt);
      if (sort === 'skill') return y.partner.skillLevel - x.partner.skillLevel;
      return x.a.appliedAt.localeCompare(y.a.appliedAt);
    });
  const declined = rows.filter((r) => r.a.status === '辞退');
  const noResponse = project.notifiedPartnerIds.filter((pid) => !rows.some((r) => r.partner.id === pid));

  const selecting = project.status === '選定中';
  const resultFixed = project.status === '手配完了' || project.status === '施工中';
  const selectedHeadcount = active.filter((r) => selected.includes(r.partner.id)).reduce((s, r) => s + r.a.availableCount, 0);
  const decidedHeadcount = active.filter((r) => r.a.status === '決定').reduce((s, r) => s + r.a.availableCount, 0);
  const lv = levelDef(project.difficulty);
  const target = distanceTarget(project);
  const r = remaining(project.deadline);

  const toggle = (pid: string) => setSelected((s) => (s.includes(pid) ? s.filter((x) => x !== pid) : [...s, pid]));
  const unreadOf = (pid: string) =>
    state.messages.filter((m) => m.projectId === project.id && m.partnerId === pid && m.sender === 'partner' && !m.readByRastaq).length;
  const projectHistory = state.history.filter((h) => h.projectId === project.id);

  const statusAction = (to: ProjectStatus) => {
    actions.setProjectStatus(project.id, to);
    setConfirm(null);
  };

  // ===== ヘッダー操作（ステータスごと） =====
  const headerActions = (
    <>
      {!['完了', '中止'].includes(project.status) && (
        <Link to={`/admin/projects/${project.id}/edit`} className="btn btn-outline">
          編集
        </Link>
      )}
      {project.status === '下書き' && (
        <button className="btn btn-primary" onClick={() => setRecruitOpen(true)}>
          募集を開始する
        </button>
      )}
      {project.status === '募集中' && (
        <button className="btn btn-primary" onClick={() => setConfirm('close')}>
          応募を締め切る
        </button>
      )}
      {project.status === '応募締め切り' && (
        <button className="btn btn-primary" onClick={() => setConfirm('startSelect')}>
          選定を開始する
        </button>
      )}
      {project.status === '手配完了' && (
        <button className="btn btn-primary" onClick={() => setConfirm('start')}>
          施工開始にする
        </button>
      )}
      {project.status === '施工中' && (
        <button className="btn btn-primary" onClick={() => setConfirm('complete')}>
          完了にする
        </button>
      )}
      {!['完了', '中止'].includes(project.status) && (
        <button className="btn btn-danger-ghost" onClick={() => setConfirm('cancel')}>
          中止
        </button>
      )}
    </>
  );

  // ===== ステータスに応じた案内 =====
  const guide: Partial<Record<ProjectStatus, { tone: string; text: string }>> = {
    下書き: { tone: 'info', text: '下書きです。「募集を開始する」で通知対象業者を確認し、案件を通知します。' },
    募集中: {
      tone: r.passed ? 'warning' : 'info',
      text: r.passed
        ? '回答締め切りを過ぎています。「応募を締め切る」を押して選定に進んでください。'
        : `応募受付中です（${r.text}）。締め切り後に、集まった応募者の中から選定します。先着順での自動決定は行いません。`,
    },
    応募締め切り: { tone: 'warning', text: '応募を締め切りました。「選定を開始する」を押し、応募者を比較して決定する業者を選んでください。' },
    選定中: { tone: 'warning', text: '選定中です。決定する業者にチェックを入れ、「選定結果を確定して通知」を押してください。チェックしなかった業者は「見送り」になります。' },
    手配完了: { tone: 'success', text: '選定結果を通知済みです。必要に応じて個別に結果を変更できます（変更時も通知されます）。' },
    施工中: { tone: 'success', text: '施工中です。' },
    中止: { tone: 'danger', text: 'この案件は中止されました。' },
  };
  const g = guide[project.status];

  return (
    <>
      <PageHeader
        back={
          <Link to="/admin/projects" className="link-sm">
            ← 案件一覧
          </Link>
        }
        title={
          <>
            {project.title} <ProjectStatusBadge status={project.status} />
          </>
        }
        sub={
          <>
            {project.workCategory} ・ {project.prefecture} ・ {fmtRange(project.startAt, project.endAt)} ・ 必要 {project.requiredCount}名
          </>
        }
        actions={headerActions}
      />

      {g && <div className={`notice notice-${g.tone}`}>{g.text}</div>}

      <div className="kpis">
        <div className="kpi">
          <span>通知済み</span>
          <strong>{project.notifiedPartnerIds.length}社</strong>
        </div>
        <div className="kpi">
          <span>応募</span>
          <strong>{active.length}社</strong>
        </div>
        <div className="kpi">
          <span>辞退</span>
          <strong>{declined.length}社</strong>
        </div>
        <div className="kpi">
          <span>未回答</span>
          <strong>{noResponse.length}社</strong>
        </div>
        <div className="kpi">
          <span>決定人数 / 必要人数</span>
          <strong className={decidedHeadcount >= project.requiredCount ? 'text-success' : ''}>
            {decidedHeadcount} / {project.requiredCount}名
          </strong>
        </div>
        <div className="kpi">
          <span>回答締め切り</span>
          <strong>{fmtDateTime(project.deadline)}</strong>
        </div>
      </div>

      <div className="tabs">
        {(
          [
            ['applicants', `応募者・選定（${active.length}）`],
            ['info', '案件情報'],
            ['targets', `通知対象業者（${project.notifiedPartnerIds.length}）`],
            ['history', `履歴（${projectHistory.length}）`],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'applicants' && (
        <div className="card">
          <div className="card-head">
            <h2>応募者一覧</h2>
            <div className="card-head-tools">
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="distance">{target.kind === 'office' ? 'オフィス' : '現場'}までの距離が近い順</option>
                <option value="skill">熟練度が高い順</option>
                <option value="appliedAt">応募日時が早い順</option>
              </select>
            </div>
          </div>
          <DemoNote>
            距離（{target.kind === 'office' ? `協力業者の住所 → ${target.label}` : '協力業者の住所 → 作業場所'}の直線距離）と条件一致は<strong>選定の参考情報</strong>です。座標はデモ用の代表座標のため、実際の距離とは異なる場合があります。システムによる自動決定・先着順の決定は行わず、RASTAQ担当者が手動で選定します。
          </DemoNote>

          {active.length === 0 ? (
            <EmptyState icon="🙋" title="まだ応募はありません">
              {project.status === '下書き' ? '募集を開始すると、協力業者からの応募がここに表示されます。' : '協力業者からの応募をお待ちください。'}
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="table applicants">
                <thead>
                  <tr>
                    {selecting && <th className="col-check">決定</th>}
                    <th>会社名</th>
                    <th>対応エリア / 工種</th>
                    <th>熟練度・資格</th>
                    <th className="num">距離（直線・参考）</th>
                    <th className="num col-rate">単価（人日）</th>
                    <th>応募日時</th>
                    <th className="num">派遣可能</th>
                    <th>コメント</th>
                    <th>ステータス</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {active.map(({ a, partner, m }) => {
                    const checked = selected.includes(partner.id);
                    const unread = unreadOf(partner.id);
                    const rate = <RateCell rate={applicantRate(project, partner)} />;
                    return (
                      <tr key={a.id} className={checked ? 'row-selected' : ''} onClick={selecting ? () => toggle(partner.id) : undefined}>
                        {selecting && (
                          <td className="col-check">
                            <input type="checkbox" checked={checked} onChange={() => toggle(partner.id)} onClick={(e) => e.stopPropagation()} />
                          </td>
                        )}
                        <td>
                          <Link to={`/admin/partners/${partner.id}`} className="cell-link" onClick={(e) => e.stopPropagation()}>
                            {partner.companyName}
                          </Link>
                          <div className="cell-sub">{partner.contactName}</div>
                          <div className="rate-inline">単価 {rate}</div>
                          <MatchChips m={m} />
                        </td>
                        <td>
                          <div className="small">{fmtAreas(partner.areas)}</div>
                          <div className="tags">
                            {partner.workTypes.map((w) => (
                              <span key={w} className={`tag ${m.matchedWorkTypes.includes(w) ? 'tag-hit' : ''}`}>
                                {w}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="skill">
                            <LevelBadge level={partner.skillLevel} /> <LevelMeter level={partner.skillLevel} />
                            <span className="muted small">経験{partner.experienceYears}年</span>
                          </div>
                          <div className="cell-sub">{partner.qualifications.join('、')}</div>
                        </td>
                        <td className="num">
                          <DistanceLabel m={m} />
                        </td>
                        <td className="num nowrap col-rate">{rate}</td>
                        <td className="nowrap">{fmtDateTime(a.appliedAt)}</td>
                        <td className="num">{a.availableCount}名</td>
                        <td className="comment">{a.comment || <span className="muted">—</span>}</td>
                        <td>
                          <AppStatusBadge status={a.status} />
                          {a.resultNotifiedAt && <div className="cell-sub notified">✉ 通知済 {fmtDateTime(a.resultNotifiedAt)}</div>}
                        </td>
                        <td className="nowrap" onClick={(e) => e.stopPropagation()}>
                          <Link to={`/admin/chats/${project.id}/${partner.id}`} className="btn btn-ghost btn-sm">
                            チャット{unread > 0 && <span className="dot-count">{unread}</span>}
                          </Link>
                          {resultFixed && a.status === '決定' && (
                            <button className="btn btn-ghost btn-sm text-danger" onClick={() => setChangeTarget({ app: a, to: '見送り' })}>
                              見送りに変更
                            </button>
                          )}
                          {resultFixed && a.status === '見送り' && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setChangeTarget({ app: a, to: '決定' })}>
                              決定に変更
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {declined.length > 0 && (
            <div className="declined">
              <h3>辞退した業者（{declined.length}）</h3>
              <ul>
                {declined.map(({ a, partner }) => (
                  <li key={a.id}>
                    <span>{partner.companyName}</span>
                    <span className="muted">{a.comment}</span>
                    <span className="muted small">{fmtDateTime(a.appliedAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selecting && (
            <div className="select-bar">
              <div>
                <div className="select-count">
                  決定予定：<strong>{selected.length}社</strong>（派遣可能 計{selectedHeadcount}名） ／ 必要人数 {project.requiredCount}名
                </div>
                {selected.length > 0 && selectedHeadcount < project.requiredCount && <div className="text-warning small">必要人数に足りていません</div>}
                {selectedHeadcount > project.requiredCount && <div className="text-warning small">必要人数を超えています（調整はチャットで確認してください）</div>}
              </div>
              <button className="btn btn-success btn-lg" disabled={selected.length === 0} onClick={() => setConfirm('select')}>
                選定結果を確定して通知
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'info' && (
        <div className="card">
          <dl className="info-grid">
            <InfoRow label="案件名">{project.title}</InfoRow>
            <InfoRow label="作業エリア">{project.prefecture || <span className="text-warning">未設定</span>}</InfoRow>
            <InfoRow label="作業場所住所">
              {project.address}
              <GeoStatus address={project.address} />
            </InfoRow>
            <InfoRow label="作業内容">
              {project.workCategory}
              {project.workDetail && <div className="muted">{project.workDetail}</div>}
            </InfoRow>
            <InfoRow label="難易度">
              <LevelBadge level={project.difficulty} withName />
              {lv.provisional && <Badge tone="amber">仮の説明</Badge>}
              <div className="muted small">{lv.description}</div>
            </InfoRow>
            <InfoRow label="必要人数">{project.requiredCount}名</InfoRow>
            <InfoRow label="作業日時">
              {fmtFull(project.startAt)} 〜 {fmtFull(project.endAt)}
            </InfoRow>
            <InfoRow label="集合方法">
              {project.meetingMethod}
              {target.kind === 'office' && <div className="muted">{target.address}</div>}
            </InfoRow>
            <InfoRow label="集合場所・時刻">{project.meetingPlace}</InfoRow>
            <InfoRow label="距離の計算">協力業者の住所 → {target.label}（直線距離・参考）</InfoRow>
            <InfoRow label="交通費">実費支給</InfoRow>
            <InfoRow label="回答締め切り">{fmtFull(project.deadline)}</InfoRow>
            <InfoRow label="単価">
              {project.customRate !== null ? (
                <>
                  個別単価 {yen(project.customRate)}／人日 <Badge tone="amber">仮設定</Badge>
                </>
              ) : (
                '各協力業者の基本単価を適用'
              )}
            </InfoRow>
            <InfoRow label="特記事項">{project.notes && <span className="pre">{project.notes}</span>}</InfoRow>
            <InfoRow label="添付資料">
              {project.attachments.length > 0 && (
                <div className="attach-grid">
                  {project.attachments.map((f) => (
                    <div key={f} className="attach">
                      <div className="attach-thumb">{/\.(jpe?g|png|gif|heic)$/i.test(f) ? '🖼' : '📄'}</div>
                      <div className="attach-name">{f}</div>
                    </div>
                  ))}
                </div>
              )}
            </InfoRow>
            <InfoRow label="登録日時">{fmtFull(project.createdAt)}</InfoRow>
            <InfoRow label="募集開始日時">{project.recruitStartedAt && fmtFull(project.recruitStartedAt)}</InfoRow>
          </dl>
        </div>
      )}

      {tab === 'targets' && (
        <div className="card">
          {project.notifiedPartnerIds.length === 0 ? (
            <EmptyState icon="📣" title="まだ通知していません">
              {project.status === '下書き' && (
                <button className="btn btn-primary" onClick={() => setRecruitOpen(true)}>
                  通知対象を確認して募集開始
                </button>
              )}
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>会社名</th>
                    <th>条件一致（参考）</th>
                    <th className="num">距離（直線・参考）</th>
                    <th>回答状況</th>
                  </tr>
                </thead>
                <tbody>
                  {project.notifiedPartnerIds
                    .map((pid) => state.partners.find((p) => p.id === pid))
                    .filter((p): p is Partner => !!p)
                    .map((p) => ({ p, m: matchPartner(project, p) }))
                    .sort((x, y) => byDistance(x.m, y.m))
                    .map(({ p, m }) => {
                      const a = rows.find((x) => x.partner.id === p.id)?.a;
                      return (
                        <tr key={p.id}>
                          <td>
                            <Link to={`/admin/partners/${p.id}`} className="cell-link">
                              {p.companyName}
                            </Link>
                          </td>
                          <td>
                            <MatchChips m={m} />
                          </td>
                          <td className="num">
                            <DistanceLabel m={m} />
                          </td>
                          <td>{a ? <AppStatusBadge status={a.status} /> : <AppStatusBadge status="未回答" />}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          {projectHistory.length === 0 ? (
            <EmptyState title="履歴はありません" />
          ) : (
            <ul className="timeline">
              {projectHistory.map((h) => (
                <li key={h.id}>
                  <span className="tl-at">{fmtDateTime(h.at)}</span>
                  <span className="tl-type">{h.type}</span>
                  <span>{h.message}</span>
                  <span className="muted small">{h.actor}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ===== ダイアログ ===== */}
      {recruitOpen && <RecruitDialog project={project} open onClose={() => setRecruitOpen(false)} />}

      <ConfirmDialog
        open={confirm === 'close'}
        title="応募の締め切り"
        confirmLabel="締め切る"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          actions.closeRecruit(project.id);
          setConfirm(null);
        }}
      >
        応募の受付を締め切ります。締め切り後は協力業者からの応募ができなくなります。
        <br />
        現在の応募：<strong>{active.length}社</strong>
      </ConfirmDialog>

      <ConfirmDialog open={confirm === 'startSelect'} title="選定の開始" confirmLabel="選定を開始する" onCancel={() => setConfirm(null)} onConfirm={() => statusAction('選定中')}>
        ステータスを「選定中」にし、応募者{active.length}社の中から決定する業者を選びます。
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === 'select'}
        title="選定結果の確定・通知"
        tone="success"
        confirmLabel="確定して通知する"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          actions.confirmSelection(project.id, selected);
          setSelected([]);
          setConfirm(null);
        }}
      >
        <p className="dialog-lead">以下の内容で選定結果を確定し、各協力業者へ通知します。</p>
        <div className="result-preview">
          <div>
            <h4 className="text-success">決定（{selected.length}社）</h4>
            <ul>
              {active
                .filter((x) => selected.includes(x.partner.id))
                .map((x) => (
                  <li key={x.a.id}>
                    {x.partner.companyName}（{x.a.availableCount}名）
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <h4 className="muted">見送り（{active.length - selected.length}社）</h4>
            <ul>
              {active
                .filter((x) => !selected.includes(x.partner.id))
                .map((x) => (
                  <li key={x.a.id}>{x.partner.companyName}</li>
                ))}
              {active.length === selected.length && <li className="muted">なし</li>}
            </ul>
          </div>
        </div>
        <p className="muted small">確定後、案件ステータスは「手配完了」になります。※ デモのため実際の通知は送信されません。</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!changeTarget}
        title="選定結果の変更"
        tone={changeTarget?.to === '見送り' ? 'danger' : 'primary'}
        confirmLabel={`「${changeTarget?.to}」に変更して通知`}
        onCancel={() => setChangeTarget(null)}
        onConfirm={() => {
          if (changeTarget) actions.changeResult(changeTarget.app.id, changeTarget.to);
          setChangeTarget(null);
        }}
      >
        {changeTarget && (
          <>
            <p>
              <strong>{state.partners.find((p) => p.id === changeTarget.app.partnerId)?.companyName}</strong> の選定結果を
              <br />「{changeTarget.app.status}」→「<strong>{changeTarget.to}</strong>」に変更します。
            </p>
            <div className="notice notice-warning">通知済みの結果を変更します。協力業者には変更後の結果が通知されます。誤操作でないかご確認ください。</div>
          </>
        )}
      </ConfirmDialog>

      <ConfirmDialog open={confirm === 'start'} title="施工開始" confirmLabel="施工中にする" onCancel={() => setConfirm(null)} onConfirm={() => statusAction('施工中')}>
        案件ステータスを「施工中」に変更します。
      </ConfirmDialog>
      <ConfirmDialog open={confirm === 'complete'} title="案件の完了" confirmLabel="完了にする" onCancel={() => setConfirm(null)} onConfirm={() => statusAction('完了')}>
        案件ステータスを「完了」に変更します。
      </ConfirmDialog>
      <ConfirmDialog open={confirm === 'cancel'} title="案件の中止" tone="danger" confirmLabel="中止する" onCancel={() => setConfirm(null)} onConfirm={() => statusAction('中止')}>
        この案件を中止します。協力業者の画面でも「中止」と表示されます。この操作は取り消せません。
      </ConfirmDialog>
    </>
  );
}

/** 応募者一覧の単価表示（個別単価の案件は全応募者に個別単価、未設定は「未設定」） */
function RateCell({ rate }: { rate: ReturnType<typeof applicantRate> }) {
  if (rate.amount === null) return <span className="muted">未設定</span>;
  return (
    <span className="rate">
      <strong>{yen(rate.amount)}</strong>
      <span className={`rate-src ${rate.source}`}>{rate.source === 'custom' ? '個別単価' : '基本単価'}</span>
    </span>
  );
}
