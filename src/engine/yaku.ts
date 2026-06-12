import { Tile, Meld, SuitType } from './types';
import { tileToIndex, indexToSuitAndValue } from './shanten';
import { getDoraTarget } from './wall';

export interface YakuResult {
  yakuList: string[];
  han: number;          // Han from Yaku
  fu: number;
  isYakuman: boolean;
  yakumanMultiplier: number;
  doraCount: number;
  uraDoraCount: number;
  akaDoraCount: number;
  decomposition: HandDecomposition | null;
}

export interface HandMentsu {
  type: 'shunzu' | 'koutsu' | 'kantsu';
  tiles: Tile[];
  isOpen: boolean;      // True if Pon/Chi/Daiminkan/Kakan, or closed triplet completed by Ron
  isKan: boolean;       // True if Kantsu
}

export interface HandDecomposition {
  jantou: Tile[];
  mentsu: HandMentsu[];
}

// Check if two tiles are identical (same suit and value, ignoring ID and Red status)
function isSameTileType(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value;
}

// Convert a Meld to HandMentsu
function meldToMentsu(meld: Meld): HandMentsu {
  const isKan = meld.type === 'daiminkan' || meld.type === 'ankan' || meld.type === 'kakan';
  return {
    type: isKan ? 'kantsu' : (meld.type === 'chi' ? 'shunzu' : 'koutsu'),
    tiles: meld.tiles,
    isOpen: meld.type !== 'ankan',
    isKan,
  };
}

// Find all 4-mentsu-1-jantou decompositions of closed tiles
export function decomposeClosedHand(
  closedTiles: Tile[],
  openMelds: Meld[],
  winningTile: Tile,
  isTsumo: boolean
): HandDecomposition[] {
  const decompositions: HandDecomposition[] = [];
  const openMentsu = openMelds.map(meldToMentsu);

  // Convert closed tiles to a frequency count
  const counts = new Array(34).fill(0);
  for (const t of closedTiles) {
    counts[tileToIndex(t)]++;
  }

  // Decompose remaining closed tiles into Mentsu
  function search(idx: number, currentCounts: number[], currentMentsu: HandMentsu[], jantouTiles: Tile[]) {
    // Skip empty indices
    while (idx < 34 && currentCounts[idx] === 0) {
      idx++;
    }

    // Base case: all tiles partitioned
    if (idx === 34) {
      decompositions.push({
        jantou: jantouTiles,
        mentsu: [...openMentsu, ...currentMentsu],
      });
      return;
    }

    // Triplet (Koutsu)
    if (currentCounts[idx] >= 3) {
      currentCounts[idx] -= 3;
      const tInfo = indexToSuitAndValue(idx);
      // Collect matching tiles from closedTiles
      const matchedTiles = closedTiles.filter(t => t.suit === tInfo.suit && t.value === tInfo.value).slice(0, 3);
      
      // If Ron, check if this triplet contains the winning tile.
      // If it does, and is completed by Ron, this triplet is considered open (Minkou).
      const containsWin = matchedTiles.some(t => t.id === winningTile.id);
      const isMinkou = !isTsumo && containsWin;

      const newMentsu: HandMentsu = {
        type: 'koutsu',
        tiles: matchedTiles,
        isOpen: isMinkou,
        isKan: false,
      };

      search(idx, currentCounts, [...currentMentsu, newMentsu], jantouTiles);
      currentCounts[idx] += 3;
    }

    // Run (Shunzu)
    if (idx < 27) {
      const val = (idx % 9) + 1;
      if (val <= 7 && currentCounts[idx] >= 1 && currentCounts[idx + 1] >= 1 && currentCounts[idx + 2] >= 1) {
        currentCounts[idx]--;
        currentCounts[idx + 1]--;
        currentCounts[idx + 2]--;

        const t1Info = indexToSuitAndValue(idx);
        const t2Info = indexToSuitAndValue(idx + 1);
        const t3Info = indexToSuitAndValue(idx + 2);

        // Find concrete tiles
        const t1 = closedTiles.find(t => t.suit === t1Info.suit && t.value === t1Info.value && !currentMentsu.some(m => m.tiles.includes(t)) && !jantouTiles.includes(t));
        const t2 = closedTiles.find(t => t.suit === t2Info.suit && t.value === t2Info.value && !currentMentsu.some(m => m.tiles.includes(t)) && !jantouTiles.includes(t));
        const t3 = closedTiles.find(t => t.suit === t3Info.suit && t.value === t3Info.value && !currentMentsu.some(m => m.tiles.includes(t)) && !jantouTiles.includes(t));

        if (t1 && t2 && t3) {
          const newMentsu: HandMentsu = {
            type: 'shunzu',
            tiles: [t1, t2, t3],
            isOpen: false, // Closed run (even completed by Ron, its status as open/closed doesn't affect score calculations directly like triplets)
            isKan: false,
          };
          search(idx, currentCounts, [...currentMentsu, newMentsu], jantouTiles);
        }

        currentCounts[idx]++;
        currentCounts[idx + 1]++;
        currentCounts[idx + 2]++;
      }
    }
  }

  // Iterate over all possible Jantou (Pair) choices
  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 2) {
      counts[i] -= 2;
      const tInfo = indexToSuitAndValue(i);
      const jantouTiles = closedTiles.filter(t => t.suit === tInfo.suit && t.value === tInfo.value).slice(0, 2);
      search(0, counts, [], jantouTiles);
      counts[i] += 2;
    }
  }

  return decompositions;
}

