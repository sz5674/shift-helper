// データはブラウザの localStorage にだけ保存する（サーバには送らない）
import { defaultSettings } from './core/defaults';
import type { AppData } from './core/types';

const KEY = 'shift-helper:v1';

export function emptyData(): AppData {
  return { version: 1, settings: defaultSettings(), records: [], periods: {} };
}

export function normalize(raw: unknown): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== 'object') return base;
  const d = raw as Partial<AppData>;
  return {
    version: 1,
    settings: { ...base.settings, ...(d.settings ?? {}) },
    records: Array.isArray(d.records) ? d.records : [],
    periods: d.periods && typeof d.periods === 'object' ? d.periods : {},
  };
}

export function loadData(): AppData {
  try {
    const text = localStorage.getItem(KEY);
    return text ? normalize(JSON.parse(text)) : emptyData();
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // プライベートモードなどで保存できないときは何もしない（画面は動く）
  }
}
