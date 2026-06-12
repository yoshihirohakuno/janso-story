import { SuitType, Tile } from './types';

export const SUITS: SuitType[] = ['m', 'p', 's', 'z'];

export const WIND_NAMES = {
  E: '東',
  S: '南',
  W: '西',
  N: '北',
};

export const DRAGON_NAMES: { [key: number]: string } = {
  5: '白',
  6: '發',
  7: '中',
};

// Map of tile string representations for debugging/testing
export function getTileName(suit: SuitType, value: number, isRed = false): string {
  if (suit === 'z') {
    if (value >= 1 && value <= 4) {
      return ['東', '南', '西', '北'][value - 1];
    }
    return DRAGON_NAMES[value] || '';
  }
  return `${isRed ? '赤' : ''}${value}${suit === 'm' ? '萬' : suit === 'p' ? '筒' : '索'}`;
}

export function sortTiles(tiles: Tile[]): Tile[] {
  const suitOrder = { m: 0, p: 1, s: 2, z: 3 };
  return [...tiles].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    if (a.value !== b.value) {
      return a.value - b.value;
    }
    // Red tiles sorted first or last, let's put red tiles first for consistency
    if (a.isRed !== b.isRed) {
      return a.isRed ? -1 : 1;
    }
    return a.id - b.id;
  });
}