export interface EvaluationParams {
  hand: Tile[];              // Private hand (including winning tile)
  melds: Meld[];             // Declared melds
  winningTile: Tile;         // The tile that completed the hand
  isTsumo: boolean;
  isDealer: boolean;
  isRiichi: boolean;
  isDoubleRiichi: boolean;
  isIppatsu: boolean;
  isHaitei: boolean;         // Tsumo on last tile
  isHoutei: boolean;         // Ron on last tile
  isRinshan: boolean;        // Tsumo on replacement tile
  isChankan: boolean;        // Ron on added Kan
  isTenhou: boolean;         // Dealer first-turn Tsumo
  isChiihou: boolean;        // Non-dealer first-turn Tsumo
  doraIndicators: Tile[];
  uraDoraIndicators: Tile[];
  seatWind: 'E' | 'S' | 'W' | 'N';
  roundWind: 'E' | 'S';
}

export function evaluateHand(params: EvaluationParams): YakuResult | null {
  const {
    hand,
    melds,
    winningTile,
    isTsumo,
    isRiichi,
    isDoubleRiichi,
    isIppatsu,
    isHaitei,
    isHoutei,
    isRinshan,
    isChankan,
    isTenhou,
    isChiihou,
    doraIndicators,
    uraDoraIndicators,
    seatWind,
    roundWind,
  } = params;

  // 1. Calculate Dora Counts
  let doraCount = 0;
  let uraDoraCount = 0;
  let akaDoraCount = 0;

  const allTiles = [...hand, ...melds.flatMap(m => m.tiles)];
  for (const tile of allTiles) {
    if (tile.isRed) akaDoraCount++;
    
    // Normal Dora
    for (const indicator of doraIndicators) {
      const target = getDoraTarget(indicator);
      if (tile.suit === target.suit && tile.value === target.value) {
        doraCount++;
      }
    }

    // Ura Dora (only if Riichi is active)
    if (isRiichi || isDoubleRiichi) {
      for (const indicator of uraDoraIndicators) {
        const target = getDoraTarget(indicator);
        if (tile.suit === target.suit && tile.value === target.value) {
          uraDoraCount++;
        }
      }
    }
  }

  const isMenzen = melds.every(m => m.type === 'ankan');

  // 2. Check Yakuman / Special Hands First
  // Kokushi Musou Check
  const kokushiYaku = checkKokushiMusou(hand, melds, winningTile);
  if (kokushiYaku) {
    const yakuList = [kokushiYaku];
    // Add Tenhou/Chiihou if applicable
    if (isTenhou) yakuList.push('天和');
    else if (isChiihou) yakuList.push('地和');

    const mult = yakuList.reduce((acc, y) => acc + (y === '国士無双十三面待ち' || y === '天和' || y === '地和' ? 2 : 1), 0) - (yakuList.includes('天和') || yakuList.includes('地和') ? 1 : 0);
    // Wait, Tenhou/Chiihou are Yakuman. If combined, they add up.
    let multiplier = 0;
    for (const y of yakuList) {
      if (y === '国士無双十三面待ち') multiplier += 2;
      else multiplier += 1;
    }

    return {
      yakuList,
      han: 13 * multiplier,
      fu: 30, // Kokushi is fixed to 30 Fu (or 40 Fu in some systems, standard is 30 Fu Ron, 20 Fu Tsumo or just fixed 30 Fu)
      isYakuman: true,
      yakumanMultiplier: multiplier,
      doraCount,
      uraDoraCount,
      akaDoraCount,
      decomposition: null,
    };
  }

  // Chiitoitsu Check
  const chiitoitsuYaku = checkChiitoitsu(hand, melds);
  let bestNormalResult: YakuResult | null = null;

  if (chiitoitsuYaku && isMenzen) {
    const yakuList: string[] = ['七対子'];
    let han = 2;

    if (isDoubleRiichi) { yakuList.push('ダブル立直'); han += 2; }
    else if (isRiichi) { yakuList.push('立直'); han += 1; }

    if (isIppatsu) { yakuList.push('一発'); han += 1; }
    if (isTsumo) { yakuList.push('門前清自摸和'); han += 1; }
    
    // Check other suit/honor Yaku compatible with Chiitoitsu
    // Tanyao, Honitsu, Chinitsu, Tsuuiisou (Yakuman)
    const counts = new Array(34).fill(0);
    for (const t of hand) counts[tileToIndex(t)]++;

    // Tanyao
    const hasTerminalsOrHonors = hand.some(t => t.suit === 'z' || t.value === 1 || t.value === 9);
    if (!hasTerminalsOrHonors) {
      yakuList.push('断么九');
      han += 1;
    }

    // Honitsu / Chinitsu / Tsuuiisou
    let hasHonors = false;
    const suitsPresent = new Set<string>();
    for (const t of hand) {
      if (t.suit === 'z') hasHonors = true;
      else suitsPresent.add(t.suit);
    }

    if (suitsPresent.size === 0 && hasHonors) {
      // Tsuuiisou (Yakuman)
      return {
        yakuList: ['字一色'],
        han: 13,
        fu: 25,
        isYakuman: true,
        yakumanMultiplier: 1,
        doraCount,
        uraDoraCount,
        akaDoraCount,
        decomposition: null,
      };
    } else if (suitsPresent.size === 1) {
      if (hasHonors) {
        yakuList.push('混一色');
        han += 3; // Chiitoitsu is closed, so Honitsu is 3 Han
      } else {
        yakuList.push('清一色');
        han += 6; // Closed Chinitsu is 6 Han
      }
    }

    // Haitei / Houtei
    if (isHaitei) { yakuList.push('海底摸月'); han += 1; }
    else if (isHoutei) { yakuList.push('河底撈魚'); han += 1; }

    // Tenhou / Chiihou
    if (isTenhou) {
      return {
        yakuList: ['天和'],
        han: 13,
        fu: 25,
        isYakuman: true,
        yakumanMultiplier: 1,
        doraCount,
        uraDoraCount,
        akaDoraCount,
        decomposition: null,
      };
    } else if (isChiihou) {
      return {
        yakuList: ['地和'],
        han: 13,
        fu: 25,
        isYakuman: true,
        yakumanMultiplier: 1,
        doraCount,
        uraDoraCount,
        akaDoraCount,
        decomposition: null,
      };
    }

    bestNormalResult = {
      yakuList,
      han,
      fu: 25, // Chiitoitsu is always fixed to 25 Fu
      isYakuman: false,
      yakumanMultiplier: 0,
      doraCount,
      uraDoraCount,
      akaDoraCount,
      decomposition: null,
    };
  }

  // 3. Find all normal decompositions and evaluate
  const decompositions = decomposeClosedHand(hand, melds, winningTile, isTsumo);
  
  for (const decomp of decompositions) {
    // Add winning tile back into the correct mentsu for evaluation
    // (This was already handled during the search; the decomp has all 14 tiles)
    const result = evaluateDecomposition(decomp, params, isMenzen, doraCount, uraDoraCount, akaDoraCount);
    if (result) {
      if (!bestNormalResult || compareResults(result, bestNormalResult) > 0) {
        bestNormalResult = result;
      }
    }
  }

  return bestNormalResult;
}

