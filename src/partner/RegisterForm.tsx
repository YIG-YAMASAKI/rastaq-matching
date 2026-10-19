import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckGroup, Field } from '../components/ui';
import { PrefecturePicker } from '../components/PrefecturePicker';
import { LEVELS, QUALIFICATIONS, WORK_TYPES } from '../data/master';
import { useStore } from '../store/AppStore';
import type { Level } from '../types';

interface Form {
  companyName: string;
  contactName: string;
  phone: string;
  fax: string;
  email: string;
  zip: string;
  address: string;
  industry: string;
  website: string;
  areas: string[];
  workTypes: string[];
  qualifications: string[];
  otherQualification: string;
  skillLevel: Level | 0;
  experienceYears: string;
  pr: string;
  question: string;
  agree: boolean;
}

const initial: Form = {
  companyName: '',
  contactName: '',
  phone: '',
  fax: '',
  email: '',
  zip: '',
  address: '',
  industry: '',
  website: '',
  areas: [],
  workTypes: [],
  qualifications: [],
  otherQualification: '',
  skillLevel: 0,
  experienceYears: '',
  pr: '',
  question: '',
  agree: false,
};

type Errors = Partial<Record<keyof Form, string>>;

const INDUSTRIES = ['ロープアクセス工事業', '建設業（とび・土工）', '建設業（塗装）', '建設業（防水）', 'ビルメンテナンス業', '看板・サイン業', 'その他'];

const validate = (f: Form): Errors => {
  const e: Errors = {};
  if (!f.companyName.trim()) e.companyName = '会社名を入力してください';
  if (!f.contactName.trim()) e.contactName = 'お名前を入力してください';
  if (!f.phone.trim()) e.phone = '電話番号を入力してください';
  else if (!/^0\d{1,4}-?\d{1,4}-?\d{3,4}$/.test(f.phone.trim())) e.phone = '電話番号の形式が正しくありません（例：03-1234-5678）';
  if (f.fax.trim() && !/^0\d{1,4}-?\d{1,4}-?\d{3,4}$/.test(f.fax.trim())) e.fax = 'FAX番号の形式が正しくありません';
  if (!f.email.trim()) e.email = 'メールアドレスを入力してください';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'メールアドレスの形式が正しくありません';
  if (!/^\d{3}-?\d{4}$/.test(f.zip.trim())) e.zip = '郵便番号を7桁で入力してください（例：105-0011）';
  if (!f.address.trim()) e.address = '住所を入力してください';
  if (!f.industry) e.industry = '業種を選択してください';
  if (f.website.trim() && !/^https?:\/\/.+/.test(f.website.trim())) e.website = 'http:// または https:// から入力してください';
  if (f.areas.length === 0) e.areas = '対応エリア（都道府県または全国）を1つ以上選択してください';
  if (f.workTypes.length === 0) e.workTypes = '該当工種を1つ以上選択してください';
  if (!f.skillLevel) e.skillLevel = 'ロープアクセスの熟練度を選択してください';
  if (!f.agree) e.agree = '個人情報の取り扱いへの同意が必要です';
  return e;
};

