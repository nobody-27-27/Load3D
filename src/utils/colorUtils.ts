export const CARGO_COLOR_PALETTE = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#6366f1',
  '#14b8a6',
  '#a855f7',
];

export function getRandomColor(): string {
  const randomIndex = Math.floor(Math.random() * CARGO_COLOR_PALETTE.length);
  return CARGO_COLOR_PALETTE[randomIndex];
}

export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}