// Compare two evaluation results, return > 0 if a is better than b
function compareResults(a: YakuResult, b: YakuResult): number {
  if (a.isYakuman && !b.isYakuman) return 1;
  if (!a.isYakuman && b.isYakuman) return -1;
  if (a.isYakuman && b.isYakuman) {
    return a.yakumanMultiplier - b.yakumanMultiplier;
  }
  
  // Calculate total Han including Dora for comparison, but only if they have at least 1 Yaku
  const aHasYaku = a.yakuList.length > 0;
  const bHasYaku = b.yakuList.length > 0;
  if (aHasYaku && !bHasYaku) return 1;
  if (!aHasYaku && bHasYaku) return -1;
  if (!aHasYaku && !bHasYaku) return 0;

  const aTotalHan = a.han + a.doraCount + a.uraDoraCount + a.akaDoraCount;
  const bTotalHan = b.han + b.doraCount + b.uraDoraCount + b.akaDoraCount;

  if (aTotalHan !== bTotalHan) {
    return aTotalHan - bTotalHan;
  }
  
  // If Han is equal, higher Fu is better
  return a.fu - b.fu;
}

function checkKokushiMusou(hand: Tile[], melds: Meld[], winningTile: Tile): string | null {
  if (melds.length > 0) return null;
  const counts = new Array(34).fill(0);
  for (const t of hand) counts[tileToIndex(t)]++;

  const yaochuhaiIndices = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
  let uniqueCount = 0;
  let pairIndex = -1;

  for (const idx of yaochuhaiIndices) {
    if (counts[idx] > 0) uniqueCount++;
    if (counts[idx] === 2) pairIndex = idx;
    if (counts[idx] > 2) return null; // Can't have triples/quads
  }

  if (uniqueCount === 13 && pairIndex !== -1) {
    // Check wait type:
    // If the winning tile completed the pair, it means before drawing the winning tile,
    // the hand had 13 unique terminals/honors. This is a 13-way wait (Double Yakuman).
    const winIdx = tileToIndex(winningTile);
    if (winIdx === pairIndex && counts[winIdx] === 2) {
      // Let's verify: if we remove the winning tile, do we still have 13 unique tiles?
      counts[winIdx]--;
      let uniqueBefore = 0;
      for (const idx of yaochuhaiIndices) {
        if (counts[idx] > 0) uniqueBefore++;
      }
      counts[winIdx]++;
      if (uniqueBefore === 13) {
        return '国士無双十三面待ち';
      }
    }
    return '国士無双';
  }
  return null;
}

