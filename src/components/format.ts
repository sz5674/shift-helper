export const yen = (n: number) => `${Math.round(n).toLocaleString('ja-JP')}円`;

/** 1,100,000 → "110万円" */
export const man = (n: number) => `${(Math.round(n / 1000) / 10).toLocaleString('ja-JP')}万円`;

export const ymLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${y}年${m}月`;
};

export const newId = () => Math.random().toString(36).slice(2, 10);
