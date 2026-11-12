import { YOUBI, monthDay, weekdayIndex } from './date';

export type DayPlan = Record<string, string>; // 日付 → 勤務時間（"18-22" など）

/** コピペで提出する文章を作る．closing の {name} は名前に置き換える */
export function formatShiftText(plan: DayPlan, name: string, closing: string): string {
  const lines = Object.keys(plan)
    .sort()
    .map((iso) => {
      const { m, d } = monthDay(iso);
      return `${m}月${d}日(${YOUBI[weekdayIndex(iso)]})${plan[iso]}`;
    });
  if (closing.trim()) lines.push(closing.replaceAll('{name}', name));
  return lines.join('\n');
}