function checkChiitoitsu(hand: Tile[], melds: Meld[]): boolean {
  if (melds.length > 0) return false;
  if (hand.length !== 14) return false;
  
  const counts = new Array(34).fill(0);
  for (const t of hand) counts[tileToIndex(t)]++;

  let pairs = 0;
  for (let i = 0; i < 34; i++) {
    if (counts[i] === 2) pairs++;
    if (counts[i] !== 0 && counts[i] !== 2) return false; // Must be exactly pairs, no singles/triples/quads
  }

  return pairs === 7;
}

// Evaluate Yaku and Fu for a single decomposition
function evaluateDecomposition(
  decomp: HandDecomposition,
  params: EvaluationParams,
  isMenzen: boolean,
  doraCount: number,
  uraDoraCount: number,
  akaDoraCount: number
): YakuResult | null {
  const {
    winningTile,
    isTsumo,
    isRiichi,
    isDoubleRiichi,
    isIppatsu,
    isHaitei,
    isHoutei,
    isRinshan,
    isChankan,
    isTenhou,
    isChiihou,
    seatWind,
    roundWind,
  } = params;

  const yakuList: string[] = [];
  const yakumanList: string[] = [];

  // Map representation of wind characters to numeric values
  const windValues = { E: 1, S: 2, W: 3, N: 4 };
  const seatWindVal = windValues[seatWind];
  const roundWindVal = windValues[roundWind];

  // --- YAKUMAN CHECKS ---
  // 1. Suuankou (四暗刻)
  let closedTriplets = 0;
  for (const m of decomp.mentsu) {
    if ((m.type === 'koutsu' || m.type === 'kantsu') && !m.isOpen) {
      closedTriplets++;
    }
  }
  
  if (closedTriplets === 4) {
    // If Shanpon wait and won by Ron, the winning Mentsu becomes open (handled in decomposeClosedHand).
    // If it becomes open, closedTriplets will be 3, so it won't hit here.
    // If it remains 4:
    // Case A: Won on Jantou (Tanki wait). The winning tile is in the Jantou.
    // This is Suuankou Tanki (Double Yakuman).
    const isTanki = decomp.jantou.some(t => t.id === winningTile.id);
    if (isTanki) {
      yakumanList.push('四暗刻単騎');
    } else {
      yakumanList.push('四暗刻');
    }
  }

  // 2. Daisangen (大三元)
  let dragonTriplets = 0;
  for (const m of decomp.mentsu) {
    if ((m.type === 'koutsu' || m.type === 'kantsu') && m.tiles[0].suit === 'z' && m.tiles[0].value >= 5) {
      dragonTriplets++;
    }
  }
  if (dragonTriplets === 3) {
    yakumanList.push('大三元');
  }

  // 3. Tsuuiisou (字一色)
  const isAllHonors = decomp.jantou[0].suit === 'z' && decomp.mentsu.every(m => m.tiles[0].suit === 'z');
  if (isAllHonors) {
    yakumanList.push('字一色');
  }

  // 4. Chinroutou (清老頭)
  const isTerminalTile = (t: Tile) => t.suit !== 'z' && (t.value === 1 || t.value === 9);
  const isAllTerminals = isTerminalTile(decomp.jantou[0]) && decomp.mentsu.every(m => m.type !== 'shunzu' && isTerminalTile(m.tiles[0]));
  if (isAllTerminals) {
    yakumanList.push('清老頭');
  }

  // 5. Ryuuiisou (緑一色)
  // Green tiles: 2s, 3s, 4s, 6s, 8s, and Hatsu (z6)
  const isGreenTile = (t: Tile) => (t.suit === 's' && [2, 3, 4, 6, 8].includes(t.value)) || (t.suit === 'z' && t.value === 6);
  const isAllGreen = isGreenTile(decomp.jantou[0]) && decomp.jantou[1].isRed === false && decomp.mentsu.every(m => m.tiles.every(t => isGreenTile(t) && !t.isRed));
  if (isAllGreen) {
    yakumanList.push('緑一色');
  }

  // 6. Shousuushii / Daisuushii (小四喜 / 大四喜)
  let windTriplets = 0;
  let hasWindJantou = false;
  for (const m of decomp.mentsu) {
    if ((m.type === 'koutsu' || m.type === 'kantsu') && m.tiles[0].suit === 'z' && m.tiles[0].value <= 4) {
      windTriplets++;
    }
  }
  if (decomp.jantou[0].suit === 'z' && decomp.jantou[0].value <= 4) {
    hasWindJantou = true;
  }

  if (windTriplets === 4) {
    yakumanList.push('大四喜');
  } else if (windTriplets === 3 && hasWindJantou) {
    yakumanList.push('小四喜');
  }

  // 7. Suukantsu (四槓子)
  let kanCount = 0;
  for (const m of decomp.mentsu) {
    if (m.isKan) kanCount++;
  }
  if (kanCount === 4) {
    yakumanList.push('四槓子');
  }

  // 8. Chuuren Poutou (九蓮宝燈)
  if (isMenzen && yakumanList.length === 0) {
    const chuurenSuit = checkChuurenPoutou(decomp, winningTile);
    if (chuurenSuit) {
      yakumanList.push(chuurenSuit);
    }
  }

  // 9. Tenhou / Chiihou
  if (isTenhou) {
    yakumanList.push('天和');
  } else if (isChiihou) {
    yakumanList.push('地和');
  }

  if (yakumanList.length > 0) {
    let multiplier = 0;
    for (const y of yakumanList) {
      if (y === '大四喜' || y === '純正九蓮宝燈' || y === '四暗刻単騎') {
        multiplier += 2;
      } else {
        multiplier += 1;
      }
    }

    return {
      yakuList: yakumanList,
      han: 13 * multiplier,
      fu: 30, // Capped Fu for Yakuman
      isYakuman: true,
      yakumanMultiplier: multiplier,
      doraCount,
      uraDoraCount,
      akaDoraCount,
      decomposition: decomp,
    };
  }

  // --- NORMAL YAKU CHECKS ---
  // 1. Riichi / Double Riichi
  if (isDoubleRiichi) yakuList.push('ダブル立直');
  else if (isRiichi) yakuList.push('立直');

  // 2. Ippatsu
  if (isIppatsu) yakuList.push('一発');

  // 3. Tsumo
  if (isMenzen && isTsumo) yakuList.push('門前清自摸和');

  // 4. Tanyao
  const hasYaochuhai = decomp.jantou.some(t => t.suit === 'z' || t.value === 1 || t.value === 9) ||
    decomp.mentsu.some(m => m.tiles.some(t => t.suit === 'z' || t.value === 1 || t.value === 9));
  if (!hasYaochuhai) {
    yakuList.push('断么九');
  }

  // 5. Pinfu
  const isPinfu = checkPinfu(decomp, isMenzen, seatWindVal, roundWindVal, winningTile);
  if (isPinfu) {
    yakuList.push('平和');
  }

  // 6. Iipeiko / Ryanpeiko
  if (isMenzen) {
    const identicalRunGroups = findIdenticalRuns(decomp.mentsu);
    if (identicalRunGroups === 2) {
      yakuList.push('二盃口');
    } else if (identicalRunGroups === 1) {
      yakuList.push('一盃口');
    }
  }

  // 7. Yakuhai (役牌)
  for (const m of decomp.mentsu) {
    if (m.type === 'koutsu' || m.type === 'kantsu') {
      const tile = m.tiles[0];
      if (tile.suit === 'z') {
        if (tile.value === 5) yakuList.push('役牌 白');
        if (tile.value === 6) yakuList.push('役牌 發');
        if (tile.value === 7) yakuList.push('役牌 中');
        if (tile.value === seatWindVal) {
          yakuList.push('自風 ' + (seatWind === 'E' ? '東' : seatWind === 'S' ? '南' : seatWind === 'W' ? '西' : '北'));
        }
        if (tile.value === roundWindVal) {
          yakuList.push('場風 ' + (roundWind === 'E' ? '東' : '南'));
        }
      }
    }
  }

  // 8. Sanshoku Doujun (三色同順)
  if (checkSanshokuDoujun(decomp.mentsu)) {
    yakuList.push('三色同順');
  }

  // 9. Ikkitsuukan (一気通貫)
  if (checkIkkitsuukan(decomp.mentsu)) {
    yakuList.push('一気通貫');
  }

  // 10. Chanta / Junchan / Honroutou
  const terminalTypes = decomp.mentsu.map(m => {
    return {
      hasTerminal: m.tiles.some(t => t.value === 1 || t.value === 9),
      hasHonor: m.tiles.some(t => t.suit === 'z'),
      isRun: m.type === 'shunzu',
    };
  });
  const jantouHasTerminal = decomp.jantou.some(t => t.value === 1 || t.value === 9);
  const jantouHasHonor = decomp.jantou.some(t => t.suit === 'z');

  const allSetsHaveYaochu = (jantouHasTerminal || jantouHasHonor) && terminalTypes.every(t => t.hasTerminal || t.hasHonor);
  const hasRuns = terminalTypes.some(t => t.isRun);

  if (allSetsHaveYaochu) {
    const hasAnyHonor = jantouHasHonor || terminalTypes.some(t => t.hasHonor);
    if (hasAnyHonor) {
      if (hasRuns) {
        yakuList.push('混全帯么九'); // Chanta
      } else {
        yakuList.push('混老頭'); // Honroutou
      }
    } else {
      if (hasRuns) {
        yakuList.push('純全帯么九'); // Junchan
      }
    }
  }

  // 11. Toitoi (対々和)
  const tripletCount = decomp.mentsu.filter(m => m.type === 'koutsu' || m.type === 'kantsu').length;
  if (tripletCount === 4) {
    yakuList.push('対々和');
  }

  // 12. Sanankou (三暗刻)
  if (closedTriplets === 3) {
    yakuList.push('三暗刻');
  }

  // 13. Sanshoku Doukou (三色同刻)
  if (checkSanshokuDoukou(decomp.mentsu)) {
    yakuList.push('三色同刻');
  }

  // 14. Sankantsu (三槓子)
  if (kanCount === 3) {
    yakuList.push('三槓子');
  }

  // 15. Shousangen (小三元)
  let dragonTripletsCount = 0;
  let hasDragonJantou = false;
  for (const m of decomp.mentsu) {
    if ((m.type === 'koutsu' || m.type === 'kantsu') && m.tiles[0].suit === 'z' && m.tiles[0].value >= 5) {
      dragonTripletsCount++;
    }
  }
  if (decomp.jantou[0].suit === 'z' && decomp.jantou[0].value >= 5) {
    hasDragonJantou = true;
  }
  if (dragonTripletsCount === 2 && hasDragonJantou) {
    yakuList.push('小三元');
  }

  // 16. Honitsu / Chinitsu
  let hasHonorsInHand = decomp.jantou[0].suit === 'z' || decomp.mentsu.some(m => m.tiles[0].suit === 'z');
  const suitsPresentInHand = new Set<SuitType>();
  if (decomp.jantou[0].suit !== 'z') suitsPresentInHand.add(decomp.jantou[0].suit);
  for (const m of decomp.mentsu) {
    if (m.tiles[0].suit !== 'z') {
      suitsPresentInHand.add(m.tiles[0].suit);
    }
  }

  if (suitsPresentInHand.size === 1) {
    if (hasHonorsInHand) {
      yakuList.push('混一色');
    } else {
      yakuList.push('清一色');
    }
  }

  // 17. Haitei / Houtei / Rinshan / Chankan
  if (isHaitei) yakuList.push('海底摸月');
  else if (isHoutei) yakuList.push('河底撈魚');
  else if (isRinshan) yakuList.push('嶺上開花');
  else if (isChankan) yakuList.push('槍槓');

  // --- CALCULATE HAN ---
  if (yakuList.length === 0) {
    return null; // No Yaku = cannot win (No Yaku Agari)
  }

  // Point mapping for Yaku (Closed Han, Open Han)
  const yakuPoints: { [key: string]: [number, number] } = {
    '立直': [1, 0],
    'ダブル立直': [2, 0],
    '一発': [1, 0],
    '門前清自摸和': [1, 0],
    '断么九': [1, 1],
    '平和': [1, 0],
    '一盃口': [1, 0],
    '二盃口': [3, 0],
    '役牌 白': [1, 1],
    '役牌 發': [1, 1],
    '役牌 中': [1, 1],
    '自風 東': [1, 1], '自風 南': [1, 1], '自風 西': [1, 1], '自風 北': [1, 1],
    '場風 東': [1, 1], '場風 南': [1, 1],
    '三色同順': [2, 1],
    '一気通貫': [2, 1],
    '混全帯么九': [2, 1],
    '対々和': [2, 2],
    '三暗刻': [2, 2],
    '三色同刻': [2, 2],
    '三槓子': [2, 2],
    '小三元': [2, 2],
    '混老頭': [2, 2],
    '純全帯么九': [3, 2],
    '混一色': [3, 2],
    '清一色': [6, 5],
    '海底摸月': [1, 1],
    '河底撈魚': [1, 1],
    '嶺上開花': [1, 1],
    '槍槓': [1, 1],
  };

  let han = 0;
  for (const y of yakuList) {
    const pts = yakuPoints[y];
    if (pts) {
      han += isMenzen ? pts[0] : pts[1];
    }
  }

  if (han === 0) {
    return null; // Can happen if open hand but all declared Yaku are closed-only
  }

  // --- FU CALCULATION ---
  const fu = calculateFu(decomp, isTsumo, isMenzen, isPinfu, seatWindVal, roundWindVal, winningTile);

  return {
    yakuList,
    han,
    fu,
    isYakuman: false,
    yakumanMultiplier: 0,
    doraCount,
    uraDoraCount,
    akaDoraCount,
    decomposition: decomp,
  };
}

