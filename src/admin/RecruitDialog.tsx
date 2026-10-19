import { useMemo, useState } from 'react';
import { ConfirmDialog, DistanceLabel, LevelBadge, MatchChips } from '../components/ui';
import { byDistance, distanceTarget, fmtAreas, matchPartner, notifiablePartners } from '../lib';
import { useStore } from '../store/AppStore';
import type { Project } from '../types';

/**
 * 募集開始：通知先の確認・選択。
 * エリア一致は判断材料として表示するだけで、通知先の自動選択・絞り込みには使わない。
 */
export function RecruitDialog({ project, open, onClose }: { project: Project; open: boolean; onClose: () => void }) {
  const { state, actions } = useStore();
  const [selected, setSelected] = useState<string[]>([]);

  // 通知候補＝承認済み・契約済みの業者すべて（エリア外も含む）。距離の近い順、距離不明は最後
  const candidates = useMemo(
    () =>
      notifiablePartners(state)
        .map((p) => ({ p, m: matchPartner(project, p) }))
        .sort((a, b) => byDistance(a.m, b.m)),
    [state, project],
  );
  const areaMatched = candidates.filter((c) => c.m.area).map((c) => c.p.id);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const target = distanceTarget(project);

  return (
    <ConfirmDialog
      open={open}
      title="募集開始：通知先の選択"
      confirmLabel={`${selected.length}社に通知して募集開始`}
      disabled={selected.length === 0}
      onCancel={onClose}
      onConfirm={() => {
        actions.startRecruit(project.id, selected);
        onClose();
      }}
    >
      <p className="dialog-lead">
        「<strong>{project.title}</strong>」（作業エリア：{project.prefecture}）を通知する協力業者を選択してください。
        <br />
        エリア一致・距離は判断材料です。<strong>エリア外の業者も、選択すれば通知できます。</strong>
      </p>
      <div className="target-summary">
        <span>
          通知候補 <strong>{candidates.length}社</strong>（うちエリア一致 {areaMatched.length}社）
        </span>
        <span>
          選択中 <strong>{selected.length}社</strong>
        </span>
        <span>距離：協力業者の住所 → {target.label}（直線・近い順）</span>
      </div>
      <div className="target-tools">
        <button className="link-btn" onClick={() => setSelected(candidates.map((c) => c.p.id))}>
          表示中の候補をすべて選択（{candidates.length}社）
        </button>
        <button className="link-btn" onClick={() => setSelected(areaMatched)}>
          エリア一致の業者を選択（{areaMatched.length}社）
        </button>
        <button className="link-btn" onClick={() => setSelected(candidates.filter((c) => c.m.area && c.m.workType && c.m.level).map((c) => c.p.id))}>
          全条件一致の業者を選択
        </button>
        <button className="link-btn" onClick={() => setSelected([])}>
          選択解除
        </button>
      </div>
      <ul className="target-list">
        {candidates.map(({ p, m }) => (
          <li key={p.id}>
            <label className={`${selected.includes(p.id) ? 'checked' : ''} ${m.area ? '' : 'outside'}`}>
              <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
              <div className="target-main">
                <div className="target-name">
                  {p.companyName} <LevelBadge level={p.skillLevel} />
                </div>
                <div className="cell-sub">対応エリア：{fmtAreas(p.areas)}</div>
                <MatchChips m={m} />
              </div>
              <div className="target-dist">
                <DistanceLabel m={m} />
              </div>
            </label>
          </li>
        ))}
      </ul>
      <p className="muted small">※ 実際の通知（メール・プッシュ通知）は送信されません。デモでは協力業者スマホ画面に案件が表示されます。</p>
    </ConfirmDialog>
  );
}
