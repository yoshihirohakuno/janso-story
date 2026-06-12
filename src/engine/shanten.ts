import { Tile, SuitType } from './types';

// Convert a tile to a 0-33 index
export function tileToIndex(tile: Tile): number {
  if (tile.suit === 'm') return tile.value - 1;          // 0-8
  if (tile.suit === 'p') return 9 + tile.value - 1;      // 9-17
  if (tile.suit === 's') return 18 + tile.value - 1;     // 18-26
  // suit === 'z'
  return 27 + tile.value - 1;                            // 27-33
}

// Convert a 0-33 index back to suit and value
export function indexToSuitAndValue(index: number): { suit: SuitType; value: number } {
  if (index >= 0 && index <= 8) {
    return { suit: 'm', value: index + 1 };
  }
  if (index >= 9 && index <= 17) {
    return { suit: 'p', value: index - 9 + 1 };
  }
  if (index >= 18 && index <= 26) {
    return { suit: 's', value: index - 18 + 1 };
  }
  return { suit: 'z', value: index - 27 + 1 };
}

// Calculate the shanten for a hand
export function calculateShanten(hand: Tile[], openMeldCount: number): number {
  const counts = new Array(34).fill(0);
  for (const tile of hand) {
    counts[tileToIndex(tile)]++;
  }

  const normal = calculateNormalShanten(counts, openMeldCount);
  
  // Chiitoitsu and Kokushi Musou are only possible with closed hands (0 open melds)
  let chiitoitsu = 99;
  let kokushi = 99;
  
  if (openMeldCount === 0) {
    chiitoitsu = calculateChiitoitsuShanten(counts);
    kokushi = calculateKokushiShanten(counts);
  }

  return Math.min(normal, chiitoitsu, kokushi);
}

// 1. Normal Hand Shanten Calculator (Backtracking DFS)
function calculateNormalShanten(counts: number[], openMeldCount: number): number {
  let minShanten = 8; // Max shanten is 8 (completely raw hand)

  // Helper DFS function to find the maximum combinations of melds and tatsu
  function dfs(idx: number, melds: number, tatsu: number, currentCounts: number[]): number {
    // Skip empty indices
    while (idx < 34 && currentCounts[idx] === 0) {
      idx++;
    }

    if (idx === 34) {
      // Calculate score for this partition path
      const totalSets = openMeldCount + melds;
      const effectiveTatsu = Math.min(tatsu, 4 - totalSets);
      return 2 * melds + effectiveTatsu;
    }

    let maxScore = dfs(idx + 1, melds, tatsu, currentCounts);

    // 1. Triplet (Koutsu)
    if (currentCounts[idx] >= 3) {
      currentCounts[idx] -= 3;
      maxScore = Math.max(maxScore, dfs(idx, melds + 1, tatsu, currentCounts));
      currentCounts[idx] += 3;
    }

    // 2. Run (Shunzu) - only for suit tiles (m, p, s)
    if (idx < 27) {
      const value = (idx % 9) + 1;
      // Ensure we don't wrap across different suits
      if (value <= 7 && currentCounts[idx] >= 1 && currentCounts[idx + 1] >= 1 && currentCounts[idx + 2] >= 1) {
        currentCounts[idx]--;
        currentCounts[idx + 1]--;
        currentCounts[idx + 2]--;
        maxScore = Math.max(maxScore, dfs(idx, melds + 1, tatsu, currentCounts));
        currentCounts[idx]++;
        currentCounts[idx + 1]++;
        currentCounts[idx + 2]++;
      }
    }

    // 3. Pair (Toitsu) -> counts as 1 tatsu
    if (currentCounts[idx] >= 2) {
      currentCounts[idx] -= 2;
      maxScore = Math.max(maxScore, dfs(idx, melds, tatsu + 1, currentCounts));
      currentCounts[idx] += 2;
    }

    // 4. Incomplete Run (Tatsu) - only for suit tiles (m, p, s)
    if (idx < 27) {
      const value = (idx % 9) + 1;
      // Ryanmen / Penchan (sequential: e.g. 1-2, 4-5)
      if (value <= 8 && currentCounts[idx] >= 1 && currentCounts[idx + 1] >= 1) {
        currentCounts[idx]--;
        currentCounts[idx + 1]--;
        maxScore = Math.max(maxScore, dfs(idx, melds, tatsu + 1, currentCounts));
        currentCounts[idx]++;
        currentCounts[idx + 1]++;
      }
      // Kanchan (gapped: e.g. 1-3, 5-7)
      if (value <= 7 && currentCounts[idx] >= 1 && currentCounts[idx + 2] >= 1) {
        currentCounts[idx]--;
        currentCounts[idx + 2]--;
        maxScore = Math.max(maxScore, dfs(idx, melds, tatsu + 1, currentCounts));
        currentCounts[idx]++;
        currentCounts[idx + 2]++;
      }
    }

    return maxScore;
  }

  // Path A: With Jantou (Pair)
  // We iterate over all tiles, select one with count >= 2 as our pair, and find the best sets with the rest.
  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 2) {
      counts[i] -= 2;
      const score = dfs(0, 0, 0, counts);
      // Shanten = 8 - 2 * (open + closed) - tatsu - 1 (for pair)
      // Since score = 2 * closed_melds + tatsu, we have:
      // Shanten = 8 - 2 * open - score - 1 = 7 - 2 * open - score
      const shanten = 7 - 2 * openMeldCount - score;
      minShanten = Math.min(minShanten, shanten);
      counts[i] += 2;
    }
  }

  // Path B: Without Jantou
  // We calculate the best sets directly. In this case, we don't have a dedicated pair.
  // Shanten = 8 - 2 * open - score
  const scoreWithoutJantou = dfs(0, 0, 0, counts);
  const shantenWithoutJantou = 8 - 2 * openMeldCount - scoreWithoutJantou;
  minShanten = Math.min(minShanten, shantenWithoutJantou);

  return minShanten;
}

// 2. Chiitoitsu (Seven Pairs) Shanten
function calculateChiitoitsuShanten(counts: number[]): number {
  let pairCount = 0;
  let uniqueCount = 0;

  for (let i = 0; i < 34; i++) {
    if (counts[i] > 0) {
      uniqueCount++;
    }
    if (counts[i] >= 2) {
      pairCount++;
    }
  }

  // Standard formula: 6 - pairCount
  // If we have less than 7 unique tiles, it means we have quads that cannot count as multiple pairs.
  // So the shanten is capped.
  let shanten = 6 - pairCount;
  
  // If we have fewer than 7 unique tiles, we need more unique tiles to make 7 distinct pairs.
  if (uniqueCount < 7) {
    shanten += (7 - uniqueCount);
  }

  return shanten;
}

// 3. Kokushi Musou (Thirteen Orphans) Shanten
function calculateKokushiShanten(counts: number[]): number {
  // Terminal and honor indexes in the 0-33 index space:
  // Manzu: 1 (0), 9 (8)
  // Pinzu: 1 (9), 9 (17)
  // Souzu: 1 (18), 9 (26)
  // Honors: East (27), South (28), West (29), North (30), White (31), Green (32), Red (33)
  const yaochuhaiIndices = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
  
  let uniqueYaochuCount = 0;
  let hasPair = 0;

  for (const idx of yaochuhaiIndices) {
    if (counts[idx] > 0) {
      uniqueYaochuCount++;
    }
    if (counts[idx] >= 2) {
      hasPair = 1;
    }
  }

  // Formula: 13 - uniqueYaochuCount - hasPair
  return 13 - uniqueYaochuCount - hasPair;
}
