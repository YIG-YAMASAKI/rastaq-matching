import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DemoNote, Field, GeoStatus, InfoRow, LevelBadge } from '../components/ui';
import { DEMO_COORDS, RASTAQ_OFFICE, REGIONS, prefectureOf } from '../data/geo';
import { CATEGORY_WORK_TYPES, DEFAULT_BASE_RATE, LEVELS, MEETING_METHODS, WORK_CATEGORIES, levelDef } from '../data/master';
import { distanceTarget, fmtFull, fromLocalInput, toLocalInput, yen } from '../lib';
import { useStore, type ProjectInput } from '../store/AppStore';
import type { Level } from '../types';
import { PageHeader } from './AdminLayout';

const plusDays = (d: number, h: number) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  x.setHours(h, 0, 0, 0);
  return x.toISOString();
};

const empty = (): ProjectInput => ({
  title: '',
  prefecture: '',
  address: '',
  workCategory: 'シート貼り',
  workDetail: '',
  difficulty: 3,
  requiredCount: 2,
  startAt: plusDays(14, 8),
  endAt: plusDays(14, 17),
  meetingMethod: '現場直行',
  meetingPlace: '',
  deadline: plusDays(7, 18),
  notes: '',
  attachments: [],
  customRate: null,
});

type Errors = Partial<Record<keyof ProjectInput, string>>;

const validate = (f: ProjectInput): Errors => {
  const e: Errors = {};
  if (!f.title.trim()) e.title = '案件名を入力してください';
  if (!f.prefecture) e.prefecture = '作業エリア（都道府県）を選択してください';
  if (!f.address.trim()) e.address = '住所を入力してください';
  if (f.workCategory === 'その他' && !f.workDetail.trim()) e.workDetail = '「その他」の場合は作業内容の詳細を入力してください';
  if (!f.requiredCount || f.requiredCount < 1) e.requiredCount = '1名以上を入力してください';
  if (!f.startAt) e.startAt = '作業開始日時を入力してください';
  if (!f.endAt) e.endAt = '作業終了日時を入力してください';
  else if (f.startAt && f.endAt <= f.startAt) e.endAt = '終了日時は開始日時より後にしてください';
  if (!f.meetingPlace.trim()) e.meetingPlace = '集合場所・時刻を入力してください';
  if (!f.deadline) e.deadline = '回答締め切り日時を入力してください';
  else if (f.startAt && f.deadline >= f.startAt) e.deadline = '回答締め切りは作業開始より前にしてください';
  if (f.customRate !== null && (!f.customRate || f.customRate <= 0)) e.customRate = '個別単価を入力してください';
  return e;
};

