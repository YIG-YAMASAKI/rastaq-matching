import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PartnerFields, pickEditable, validatePartner, type PartnerEditable, type PartnerErrors } from '../components/PartnerFields';
import { AppStatusBadge, Badge, ConfirmDialog, DemoNote, EmptyState, GeoStatus, InfoRow, LevelBadge, LevelMeter, Modal, ProjectStatusBadge, RegStatusBadge } from '../components/ui';
import { levelDef } from '../data/master';
import { fmtAreas, fmtDateTime, fmtFull, yen } from '../lib';
import { useStore } from '../store/AppStore';
import type { RegistrationStatus } from '../types';
import { PageHeader } from './AdminLayout';

const REVIEW_ACTIONS: { status: RegistrationStatus; label: string; tone: 'success' | 'primary' | 'danger'; desc: string; needNote: boolean }[] = [
  { status: '承認済み', label: '承認する', tone: 'success', desc: '協力業者として承認し、案件通知の対象にします（契約状況は「契約済み」になります）。', needNote: false },
  { status: '差し戻し', label: '差し戻す', tone: 'primary', desc: '登録内容に不備がある場合に、修正を依頼します。差し戻し理由を入力してください。', needNote: true },
  { status: '利用停止', label: '利用停止にする', tone: 'danger', desc: '案件通知の対象外とし、スマホ画面へのログインを停止します。', needNote: true },
];

