import React from 'react';
import { Discard } from '../../engine/types';
import { TileView } from './TileView';
import { useGameStore } from '../../engine/store';

interface DiscardPondProps {
  discards: Discard[];
  playerIndex: number;
}

export const DiscardPond: React.FC<DiscardPondProps> = ({ discards, playerIndex }) => {
  const { gameState, isOnlineMode, mySeatIndex } = useGameStore();
  const { turnPhase, lastDiscard, yakuResults, activeCalls } = gameState;

  const humanIndex = isOnlineMode ? mySeatIndex : 0;
  const isRonWin = turnPhase === 'agari' && yakuResults?.some(res => !res.isTsumo);
  const hasRonOption = activeCalls.some(c => c.playerIndex === humanIndex && c.type === 'ron');

  // Discard ponds are typically rendered in rows of 6 tiles
  const rows: Discard[][] = [];
  for (let i = 0; i < discards.length; i += 6) {
    rows.push(discards.slice(i, i + 6));
  }

  const screenPos = isOnlineMode ? (playerIndex - mySeatIndex + 4) % 4 : playerIndex;

  return (
    <div className={`discard-pond pond-pos-${screenPos}`}>
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="pond-row">
          {row.map((discard, dIdx) => {
            const isTargetDiscard = lastDiscard && discard.tile.id === lastDiscard.id;
            const isRonWinningTile = isRonWin && isTargetDiscard;
            const isPossibleRonTarget = hasRonOption && isTargetDiscard;

            return (
              <div
                key={`${rowIdx}-${dIdx}-${discard.tile.id}`}
                style={{ position: 'relative', display: 'inline-block' }}
              >
                <TileView
                  tile={discard.tile}
                  isSideways={discard.isRiichi}
                  isGrayed={discard.isCalled && !isRonWinningTile && !isPossibleRonTarget}
                  className={(isRonWinningTile || isPossibleRonTarget) ? 'ron-target-glow' : ''}
                />
                {isPossibleRonTarget && (
                  <div className="ron-possible-badge">ロン可</div>
                )}
              </div>
            );
          })}
        </div>
      ))}
      {discards.length === 0 && <div className="pond-empty" />}
    </div>
  );
};