export function ProjectForm() {
  const { id } = useParams();
  const { state, actions } = useStore();
  const navigate = useNavigate();
  const editing = id ? state.projects.find((p) => p.id === id) : undefined;

  const [form, setForm] = useState<ProjectInput>(() => {
    if (!editing) return empty();
    const { id: _i, status: _s, notifiedPartnerIds: _n, createdAt: _c, recruitStartedAt: _r, updatedAt: _u, ...rest } = editing;
    return rest;
  });
  const [errors, setErrors] = useState<Errors>({});
  const [step, setStep] = useState<'input' | 'confirm'>('input');

  if (id && !editing) return <div className="card">案件が見つかりません。</div>;

  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const toConfirm = () => {
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) {
      actions.toast('入力内容に不備があります。赤字の項目を確認してください', 'warning');
      return;
    }
    setStep('confirm');
    window.scrollTo({ top: 0 });
  };

  const save = (recruit: boolean) => {
    const pid = actions.saveProject(form, editing?.id);
    if (!recruit) actions.toast(editing ? '案件を更新しました' : '案件を下書き保存しました');
    navigate(`/admin/projects/${pid}`, { state: recruit ? { openRecruit: true } : undefined });
  };

  const canRecruit = !editing || editing.status === '下書き';
  const lv = levelDef(form.difficulty);
  const target = distanceTarget(form);
  const addressPref = prefectureOf(form.address);
  const title = editing ? '案件の編集' : '新規案件の登録';

  if (step === 'confirm') {
    return (
      <>
        <PageHeader title={`${title}（入力内容の確認）`} sub="内容を確認のうえ、保存または募集開始してください" />
        <div className="steps">
          <span className="done">1. 入力</span>
          <span className="active">2. 確認</span>
          <span>3. 保存・募集開始</span>
        </div>
        <div className="card">
          <dl className="info-grid">
            <InfoRow label="案件名">{form.title}</InfoRow>
            <InfoRow label="作業エリア">{form.prefecture}</InfoRow>
            <InfoRow label="作業場所住所">{form.address}</InfoRow>
            <InfoRow label="作業内容">
              {form.workCategory}
              {form.workDetail && <div className="muted">{form.workDetail}</div>}
            </InfoRow>
            <InfoRow label="難易度">
              <LevelBadge level={form.difficulty} withName /> <span className="muted">{lv.description}</span>
            </InfoRow>
            <InfoRow label="必要人数">{form.requiredCount}名</InfoRow>
            <InfoRow label="作業日時">
              {fmtFull(form.startAt)} 〜 {fmtFull(form.endAt)}
            </InfoRow>
            <InfoRow label="集合方法">
              {form.meetingMethod}
              {target.kind === 'office' && <div className="muted">{target.address}</div>}
            </InfoRow>
            <InfoRow label="集合場所・時刻">{form.meetingPlace}</InfoRow>
            <InfoRow label="距離の計算">
              協力業者の住所 → {target.label}（直線距離・参考）
              {target.kind === 'site' && <GeoStatus address={form.address} />}
            </InfoRow>
            <InfoRow label="交通費">実費支給</InfoRow>
            <InfoRow label="回答締め切り">{fmtFull(form.deadline)}</InfoRow>
            <InfoRow label="単価">
              {form.customRate !== null ? (
                <>
                  個別単価 {yen(form.customRate)}／人日 <span className="badge badge-amber">仮設定</span>
                </>
              ) : (
                '各協力業者の基本単価を適用'
              )}
            </InfoRow>
            <InfoRow label="特記事項">{form.notes && <span className="pre">{form.notes}</span>}</InfoRow>
            <InfoRow label="添付資料">{form.attachments.length > 0 && form.attachments.join('、')}</InfoRow>
          </dl>
        </div>
        <div className="form-actions sticky">
          <button className="btn btn-ghost" onClick={() => setStep('input')}>
            ← 入力内容を修正する
          </button>
          <div className="spacer" />
          <button className="btn btn-outline" onClick={() => save(false)}>
            {editing ? '変更を保存' : '下書き保存'}
          </button>
          {canRecruit && (
            <button className="btn btn-primary btn-lg" onClick={() => save(true)}>
              保存して募集開始へ →
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        back={
          <Link to={editing ? `/admin/projects/${editing.id}` : '/admin/projects'} className="link-sm">
            ← {editing ? '案件詳細に戻る' : '案件一覧に戻る'}
          </Link>
        }
      />
      <div className="steps">
        <span className="active">1. 入力</span>
        <span>2. 確認</span>
        <span>3. 保存・募集開始</span>
      </div>

      <div className="card form-card">
        <h2 className="section-title">基本情報</h2>
        <Field label="案件名" required error={errors.title}>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="例）港区オフィスビル 外壁シート貼り" />
        </Field>
        <div className="form-row">
          <Field label="作業エリア（都道府県）" required error={errors.prefecture} hint="協力業者の対応エリアとの一致（参考表示）に使用します">
            <select value={form.prefecture} onChange={(e) => set('prefecture', e.target.value)}>
              <option value="">選択してください</option>
              {REGIONS.map((r) => (
                <optgroup key={r.name} label={r.name}>
                  {r.prefectures.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="作業場所住所" required error={errors.address} hint="現場直行の案件では、この住所までの距離を表示します">
            <input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="例）東京都港区虎ノ門3-8-21（○○ビル）"
              list="demo-addresses"
            />
            <datalist id="demo-addresses">
              {DEMO_COORDS.filter((d) => d.note !== 'RASTAQ 東京オフィス').map((d) => (
                <option key={d.address} value={d.address} />
              ))}
            </datalist>
            <GeoStatus address={form.address} />
            {addressPref && form.prefecture && addressPref !== form.prefecture && (
              <div className="geo-status ng">
                ⚠ 住所の都道府県（{addressPref}）と作業エリア（{form.prefecture}）が異なります
              </div>
            )}
          </Field>
        </div>

        <Field
          label="作業内容"
          required
          hint={
            CATEGORY_WORK_TYPES[form.workCategory].length > 0
              ? `マッチング判定に使う関連工種（仮）：${CATEGORY_WORK_TYPES[form.workCategory].join('・')}`
              : '「その他」は工種による判定を行いません'
          }
        >
          <div className="segmented">
            {WORK_CATEGORIES.map((c) => (
              <button type="button" key={c} className={form.workCategory === c ? 'active' : ''} onClick={() => set('workCategory', c)}>
                {c}
              </button>
            ))}
          </div>
        </Field>
        <Field label="作業内容の詳細" required={form.workCategory === 'その他'} error={errors.workDetail}>
          <input value={form.workDetail} onChange={(e) => set('workDetail', e.target.value)} placeholder="例）改修工事に伴う北面・東面への飛散防止メッシュシート設置" />
        </Field>

        <Field label="難易度レベル" required>
          <div className="level-options">
            {LEVELS.map((l) => (
              <label key={l.level} className={`level-option ${form.difficulty === l.level ? 'checked' : ''}`}>
                <input type="radio" name="difficulty" checked={form.difficulty === l.level} onChange={() => set('difficulty', l.level as Level)} />
                <div className="level-option-head">
                  <LevelBadge level={l.level} /> <strong>{l.name}</strong>
                  {l.provisional && <span className="badge badge-amber">仮の説明</span>}
                </div>
                <div className="level-option-desc">{l.description}</div>
              </label>
            ))}
          </div>
        </Field>

        <div className="form-row three">
          <Field label="必要人数" required error={errors.requiredCount}>
            <div className="input-suffix">
              <input type="number" min={1} max={50} value={form.requiredCount} onChange={(e) => set('requiredCount', Number(e.target.value))} />
              <span>名</span>
            </div>
          </Field>
          <Field label="作業開始日時" required error={errors.startAt}>
            <input type="datetime-local" value={toLocalInput(form.startAt)} onChange={(e) => set('startAt', fromLocalInput(e.target.value))} />
          </Field>
          <Field label="作業終了日時" required error={errors.endAt}>
            <input type="datetime-local" value={toLocalInput(form.endAt)} onChange={(e) => set('endAt', fromLocalInput(e.target.value))} />
          </Field>
        </div>

        <h2 className="section-title">集合・交通費</h2>
        <Field label="集合方法" required hint={`距離の計算：協力業者の住所 → ${target.label}（直線距離）`}>
          <div className="radio-cards">
            {MEETING_METHODS.map((m) => (
              <label key={m} className={`radio-card ${form.meetingMethod === m ? 'checked' : ''}`}>
                <input type="radio" name="meeting" checked={form.meetingMethod === m} onChange={() => set('meetingMethod', m)} />
                <span>{m}</span>
              </label>
            ))}
          </div>
          {target.kind === 'office' && (
            <div className="office-box">
              <strong>{RASTAQ_OFFICE.name}</strong>〒{RASTAQ_OFFICE.zip} {RASTAQ_OFFICE.address}
            </div>
          )}
        </Field>
        <Field label="集合場所・時刻" required error={errors.meetingPlace} hint="集合時刻もあわせて記載してください">
          <input
            value={form.meetingPlace}
            onChange={(e) => set('meetingPlace', e.target.value)}
            placeholder={form.meetingMethod === '現場直行' ? '例）現場 正面エントランス前 8:15集合' : '例）7:00集合（1F エントランス前）'}
          />
        </Field>
        <div className="notice notice-info">
          <strong>交通費：実費支給</strong>（協力業者の画面にも表示されます）
        </div>

        <h2 className="section-title">募集・単価</h2>
        <div className="form-row">
          <Field label="回答締め切り日時" required error={errors.deadline} hint="締め切りまでに集まった応募者の中からRASTAQが選定します">
            <input type="datetime-local" value={toLocalInput(form.deadline)} onChange={(e) => set('deadline', fromLocalInput(e.target.value))} />
          </Field>
          <Field label="個別単価" error={errors.customRate} hint={`未設定の場合、各業者の基本単価（例：${yen(DEFAULT_BASE_RATE)}／人日）を適用します`}>
            <label className="inline-check">
              <input type="checkbox" checked={form.customRate !== null} onChange={(e) => set('customRate', e.target.checked ? DEFAULT_BASE_RATE : null)} />
              イレギュラーのため個別単価を設定する
            </label>
            {form.customRate !== null && (
              <div className="input-suffix" style={{ marginTop: 8 }}>
                <span>¥</span>
                <input type="number" min={0} step={1000} value={form.customRate} onChange={(e) => set('customRate', Number(e.target.value))} />
                <span>／人日</span>
              </div>
            )}
          </Field>
        </div>
        <DemoNote>単価はデモ上の仮設定です。単価体系（基本単価・割増条件など）は今後確定予定です。</DemoNote>

        <h2 className="section-title">その他</h2>
        <Field label="特記事項">
          <textarea rows={4} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="持ち物、注意事項、雨天時の対応など" />
        </Field>
        <Field label="添付資料・写真" hint="デモではファイル名のみ保存されます（実ファイルはアップロードされません）">
          <label className="file-drop">
            <input
              type="file"
              multiple
              onChange={(e) => {
                const names = Array.from(e.target.files ?? []).map((f) => f.name);
                set('attachments', [...form.attachments, ...names.filter((n) => !form.attachments.includes(n))]);
                e.target.value = '';
              }}
            />
            📎 クリックしてファイルを選択
          </label>
          {form.attachments.length > 0 && (
            <ul className="file-list">
              {form.attachments.map((a) => (
                <li key={a}>
                  <span>{/\.(jpe?g|png|gif|heic)$/i.test(a) ? '🖼' : '📄'} {a}</span>
                  <button type="button" className="link-btn" onClick={() => set('attachments', form.attachments.filter((x) => x !== a))}>
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>
      </div>

      <div className="form-actions sticky">
        <Link to={editing ? `/admin/projects/${editing.id}` : '/admin/projects'} className="btn btn-ghost">
          キャンセル
        </Link>
        <div className="spacer" />
        <button className="btn btn-primary btn-lg" onClick={toConfirm}>
          入力内容を確認する →
        </button>
      </div>
    </>
  );
}
