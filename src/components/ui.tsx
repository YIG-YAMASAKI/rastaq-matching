import { useEffect, type ReactNode } from 'react';
import { lookupDemoCoord } from '../data/geo';
import { levelDef } from '../data/master';
import { fmtDistance, type MatchResult } from '../lib';
import { useStore } from '../store/AppStore';
import type { ApplicationStatus, PartnerViewStatus, ProjectStatus, RegistrationStatus } from '../types';

// ===== バッジ =====
type Tone = 'gray' | 'blue' | 'amber' | 'purple' | 'green' | 'teal' | 'slate' | 'red' | 'orange' | 'navy';

export const Badge = ({ tone, children, dot }: { tone: Tone; children: ReactNode; dot?: boolean }) => (
  <span className={`badge badge-${tone}`}>
    {dot && <span className="badge-dot" />}
    {children}
  </span>
);

const PROJECT_TONE: Record<ProjectStatus, Tone> = {
  下書き: 'gray',
  募集中: 'blue',
  応募締め切り: 'amber',
  選定中: 'purple',
  手配完了: 'green',
  施工中: 'teal',
  完了: 'slate',
  中止: 'red',
};
export const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => (
  <Badge tone={PROJECT_TONE[status]} dot>
    {status}
  </Badge>
);

const VIEW_TONE: Record<PartnerViewStatus | ApplicationStatus, Tone> = {
  未回答: 'orange',
  応募済み: 'blue',
  決定: 'green',
  見送り: 'gray',
  辞退: 'slate',
  施工中: 'teal',
  完了: 'slate',
  中止: 'red',
};
export const AppStatusBadge = ({ status }: { status: PartnerViewStatus | ApplicationStatus }) => (
  <Badge tone={VIEW_TONE[status]}>{status}</Badge>
);

const REG_TONE: Record<RegistrationStatus, Tone> = { 審査中: 'amber', 承認済み: 'green', 差し戻し: 'orange', 利用停止: 'red' };
export const RegStatusBadge = ({ status }: { status: RegistrationStatus }) => <Badge tone={REG_TONE[status]}>{status}</Badge>;

export const LevelBadge = ({ level, withName }: { level: number; withName?: boolean }) => {
  const d = levelDef(level);
  return (
    <span className={`level level-${level}`} title={d.description}>
      Lv.{level}
      {withName && <span className="level-name">{d.name}</span>}
    </span>
  );
};

/** 熟練度・難易度の5段階メーター */
export const LevelMeter = ({ level }: { level: number }) => (
  <span className="meter" aria-label={`レベル${level}`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} className={i <= level ? 'on' : ''} />
    ))}
  </span>
);

/** マッチング条件の一致表示（参考情報）。エリアは「エリア一致／エリア外」と明示する */
export const MatchChips = ({ m }: { m: MatchResult }) => (
  <span className="match-chips">
    <span className={`chip ${m.area ? 'ok' : 'out'}`}>{m.area ? '✓ エリア一致' : 'エリア外'}</span>
    <span className={`chip ${m.workType ? 'ok' : 'ng'}`}>{m.workType ? '✓' : '×'} 工種</span>
    <span className={`chip ${m.level ? 'ok' : 'ng'}`}>{m.level ? '✓' : '×'} 熟練度</span>
  </span>
);

/** 距離の表示（直線距離・参考）。10km以内は「近場」、座標が無い場合は「距離不明」 */
export const DistanceLabel = ({ m }: { m: MatchResult }) =>
  m.distance === null ? (
    <span className="dist unknown" title="住所に対応する座標が無いため計算できません">
      距離不明
    </span>
  ) : (
    <span className={m.near ? 'dist near' : 'dist'}>
      {fmtDistance(m.distance)}
      {m.near && <span className="chip near">近場</span>}
    </span>
  );

// ===== モーダル =====
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    // 開いている間は背景ページをスクロールさせない（モーダル内部だけをスクロール）
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = '確定する',
  tone = 'primary',
  onConfirm,
  onCancel,
  disabled,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  tone?: 'primary' | 'danger' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel}>
            キャンセル
          </button>
          <button className={`btn btn-${tone}`} onClick={onConfirm} disabled={disabled}>
            {confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

// ===== その他 =====
export const EmptyState = ({ icon = '📭', title, children }: { icon?: string; title: string; children?: ReactNode }) => (
  <div className="empty">
    <div className="empty-icon">{icon}</div>
    <div className="empty-title">{title}</div>
    {children && <div className="empty-text">{children}</div>}
  </div>
);

export const Field = ({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) => (
  <div className={`field ${error ? 'has-error' : ''}`}>
    <label className="field-label">
      {label}
      {required ? <span className="req">必須</span> : <span className="opt">任意</span>}
    </label>
    {children}
    {hint && <div className="field-hint">{hint}</div>}
    {error && <div className="field-error">{error}</div>}
  </div>
);

export function CheckGroup({
  options,
  value,
  onChange,
  columns = 3,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  columns?: number;
}) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <div className="check-group" style={{ ['--cols' as string]: columns }}>
      {options.map((o) => (
        <label key={o} className={`check-item ${value.includes(o) ? 'checked' : ''}`}>
          <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} />
          <span>{o}</span>
        </label>
      ))}
    </div>
  );
}

export const InfoRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="info-row">
    <dt>{label}</dt>
    <dd>{children || <span className="muted">—</span>}</dd>
  </div>
);

export const DemoNote = ({ children }: { children: ReactNode }) => <div className="demo-note">{children}</div>;

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          {t.tone === 'success' ? '✓' : t.tone === 'warning' ? '!' : 'i'}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/** 住所に距離計算用のデモ座標があるかを表示（管理画面用） */
export const GeoStatus = ({ address }: { address: string }) =>
  !address.trim() ? null : lookupDemoCoord(address) ? (
    <div className="geo-status ok">📍 距離計算用のデモ座標が登録されている住所です</div>
  ) : (
    <div className="geo-status ng">⚠ デモ用の座標が未登録の住所のため、距離は「距離不明」と表示されます</div>
  );