// Check Pinfu eligibility
function checkPinfu(
  decomp: HandDecomposition,
  isMenzen: boolean,
  seatWindVal: number,
  roundWindVal: number,
  winningTile: Tile
): boolean {
  if (!isMenzen) return false;
  
  // All sets must be runs (Shunzu)
  const allRuns = decomp.mentsu.every(m => m.type === 'shunzu');
  if (!allRuns) return false;

  // Jantou must not be a valued wind or dragon
  const jantouTile = decomp.jantou[0];
  if (jantouTile.suit === 'z') {
    if (jantouTile.value >= 5) return false; // Dragon
    if (jantouTile.value === seatWindVal) return false; // Seat wind
    if (jantouTile.value === roundWindVal) return false; // Round wind
  }

  // Must be a two-sided wait (Ryanmen)
  // Check if there is at least one run where the winning tile fits a Ryanmen wait
  let hasRyanmen = false;
  for (const m of decomp.mentsu) {
    const sortedVals = m.tiles.map(t => t.value).sort((a, b) => a - b);
    const hasWin = m.tiles.some(t => t.id === winningTile.id);
    if (hasWin) {
      // It's a run: sortedVals are like [a, a+1, a+2]
      const winVal = winningTile.value;
      if (winVal === sortedVals[0]) {
        // e.g. winning is 4 in 4-5-6. The wait was 5-6 (waiting for 4 or 7).
        // Since 7 is <= 9, it's a Ryanmen wait.
        if (sortedVals[2] <= 8) { // If 6 is <= 8, then max wait would be 7, which is <= 9.
          hasRyanmen = true;
        }
      } else if (winVal === sortedVals[2]) {
        // e.g. winning is 6 in 4-5-6. The wait was 4-5 (waiting for 3 or 6).
        // Since 3 is >= 1, it's a Ryanmen wait.
        if (sortedVals[0] >= 2) { // If 4 is >= 2, then min wait would be 3, which is >= 1.
          hasRyanmen = true;
        }
      }
    }
  }

  return hasRyanmen;
}

