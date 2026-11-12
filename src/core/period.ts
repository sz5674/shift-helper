import { addDays, diffDays } from './date';

/** シフトの提出単位（2週間） */
export const PERIOD_DAYS = 14;

/** date を含む期間の初日．anchor は期間の初日のどれか */
export function periodStartOf(date: string, anchor: string): string {
  const k = Math.floor(diffDays(anchor, date) / PERIOD_DAYS);
  return addDays(anchor, k * PERIOD_DAYS);
}

/** 次に提出する期間（今日を含む期間の次）の初日 */
export function nextPeriodStart(today: string, anchor: string): string {
  return addDays(periodStartOf(today, anchor), PERIOD_DAYS);
}

export function periodDays(start: string): string[] {
  return Array.from({ length: PERIOD_DAYS }, (_, i) => addDays(start, i));
}
