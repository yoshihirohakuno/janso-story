import { YakuResult } from './yaku';

export interface ScorePayout {
  winnerIndex: number;
  payerScores: { [playerIndex: number]: number }; // Score changes for each player
  textSummary: string; // Description of the win (e.g. "満貫 8000点")
  baseScoreName: string; // e.g. "満貫", "跳満"
  points: number; // Total points won
}

// Round up to the nearest 100 points
export function roundUp100(val: number): number {
  return Math.ceil(val / 100) * 100;
}

// Calculate the base score name based on Han and Fu
export function getBaseScoreName(han: number, fu: number, isYakuman: boolean, yakumanMultiplier = 1): string {
  if (isYakuman) {
    return yakumanMultiplier > 1 ? `ダブル役満` : '役満';
  }
  if (han >= 13) return '数え役満';
  if (han >= 11) return '三倍満';
  if (han >= 8) return '倍満';
  if (han >= 6) return '跳満';
  if (han >= 5) return '満貫';
  if (han === 4 && fu >= 40) return '満貫';
  if (han === 3 && fu >= 70) return '満貫';
  return '';
}

export interface CalculatePointsParams {
  yakuResult: YakuResult;
  isDealer: boolean;
  isTsumo: boolean;
  honba: number;
  kyoutaku: number;
  useKiriMangan?: boolean;
}

export function calculatePoints(params: CalculatePointsParams): {
  points: number;
  payerScores: { [playerIndex: number]: number };
  baseScoreName: string;
  textSummary: string;
} {
  const { yakuResult, isDealer, isTsumo, honba, kyoutaku, useKiriMangan = true } = params;
  const { han, fu, isYakuman, yakumanMultiplier, doraCount, akaDoraCount, uraDoraCount } = yakuResult;

  const totalHan = han + doraCount + akaDoraCount + uraDoraCount;
  let basePoints = 0;
  let baseScoreName = getBaseScoreName(totalHan, fu, isYakuman, yakumanMultiplier);

  if (isYakuman) {
    basePoints = 8000 * (yakumanMultiplier || 1);
  } else if (totalHan >= 13) {
    basePoints = 8000;
  } else if (totalHan >= 11) {
    basePoints = 6000;
  } else if (totalHan >= 8) {
    basePoints = 4000;
  } else if (totalHan >= 6) {
    basePoints = 3000;
  } else if (totalHan >= 5) {
    basePoints = 2000;
  } else if (totalHan === 4 && fu >= 40) {
    basePoints = 2000;
  } else if (totalHan === 3 && fu >= 70) {
    basePoints = 2000;
  } else if (useKiriMangan && ((totalHan === 4 && fu === 30) || (totalHan === 3 && fu === 60))) {
    // Kiri-Mangan rounds 30-Fu 4-Han and 60-Fu 3-Han up to Mangan
    basePoints = 2000;
    baseScoreName = '満貫';
  } else {
    // Normal hand scoring formula
    basePoints = fu * Math.pow(2, totalHan + 2);
    // Cap at Mangan
    if (basePoints > 2000) {
      basePoints = 2000;
      baseScoreName = '満貫';
    }
  }

  const payerScores: { [playerIndex: number]: number } = {};
  let points = 0;
  let detailsText = '';

  if (isTsumo) {
    // Tsumo: points are paid by the other 3 players
    if (isDealer) {
      // Dealer wins: all children pay basePoints * 2
      const childPay = roundUp100(basePoints * 2) + 100 * honba;
      points = childPay * 3;
      detailsText = `${childPay}オール`;
    } else {
      // Child wins: dealer pays basePoints * 2, children pay basePoints
      const dealerPay = roundUp100(basePoints * 2) + 100 * honba;
      const childPay = roundUp100(basePoints) + 100 * honba;
      points = dealerPay + childPay * 2;
      detailsText = `${childPay}/${dealerPay}`;
    }
  } else {
    // Ron: points are paid entirely by the discarding player
    const multiplier = isDealer ? 6 : 4;
    points = roundUp100(basePoints * multiplier) + 300 * honba;
    detailsText = `${points}点`;
  }

  // Include Kyoutaku sticks (each worth 1000 points) in the total point payout
  const totalPayout = points + kyoutaku * 1000;

  // Set up payerScores
  // (Payer index configuration will be resolved by the caller in game.ts)
  return {
    points: totalPayout,
    payerScores,
    baseScoreName: baseScoreName || `${fu}符${totalHan}翻`,
    textSummary: `${baseScoreName || `${fu}符${totalHan}翻`} ${detailsText}`,
  };
}

// Generate the final player score adjustments for a round end
export function redistributeScores(
  winnerIndex: number,
  payerIndex: number | null, // null for Tsumo
  _pointsData: { points: number; baseScoreName: string; textSummary: string },
  activeDealer: number,
  honba: number,
  kyoutaku: number,
  yakuResult: YakuResult,
  isTsumo: boolean
): { [playerIndex: number]: number } {
  const scoreChanges = new Array(4).fill(0);
  const totalHan = yakuResult.han + yakuResult.doraCount + yakuResult.akaDoraCount + yakuResult.uraDoraCount;
  const fu = yakuResult.fu;
  const isYakuman = yakuResult.isYakuman;
  const mult = yakuResult.yakumanMultiplier;

  let basePoints = 0;
  if (isYakuman) {
    basePoints = 8000 * (mult || 1);
  } else if (totalHan >= 13) basePoints = 8000;
  else if (totalHan >= 11) basePoints = 6000;
  else if (totalHan >= 8) basePoints = 4000;
  else if (totalHan >= 6) basePoints = 3000;
  else if (totalHan >= 5) basePoints = 2000;
  else if (totalHan === 4 && fu >= 40) basePoints = 2000;
  else if (totalHan === 3 && fu >= 70) basePoints = 2000;
  else if ((totalHan === 4 && fu === 30) || (totalHan === 3 && fu === 60)) basePoints = 2000; // Assuming Kiri-Mangan
  else {
    basePoints = fu * Math.pow(2, totalHan + 2);
    if (basePoints > 2000) basePoints = 2000;
  }

  const isWinnerDealer = winnerIndex === activeDealer;

  if (isTsumo) {
    let winSum = 0;
    for (let p = 0; p < 4; p++) {
      if (p === winnerIndex) continue;
      
      const isPayerDealer = p === activeDealer;
      let payAmount = 0;
      
      if (isWinnerDealer) {
        payAmount = roundUp100(basePoints * 2) + 100 * honba;
      } else {
        payAmount = isPayerDealer
          ? roundUp100(basePoints * 2) + 100 * honba
          : roundUp100(basePoints) + 100 * honba;
      }
      
      scoreChanges[p] = -payAmount;
      winSum += payAmount;
    }
    scoreChanges[winnerIndex] = winSum + kyoutaku * 1000;
  } else {
    // Ron
    if (payerIndex !== null) {
      const multVal = isWinnerDealer ? 6 : 4;
      const payAmount = roundUp100(basePoints * multVal) + 300 * honba;
      scoreChanges[payerIndex] = -payAmount;
      scoreChanges[winnerIndex] = payAmount + kyoutaku * 1000;
    }
  }

  // Convert to object map
  const result: { [playerIndex: number]: number } = {};
  for (let i = 0; i < 4; i++) {
    result[i] = scoreChanges[i];
  }
  return result;
}
