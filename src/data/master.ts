import type { Level, MeetingMethod, ProjectStatus, WorkCategory } from '../types';

export const WORK_TYPES = [
  '看板施工工事',
  '仮設工事',
  '組積左官防水工事',
  'ディスプレイ・塗装',
  '空調換気工事',
  '外壁補修工事',
  '金属工事',
  '石タイル工事',
  '電気設備工事',
  '給排水衛生設備工事',
  '解体工事',
  '鉄骨工事',
  '塗装工事',
  '機械設備工事',
  '看板撤去',
  '看板の清掃',
];

export const QUALIFICATIONS = [
  'IRATA Level 1',
  'IRATA Level 2',
  'IRATA Level 3',
  'ロープ高所作業特別教育',
  'フルハーネス型墜落制止用器具特別教育',
  '足場の組立て等作業主任者',
  '高所作業車運転技能講習',
  '玉掛け技能講習',
  '職長・安全衛生責任者教育',
  '有機溶剤作業主任者',
];

export const WORK_CATEGORIES: WorkCategory[] = ['シート貼り', '安全点検', '外壁補修', '看板撤去', '看板の清掃', 'その他'];

/**
 * 作業内容 → 関連する工種（マッチング判定用の仮マッピング）
 * TODO(本番): RASTAQ様と対応表を確定する
 */
export const CATEGORY_WORK_TYPES: Record<WorkCategory, string[]> = {
  シート貼り: ['仮設工事', '看板施工工事', 'ディスプレイ・塗装'],
  安全点検: ['外壁補修工事', '仮設工事', '金属工事', '石タイル工事'],
  外壁補修: ['外壁補修工事', '組積左官防水工事', '塗装工事', '石タイル工事'],
  看板撤去: ['看板撤去'],
  看板の清掃: ['看板の清掃'],
  その他: [],
};

export const MEETING_METHODS: MeetingMethod[] = ['現場直行', 'RASTAQ 東京オフィスに集合'];

export interface LevelDef {
  level: Level;
  name: string;
  description: string;
  provisional?: boolean;
}

/** 難易度レベル定義（案件側）と熟練度（業者側）で同じ尺度を使う */
export const LEVELS: LevelDef[] = [
  { level: 1, name: '補助作業', description: '地上・低所での資材運搬や補助作業が中心。ロープ作業の経験は問わない。' },
  { level: 2, name: '基本作業', description: '経験者の指導下での基本的な降下・簡易作業。ロープ作業の基礎ができること。' },
  { level: 3, name: '一般作業', description: '単独でのロープ作業（シート貼り・目視点検など一般的な作業）が可能なこと。' },
  { level: 4, name: '高難度作業', description: 'オーバーハング・狭所・複雑な取付作業、または現場リーダーを担えること。' },
  {
    level: 5,
    name: '最高難度（仮）',
    description: '【仮の説明・定義未確定】特殊構造物や救助体制の構築を伴う作業を想定。具体的な基準はRASTAQ様と協議のうえ決定予定。',
    provisional: true,
  },
];

export const levelDef = (l: number) => LEVELS.find((d) => d.level === l) ?? LEVELS[0];

export const PROJECT_STATUSES: ProjectStatus[] = [
  '下書き',
  '募集中',
  '応募締め切り',
  '選定中',
  '手配完了',
  '施工中',
  '完了',
  '中止',
];

/** 基本単価（仮）。TODO(本番): 単価体系は未確定。契約マスタから取得する */
export const DEFAULT_BASE_RATE = 25000;
