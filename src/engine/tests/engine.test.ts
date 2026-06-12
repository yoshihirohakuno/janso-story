import { describe, it, expect } from 'vitest';
import { calculateShanten } from '../shanten';
import { evaluateHand, EvaluationParams } from '../yaku';
import { calculatePoints } from '../scoring';
import { Tile } from '../types';
import { initGame, advanceRound } from '../game';

// Helper to make a Tile list from a simplified string notation
// e.g. "123m 456p 789s E E E S S"
function makeTiles(tileStr: string): Tile[] {
  const parts = tileStr.split(/\s+/);
  const tiles: Tile[] = [];
  let id = 0;
  
  for (const part of parts) {
    if (!part) continue;
    
    // Check for Wind/Dragon abbreviations
    // E=East (z1), S=South (z2), W=West (z3), N=North (z4)
    // Haku=White (z5), Hatsu=Green (z6), Chun=Red (z7)
    if (['E', 'S', 'W', 'N', 'Haku', 'Hatsu', 'Chun'].includes(part)) {
      let value = 1;
      if (part === 'E') value = 1;
      else if (part === 'S') value = 2;
      else if (part === 'W') value = 3;
      else if (part === 'N') value = 4;
      else if (part === 'Haku') value = 5;
      else if (part === 'Hatsu') value = 6;
      else if (part === 'Chun') value = 7;
      
      tiles.push({ id, suit: 'z', value, isRed: false });
      id++;
      continue;
    }

    // Number suit tiles like "123m" or "5mr" (red 5m)
    const match = part.match(/^([1-9]+)([mps])(r?)$/);
    if (match) {
      const vals = match[1];
      const suit = match[2] as 'm' | 'p' | 's';
      const isRedTotal = match[3] === 'r';
      
      for (let i = 0; i < vals.length; i++) {
        const val = parseInt(vals[i]);
        // If it says "r" and it's 5, make it red. For multi-digits like 55mr, make first one red.
        const isRed = isRedTotal && val === 5 && i === 0;
        tiles.push({
          id,
          suit,
          value: val,
          isRed,
        });
        id++;
      }
    }
  }

  return tiles;
}

describe('Mahjong Shanten Calculator', () => {
  it('should calculate Kokushi Musou complete hand (-1 shanten)', () => {
    const hand = makeTiles('1m 9m 1p 9p 1s 9s E S W N Haku Hatsu Chun Chun');
    expect(calculateShanten(hand, 0)).toBe(-1);
  });

  it('should calculate Kokushi Musou Tenpai (0 shanten)', () => {
    const hand = makeTiles('1m 9m 1p 9p 1s 9s E S W N Haku Hatsu Chun'); // 13 unique, 13-way wait
    expect(calculateShanten(hand, 0)).toBe(0);
  });

  it('should calculate Chiitoitsu complete hand (-1 shanten)', () => {
    const hand = makeTiles('11m 22p 33s 44s 55s 66s 77s');
    expect(calculateShanten(hand, 0)).toBe(-1);
  });

  it('should calculate normal complete hand (-1 shanten)', () => {
    // 4 sets (123m, 456p, 789s, EEE) + 1 pair (SS)
    const hand = makeTiles('123m 456p 789s E E E S S');
    expect(calculateShanten(hand, 0)).toBe(-1);
  });

  it('should calculate normal Tenpai hand (0 shanten)', () => {
    // Waiting for 3m (holding 12m)
    const hand = makeTiles('12m 456p 789s E E E S S');
    expect(calculateShanten(hand, 0)).toBe(0);
  });
});

