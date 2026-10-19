// ===== ドメイン型定義 =====
// TODO(本番): DB設計時はこの型をベースにテーブル定義・APIスキーマを作成する

export type ProjectStatus =
  | '下書き'
  | '募集中'
  | '応募締め切り'
  | '選定中'
  | '手配完了'
  | '施工中'
  | '完了'
  | '中止';

export type WorkCategory = 'シート貼り' | '安全点検' | '外壁補修' | '看板撤去' | '看板の清掃' | 'その他';

export type MeetingMethod = '現場直行' | 'RASTAQ 東京オフィスに集合';

export type Level = 1 | 2 | 3 | 4 | 5;

export interface Project {
  id: string;
  title: string;
  prefecture: string; // 作業エリア（都道府県）。エリア一致の判定に使用
  address: string; // 作業場所の住所。現場直行の案件では距離計算の終点
  workCategory: WorkCategory;
  workDetail: string; // 「その他」の場合や補足
  difficulty: Level;
  requiredCount: number;
  startAt: string; // ISO
  endAt: string;
  meetingMethod: MeetingMethod;
  meetingPlace: string;
  deadline: string;
  notes: string;
  attachments: string[]; // デモではファイル名のみ
  customRate: number | null; // 個別単価（円/人日）。null の場合は基本単価
  status: ProjectStatus;
  notifiedPartnerIds: string[];
  createdAt: string;
  recruitStartedAt: string | null;
  updatedAt: string;
}

export type RegistrationStatus = '審査中' | '承認済み' | '差し戻し' | '利用停止';
export type ContractStatus = '契約済み' | '未契約';

export interface Partner {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  fax: string;
  email: string;
  zip: string;
  address: string; // 所在地。距離計算の起点
  industry: string;
  website: string;
  areas: string[]; // 対応エリア（都道府県 または「全国」）
  legacyAreas?: string[]; // 旧仕様（地方区分）から都道府県へ移行できなかったエリア（要再設定）
  workTypes: string[];
  qualifications: string[];
  skillLevel: Level; // ロープアクセス熟練度
  experienceYears: number;
  workerCount: number;
  pr: string;
  question: string;
  contractStatus: ContractStatus;
  registrationStatus: RegistrationStatus;
  baseRate: number | null; // 基本単価（仮）
  reviewNote: string; // 差し戻し理由など
  registeredAt: string;
  fromRegistrationForm?: boolean; // 新規登録フォームからの申請

}

export type ApplicationStatus = '応募済み' | '辞退' | '決定' | '見送り';

export interface Application {
  id: string;
  projectId: string;
  partnerId: string;
  status: ApplicationStatus;
  appliedAt: string;
  comment: string;
  availableCount: number; // 派遣可能人数
  resultNotifiedAt: string | null; // 決定/見送り通知の送信日時（デモ）
  partnerSeenResult: boolean;
}

/** 協力業者側から見た案件ステータス */
export type PartnerViewStatus =
  | '未回答'
  | '応募済み'
  | '決定'
  | '見送り'
  | '辞退'
  | '施工中'
  | '完了'
  | '中止';

export type Sender = 'rastaq' | 'partner';

export interface ChatMessage {
  id: string;
  projectId: string;
  partnerId: string;
  sender: Sender;
  senderName: string;
  text: string;
  sentAt: string;
  readByRastaq: boolean;
  readByPartner: boolean;
}

export type HistoryType =
  | '案件登録'
  | '案件編集'
  | '募集開始'
  | '応募締め切り'
  | '応募'
  | '辞退'
  | '決定'
  | '見送り'
  | '結果通知'
  | '選定変更'
  | 'ステータス変更'
  | 'チャット送信'
  | '新規登録'
  | '審査'
  | '業者情報更新';

export interface HistoryEntry {
  id: string;
  at: string;
  type: HistoryType;
  actor: string;
  message: string;
  projectId?: string;
  partnerId?: string;
}

export interface AppState {
  projects: Project[];
  partners: Partner[];
  applications: Application[];
  messages: ChatMessage[];
  history: HistoryEntry[];
  currentPartnerId: string; // デモ用：スマホ画面でログイン中の協力業者
  adminUser: string;
  schemaVersion?: number; // 保存データの形式（旧データの移行判定用）
}