// Count number of identical runs (e.g. 123m and 123m)
function findIdenticalRuns(mentsu: HandMentsu[]): number {
  const runs = mentsu.filter(m => m.type === 'shunzu');
  let pairCount = 0;
  const used = new Array(runs.length).fill(false);

  for (let i = 0; i < runs.length; i++) {
    if (used[i]) continue;
    for (let j = i + 1; j < runs.length; j++) {
      if (used[j]) continue;
      
      const r1 = runs[i].tiles.map(t => t.value).sort((a,b)=>a-b);
      const r2 = runs[j].tiles.map(t => t.value).sort((a,b)=>a-b);
      const sameSuit = runs[i].tiles[0].suit === runs[j].tiles[0].suit;
      const sameVals = r1[0] === r2[0] && r1[1] === r2[1] && r1[2] === r2[2];
      
      if (sameSuit && sameVals) {
        pairCount++;
        used[i] = true;
        used[j] = true;
        break;
      }
    }
  }
  return pairCount;
}

// Check Sanshoku Doujun (Runs of same numbers in all 3 suits)
function checkSanshokuDoujun(mentsu: HandMentsu[]): boolean {
  const runs = mentsu.filter(m => m.type === 'shunzu');
  for (const r of runs) {
    const val = r.tiles.map(t => t.value).sort((a,b)=>a-b)[0];
    // Check if we have runs starting with `val` in Pinzu and Souzu if this is Manzu, etc.
    const suits = new Set<SuitType>();
    for (const other of runs) {
      const otherVal = other.tiles.map(t => t.value).sort((a,b)=>a-b)[0];
      if (otherVal === val) {
        suits.add(other.tiles[0].suit);
      }
    }
    if (suits.has('m') && suits.has('p') && suits.has('s')) {
      return true;
    }
  }
  return false;
}

