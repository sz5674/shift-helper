// "18-22" や "17:30-0" のような勤務時間を解釈して，給料を見積もる

export interface TimeRange {
  /** 0:00 からの分．終わりが日をまたぐときは end が 1440 を超える */
  start: number;
  end: number;
}

const CLOCK = /^(\d{1,2})(?::(\d{2}))?$/;

function parseClock(s: string): number | null {
  const m = CLOCK.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 24 || min >= 60) return null;
  return h * 60 + min;
}

export function parseRange(text: string): TimeRange | null {
  const parts = text.split('-');
  if (parts.length !== 2) return null;
  const start = parseClock(parts[0]);
  const endRaw = parseClock(parts[1]);
  if (start === null || endRaw === null) return null;
  const end = endRaw <= start ? endRaw + 1440 : endRaw;
  return { start, end };
}

// 深夜割増の時間帯（22時〜翌5時）．日をまたぐ勤務にも対応するため2日分並べる
const NIGHT: [number, number][] = [
  [0, 5 * 60],
  [22 * 60, 29 * 60],
  [46 * 60, 53 * 60],
];

const overlap = (a: number, b: number, c: number, d: number) =>
  Math.max(0, Math.min(b, d) - Math.max(a, c));

export function workHours(r: TimeRange): number {
  return (r.end - r.start) / 60;
}

export function nightHours(r: TimeRange): number {
  return NIGHT.reduce((s, [a, b]) => s + overlap(r.start, r.end, a, b), 0) / 60;
}

/** 1回の勤務の給料（休憩・残業は考えない）．解釈できない時間は 0 円 */
export function shiftPay(text: string, wage: number, nightRate: number): number {
  const r = parseRange(text);
  if (!r) return 0;
  return wage * workHours(r) + wage * (nightRate - 1) * nightHours(r);
}
