/** Where each seeded file sits: its id, which of the 24 leaf clusters it belongs to, and the path of a leaf. */
export const pad = (i: number): string => String(i).padStart(3, "0");
export const fid = (i: number): string => `f${pad(i)}`;
export const members = (i: number): number[] => [
  i % 24,
  ...(i % 3 === 0 ? [(i + 5) % 24] : []),
  ...(i % 6 === 0 ? [(i + 11) % 24] : []),
  ...(i % 10 === 0 ? [(i + 13) % 24] : []),
];
/** root > mid > leaf names for leaf cluster l (mid = l % 12, root = mid % 4). */
export const pathOf = (l: number): string[] => [`Root r${(l % 12) % 4}`, `Mid m${l % 12}`, `Leaf l${l}`];
