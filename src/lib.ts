import { CATEGORY_WORK_TYPES } from './data/master';
import { NATIONWIDE, RASTAQ_OFFICE, REGIONS, lookupDemoCoord, type LatLng } from './data/geo';
import type { Application, AppState, Partner, PartnerViewStatus, Project } from './types';

// ===== 日付 =====
const WD = ['日', '月', '火', '水', '木', '金', '土'];
const pad = (n: number) => String(n).padStart(2, '0');

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`;
};
export const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fmtDateTime = (iso: string) => `${fmtDate(iso)} ${fmtTime(iso)}`;
export const fmtFull = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${fmtTime(iso)}`;
};
export const fmtRange = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  return sameDay ? `${fmtDate(start)} ${fmtTime(start)}〜${fmtTime(end)}` : `${fmtDateTime(start)} 〜 ${fmtDateTime(end)}`;
};

/** <input type="datetime-local"> 用 */
export const toLocalInput = (iso: string) => {
  if (timeOf(iso) === null) return ''; // 未設定・不正な日時は空欄にする
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : '');

export const timeOf = (iso: string | null | undefined) => {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? null : t; // 未設定・不正な日時は判定しない
};

/** 締め切り日時の問題（未設定・日付として解釈できない）。有効な日時なら null */
export const deadlineIssue = (iso: string | null | undefined) => (timeOf(iso) !== null ? null : iso ? '日時不正' : '未設定');

/** 締め切り日時の表示。未設定・不正な場合は「未設定」「日時不正」 */
export const fmtDeadline = (iso: string | null | undefined, fmt: (iso: string) => string = fmtDateTime) => deadlineIssue(iso) ?? fmt(iso as string);

/** 締め切りの早い順。未設定・不正な締め切りは末尾 */
export const compareDeadline = (a: string | null | undefined, b: string | null | undefined) => {
  const ta = timeOf(a);
  const tb = timeOf(b);
  if (ta === null || tb === null) return ta === tb ? 0 : ta === null ? 1 : -1;
  return ta - tb;
};

/**
 * 締め切りまでの残り表示。
 * 締め切りが未設定・不正な場合は残りを計算しない（invalid: true）。passed は従来どおり false のまま
 */
export const remaining = (iso: string | null | undefined) => {
  const issue = deadlineIssue(iso);
  if (issue) return { text: `締切${issue}`, urgent: false, passed: false, invalid: true };
  const diff = new Date(iso as string).getTime() - Date.now();
  if (diff <= 0) return { text: '締切済み', urgent: false, passed: true, invalid: false };
  const h = Math.floor(diff / 3600000);
  if (h < 24) return { text: `残り${h}時間`, urgent: true, passed: false, invalid: false };
  const d = Math.floor(h / 24);
  return { text: `残り${d}日`, urgent: d <= 2, passed: false, invalid: false };
};

export const isPast = (iso: string) => new Date(iso).getTime() < Date.now();

export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;

/**
 * 応募者に適用する単価。案件に個別単価があれば全応募者に個別単価、なければ各業者の基本単価。
 * どちらも未設定なら amount は null（0円などで埋めない）。協力業者側の案件詳細と同じ判定。
 */
export const applicantRate = (project: Pick<Project, 'customRate'>, partner: Pick<Partner, 'baseRate'>) =>
  project.customRate !== null && project.customRate !== undefined
    ? { amount: project.customRate, source: 'custom' as const }
    : { amount: partner.baseRate ?? null, source: 'base' as const };

// ===== 距離 =====
/**
 * 2点間の直線距離（km、小数第1位）。ハバーサイン公式。
 * どちらかの座標が無い場合は null（=距離不明）を返し、推測した値は返さない。
 * TODO(本番): 道路距離・所要時間が必要な場合は経路APIに置き換える
 */
export const distanceKm = (a: LatLng | null, b: LatLng | null) => {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
};

export const NEAR_KM = 10;