// Check Ikkitsuukan (1-9 in one suit)
function checkIkkitsuukan(mentsu: HandMentsu[]): boolean {
  const runs = mentsu.filter(m => m.type === 'shunzu');
  const suits: SuitType[] = ['m', 'p', 's'];
  for (const s of suits) {
    let has123 = false;
    let has456 = false;
    let has789 = false;
    for (const r of runs) {
      if (r.tiles[0].suit === s) {
        const sortedVals = r.tiles.map(t => t.value).sort((a,b)=>a-b);
        if (sortedVals[0] === 1) has123 = true;
        if (sortedVals[0] === 4) has456 = true;
        if (sortedVals[0] === 7) has789 = true;
      }
    }
    if (has123 && has456 && has789) {
      return true;
    }
  }
  return false;
}

// Check Sanshoku Doukou (Triplets of same numbers in all 3 suits)
function checkSanshokuDoukou(mentsu: HandMentsu[]): boolean {
  const triplets = mentsu.filter(m => m.type === 'koutsu' || m.type === 'kantsu');
  for (const t of triplets) {
    const val = t.tiles[0].value;
    const suit = t.tiles[0].suit;
    if (suit === 'z') continue;

    const suits = new Set<SuitType>();
    for (const other of triplets) {
      if (other.tiles[0].value === val && other.tiles[0].suit !== 'z') {
        suits.add(other.tiles[0].suit);
      }
    }
    if (suits.has('m') && suits.has('p') && suits.has('s')) {
      return true;
    }
  }
  return false;
}

