import { daysOfMonth, shiftYm, ymOf } from './date';
import { periodDays } from './period';
import { shiftPay } from './time';
import type { PayRecord, Settings, Wall } from './types';
import type { DayPlan } from './shiftText';

export interface Averages {
  /** 明細1枚あたりの平均（＝1か月の平均） */
  monthly: number | null;
  /** 出勤1日あたりの平均（出勤日数が入っている明細だけで計算） */
  perDay: number | null;
}

export function averages(records: PayRecord[]): Averages {
  const monthly = records.length
    ? records.reduce((s, r) => s + r.amount, 0) / records.length
    : null;
  const withDays = records.filter((r) => r.workDays && r.workDays > 0);
  const days = withDays.reduce((s, r) => s + (r.workDays ?? 0), 0);
  const perDay = days > 0 ? withDays.reduce((s, r) => s + r.amount, 0) / days : null;
  return { monthly, perDay };
}

/** 1回の勤務の見込み額 */
export function estimateShift(time: string, settings: Settings, avg: Averages): number {
  if (settings.estimateMode === 'actual' && avg.perDay !== null) return avg.perDay;
  return shiftPay(time, settings.hourlyWage, settings.nightRate);
}

export interface MonthRow {
  payMonth: string; // YYYY-MM
  workMonth: string; // YYYY-MM
  confirmed: number; // 明細で確定した額
  planned: number; // 入力済みのシフトからの見込み
  assumed: number; // シフト未入力の日を過去の平均ペースで仮定した額
  amount: number;
  plannedShifts: number;
  uncoveredDays: number;
  isConfirmed: boolean;
}

export interface Projection {
  rows: MonthRow[];
  confirmed: number;
  planned: number;
  assumed: number;
  total: number;
  /** 1回あたりの見込み額（「あと何回入れるか」に使う） */
  perShift: number;
}

/**
 * year 年に支給される額（年収の壁は支給日ベース）の見込みを出す．
 * 明細がある月はその額，ない月は勤務月のシフトから見積もる．
 * シフトを入れていない日は，過去の明細の月平均を日割りした額で仮定する．
 */
export function projectYear(
  year: number,
  records: PayRecord[],
  periods: Record<string, DayPlan>,
  settings: Settings,
): Projection {
  const avg = averages(records);
  const plan: DayPlan = {};
  const covered = new Set<string>();
  for (const [start, days] of Object.entries(periods)) {
    periodDays(start).forEach((d) => covered.add(d));
    Object.assign(plan, days);
  }

  const rows: MonthRow[] = [];
  for (let m = 1; m <= 12; m++) {
    const payMonth = ymOf(year, m);
    const workMonth = shiftYm(payMonth, -settings.payMonthOffset);
    const recs = records.filter((r) => r.payDate.startsWith(payMonth));
    const row: MonthRow = {
      payMonth,
      workMonth,
      confirmed: 0,
      planned: 0,
      assumed: 0,
      amount: 0,
      plannedShifts: 0,
      uncoveredDays: 0,
      isConfirmed: recs.length > 0,
    };
    if (row.isConfirmed) {
      row.confirmed = recs.reduce((s, r) => s + r.amount, 0);
    } else {
      const days = daysOfMonth(workMonth);
      for (const d of days) {
        if (!covered.has(d)) row.uncoveredDays++;
        else if (plan[d]) {
          row.planned += estimateShift(plan[d], settings, avg);
          row.plannedShifts++;
        }
      }
      row.assumed = ((avg.monthly ?? 0) * row.uncoveredDays) / days.length;
    }
    row.amount = row.confirmed + row.planned + row.assumed;
    rows.push(row);
  }

  const sum = (k: 'confirmed' | 'planned' | 'assumed' | 'amount') =>
    rows.reduce((s, r) => s + r[k], 0);

  const fallback =
    settings.defaultTimes.reduce(
      (s, t) => s + shiftPay(t, settings.hourlyWage, settings.nightRate),
      0,
    ) / settings.defaultTimes.length;
  const perShift = settings.estimateMode === 'actual' && avg.perDay !== null ? avg.perDay : fallback;

  return {
    rows,
    confirmed: sum('confirmed'),
    planned: sum('planned'),
    assumed: sum('assumed'),
    total: sum('amount'),
    perShift,
  };
}

export type WallStatus = 'ok' | 'warn' | 'over';

export interface WallResult extends Wall {
  remaining: number;
  ratio: number;
  status: WallStatus;
  /** 見込みに加えて，あと何回入れても壁を超えないか */
  shiftsLeft: number | null;
}

export function evaluateWalls(total: number, walls: Wall[], perShift: number): WallResult[] {
  return [...walls]
    .sort((a, b) => a.amount - b.amount)
    .map((w) => {
      const remaining = w.amount - total;
      const ratio = w.amount > 0 ? total / w.amount : 0;
      const status: WallStatus = remaining < 0 ? 'over' : ratio >= 0.9 ? 'warn' : 'ok';
      const shiftsLeft = perShift > 0 && remaining >= 0 ? Math.floor(remaining / perShift) : null;
      return { ...w, remaining, ratio, status, shiftsLeft };
    });
}
