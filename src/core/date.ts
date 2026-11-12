// 日付は "YYYY-MM-DD" の文字列で扱う（タイムゾーンのずれを避けるため内部はUTC）

export const YOUBI = '月火水木金土日';

const pad = (n: number) => String(n).padStart(2, '0');

function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toIso(dt: Date): string {
  return dt.toISOString().slice(0, 10);
}

export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(iso: string, n: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

/** b - a の日数 */
export function diffDays(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);
}

/** 0=月 … 6=日 */
export function weekdayIndex(iso: string): number {
  return (toDate(iso).getUTCDay() + 6) % 7;
}

export function mondayOf(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

export function monthDay(iso: string): { m: number; d: number } {
  const [, m, d] = iso.split('-').map(Number);
  return { m, d };
}

/** 例："10/26(月)" */
export function shortLabel(iso: string): string {
  const { m, d } = monthDay(iso);
  return `${m}/${d}(${YOUBI[weekdayIndex(iso)]})`;
}

/** "YYYY-MM" を months か月ずらす */
export function shiftYm(ym: string, months: number): string {
  const [y, m] = ym.split('-').map(Number);
  const t = y * 12 + (m - 1) + months;
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`;
}

export function daysOfMonth(ym: string): string[] {
  const [y, m] = ym.split('-').map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${ym}-${pad(i + 1)}`);
}

export function ymOf(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}