// Check Chuuren Poutou (九蓮宝燈)
function checkChuurenPoutou(decomp: HandDecomposition, winningTile: Tile): string | null {
  // Must be single suit
  const suit = decomp.jantou[0].suit;
  if (suit === 'z') return null;
  const isSingleSuit = decomp.mentsu.every(m => m.tiles.every(t => t.suit === suit));
  if (!isSingleSuit) return null;

  // Hand counts for that suit
  const counts = new Array(10).fill(0); // 1-indexed values
  for (const t of decomp.jantou) counts[t.value]++;
  for (const m of decomp.mentsu) {
    for (const t of m.tiles) counts[t.value]++;
  }

  // Pure Chuuren template: 1112345678999
  const required = [0, 3, 1, 1, 1, 1, 1, 1, 1, 3];
  let extraTileVal = -1;

  for (let i = 1; i <= 9; i++) {
    if (counts[i] < required[i]) return null;
    if (counts[i] === required[i] + 1) {
      extraTileVal = i;
    }
  }

  if (extraTileVal !== -1) {
    // Check wait type:
    // If the winning tile is the extra tile that completed the `1112345678999` pattern,
    // wait is 9-way (純正) if before winning we had exactly 1112345678999.
    // That means the winning tile matches the extra tile, but the hand was waiting on any of 1-9.
    if (winningTile.value === extraTileVal) {
      counts[winningTile.value]--;
      let hasTemplate = true;
      for (let i = 1; i <= 9; i++) {
        if (counts[i] !== required[i]) hasTemplate = false;
      }
      counts[winningTile.value]++;
      if (hasTemplate) {
        return '純正九蓮宝燈';
      }
    }
    return '九蓮宝燈';
  }

  return null;
}

// Calculate Fu
function calculateFu(
  decomp: HandDecomposition,
  isTsumo: boolean,
  isMenzen: boolean,
  isPinfu: boolean,
  seatWindVal: number,
  roundWindVal: number,
  winningTile: Tile
): number {
  // Pinfu Tsumo is always exactly 20 Fu
  if (isPinfu && isTsumo) {
    return 20;
  }

  // Base Fu
  let fu = 20;
  if (!isTsumo && isMenzen) {
    // Closed Ron gets 30 Fu base
    fu = 30;
  }

  // 1. Fu for Melds
  for (const m of decomp.mentsu) {
    if (m.type === 'shunzu') continue;

    const isYaochu = m.tiles[0].suit === 'z' || m.tiles[0].value === 1 || m.tiles[0].value === 9;
    let setFu = 0;

    if (m.type === 'koutsu') {
      if (m.isOpen) {
        setFu = isYaochu ? 4 : 2;
      } else {
        setFu = isYaochu ? 8 : 4;
      }
    } else if (m.type === 'kantsu') {
      if (m.isOpen) {
        setFu = isYaochu ? 16 : 8;
      } else {
        setFu = isYaochu ? 32 : 16;
      }
    }
    fu += setFu;
  }

  // 2. Fu for Jantou (Pair)
  const jantouTile = decomp.jantou[0];
  if (jantouTile.suit === 'z') {
    if (jantouTile.value >= 5) {
      fu += 2; // Dragon
    }
    if (jantouTile.value === seatWindVal) {
      fu += 2; // Seat wind
    }
    if (jantouTile.value === roundWindVal) {
      fu += 2; // Round wind
    }
  }

  // 3. Fu for Wait Type (Machi)
  // We check if the winning tile is completing a center (Kanchan), edge (Penchan), or pair (Tanki) wait.
  let waitFu = 0;
  
  // Tanki wait check (winning tile is in the Jantou)
  const isTanki = decomp.jantou.some(t => t.id === winningTile.id);
  if (isTanki) {
    waitFu = 2;
  } else {
    // Check Mentsu that contains the winning tile
    for (const m of decomp.mentsu) {
      if (m.type === 'shunzu' && m.tiles.some(t => t.id === winningTile.id)) {
        const sortedVals = m.tiles.map(t => t.value).sort((a,b)=>a-b);
        const winVal = winningTile.value;
        
        // Kanchan wait (e.g. winning is 5 in 4-5-6)
        if (winVal === sortedVals[1]) {
          waitFu = 2;
          break;
        }
        
        // Penchan wait (e.g. winning is 3 in 1-2-3 or 7 in 7-8-9)
        if (winVal === 3 && sortedVals[0] === 1 && sortedVals[2] === 3) {
          waitFu = 2;
          break;
        }
        if (winVal === 7 && sortedVals[0] === 7 && sortedVals[2] === 9) {
          waitFu = 2;
          break;
        }
      }
    }
  }
  fu += waitFu;

  // 4. Fu for Tsumo
  if (isTsumo && !isPinfu) {
    fu += 2;
  }

  // 5. Open Ron Pinfu-like hand: Kui-pinfu is 30 Fu minimum, round up to 30.
  // Actually, standard is: round up to nearest 10 Fu.
  if (fu === 20 && !isTsumo && !isMenzen) {
    return 30; // Open Ron minimum 30 Fu
  }

  // Round up to nearest 10
  return Math.ceil(fu / 10) * 10;
}
