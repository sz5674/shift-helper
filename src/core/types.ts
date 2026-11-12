import type { DayPlan } from './shiftText';

export interface Wall {
  id: string;
  label: string;
  amount: number;
  note: string;
}

export type EstimateMode = 'actual' | 'shift';

export interface Settings {
  name: string;
  /** 提出文の最後の行．{name} が名前に置き換わる */
  closing: string;
  /** 曜日ごとのいつもの時間（月〜日の7個） */
  defaultTimes: string[];
  hourlyWage: number;
  /** 深夜割増の倍率（通常 1.25） */
  nightRate: number;
  /** 提出期間の初日のどれか（名前は旧版との互換のため．月曜以外でもよい） */
  anchorMonday: string;
  /** 勤務月から何か月後に支給されるか（月末締め・翌月払いなら 1） */
  payMonthOffset: number;
  /** 1か月あたりの注意ライン（社会保険の扶養：130万円÷12） */
  monthlyLimit: number;
  /** 見込みの計算方法：actual＝明細から出した1日平均，shift＝シフト時間×時給 */
  estimateMode: EstimateMode;
  walls: Wall[];
}

/** 給与明細1枚分 */
export interface PayRecord {
  id: string;
  payDate: string;
  /** 総支給額（課税対象，交通費を除く） */
  amount: number;
  /** 出勤日数（1日平均の計算に使う．空でもよい） */
  workDays?: number;
}

export interface AppData {
  version: 1;
  settings: Settings;
  records: PayRecord[];
  /** 期間の初日 → その期間に入る日と時間．一度でも開いて編集した期間だけが入る */
  periods: Record<string, DayPlan>;
}