export const fmtDistance = (d: number | null) => (d === null ? '距離不明' : `${d.toFixed(1)}km`);

/** 距離計算の終点：現場直行なら作業場所、オフィス集合なら RASTAQ 東京オフィス */
export const distanceTarget = (project: Pick<Project, 'meetingMethod' | 'address'>) =>
  project.meetingMethod === 'RASTAQ 東京オフィスに集合'
    ? { kind: 'office' as const, label: RASTAQ_OFFICE.name, address: `〒${RASTAQ_OFFICE.zip} ${RASTAQ_OFFICE.address}`, point: RASTAQ_OFFICE.point }
    : { kind: 'site' as const, label: '作業場所', address: project.address, point: lookupDemoCoord(project.address) };

// ===== マッチング =====
export interface MatchResult {
  area: boolean;
  workType: boolean;
  level: boolean;
  distance: number | null;
  near: boolean;
  matchedWorkTypes: string[];
}

/** 対応エリア一致：同じ都道府県を含む、または「全国」。空欄は一致しない */
export const areaMatches = (prefecture: string, areas: string[]) =>
  areas.includes(NATIONWIDE) || (!!prefecture && areas.includes(prefecture));

/**
 * 案件と業者の条件一致を判定する（参考情報）。
 * ※ 自動決定や通知先の絞り込みには使わない。最終選定・通知先は必ずRASTAQ担当者が選ぶ。
 */
export const matchPartner = (project: Project, partner: Partner): MatchResult => {
  const area = areaMatches(project.prefecture, partner.areas);
  const related = CATEGORY_WORK_TYPES[project.workCategory] ?? [];
  const matchedWorkTypes = related.filter((w) => partner.workTypes.includes(w));
  const workType = related.length === 0 ? true : matchedWorkTypes.length > 0;
  const level = partner.skillLevel >= project.difficulty;
  const distance = distanceKm(lookupDemoCoord(partner.address), distanceTarget(project).point);
  return { area, workType, level, distance, near: distance !== null && distance <= NEAR_KM, matchedWorkTypes };
};

export const matchCount = (m: MatchResult) => [m.area, m.workType, m.level].filter(Boolean).length;

/** 距離の近い順（距離不明は最後）。同じ距離ならエリア一致を先に。それ以外は元の並びを保つ */
export const byDistance = (x: MatchResult, y: MatchResult) => {
  if (x.distance === null || y.distance === null) return (x.distance === null ? 1 : 0) - (y.distance === null ? 1 : 0);
  return x.distance - y.distance || Number(y.area) - Number(x.area);
};

/** 通知先として選択できる業者（承認済み・契約済み） */
export const notifiablePartners = (state: AppState) =>
  state.partners.filter((p) => p.registrationStatus === '承認済み' && p.contractStatus === '契約済み');

/** 対応エリアの表示（地方の全都道府県を選んでいる場合は「関東全域」のようにまとめる） */
export const fmtAreas = (areas: string[]) => {
  if (areas.length === 0) return '未設定';
  const parts: string[] = areas.includes(NATIONWIDE) ? [NATIONWIDE] : [];
  for (const r of REGIONS) {
    const hit = r.prefectures.filter((p) => areas.includes(p));
    if (hit.length === 0) continue;
    if (hit.length === r.prefectures.length && r.prefectures.length > 1) parts.push(`${r.name}全域`);
    else parts.push(...hit);
  }
  return parts.join('・');
};

// ===== 協力業者側から見たステータス =====
export const partnerViewStatus = (project: Project, app: Application | undefined): PartnerViewStatus => {
  if (project.status === '中止') return '中止';
  if (!app) return '未回答';
  if (app.status === '決定') {
    if (project.status === '施工中') return '施工中';
    if (project.status === '完了') return '完了';
    return '決定';
  }
  return app.status;
};

export const findApp = (state: AppState, projectId: string, partnerId: string) =>
  state.applications.find((a) => a.projectId === projectId && a.partnerId === partnerId);

