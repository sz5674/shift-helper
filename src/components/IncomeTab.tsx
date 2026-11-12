import { useMemo, useState } from 'react';
import type { AppData, PayRecord } from '../core/types';
import type { Update } from '../App';
import { todayIso } from '../core/date';
import { averages, evaluateWalls, projectYear } from '../core/income';
import { man, newId, yen, ymLabel } from './format';

interface Props {
  data: AppData;
  update: Update;
}

const STATUS_LABEL = { ok: '余裕あり', warn: 'もうすぐ', over: '超える見込み' } as const;

export function IncomeTab({ data, update }: Props) {
  const { settings } = data;
  const thisYear = Number(todayIso().slice(0, 4));
  const [year, setYear] = useState(thisYear);

  const projection = useMemo(
    () => projectYear(year, data.records, data.periods, settings),
    [year, data.records, data.periods, settings],
  );
  const walls = evaluateWalls(projection.total, settings.walls, projection.perShift);
  const avg = averages(data.records);

  const [form, setForm] = useState({ payDate: '', amount: '', workDays: '' });
  const addRecord = () => {
    const amount = Number(form.amount.replaceAll(',', ''));
    if (!form.payDate || !(amount > 0)) return;
    const rec: PayRecord = {
      id: newId(),
      payDate: form.payDate,
      amount,
      workDays: form.workDays ? Number(form.workDays) : undefined,
    };
    update((d) => ({ ...d, records: [...d.records, rec].sort((a, b) => a.payDate.localeCompare(b.payDate)) }));
    setForm({ payDate: '', amount: '', workDays: '' });
  };
  const removeRecord = (id: string) =>
    update((d) => ({ ...d, records: d.records.filter((r) => r.id !== id) }));

  const yearRecords = data.records.filter((r) => r.payDate.startsWith(String(year)));

  return (
    <section className="stack">
      <div className="card">
        <div className="row-between">
          <div className="year-switch">
            <button className="ghost" onClick={() => setYear(year - 1)} aria-label="前の年">
              ◀
            </button>
            <h2>{year}年に支給される額</h2>
            <button className="ghost" onClick={() => setYear(year + 1)} aria-label="次の年">
              ▶
            </button>
          </div>
        </div>
        <p className="big">約{man(projection.total)}</p>
        <ul className="breakdown">
          <li>
            <span className="dot confirmed" />
            明細で確定 {yen(projection.confirmed)}
          </li>
          <li>
            <span className="dot planned" />
            入力したシフト {yen(projection.planned)}
          </li>
          <li>
            <span className="dot assumed" />
            未入力の日（過去の平均で仮定） {yen(projection.assumed)}
          </li>
        </ul>
        <p className="hint">
          見込みの計算：
          {settings.estimateMode === 'actual' && avg.perDay !== null
            ? `明細から出した1日平均 ${yen(avg.perDay)}`
            : `シフト時間×時給 ${yen(settings.hourlyWage)}`}
          （設定で切り替え）
        </p>
      </div>

      <div className="card">
        <h2>壁までの残り</h2>
        <ul className="walls">
          {walls.map((w) => (
            <li key={w.id} className={`wall ${w.status}`}>
              <div className="row-between">
                <strong>
                  {man(w.amount)} {w.label}
                </strong>
                <span className={`status ${w.status}`}>{STATUS_LABEL[w.status]}</span>
              </div>
              <div className="bar" role="progressbar" aria-valuenow={Math.round(w.ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${Math.min(100, w.ratio * 100)}%` }} />
              </div>
              <div className="muted">
                {w.remaining >= 0
                  ? `あと ${yen(w.remaining)}${w.shiftsLeft !== null ? `（見込みに加えて約${w.shiftsLeft}回）` : ''}`
                  : `${yen(-w.remaining)} 超える見込み`}
                {w.note && ` ・ ${w.note}`}
              </div>
            </li>
          ))}
        </ul>
        <p className="hint">金額は目安です．年齢・自治体・制度改正で変わるので，公的な情報で確認してください．</p>
      </div>

      <div className="card">
        <h2>月ごと</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>支給月</th>
                <th>勤務月</th>
                <th className="num">金額</th>
                <th>内訳</th>
              </tr>
            </thead>
            <tbody>
              {projection.rows.map((r) => (
                <tr key={r.payMonth} className={r.amount > settings.monthlyLimit ? 'over-row' : ''}>
                  <td>{Number(r.payMonth.slice(5))}月</td>
                  <td className="muted">{ymLabel(r.workMonth)}</td>
                  <td className="num">{yen(r.amount)}</td>
                  <td className="muted">
                    {r.isConfirmed
                      ? '確定'
                      : [
                          r.plannedShifts ? `シフト${r.plannedShifts}回` : '',
                          r.uncoveredDays ? `未入力${r.uncoveredDays}日` : '',
                        ]
                          .filter(Boolean)
                          .join('・') || '勤務なし'}
                    {r.amount > settings.monthlyLimit && ' ・ 月額の目安超え'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">
          月額 {yen(settings.monthlyLimit)} を超える月が続くと，社会保険の扶養（年収見込み130万円）で問題になりやすいです．
        </p>
      </div>

      <div className="card">
        <h2>給与明細を入れる</h2>
        <div className="form-row">
          <label>
            支給日
            <input type="date" value={form.payDate} onChange={(e) => setForm({ ...form, payDate: e.target.value })} />
          </label>
          <label>
            総支給額（課税分）
            <input
              inputMode="numeric"
              placeholder="85000"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </label>
          <label>
            出勤日数（任意）
            <input
              inputMode="numeric"
              placeholder="12"
              value={form.workDays}
              onChange={(e) => setForm({ ...form, workDays: e.target.value })}
            />
          </label>
          <button className="primary" onClick={addRecord}>
            追加
          </button>
        </div>
        {yearRecords.length > 0 && (
          <ul className="records">
            {yearRecords.map((r) => (
              <li key={r.id}>
                <span>{r.payDate.slice(5).replace('-', '/')}</span>
                <span className="num">{yen(r.amount)}</span>
                <span className="muted">{r.workDays ? `${r.workDays}日` : ''}</span>
                <button className="ghost small" onClick={() => removeRecord(r.id)} aria-label="削除">
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