describe('Mahjong Yaku Evaluator', () => {
  it('should detect Tanyao + Pinfu + Tsumo', () => {
    // Closed hand, all runs, no terminals/honors, Ryanmen wait on 4s (holding 23s)
    const hand = makeTiles('234m 567m 234p 23s 88s');
    const winningTile: Tile = { id: 99, suit: 's', value: 4, isRed: false }; // completes 234s
    
    // Add winning tile to hand for evaluation
    const evalParams: EvaluationParams = {
      hand: [...hand, winningTile],
      melds: [],
      winningTile,
      isTsumo: true,
      isDealer: false,
      isRiichi: false,
      isDoubleRiichi: false,
      isIppatsu: false,
      isHaitei: false,
      isHoutei: false,
      isRinshan: false,
      isChankan: false,
      isTenhou: false,
      isChiihou: false,
      doraIndicators: [makeTiles('9m')[0]], // 9m indicator -> 1m target (0 dora)
      uraDoraIndicators: [],
      seatWind: 'S',
      roundWind: 'E',
    };

    const res = evaluateHand(evalParams);
    expect(res).not.toBeNull();
    expect(res!.yakuList).toContain('平和');
    expect(res!.yakuList).toContain('断么九');
    expect(res!.yakuList).toContain('門前清自摸和');
    // Also contains Sanshoku Doujun (234m, 234p, 234s) -> total 5 Han!
    expect(res!.han).toBe(5); // Pinfu (1) + Tanyao (1) + Tsumo (1) + Sanshoku (2)
    expect(res!.fu).toBe(20); // Pinfu Tsumo is exactly 20 Fu
  });

  it('should detect Ryanpeiko', () => {
    // 223344m 556677s 88p -> two identical runs in Manzu, two in Souzu, and 8p pair
    const hand = makeTiles('223344m 55667s 88p');
    const winningTile: Tile = { id: 99, suit: 's', value: 7, isRed: false }; // completes 556677s
    
    const evalParams: EvaluationParams = {
      hand: [...hand, winningTile],
      melds: [],
      winningTile,
      isTsumo: true,
      isDealer: false,
      isRiichi: false,
      isDoubleRiichi: false,
      isIppatsu: false,
      isHaitei: false,
      isHoutei: false,
      isRinshan: false,
      isChankan: false,
      isTenhou: false,
      isChiihou: false,
      doraIndicators: [makeTiles('9m')[0]],
      uraDoraIndicators: [],
      seatWind: 'S',
      roundWind: 'E',
    };

    const res = evaluateHand(evalParams);
    expect(res).not.toBeNull();
    expect(res!.yakuList).toContain('二盃口');
    expect(res!.yakuList).not.toContain('一盃口'); // Ryanpeiko overrides Iipeiko
    // Also contains Tanyao (1) + Pinfu (1) + Tsumo (1) + Ryanpeiko (3) -> total 6 Han!
    expect(res!.han).toBe(6); 
  });

  it('should detect Daisangen Yakuman', () => {
    // Haku triplet, Hatsu triplet, Chun triplet, 123m, EE wind pair
    const hand = makeTiles('E E 123m Haku Haku Haku Hatsu Hatsu Hatsu Chun Chun');
    const winningTile: Tile = { id: 99, suit: 'z', value: 7, isRed: false }; // completes Chun triplet
    
    const evalParams: EvaluationParams = {
      hand: [...hand, winningTile],
      melds: [],
      winningTile,
      isTsumo: true,
      isDealer: false,
      isRiichi: false,
      isDoubleRiichi: false,
      isIppatsu: false,
      isHaitei: false,
      isHoutei: false,
      isRinshan: false,
      isChankan: false,
      isTenhou: false,
      isChiihou: false,
      doraIndicators: [makeTiles('9m')[0]],
      uraDoraIndicators: [],
      seatWind: 'S',
      roundWind: 'E',
    };

    const res = evaluateHand(evalParams);
    expect(res).not.toBeNull();
    expect(res!.isYakuman).toBe(true);
    expect(res!.yakuList).toContain('大三元');
  });
});