export const appsOf = (state: AppState, projectId: string) =>
  state.applications.filter((a) => a.projectId === projectId);

export const appliedCount = (state: AppState, projectId: string) =>
  appsOf(state, projectId).filter((a) => a.status !== '辞退').length;

export const decidedCount = (state: AppState, projectId: string) =>
  appsOf(state, projectId).filter((a) => a.status === '決定').length;

export const unreadForRastaq = (state: AppState) => state.messages.filter((m) => m.sender === 'partner' && !m.readByRastaq);

export const unreadForPartner = (state: AppState, partnerId: string) =>
  state.messages.filter((m) => m.partnerId === partnerId && m.sender === 'rastaq' && !m.readByPartner);

// ===== 案件一覧のアラート（管理者向けの注意喚起。並び順・絞り込みには使わない） =====

export type AlertLevel = 'danger' | 'warn';
export interface ProjectAlert {
  level: AlertLevel;
  label: string;
  detail: string;
}

/** 作業開始日が「近い」とみなす日数（仮）。TODO(本番): RASTAQ様と基準を確定する */
export const START_SOON_DAYS = 3;

/** 手配（選定結果の確定）が済んでいないステータス */
const UNARRANGED: Project['status'][] = ['募集中', '応募締め切り', '選定中'];

/** 募集中のまま回答締め切りを過ぎている（締め切りが未設定・不正な案件は false） */
export const isDeadlineOverdue = (project: Project, now = Date.now()) => {
  const deadline = timeOf(project.deadline);
  return project.status === '募集中' && deadline !== null && deadline <= now;
};

/**
 * 案件のアラート（緊急度の高い順）。下書き・完了・中止は対象外。
 * 1. 締め切り超過：募集中のまま回答締め切りを過ぎている
 * 2. 要選定：締め切り後（応募締め切り・選定中）で、辞退以外の応募者がいるが選定結果が未確定
 * 3. 作業日接近・未手配：手配完了前のまま、作業開始まで START_SOON_DAYS 日以内
 * 4. 作業日超過・未手配：手配完了前のまま、作業開始日時を過ぎている
 *    ステータス未更新：手配完了のまま作業開始日時を過ぎた／施工中のまま作業終了日時を過ぎた
 */
export const projectAlerts = (state: AppState, project: Project, now = Date.now()): ProjectAlert[] => {
  if (['下書き', '完了', '中止'].includes(project.status)) return [];
  const out: ProjectAlert[] = [];
  const start = timeOf(project.startAt);
  const end = timeOf(project.endAt);
  const unarranged = UNARRANGED.includes(project.status);

  if (unarranged && start !== null && start <= now)
    out.push({ level: 'danger', label: '作業日超過・未手配', detail: '作業開始日時を過ぎていますが、手配（選定結果の確定）が完了していません' });
  if (isDeadlineOverdue(project, now))
    out.push({ level: 'danger', label: '締め切り超過', detail: '回答締め切りを過ぎていますが、募集中のままです' });
  if (unarranged && start !== null && start > now && start - now <= START_SOON_DAYS * 86400000)
    out.push({ level: 'warn', label: '作業日接近・未手配', detail: `作業開始まで${START_SOON_DAYS}日以内ですが、手配が完了していません` });
  if ((project.status === '応募締め切り' || project.status === '選定中') && appliedCount(state, project.id) > 0)
    out.push({ level: 'warn', label: '要選定', detail: '応募者がいますが、選定結果が確定していません' });
  if (project.status === '手配完了' && start !== null && start <= now)
    out.push({ level: 'warn', label: 'ステータス未更新', detail: '作業開始日時を過ぎていますが、手配完了のままです' });
  if (project.status === '施工中' && end !== null && end <= now)
    out.push({ level: 'warn', label: 'ステータス未更新', detail: '作業終了日時を過ぎていますが、施工中のままです' });
  return out;
};
