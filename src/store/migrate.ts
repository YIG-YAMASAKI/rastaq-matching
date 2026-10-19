import { LEGACY_AREA_MAP, NATIONWIDE, PREFECTURES, prefectureOf } from '../data/geo';
import { MEETING_METHODS } from '../data/master';
import type { AppState, MeetingMethod, Partner, Project } from '../types';

/**
 * 保存データの形式。
 * 1: 案件のエリア＝区市（city）、業者の対応エリア＝地方区分、集合方法「RASTAQ指定場所に集合して車で移動」
 * 2: 案件のエリア＝都道府県（prefecture）、業者の対応エリア＝都道府県＋「全国」、集合方法「RASTAQ 東京オフィスに集合」
 */
export const SCHEMA_VERSION = 2;

const LEGACY_MEETING: Record<string, MeetingMethod> = {
  RASTAQ指定場所に集合して車で移動: 'RASTAQ 東京オフィスに集合',
};

type LegacyProject = Omit<Project, 'prefecture'> & { prefecture?: string; city?: string };
type LegacyPartner = Partner & { city?: string };

const migrateProject = (raw: LegacyProject): Project => {
  const { city, ...p } = raw;
  // 旧データの区市 → 都道府県。判定できなければ空（未設定）のままにする
  const prefecture = p.prefecture ?? prefectureOf(city ?? '') ?? prefectureOf(p.address ?? '') ?? '';
  const meetingMethod = (MEETING_METHODS as string[]).includes(p.meetingMethod)
    ? p.meetingMethod
    : (LEGACY_MEETING[p.meetingMethod] ?? p.meetingMethod);
  return { ...p, prefecture, meetingMethod };
};

const migratePartner = (raw: LegacyPartner): Partner => {
  const { city: _city, ...p } = raw;
  const areas: string[] = [];
  const legacy: string[] = [...(p.legacyAreas ?? [])];
  for (const a of p.areas ?? []) {
    if (a === NATIONWIDE || PREFECTURES.includes(a)) areas.push(a);
    else if (LEGACY_AREA_MAP[a]) areas.push(...LEGACY_AREA_MAP[a]);
    else legacy.push(a); // 都道府県に置き換えられない区分は「全国」等へ変換せず、要再設定として残す
  }
  const out: Partner = { ...p, areas: [...new Set(areas)] };
  if (legacy.length) out.legacyAreas = [...new Set(legacy)];
  else delete out.legacyAreas;
  return out;
};

/** localStorage から読み込んだデータを現在の形式にそろえる（新形式のデータに対しては何も変えない） */
export const migrateState = (raw: AppState): AppState => {
  if (raw.schemaVersion === SCHEMA_VERSION) return raw;
  return {
    ...raw,
    projects: (raw.projects as LegacyProject[]).map(migrateProject),
    partners: (raw.partners as LegacyPartner[]).map(migratePartner),
    schemaVersion: SCHEMA_VERSION,
  };
};