export function RegisterForm() {
  const { actions } = useStore();
  const navigate = useNavigate();
  const [f, setF] = useState<Form>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (submitted) setErrors(validate(next));
  };

  const submit = () => {
    setSubmitted(true);
    const e = validate(f);
    setErrors(e);
    if (Object.keys(e).length) {
      actions.toast(`入力内容に不備があります（${Object.keys(e).length}件）`, 'warning');
      setTimeout(() => document.querySelector('.reg .has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
      return;
    }
    const qualifications = [...f.qualifications, ...f.otherQualification.split(/[、,]/).map((s) => s.trim()).filter(Boolean)];
    actions.registerPartner({
      companyName: f.companyName.trim(),
      contactName: f.contactName.trim(),
      phone: f.phone.trim(),
      fax: f.fax.trim(),
      email: f.email.trim(),
      zip: f.zip.trim(),
      address: f.address.trim(),
      industry: f.industry,
      website: f.website.trim(),
      areas: f.areas,
      workTypes: f.workTypes,
      qualifications,
      skillLevel: f.skillLevel as Level,
      experienceYears: Number(f.experienceYears) || 0,
      pr: f.pr.trim(),
      question: f.question.trim(),
    });
    navigate('/register/done', { state: { companyName: f.companyName.trim(), email: f.email.trim() } });
  };

  return (
    <div className="reg">
      <header className="reg-header">
        <span className="brand-logo sm">R</span>
        <div>
          <div className="reg-brand">RASTAQ</div>
          <div className="reg-sub">協力業者 新規登録</div>
        </div>
      </header>
      <div className="reg-body">
        <div className="reg-intro">
          <h1>協力業者登録フォーム</h1>
          <p>RASTAQの協力業者としてご登録いただける企業様は、以下のフォームよりお申し込みください。内容を確認のうえ、担当者よりご連絡いたします。</p>
          <p className="small">
            <span className="req">必須</span> は入力必須の項目です。
          </p>
        </div>

        <section className="reg-section">
          <h2>会社・ご担当者情報</h2>
          <Field label="会社名" required error={errors.companyName}>
            <input value={f.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="例）株式会社○○工業" autoComplete="organization" />
          </Field>
          <Field label="お名前" required error={errors.contactName}>
            <input value={f.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="例）山田 太郎" autoComplete="name" />
          </Field>
          <Field label="電話番号" required error={errors.phone}>
            <input type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="例）03-1234-5678" autoComplete="tel" />
          </Field>
          <Field label="FAX" error={errors.fax}>
            <input type="tel" inputMode="tel" value={f.fax} onChange={(e) => set('fax', e.target.value)} placeholder="例）03-1234-5679" />
          </Field>
          <Field label="メールアドレス" required error={errors.email}>
            <input type="email" inputMode="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="例）info@example.co.jp" autoComplete="email" />
          </Field>
          <Field label="郵便番号" required error={errors.zip}>
            <input inputMode="numeric" value={f.zip} onChange={(e) => set('zip', e.target.value)} placeholder="例）105-0011" autoComplete="postal-code" />
          </Field>
          <Field label="住所" required error={errors.address}>
            <input value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="例）東京都港区芝公園2-4-1" autoComplete="street-address" />
          </Field>
          <Field label="業種" required error={errors.industry}>
            <select value={f.industry} onChange={(e) => set('industry', e.target.value)}>
              <option value="">選択してください</option>
              {INDUSTRIES.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </Field>
          <Field label="ホームページURL" error={errors.website}>
            <input type="url" inputMode="url" value={f.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" />
          </Field>
        </section>

        <section className="reg-section">
          <h2>対応エリア・工種</h2>
          <Field label="対応エリア（都道府県・複数選択可）" required error={errors.areas}>
            <PrefecturePicker value={f.areas} onChange={(v) => set('areas', v)} mobile />
          </Field>
          <Field label="該当工種（複数選択可）" required error={errors.workTypes}>
            <CheckGroup options={WORK_TYPES} value={f.workTypes} onChange={(v) => set('workTypes', v)} columns={1} />
          </Field>
        </section>

        <section className="reg-section">
          <h2>資格・経験</h2>
          <Field label="保有資格（複数選択可）">
            <CheckGroup options={QUALIFICATIONS} value={f.qualifications} onChange={(v) => set('qualifications', v)} columns={1} />
            <input
              style={{ marginTop: 8 }}
              value={f.otherQualification}
              onChange={(e) => set('otherQualification', e.target.value)}
              placeholder="その他の資格（読点区切りで複数入力可）"
            />
          </Field>
          <Field label="ロープアクセスの経験・熟練度" required error={errors.skillLevel}>
            <div className="level-options mobile">
              {LEVELS.map((l) => (
                <label key={l.level} className={`level-option ${f.skillLevel === l.level ? 'checked' : ''}`}>
                  <input type="radio" name="skill" checked={f.skillLevel === l.level} onChange={() => set('skillLevel', l.level)} />
                  <div className="level-option-head">
                    <strong>
                      Lv.{l.level} {l.name}
                    </strong>
                    {l.provisional && <span className="badge badge-amber">仮</span>}
                  </div>
                  <div className="level-option-desc">{l.description}</div>
                </label>
              ))}
            </div>
          </Field>
          <Field label="ロープアクセス経験年数">
            <div className="input-suffix">
              <input type="number" inputMode="numeric" min={0} value={f.experienceYears} onChange={(e) => set('experienceYears', e.target.value)} />
              <span>年</span>
            </div>
          </Field>
        </section>

        <section className="reg-section">
          <h2>その他</h2>
          <Field label="PRポイント">
            <textarea rows={4} value={f.pr} onChange={(e) => set('pr', e.target.value)} placeholder="得意な作業、実績、保有機材など" />
          </Field>
          <Field label="質問事項">
            <textarea rows={3} value={f.question} onChange={(e) => set('question', e.target.value)} placeholder="ご不明な点があればご記入ください" />
          </Field>
          <div className={`field ${errors.agree ? 'has-error' : ''}`}>
            <label className="agree">
              <input type="checkbox" checked={f.agree} onChange={(e) => set('agree', e.target.checked)} />
              <span>個人情報の取り扱いに同意する（デモのため規約本文は省略）</span>
            </label>
            {errors.agree && <div className="field-error">{errors.agree}</div>}
          </div>
        </section>

        <button className="btn btn-primary btn-block btn-xl" onClick={submit}>
          この内容で登録を申し込む
        </button>
        <p className="muted small center">※ デモのため実際のメール送信は行われません</p>
      </div>
    </div>
  );
}

export function RegisterDone() {
  const location = useLocation();
  const s = (location.state ?? {}) as { companyName?: string; email?: string };
  return (
    <div className="reg">
      <header className="reg-header">
        <span className="brand-logo sm">R</span>
        <div>
          <div className="reg-brand">RASTAQ</div>
          <div className="reg-sub">協力業者 新規登録</div>
        </div>
      </header>
      <div className="reg-body">
        <div className="reg-done">
          <div className="reg-done-icon">✓</div>
          <h1>お申し込みを受け付けました</h1>
          {s.companyName && (
            <p>
              <strong>{s.companyName}</strong> 様
            </p>
          )}
          <p>
            ご登録ありがとうございます。
            <br />
            内容を確認のうえ、担当者より
            {s.email ? (
              <>
                <br />
                <strong>{s.email}</strong> 宛に
              </>
            ) : null}
            ご連絡いたします。
          </p>
          <div className="reg-done-steps">
            <div>
              <span>1</span>申込み受付
            </div>
            <div>
              <span>2</span>RASTAQにて審査
            </div>
            <div>
              <span>3</span>契約手続き・利用開始
            </div>
          </div>
          <div className="demo-note">
            デモ：<Link to="/admin/reviews">管理画面の「新規登録審査」</Link>に申請が反映されています。
          </div>
          <Link to="/register" className="btn btn-outline btn-block">
            フォームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
