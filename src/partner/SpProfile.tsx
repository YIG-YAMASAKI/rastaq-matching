import { useState, type ReactNode } from 'react';
import { PartnerFields, pickEditable, validatePartner, type PartnerEditable, type PartnerErrors } from '../components/PartnerFields';
import { Badge, LevelBadge, LevelMeter, RegStatusBadge } from '../components/ui';
import { fmtAreas } from '../lib';
import { useCurrentPartner, useStore } from '../store/AppStore';

export function SpProfile() {
  const { actions } = useStore();
  const partner = useCurrentPartner();
  const [form, setForm] = useState<PartnerEditable | null>(null);
  const [errors, setErrors] = useState<PartnerErrors>({});

  const save = () => {
    if (!form) return;
    const e = validatePartner(form);
    setErrors(e);
    if (Object.keys(e).length) {
      actions.toast('入力内容を確認してください', 'warning');
      return;
    }
    actions.updatePartner(partner.id, form, partner.companyName);
    setForm(null);
  };

  if (form) {
    return (
      <div className="sp-page with-action">
        <h1 className="sp-title">自社情報の編集</h1>
        <div className="sp-form">
          <PartnerFields value={form} onChange={setForm} errors={errors} legacyAreas={partner.legacyAreas} mobile />
        </div>
        <div className="sp-action-bar">
          <button className="btn btn-outline btn-lg" onClick={() => setForm(null)}>
            キャンセル
          </button>
          <button className="btn btn-primary btn-lg grow" onClick={save}>
            保存する
          </button>
        </div>
      </div>
    );
  }

  const rows: [string, ReactNode][] = [
    ['担当者名', partner.contactName],
    ['電話番号', partner.phone],
    ['FAX', partner.fax],
    ['メール', partner.email],
    ['住所', `${partner.zip ? `〒${partner.zip} ` : ''}${partner.address}`],
    ['ホームページ', partner.website],
    ['対応エリア', fmtAreas(partner.areas)],
    ['経験年数', `${partner.experienceYears}年`],
    ['作業可能人数', `${partner.workerCount}名`],
  ];

  return (
    <div className="sp-page">
      <h1 className="sp-title">自社情報</h1>
      <div className="sp-profile-head">
        <div className="sp-profile-avatar">{partner.companyName.replace(/株式会社|有限会社|合同会社/g, '').trim().charAt(0)}</div>
        <div>
          <div className="sp-profile-name">{partner.companyName}</div>
          <div className="sp-profile-badges">
            <RegStatusBadge status={partner.registrationStatus} />
            <Badge tone="navy">{partner.contractStatus}</Badge>
          </div>
        </div>
      </div>
      <section className="sp-section">
        <h3>ロープアクセス熟練度</h3>
        <p>
          <LevelBadge level={partner.skillLevel} withName /> <LevelMeter level={partner.skillLevel} />
        </p>
      </section>
      <section className="sp-section">
        <h3>基本情報</h3>
        {rows.map(([k, v]) => (
          <div key={k} className="sp-kv">
            <span>{k}</span>
            <strong>{v || <span className="muted">未登録</span>}</strong>
          </div>
        ))}
      </section>
      <section className="sp-section">
        <h3>対応工種</h3>
        <div className="tags">
          {partner.workTypes.map((w) => (
            <span key={w} className="tag">
              {w}
            </span>
          ))}
        </div>
      </section>
      <section className="sp-section">
        <h3>保有資格</h3>
        <div className="tags">
          {partner.qualifications.map((w) => (
            <span key={w} className="tag">
              {w}
            </span>
          ))}
          {partner.qualifications.length === 0 && <span className="muted">未登録</span>}
        </div>
      </section>
      <section className="sp-section">
        <h3>PRポイント</h3>
        <p className="pre">{partner.pr || <span className="muted">未登録</span>}</p>
      </section>
      <button
        className="btn btn-primary btn-block btn-lg"
        onClick={() => {
          setErrors({});
          setForm(pickEditable(partner));
        }}
      >
        登録情報を編集する
      </button>
    </div>
  );
}
