import { LEVELS, QUALIFICATIONS, WORK_TYPES } from '../data/master';
import { PrefecturePicker } from './PrefecturePicker';
import type { Level, Partner } from '../types';
import { CheckGroup, Field, GeoStatus } from './ui';

export type PartnerEditable = Pick<
  Partner,
  | 'contactName'
  | 'phone'
  | 'fax'
  | 'email'
  | 'zip'
  | 'address'
  | 'website'
  | 'areas'
  | 'workTypes'
  | 'qualifications'
  | 'skillLevel'
  | 'experienceYears'
  | 'workerCount'
  | 'pr'
>;

export const pickEditable = (p: Partner): PartnerEditable => ({
  contactName: p.contactName,
  phone: p.phone,
  fax: p.fax,
  email: p.email,
  zip: p.zip,
  address: p.address,
  website: p.website,
  areas: p.areas,
  workTypes: p.workTypes,
  qualifications: p.qualifications,
  skillLevel: p.skillLevel,
  experienceYears: p.experienceYears,
  workerCount: p.workerCount,
  pr: p.pr,
});

export type PartnerErrors = Partial<Record<keyof PartnerEditable, string>>;

export const validatePartner = (f: PartnerEditable): PartnerErrors => {
  const e: PartnerErrors = {};
  if (!f.contactName.trim()) e.contactName = '担当者名を入力してください';
  if (!/^0\d{1,4}-?\d{1,4}-?\d{3,4}$/.test(f.phone.trim())) e.phone = '電話番号の形式が正しくありません（例：03-1234-5678）';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'メールアドレスの形式が正しくありません';
  if (f.areas.length === 0) e.areas = '対応エリア（都道府県または全国）を1つ以上選択してください';
  if (f.workTypes.length === 0) e.workTypes = '工種を1つ以上選択してください';
  return e;
};

/** 協力業者の登録情報フォーム（管理画面の編集・スマホの自社情報で共通） */
export function PartnerFields({
  value,
  onChange,
  errors = {},
  mobile,
  legacyAreas,
  showGeo,
}: {
  value: PartnerEditable;
  onChange: (v: PartnerEditable) => void;
  errors?: PartnerErrors;
  mobile?: boolean;
  legacyAreas?: string[];
  showGeo?: boolean; // 住所に距離計算用の座標があるかを表示（管理画面のみ）
}) {
  const set = <K extends keyof PartnerEditable>(k: K, v: PartnerEditable[K]) => onChange({ ...value, [k]: v });
  return (
    <>
      <div className={mobile ? '' : 'form-row'}>
        <Field label="担当者名" required error={errors.contactName}>
          <input value={value.contactName} onChange={(e) => set('contactName', e.target.value)} autoComplete="name" />
        </Field>
        <Field label="電話番号" required error={errors.phone}>
          <input type="tel" inputMode="tel" value={value.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" />
        </Field>
      </div>
      <div className={mobile ? '' : 'form-row'}>
        <Field label="メールアドレス" required error={errors.email}>
          <input type="email" inputMode="email" value={value.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
        </Field>
        <Field label="FAX">
          <input type="tel" inputMode="tel" value={value.fax} onChange={(e) => set('fax', e.target.value)} />
        </Field>
      </div>
      <div className={mobile ? '' : 'form-row'}>
        <Field label="郵便番号">
          <input inputMode="numeric" value={value.zip} onChange={(e) => set('zip', e.target.value)} placeholder="000-0000" autoComplete="postal-code" />
        </Field>
        <Field label="住所">
          <input value={value.address} onChange={(e) => set('address', e.target.value)} autoComplete="street-address" />
          {showGeo && <GeoStatus address={value.address} />}
        </Field>
      </div>
      <Field label="ホームページURL">
        <input type="url" inputMode="url" value={value.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" />
      </Field>
      <Field label="対応エリア（都道府県・複数選択可）" required error={errors.areas}>
        <PrefecturePicker value={value.areas} onChange={(v) => set('areas', v)} legacyAreas={legacyAreas} mobile={mobile} />
      </Field>
      <Field label="対応工種（複数選択可）" required error={errors.workTypes}>
        <CheckGroup options={WORK_TYPES} value={value.workTypes} onChange={(v) => set('workTypes', v)} columns={mobile ? 1 : 3} />
      </Field>
      <Field label="保有資格（複数選択可）">
        <CheckGroup options={QUALIFICATIONS} value={value.qualifications} onChange={(v) => set('qualifications', v)} columns={mobile ? 1 : 2} />
      </Field>
      <Field label="ロープアクセスの熟練度" required hint="案件の難易度レベルと同じ基準です">
        <select value={value.skillLevel} onChange={(e) => set('skillLevel', Number(e.target.value) as Level)}>
          {LEVELS.map((l) => (
            <option key={l.level} value={l.level}>
              Lv.{l.level} {l.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="form-row">
        <Field label="ロープアクセス経験年数">
          <div className="input-suffix">
            <input type="number" inputMode="numeric" min={0} value={value.experienceYears} onChange={(e) => set('experienceYears', Number(e.target.value))} />
            <span>年</span>
          </div>
        </Field>
        <Field label="作業可能人数">
          <div className="input-suffix">
            <input type="number" inputMode="numeric" min={0} value={value.workerCount} onChange={(e) => set('workerCount', Number(e.target.value))} />
            <span>名</span>
          </div>
        </Field>
      </div>
      <Field label="PRポイント">
        <textarea rows={4} value={value.pr} onChange={(e) => set('pr', e.target.value)} />
      </Field>
    </>
  );
}
