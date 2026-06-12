import { Tile, SuitType } from './types';

// Generate a complete deck of 136 tiles
export function generateDeck(): Tile[] {
  const deck: Tile[] = [];
  let id = 0;

  // Suits: m (Manzu), p (Pinzu), s (Souzu)
  const suits: SuitType[] = ['m', 'p', 's'];
  for (const suit of suits) {
    for (let value = 1; value <= 9; value++) {
      for (let i = 0; i < 4; i++) {
        // One of the 5s in each suit is red
        const isRed = value === 5 && i === 0;
        deck.push({
          id,
          suit,
          value,
          isRed,
        });
        id++;
      }
    }
  }

  // Honor tiles: z (Jiihai)
  // z1-z4: East, South, West, North
  // z5-z7: Haku (White), Hatsu (Green), Chun (Red)
  for (let value = 1; value <= 7; value++) {
    for (let i = 0; i < 4; i++) {
      deck.push({
        id,
        suit: 'z',
        value,
        isRed: false,
      });
      id++;
    }
  }

  return deck;
}

// Fisher-Yates Shuffle
export function shuffle(tiles: Tile[]): Tile[] {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export interface WallSetup {
  wall: Tile[];          // Live wall for drawing (normally 122 tiles)
  deadWall: Tile[];      // Dead wall (exactly 14 tiles)
  doraIndicators: Tile[];
  uraDoraIndicators: Tile[];
}

export function setupWall(): WallSetup {
  const deck = shuffle(generateDeck());

  // In standard mahjong:
  // Total 136 tiles.
  // Dead wall: 14 tiles at the end of the shuffled deck.
  // Live wall: 122 tiles.
  const liveWall = deck.slice(0, 122);
  const deadWall = deck.slice(122, 136);

  // Dead wall structure (index 0 to 13):
  // 0, 1, 2, 3: Rinshan (replacement) tiles
  // 4, 6, 8, 10, 12: Dora indicators (top row)
  // 5, 7, 9, 11, 13: Ura Dora indicators (bottom row)
  const doraIndicators = [deadWall[4]];
  const uraDoraIndicators = [deadWall[5]];

  return {
    wall: liveWall,
    deadWall,
    doraIndicators,
    uraDoraIndicators,
  };
}

// Convert a Dora indicator tile to the tile type that counts as Dora
export function getDoraTarget(indicator: Tile): { suit: SuitType; value: number } {
  const { suit, value } = indicator;
  if (suit === 'z') {
    // Winds: East (1) -> South (2) -> West (3) -> North (4) -> East (1)
    if (value >= 1 && value <= 4) {
      return { suit: 'z', value: value === 4 ? 1 : value + 1 };
    }
    // Dragons: White (5) -> Green (6) -> Red (7) -> White (5)
    return { suit: 'z', value: value === 7 ? 5 : value + 1 };
  }

  // Numbers: 1-8 -> value + 1, 9 -> 1
  return { suit, value: value === 9 ? 1 : value + 1 };
}

// Check if a tile is a Dora (either normal, red, or ura)
export function isDoraTile(
  tile: Tile,
  doraIndicators: Tile[],
  uraDoraIndicators: Tile[] = [],
  includeUra = false
): { isDora: boolean; count: number } {
  let count = 0;
  
  // Check red dora
  if (tile.isRed) {
    count++;
  }

  // Check normal dora
  for (const indicator of doraIndicators) {
    const target = getDoraTarget(indicator);
    if (tile.suit === target.suit && tile.value === target.value) {
      count++;
    }
  }

  // Check ura dora
  if (includeUra) {
    for (const indicator of uraDoraIndicators) {
      const target = getDoraTarget(indicator);
      if (tile.suit === target.suit && tile.value === target.value) {
        count++;
      }
    }
  }

  return {
    isDora: count > 0,
    count,
  };
}
