import { describe, expect, it } from 'vitest';
import { addDays, shiftYm, weekdayIndex } from '../src/core/date';
import { nextPeriodStart, periodDays, periodStartOf } from '../src/core/period';
import { formatShiftText } from '../src/core/shiftText';
import { nightHours, parseRange, shiftPay } from '../src/core/time';
import { averages, evaluateWalls, projectYear } from '../src/core/income';
import { defaultSettings } from '../src/core/defaults';
import type { Settings } from '../src/core/types';

describe('日付', () => {
  it('曜日と月またぎ', () => {
    expect(weekdayIndex('2026-10-26')).toBe(0); // 月
    expect(weekdayIndex('2026-11-08')).toBe(6); // 日
    expect(addDays('2026-10-26', 13)).toBe('2026-11-08');
    expect(shiftYm('2026-01', -1)).toBe('2025-12');
    expect(shiftYm('2026-12', 1)).toBe('2027-01');
  });
});

describe('提出期間', () => {
  const anchor = '2026-10-12';
  it('2週間ごとに区切る', () => {
    expect(periodStartOf('2026-10-22', anchor)).toBe('2026-10-12');
    expect(periodStartOf('2026-10-26', anchor)).toBe('2026-10-26');
    expect(periodStartOf('2026-10-11', anchor)).toBe('2026-09-28'); // 基準より前
    expect(nextPeriodStart('2026-10-22', anchor)).toBe('2026-10-26');
    expect(periodDays('2026-11-09').at(-1)).toBe('2026-11-22');
  });
  it('周期がずれたら開始日を基準にし直す', () => {
    expect(nextPeriodStart('2026-10-30', '2026-11-09')).toBe('2026-11-09');
    expect(nextPeriodStart('2026-11-10', '2026-11-09')).toBe('2026-11-23');
    expect(nextPeriodStart('2026-10-30', '2026-11-04')).toBe('2026-11-04'); // 月曜以外
  });
});

describe('勤務時間と給料', () => {
  it('日をまたぐ時間を解釈する', () => {
    expect(parseRange('18-0')).toEqual({ start: 1080, end: 1440 });
    expect(parseRange('17:30-22')).toEqual({ start: 1050, end: 1320 });
    expect(parseRange('あいう')).toBeNull();
  });
  it('22時以降を深夜として数える', () => {
    expect(nightHours(parseRange('18-22')!)).toBe(0);
    expect(nightHours(parseRange('18-0')!)).toBe(2);
    expect(nightHours(parseRange('20-6')!)).toBe(7);
  });
  it('月4h＋水4h＋土6h（深夜2h）＝14,500円（時給1,000円）', () => {
    const pay = (t: string) => shiftPay(t, 1000, 1.25);
    expect(pay('18-22') * 2 + pay('18-0')).toBe(14500);
  });
});

describe('提出文', () => {
  it('シフト提出ルールの例と一致する', () => {
    const plan = {
      '2026-10-24': '18-0',
      '2026-10-12': '18-22',
      '2026-10-15': '18-0',
      '2026-10-17': '18-0',
      '2026-10-19': '18-22',
      '2026-10-22': '18-0',
    };
    expect(formatShiftText(plan, '山田太郎', '以上でよろしくお願いします。({name})')).toBe(
      [
        '10月12日(月)18-22',
        '10月15日(木)18-0',
        '10月17日(土)18-0',
        '10月19日(月)18-22',
        '10月22日(木)18-0',
        '10月24日(土)18-0',
        '以上でよろしくお願いします。(山田太郎)',
      ].join('\n'),
    );
  });
});

describe('年収の見込み', () => {
  const settings: Settings = {
    ...defaultSettings('2026-10-22'),
    hourlyWage: 1000,
    nightRate: 1.25,
    estimateMode: 'shift',
    anchorMonday: '2026-10-26',
  };

  it('明細の平均を出す', () => {
    const avg = averages([
      { id: 'a', payDate: '2026-01-09', amount: 90000, workDays: 10 },
      { id: 'b', payDate: '2026-02-10', amount: 60000 },
    ]);
    expect(avg.monthly).toBe(75000);
    expect(avg.perDay).toBe(9000); // 出勤日数があるものだけで計算
  });

  it('確定・シフト・仮定を月ごとに合わせる', () => {
    const records = [{ id: 'a', payDate: '2026-10-09', amount: 62000 }];
    // 10/26〜11/8 の期間に 10/26(18-22) と 11/2(18-0) を入れる
    const periods = { '2026-10-26': { '2026-10-26': '18-22', '2026-11-02': '18-0' } };
    const p = projectYear(2026, records, periods, settings);
    const oct = p.rows.find((r) => r.payMonth === '2026-10')!;
    const nov = p.rows.find((r) => r.payMonth === '2026-11')!; // 10月勤務分
    expect(oct.isConfirmed).toBe(true);
    expect(oct.amount).toBe(62000);
    expect(nov.planned).toBe(4000);
    expect(nov.uncoveredDays).toBe(25); // 10/1〜10/25
    expect(nov.assumed).toBeCloseTo((62000 * 25) / 31);
    const dec = p.rows.find((r) => r.payMonth === '2026-12')!; // 11月勤務分
    expect(dec.planned).toBe(6500); // 18-0 = 6h + 深夜2h×0.25
    expect(dec.uncoveredDays).toBe(22); // 11/9〜11/30
  });

  it('壁までの残りと回数', () => {
    const walls = [
      { id: 'b', label: 'B', amount: 1_300_000, note: '' },
      { id: 'a', label: 'A', amount: 1_100_000, note: '' },
    ];
    const r = evaluateWalls(1_050_000, walls, 9000);
    expect(r.map((w) => w.id)).toEqual(['a', 'b']); // 金額順
    expect(r[0].status).toBe('warn');
    expect(r[0].shiftsLeft).toBe(5);
    expect(evaluateWalls(1_400_000, walls, 9000)[1].status).toBe('over');
  });
});
