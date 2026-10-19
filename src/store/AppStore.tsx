import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createSeed } from '../data/seed';
import { uid } from '../lib';
import { migrateState } from './migrate';
import type {
  Application,
  AppState,
  ChatMessage,
  HistoryEntry,
  HistoryType,
  Partner,
  Project,
  ProjectStatus,
  RegistrationStatus,
  Sender,
} from '../types';

/**
 * デモ用ストア。
 * 全画面（管理画面・スマホ画面・登録フォーム）が同じ状態を参照し、localStorage に保存する。
 * TODO(本番): ここの各操作を API 呼び出し（サーバー側で権限チェック・DB更新・通知送信）に置き換える。
 */

const STORAGE_KEY = 'rastaq-matching-demo-v1';

const load = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrateState(JSON.parse(raw) as AppState); // 旧形式の保存データは現在の形式へ移行
  } catch {
    /* 保存データが壊れている場合は初期データ */
  }
  return structuredClone(createSeed());
};

export interface Toast {
  id: string;
  text: string;
  tone: 'success' | 'info' | 'warning';
}

export type ProjectInput = Omit<Project, 'id' | 'status' | 'notifiedPartnerIds' | 'createdAt' | 'recruitStartedAt' | 'updatedAt'>;
export type RegistrationInput = Omit<
  Partner,
  'id' | 'contractStatus' | 'registrationStatus' | 'baseRate' | 'reviewNote' | 'registeredAt' | 'workerCount' | 'legacyAreas'
>;

interface Actions {
  toast: (text: string, tone?: Toast['tone']) => void;
  resetDemo: () => void;
  setCurrentPartner: (id: string) => void;
  // 案件
  saveProject: (input: ProjectInput, id?: string) => string;
  startRecruit: (projectId: string, partnerIds: string[]) => void;
  closeRecruit: (projectId: string) => void;
  setProjectStatus: (projectId: string, status: ProjectStatus) => void;
  // 応募・選定
  apply: (projectId: string, partnerId: string, comment: string, availableCount: number) => void;
  decline: (projectId: string, partnerId: string, comment: string) => void;
  confirmSelection: (projectId: string, selectedPartnerIds: string[]) => void;
  changeResult: (applicationId: string, status: '決定' | '見送り') => void;
  markResultSeen: (projectId: string, partnerId: string) => void;
  // チャット
  sendMessage: (projectId: string, partnerId: string, sender: Sender, text: string) => void;
  markRead: (projectId: string, partnerId: string, reader: Sender) => void;
  // 業者
  updatePartner: (id: string, patch: Partial<Partner>, actor: string) => void;
  registerPartner: (input: RegistrationInput) => string;
  reviewPartner: (id: string, status: RegistrationStatus, note: string) => void;
}

