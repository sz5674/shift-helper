import { mondayOf, todayIso } from './date';
import type { Settings, Wall } from './types';

// 2026年分・給与収入のみ・23歳以上の学生を想定した目安．年齢や自治体で変わるので必ず自分で確認すること
export const DEFAULT_WALLS: Wall[] = [
  { id: 'resident', label: '住民税', amount: 1_100_000, note: '自分に住民税がかかり始める．自治体で異なる' },
  { id: 'social', label: '社会保険の扶養', amount: 1_300_000, note: '年収の見込みで判定（19〜22歳は150万円）' },
  { id: 'dependent', label: '親の扶養控除', amount: 1_360_000, note: '2026年分から123万円→136万円' },
  { id: 'income-tax', label: '所得税', amount: 1_780_000, note: '自分に所得税がかかり始める' },
];

export function defaultSettings(today = todayIso()): Settings {
  return {
    name: '',
    closing: '以上でよろしくお願いします。({name})',
    defaultTimes: Array(7).fill('18-22'),
    hourlyWage: 1100,
    nightRate: 1.25,
    anchorMonday: mondayOf(today),
    payMonthOffset: 1,
    monthlyLimit: 108_333,
    estimateMode: 'actual',
    walls: DEFAULT_WALLS,
  };
}