export function PartnerDetail({ review }: { review?: boolean }) {
  const { id } = useParams();
  const { state, actions } = useStore();
  const partner = state.partners.find((p) => p.id === id);
  const [editing, setEditing] = useState<PartnerEditable | null>(null);
  const [errors, setErrors] = useState<PartnerErrors>({});
  const [action, setAction] = useState<(typeof REVIEW_ACTIONS)[number] | null>(null);
  const [note, setNote] = useState('');
  const [rate, setRate] = useState<string | null>(null);

  if (!partner) {
    return (
      <div className="card">
        <EmptyState icon="❓" title="協力業者が見つかりません" />
      </div>
    );
  }

  const apps = state.applications
    .filter((a) => a.partnerId === partner.id)
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
  const lv = levelDef(partner.skillLevel);
  const backTo = review ? '/admin/reviews' : '/admin/partners';
  const available = REVIEW_ACTIONS.filter((a) => a.status !== partner.registrationStatus);

  const saveEdit = () => {
    if (!editing) return;
    const e = validatePartner(editing);
    setErrors(e);
    if (Object.keys(e).length) return;
    actions.updatePartner(partner.id, editing, state.adminUser);
    setEditing(null);
  };

  return (
    <>
      <PageHeader
        back={
          <Link to={backTo} className="link-sm">
            ← {review ? '審査一覧' : '協力業者一覧'}
          </Link>
        }
        title={
          <>
            {partner.companyName} <RegStatusBadge status={partner.registrationStatus} />
          </>
        }
        sub={`登録日時 ${fmtFull(partner.registeredAt)}${partner.fromRegistrationForm ? '（新規登録フォームから申請）' : ''}`}
        actions={
          <button
            className="btn btn-outline"
            onClick={() => {
              setErrors({});
              setEditing(pickEditable(partner));
            }}
          >
            登録情報を編集
          </button>
        }
      />

      <div className="grid-side">
        <div>
          <section className="card">
            <div className="card-head">
              <h2>登録情報</h2>
            </div>
            <dl className="info-grid">
              <InfoRow label="会社名">{partner.companyName}</InfoRow>
              <InfoRow label="担当者名">{partner.contactName}</InfoRow>
              <InfoRow label="電話番号">{partner.phone}</InfoRow>
              <InfoRow label="FAX">{partner.fax}</InfoRow>
              <InfoRow label="メールアドレス">{partner.email}</InfoRow>
              <InfoRow label="住所">
                {partner.zip && `〒${partner.zip} `}
                {partner.address}
                <GeoStatus address={partner.address} />
              </InfoRow>
              <InfoRow label="業種">{partner.industry}</InfoRow>
              <InfoRow label="ホームページ">{partner.website}</InfoRow>
              <InfoRow label="対応エリア">
                {fmtAreas(partner.areas)}
                {!!partner.legacyAreas?.length && (
                  <div className="geo-status ng">⚠ 旧仕様のエリア「{partner.legacyAreas.join('・')}」は都道府県に移行できませんでした。編集で再設定してください</div>
                )}
              </InfoRow>
              <InfoRow label="対応工種">
                <div className="tags">
                  {partner.workTypes.map((w) => (
                    <span key={w} className="tag">
                      {w}
                    </span>
                  ))}
                </div>
              </InfoRow>
              <InfoRow label="保有資格">{partner.qualifications.join('、')}</InfoRow>
              <InfoRow label="ロープアクセス熟練度">
                <LevelBadge level={partner.skillLevel} withName /> <LevelMeter level={partner.skillLevel} />
                <div className="muted small">
                  経験{partner.experienceYears}年 ・ 作業可能人数 {partner.workerCount}名 ／ {lv.description}
                </div>
              </InfoRow>
              <InfoRow label="PRポイント">{partner.pr && <span className="pre">{partner.pr}</span>}</InfoRow>
              {partner.fromRegistrationForm && <InfoRow label="質問事項">{partner.question && <span className="pre">{partner.question}</span>}</InfoRow>}
            </dl>
          </section>

          {!review && (
            <section className="card">
              <div className="card-head">
                <h2>応募・稼働履歴</h2>
              </div>
              {apps.length === 0 ? (
                <EmptyState title="応募履歴はありません" />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>案件</th>
                        <th>応募日時</th>
                        <th>応募ステータス</th>
                        <th>案件ステータス</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apps.map((a) => {
                        const pj = state.projects.find((p) => p.id === a.projectId);
                        if (!pj) return null;
                        return (
                          <tr key={a.id}>
                            <td>
                              <Link to={`/admin/projects/${pj.id}`} className="cell-link">
                                {pj.title}
                              </Link>
                            </td>
                            <td>{fmtDateTime(a.appliedAt)}</td>
                            <td>
                              <AppStatusBadge status={a.status} />
                            </td>
                            <td>
                              <ProjectStatusBadge status={pj.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>

        <aside>
          <section className="card">
            <div className="card-head">
              <h2>{review ? '審査' : '契約・ステータス'}</h2>
            </div>
            <dl className="info-grid compact">
              <InfoRow label="登録ステータス">
                <RegStatusBadge status={partner.registrationStatus} />
              </InfoRow>
              <InfoRow label="契約状況">
                <Badge tone={partner.contractStatus === '契約済み' ? 'navy' : 'gray'}>{partner.contractStatus}</Badge>
              </InfoRow>
              <InfoRow label="基本単価（仮）">
                {rate === null ? (
                  <>
                    {partner.baseRate ? `${yen(partner.baseRate)}／人日` : '未設定'}{' '}
                    <button className="link-btn" onClick={() => setRate(String(partner.baseRate ?? ''))}>
                      変更
                    </button>
                  </>
                ) : (
                  <div className="inline-edit">
                    <input type="number" step={1000} value={rate} onChange={(e) => setRate(e.target.value)} />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        actions.updatePartner(partner.id, { baseRate: rate ? Number(rate) : null }, state.adminUser);
                        setRate(null);
                      }}
                    >
                      保存
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setRate(null)}>
                      取消
                    </button>
                  </div>
                )}
              </InfoRow>
              {partner.reviewNote && <InfoRow label="審査メモ">{partner.reviewNote}</InfoRow>}
            </dl>
            <DemoNote>単価はデモ上の仮設定です。</DemoNote>
            <div className="review-actions">
              {available.map((a) => (
                <button
                  key={a.status}
                  className={`btn btn-${a.tone === 'primary' ? 'outline' : a.tone === 'danger' ? 'danger-ghost' : 'success'} btn-block`}
                  onClick={() => {
                    setNote('');
                    setAction(a);
                  }}
                >
                  {a.status === '承認済み' && partner.registrationStatus === '利用停止' ? '利用を再開する（承認済みに戻す）' : a.label}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={!!action}
        title={`登録ステータスの変更：${action?.status}`}
        tone={action?.tone}
        confirmLabel={action?.label ?? ''}
        disabled={!!action?.needNote && !note.trim()}
        onCancel={() => setAction(null)}
        onConfirm={() => {
          if (action) actions.reviewPartner(partner.id, action.status, note.trim());
          setAction(null);
        }}
      >
        <p>
          <strong>{partner.companyName}</strong> の登録ステータスを「{partner.registrationStatus}」→「<strong>{action?.status}</strong>」に変更します。
        </p>
        <p className="muted small">{action?.desc}</p>
        <label className="field-label" style={{ marginTop: 12 }}>
          {action?.needNote ? '理由（必須）' : 'メモ（任意）'}
        </label>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={action?.needNote ? '例）保有資格の証明書類をご提出ください' : ''} />
        <p className="muted small">※ デモのため申請者へのメール通知は送信されません。</p>
      </ConfirmDialog>

      <Modal
        open={!!editing}
        wide
        title="登録情報の編集"
        onClose={() => setEditing(null)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>
              キャンセル
            </button>
            <button className="btn btn-primary" onClick={saveEdit}>
              保存する
            </button>
          </>
        }
      >
        {editing && <PartnerFields value={editing} onChange={setEditing} errors={errors} legacyAreas={partner.legacyAreas} showGeo />}
      </Modal>
    </>
  );
}
