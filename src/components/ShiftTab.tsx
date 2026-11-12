import { useMemo, useState } from 'react';
import type { AppData } from '../core/types';
import type { Update } from '../App';
import { YOUBI, addDays, shortLabel, todayIso, weekdayIndex } from '../core/date';
import { nextPeriodStart, periodDays } from '../core/period';
import { formatShiftText, type DayPlan } from '../core/shiftText';
import { averages, estimateShift } from '../core/income';
import { parseRange } from '../core/time';
import { yen } from './format';

interface Props {
  data: AppData;
  update: Update;
}

export function ShiftTab({ data, update }: Props) {
  const { settings } = data;
  const next = nextPeriodStart(todayIso(), settings.anchorMonday);
  const [start, setStart] = useState(next);
  const [copied, setCopied] = useState(false);

  const days = periodDays(start);
  const plan: DayPlan = data.periods[start] ?? {};
  const avg = useMemo(() => averages(data.records), [data.records]);

  const setPlan = (fn: (p: DayPlan) => DayPlan) => {
    setCopied(false);
    update((d) => ({ ...d, periods: { ...d.periods, [start]: fn(d.periods[start] ?? {}) } }));
  };

  const toggleDay = (iso: string) =>
    setPlan((p) => {
      const { [iso]: had, ...rest } = p;
      return had !== undefined ? rest : { ...p, [iso]: settings.defaultTimes[weekdayIndex(iso)] };
    });

  // 開始日を変えたら，その日を新しい区切りとして以後の2週間もずらす
  const changeStart = (iso: string) => {
    setStart(iso);
    setCopied(false);
    update((d) => ({ ...d, settings: { ...d.settings, anchorMonday: iso } }));
  };

  const setTime = (iso: string, time: string) => setPlan((p) => ({ ...p, [iso]: time }));

  // その曜日が2週とも入っていれば外し，そうでなければ2週とも入れる
  const toggleWeekday = (w: number) =>
    setPlan((p) => {
      const targets = days.filter((d) => weekdayIndex(d) === w);
      const allOn = targets.every((d) => p[d] !== undefined);
      const nextPlan = { ...p };
      for (const d of targets) {
        if (allOn) delete nextPlan[d];
        else nextPlan[d] ??= settings.defaultTimes[w];
      }
      return nextPlan;
    });

  const text = formatShiftText(plan, settings.name, settings.closing);
  const count = Object.keys(plan).length;
  const total = Object.values(plan).reduce((s, t) => s + estimateShift(t, settings, avg), 0);
  const invalid = Object.entries(plan).filter(([, t]) => !parseRange(t));
  const timeOptions = [...new Set([...settings.defaultTimes, '18-22', '18-0', '17-22'])];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
      alert('コピーできませんでした．文章を選んで手動でコピーしてください．');
    }
  };

  return (
    <section className="stack">
      <div className="card period">
        <button className="ghost" onClick={() => setStart(addDays(start, -14))} aria-label="前の期間">
          ◀
        </button>
        <div className="period-label">
          <strong>
            {shortLabel(days[0])} 〜 {shortLabel(days[13])}
          </strong>
          {start === next && <span className="badge">次の提出分</span>}
          <label className="period-start">
            開始日
            <input type="date" value={start} onChange={(e) => e.target.value && changeStart(e.target.value)} />
          </label>
        </div>
        <button className="ghost" onClick={() => setStart(addDays(start, 14))} aria-label="次の期間">
          ▶
        </button>
      </div>

      <div className="card">
        <h2>曜日でまとめて選ぶ</h2>
        <div className="weekdays">
          {[...YOUBI].map((y, w) => {
            const on = days.filter((d) => weekdayIndex(d) === w).every((d) => plan[d] !== undefined);
            return (
              <button key={y} className={on ? 'chip on' : 'chip'} onClick={() => toggleWeekday(w)}>
                {y}
              </button>
            );
          })}
        </div>
        <p className="hint">週ごとに変えたいときは，下のカレンダーで1日ずつ切り替えてください．</p>
      </div>

      <div className="card">
        <h2>カレンダー</h2>
        {[0, 1].map((week) => (
          <div className="week" key={week}>
            {days.slice(week * 7, week * 7 + 7).map((d) => {
              const on = plan[d] !== undefined;
              const w = weekdayIndex(d);
              return (
                <div key={d} className={`day ${on ? 'on' : ''} ${w === 5 ? 'sat' : ''} ${w === 6 ? 'sun' : ''}`}>
                  <button className="day-toggle" onClick={() => toggleDay(d)} aria-pressed={on}>
                    <span className="day-date">{d.slice(5).replace('-', '/').replace(/^0/, '')}</span>
                    <span className="day-youbi">{YOUBI[w]}</span>
                    <span className="day-time">{on ? plan[d] : ' '}</span>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
        {count > 0 && (
          <details className="time-edit">
            <summary>時間を変える</summary>
            <ul>
              {Object.keys(plan)
                .sort()
                .map((d) => (
                  <li key={d}>
                    <span>{shortLabel(d)}</span>
                    <input
                      className={parseRange(plan[d]) ? 'time' : 'time error'}
                      list="time-options"
                      value={plan[d]}
                      onChange={(e) => setTime(d, e.target.value)}
                      aria-label={`${shortLabel(d)}の時間`}
                    />
                  </li>
                ))}
            </ul>
          </details>
        )}
        <datalist id="time-options">
          {timeOptions.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>

      <div className="card">
        <div className="row-between">
          <h2>提出文</h2>
          <span className="muted">
            {count}日 ・ 見込み 約{yen(total)}
          </span>
        </div>
        {invalid.length > 0 && (
          <p className="warn-text">時間の書き方が読めない日があります（例：18-22，17:30-0）．</p>
        )}
        {!settings.name && <p className="warn-text">設定タブで名前を入れてください．</p>}
        <pre className="preview">{count ? text : '日付を選ぶとここに提出文ができます．'}</pre>
        <div className="actions">
          <button className="primary" onClick={copy} disabled={!count}>
            {copied ? 'コピーしました' : 'コピーする'}
          </button>
          <button className="ghost" onClick={() => setPlan(() => ({}))} disabled={!count}>
            全部外す
          </button>
        </div>
      </div>
    </section>
  );
}
