import { useRef } from 'react';
import type { AppData, Settings, Wall } from '../core/types';
import type { Update } from '../App';
import { YOUBI } from '../core/date';
import { parseRange } from '../core/time';
import { DEFAULT_WALLS } from '../core/defaults';
import { emptyData, normalize } from '../storage';
import { newId } from './format';

interface Props {
  data: AppData;
  update: Update;
  setData: (d: AppData) => void;
}

export function SettingsTab({ data, update, setData }: Props) {
  const s = data.settings;
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    update((d) => ({ ...d, settings: { ...d.settings, [key]: value } }));

  const setWall = (id: string, patch: Partial<Wall>) =>
    set('walls', s.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)));

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'shift-helper-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (file: File) => {
    try {
      setData(normalize(JSON.parse(await file.text())));
      alert('読み込みました．');
    } catch {
      alert('読み込めませんでした．このアプリで書き出したファイルを選んでください．');
    }
  };

  return (
    <section className="stack">
      <div className="card">
        <h2>提出文</h2>
        <label className="field">
          名前
          <input value={s.name} placeholder="山田太郎" onChange={(e) => set('name', e.target.value)} />
        </label>
        <label className="field">
          最後の一文（{'{name}'} が名前になります）
          <input value={s.closing} onChange={(e) => set('closing', e.target.value)} />
        </label>
      </div>

      <div className="card">
        <h2>曜日ごとのいつもの時間</h2>
        <div className="times-grid">
          {[...YOUBI].map((y, i) => (
            <label key={y}>
              {y}
              <input
                className={parseRange(s.defaultTimes[i]) ? 'time' : 'time error'}
                value={s.defaultTimes[i]}
                onChange={(e) => set('defaultTimes', s.defaultTimes.map((t, j) => (j === i ? e.target.value : t)))}
              />
            </label>
          ))}
        </div>
        <p className="hint">書き方：18-22，18-0（0時まで），17:30-22</p>
        <label className="field">
          提出期間の初日のどれか1日
          <input
            type="date"
            value={s.anchorMonday}
            onChange={(e) => e.target.value && set('anchorMonday', e.target.value)}
          />
        </label>
        <p className="hint">2週間ごとの区切りを合わせるために使います．周期がずれたら，シフトタブの「開始日」からも変えられます．</p>
      </div>

      <div className="card">
        <h2>給料</h2>
        <div className="form-row">
          <label>
            時給（円）
            <input type="number" value={s.hourlyWage} onChange={(e) => set('hourlyWage', Number(e.target.value))} />
          </label>
          <label>
            深夜割増（22〜5時）
            <input
              type="number"
              step="0.01"
              value={s.nightRate}
              onChange={(e) => set('nightRate', Number(e.target.value))}
            />
          </label>
          <label>
            支給は勤務の何か月後
            <input
              type="number"
              min={0}
              max={2}
              value={s.payMonthOffset}
              onChange={(e) => set('payMonthOffset', Number(e.target.value))}
            />
          </label>
        </div>
        <fieldset className="radio">
          <legend>見込みの計算方法</legend>
          <label>
            <input
              type="radio"
              checked={s.estimateMode === 'actual'}
              onChange={() => set('estimateMode', 'actual')}
            />
            明細から出した1日平均（実際は延長や残業があるので，こちらが現実に近い）
          </label>
          <label>
            <input type="radio" checked={s.estimateMode === 'shift'} onChange={() => set('estimateMode', 'shift')} />
            シフトの時間×時給
          </label>
        </fieldset>
      </div>

      <div className="card">
        <h2>年収の壁</h2>
        <ul className="wall-edit">
          {s.walls.map((w) => (
            <li key={w.id}>
              <input value={w.label} aria-label="名前" onChange={(e) => setWall(w.id, { label: e.target.value })} />
              <input
                type="number"
                value={w.amount}
                aria-label="金額"
                onChange={(e) => setWall(w.id, { amount: Number(e.target.value) })}
              />
              <input value={w.note} aria-label="メモ" onChange={(e) => setWall(w.id, { note: e.target.value })} />
              <button
                className="ghost small"
                aria-label="削除"
                onClick={() => set('walls', s.walls.filter((x) => x.id !== w.id))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="actions">
          <button
            className="ghost"
            onClick={() => set('walls', [...s.walls, { id: newId(), label: '新しい壁', amount: 1_000_000, note: '' }])}
          >
            壁を追加
          </button>
          <button className="ghost" onClick={() => set('walls', DEFAULT_WALLS)}>
            初期値に戻す
          </button>
        </div>
        <label className="field">
          月額の注意ライン（円）
          <input type="number" value={s.monthlyLimit} onChange={(e) => set('monthlyLimit', Number(e.target.value))} />
        </label>
      </div>

      <div className="card">
        <h2>データ</h2>
        <div className="actions">
          <button className="ghost" onClick={exportJson}>
            書き出す（バックアップ）
          </button>
          <button className="ghost" onClick={() => fileRef.current?.click()}>
            読み込む
          </button>
          <button
            className="ghost danger"
            onClick={() => confirm('すべてのデータを消しますか？') && setData(emptyData())}
          >
            すべて消す
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
        />
      </div>
    </section>
  );
}