describe('Mahjong Scoring Distributor', () => {
  it('should calculate normal non-mangan hand points (3 Han 40 Fu Dealer Ron)', () => {
    const mockYakuResult = {
      yakuList: ['対々和', '役牌 白'],
      han: 3, // Toitoi (2) + Yakuhai (1)
      fu: 40,
      isYakuman: false,
      yakumanMultiplier: 0,
      doraCount: 0,
      akaDoraCount: 0,
      uraDoraCount: 0,
      decomposition: null,
    };

    // basicPoints = 40 * 2^(3+2) = 40 * 32 = 1280
    // Dealer Ron = roundUp100(1280 * 6) = roundUp100(7680) = 7700
    const pointsData = calculatePoints({
      yakuResult: mockYakuResult,
      isDealer: true,
      isTsumo: false,
      honba: 0,
      kyoutaku: 0,
      useKiriMangan: false,
    });

    expect(pointsData.points).toBe(7700);
    expect(pointsData.baseScoreName).toBe('40符3翻');
  });

  it('should apply Kiri-Mangan if enabled (4 Han 30 Fu Child Tsumo)', () => {
    const mockYakuResult = {
      yakuList: ['立直', '断么九', '平和', '門前清自摸和'],
      han: 4,
      fu: 20, // Pinfu Tsumo is 20 fu. Let's make it 30 fu by using some other hand
      isYakuman: false,
      yakumanMultiplier: 0,
      doraCount: 0,
      akaDoraCount: 0,
      uraDoraCount: 0,
      decomposition: null,
    };
    
    // Modify to 30 Fu 4 Han
    const yakuWith30Fu = { ...mockYakuResult, fu: 30 };

    // With Kiri-Mangan, 30 Fu 4 Han becomes Mangan (8000 points total, Dealer pays 4000, Children pay 2000)
    const pointsData = calculatePoints({
      yakuResult: yakuWith30Fu,
      isDealer: false,
      isTsumo: true,
      honba: 0,
      kyoutaku: 0,
      useKiriMangan: true,
    });

    expect(pointsData.points).toBe(8000);
    expect(pointsData.baseScoreName).toBe('満貫');
  });
});

describe('Mahjong Round Advancement', () => {
  it('should advance from East 1 to East 2 when child wins', () => {
    const state = initGame();
    // Simulate game state just finished with player 1 (child) winning
    state.turnPhase = 'agari';
    state.winnerIndices = [1];
    state.dealerIndex = 0;
    state.wind = 'E';
    state.roundNumber = 1;
    state.honba = 0;

    const nextState = advanceRound(state);
    expect(nextState.wind).toBe('E');
    expect(nextState.roundNumber).toBe(2);
    expect(nextState.dealerIndex).toBe(1);
  });

  it('should repeat East 1 (renchan) when dealer wins', () => {
    const state = initGame();
    // Simulate dealer (player 0) winning
    state.turnPhase = 'agari';
    state.winnerIndices = [0];
    state.dealerIndex = 0;
    state.wind = 'E';
    state.roundNumber = 1;
    state.honba = 0;

    const nextState = advanceRound(state);
    expect(nextState.wind).toBe('E');
    expect(nextState.roundNumber).toBe(1);
    expect(nextState.honba).toBe(1);
    expect(nextState.dealerIndex).toBe(0);
  });

  it('should advance from East 1 to East 2 on Ryukyoku when dealer is not Tenpai', () => {
    const state = initGame();
    state.turnPhase = 'ryukyoku';
    state.winnerIndices = [];
    state.dealerIndex = 0;
    state.wind = 'E';
    state.roundNumber = 1;
    state.honba = 0;

    // Simulate dealer is not Tenpai (shanten > 0)
    state.players[0].hand = makeTiles('12m 456p 789s E E E S'); // 10 tiles, not Tenpai
    state.players[0].melds = [];

    const nextState = advanceRound(state);
    expect(nextState.wind).toBe('E');
    expect(nextState.roundNumber).toBe(2);
    expect(nextState.dealerIndex).toBe(1);
  });
});
