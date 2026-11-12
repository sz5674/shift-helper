import { useEffect, useState } from 'react';
import { loadData, saveData } from './storage';
import type { AppData } from './core/types';
import { ShiftTab } from './components/ShiftTab';
import { IncomeTab } from './components/IncomeTab';
import { SettingsTab } from './components/SettingsTab';

const TABS = [
  { id: 'shift', label: 'シフト提出' },
  { id: 'income', label: '年収の壁' },
  { id: 'settings', label: '設定' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export type Update = (fn: (d: AppData) => AppData) => void;

export function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [tab, setTab] = useState<TabId>(() => (loadData().settings.name ? 'shift' : 'settings'));

  useEffect(() => saveData(data), [data]);

  const update: Update = (fn) => setData((d) => fn(d));

  return (
    <div className="app">
      <header className="header">
        <h1>シフトヘルパー</h1>
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'tab active' : 'tab'}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {tab === 'shift' && <ShiftTab data={data} update={update} />}
        {tab === 'income' && <IncomeTab data={data} update={update} />}
        {tab === 'settings' && <SettingsTab data={data} update={update} setData={setData} />}
      </main>
      <footer className="footer">データはこのブラウザの中だけに保存されます．</footer>
    </div>
  );
}