interface Store {
  state: AppState;
  actions: Actions;
  toasts: Toast[];
}

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* 保存不可（プライベートモード等）でもデモは動作させる */
    }
  }, [state]);

  const actions = useMemo<Actions>(() => {
    const now = () => new Date().toISOString();
    const entry = (type: HistoryType, actor: string, message: string, projectId?: string, partnerId?: string): HistoryEntry => ({
      id: uid('h'),
      at: now(),
      type,
      actor,
      message,
      projectId,
      partnerId,
    });
    const admin = () => stateRef.current.adminUser;
    const projectTitle = (s: AppState, id: string) => s.projects.find((p) => p.id === id)?.title ?? '';
    const partnerName = (s: AppState, id: string) => s.partners.find((p) => p.id === id)?.companyName ?? '';

    const toast: Actions['toast'] = (text, tone = 'success') => {
      const t = { id: uid('t'), text, tone };
      setToasts((ts) => [...ts, t]);
      setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== t.id)), 3200);
    };

    return {
      toast,
      resetDemo: () => {
        setState(structuredClone(createSeed()));
        toast('デモデータを初期状態に戻しました', 'info');
      },
      setCurrentPartner: (id) => setState((s) => ({ ...s, currentPartnerId: id })),

      saveProject: (input, id) => {
        const newId = id ?? uid('pj');
        setState((s) => {
          if (id) {
            return {
              ...s,
              projects: s.projects.map((p) => (p.id === id ? { ...p, ...input, updatedAt: now() } : p)),
              history: [entry('案件編集', admin(), `案件「${input.title}」を編集しました`, id), ...s.history],
            };
          }
          const project: Project = {
            ...input,
            id: newId,
            status: '下書き',
            notifiedPartnerIds: [],
            createdAt: now(),
            recruitStartedAt: null,
            updatedAt: now(),
          };
          return {
            ...s,
            projects: [project, ...s.projects],
            history: [entry('案件登録', admin(), `案件「${input.title}」を登録しました`, newId), ...s.history],
          };
        });
        return newId;
      },

      startRecruit: (projectId, partnerIds) => {
        // TODO(本番): 通知対象業者へメール/プッシュ/LINE等で実際に通知を送信する
        setState((s) => ({
          ...s,
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, status: '募集中', notifiedPartnerIds: partnerIds, recruitStartedAt: now(), updatedAt: now() }
              : p,
          ),
          history: [
            entry('募集開始', admin(), `「${projectTitle(s, projectId)}」の募集を開始し、${partnerIds.length}社に通知しました`, projectId),
            ...s.history,
          ],
        }));
        toast(`募集を開始し、${partnerIds.length}社に案件を通知しました（デモ）`);
      },

      closeRecruit: (projectId) => {
        setState((s) => {
          const n = s.applications.filter((a) => a.projectId === projectId && a.status === '応募済み').length;
          return {
            ...s,
            projects: s.projects.map((p) => (p.id === projectId ? { ...p, status: '応募締め切り', updatedAt: now() } : p)),
            history: [entry('応募締め切り', admin(), `「${projectTitle(s, projectId)}」の応募を締め切りました（応募${n}社）`, projectId), ...s.history],
          };
        });
        toast('応募を締め切りました。応募者の中から選定してください', 'info');
      },

      setProjectStatus: (projectId, status) => {
        setState((s) => ({
          ...s,
          projects: s.projects.map((p) => (p.id === projectId ? { ...p, status, updatedAt: now() } : p)),
          history: [entry('ステータス変更', admin(), `「${projectTitle(s, projectId)}」のステータスを「${status}」に変更しました`, projectId), ...s.history],
        }));
        toast(`ステータスを「${status}」に変更しました`);
      },

      apply: (projectId, partnerId, comment, availableCount) => {
        setState((s) => {
          const existing = s.applications.find((a) => a.projectId === projectId && a.partnerId === partnerId);
          const base: Application = existing ?? {
            id: uid('a'),
            projectId,
            partnerId,
            status: '応募済み',
            appliedAt: now(),
            comment: '',
            availableCount: 1,
            resultNotifiedAt: null,
            partnerSeenResult: true,
          };
          const next: Application = { ...base, status: '応募済み', appliedAt: now(), comment, availableCount };
          return {
            ...s,
            applications: existing ? s.applications.map((a) => (a.id === existing.id ? next : a)) : [...s.applications, next],
            history: [entry('応募', partnerName(s, partnerId), `「${projectTitle(s, projectId)}」に応募しました`, projectId, partnerId), ...s.history],
          };
        });
        toast('応募しました。RASTAQによる選定結果をお待ちください');
      },

      decline: (projectId, partnerId, comment) => {
        setState((s) => {
          const existing = s.applications.find((a) => a.projectId === projectId && a.partnerId === partnerId);
          const next: Application = {
            ...(existing ?? {
              id: uid('a'),
              projectId,
              partnerId,
              appliedAt: now(),
              availableCount: 0,
              resultNotifiedAt: null,
              partnerSeenResult: true,
            }),
            status: '辞退',
            comment,
          };
          return {
            ...s,
            applications: existing ? s.applications.map((a) => (a.id === existing.id ? next : a)) : [...s.applications, next],
            history: [entry('辞退', partnerName(s, partnerId), `「${projectTitle(s, projectId)}」を辞退しました`, projectId, partnerId), ...s.history],
          };
        });
        toast('辞退を送信しました', 'info');
      },

      confirmSelection: (projectId, selectedPartnerIds) => {
        // TODO(本番): 決定・見送りの通知を実際に送信する（メール/プッシュ等）
        setState((s) => {
          const t = now();
          const title = projectTitle(s, projectId);
          let decided = 0;
          let rejected = 0;
          const logs: HistoryEntry[] = [];
          const applications = s.applications.map((a) => {
            if (a.projectId !== projectId || a.status === '辞退') return a;
            const status = selectedPartnerIds.includes(a.partnerId) ? '決定' : '見送り';
            if (status === '決定') decided++;
            else rejected++;
            logs.push(entry(status, admin(), `「${title}」で${partnerName(s, a.partnerId)}を${status}にしました`, projectId, a.partnerId));
            return { ...a, status, resultNotifiedAt: t, partnerSeenResult: false } as Application;
          });
          logs.push(entry('結果通知', admin(), `「${title}」の選定結果を通知しました（決定${decided}社・見送り${rejected}社）`, projectId));
          return {
            ...s,
            applications,
            projects: s.projects.map((p) => (p.id === projectId ? { ...p, status: '手配完了', updatedAt: t } : p)),
            history: [...logs.reverse(), ...s.history],
          };
        });
        toast('選定結果を確定し、決定・見送りの通知を送信しました（デモ）');
      },

      changeResult: (applicationId, status) => {
        setState((s) => {
          const a = s.applications.find((x) => x.id === applicationId);
          if (!a) return s;
          return {
            ...s,
            applications: s.applications.map((x) =>
              x.id === applicationId ? { ...x, status, resultNotifiedAt: now(), partnerSeenResult: false } : x,
            ),
            history: [
              entry(
                '選定変更',
                admin(),
                `「${projectTitle(s, a.projectId)}」で${partnerName(s, a.partnerId)}の結果を「${a.status}」→「${status}」に変更し、通知しました`,
                a.projectId,
                a.partnerId,
              ),
              ...s.history,
            ],
          };
        });
        toast(`選定結果を「${status}」に変更し、通知しました（デモ）`);
      },

      markResultSeen: (projectId, partnerId) =>
        setState((s) => {
          const target = s.applications.find((a) => a.projectId === projectId && a.partnerId === partnerId && !a.partnerSeenResult);
          if (!target) return s;
          return { ...s, applications: s.applications.map((a) => (a.id === target.id ? { ...a, partnerSeenResult: true } : a)) };
        }),

      sendMessage: (projectId, partnerId, sender, text) => {
        setState((s) => {
          const partner = s.partners.find((p) => p.id === partnerId);
          const senderName =
            sender === 'rastaq' ? s.adminUser : `${partner?.contactName.split(' ')[0] ?? ''}（${partner?.companyName.replace(/株式会社|有限会社|合同会社/g, '')}）`;
          const m: ChatMessage = {
            id: uid('m'),
            projectId,
            partnerId,
            sender,
            senderName,
            text,
            sentAt: now(),
            readByRastaq: sender === 'rastaq',
            readByPartner: sender === 'partner',
          };
          const actor = sender === 'rastaq' ? s.adminUser : partner?.companyName ?? '';
          const to = sender === 'rastaq' ? `${partner?.companyName}へ` : 'RASTAQへ';
          return {
            ...s,
            messages: [...s.messages, m],
            history: [entry('チャット送信', actor, `「${projectTitle(s, projectId)}」について${to}メッセージを送信しました`, projectId, partnerId), ...s.history],
          };
        });
      },

      markRead: (projectId, partnerId, reader) =>
        setState((s) => {
          const key = reader === 'rastaq' ? 'readByRastaq' : 'readByPartner';
          const needs = s.messages.some((m) => m.projectId === projectId && m.partnerId === partnerId && !m[key]);
          if (!needs) return s;
          return {
            ...s,
            messages: s.messages.map((m) => (m.projectId === projectId && m.partnerId === partnerId ? { ...m, [key]: true } : m)),
          };
        }),

      updatePartner: (id, patch, actor) => {
        setState((s) => ({
          ...s,
          // 対応エリアを保存し直した時点で、旧仕様から移行できなかったエリアの注意表示を解除する
          partners: s.partners.map((p) => (p.id === id ? { ...p, ...patch, ...(patch.areas ? { legacyAreas: undefined } : {}) } : p)),
          history: [entry('業者情報更新', actor, `${partnerName(s, id)}の登録情報を更新しました`, undefined, id), ...s.history],
        }));
        toast('登録情報を更新しました');
      },

      registerPartner: (input) => {
        const id = uid('n');
        setState((s) => {
          const partner: Partner = {
            ...input,
            id,
            workerCount: 0,
            contractStatus: '未契約',
            registrationStatus: '審査中',
            baseRate: null,
            reviewNote: '',
            registeredAt: now(),
            fromRegistrationForm: true,
          };
          return {
            ...s,
            partners: [...s.partners, partner],
            history: [entry('新規登録', input.companyName, '新規協力業者登録の申請がありました', undefined, id), ...s.history],
          };
        });
        return id;
      },

      reviewPartner: (id, status, note) => {
        // TODO(本番): 審査結果を申請者へメール通知。承認時は契約手続き・ログインアカウント発行と連動
        setState((s) => ({
          ...s,
          partners: s.partners.map((p) =>
            p.id === id
              ? { ...p, registrationStatus: status, reviewNote: note, contractStatus: status === '承認済み' ? '契約済み' : p.contractStatus }
              : p,
          ),
          history: [entry('審査', admin(), `${partnerName(s, id)}を「${status}」にしました${note ? `（${note}）` : ''}`, undefined, id), ...s.history],
        }));
        toast(`登録ステータスを「${status}」に更新しました`);
      },
    };
  }, []);

  const value = useMemo(() => ({ state, actions, toasts }), [state, actions, toasts]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('AppStoreProvider is missing');
  return v;
};

/** 選択中のログイン業者（スマホ画面用） */
export const useCurrentPartner = () => {
  const { state } = useStore();
  return state.partners.find((p) => p.id === state.currentPartnerId) ?? state.partners[0];
};
