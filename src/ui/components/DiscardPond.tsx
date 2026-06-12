import React from 'react';
import { Discard } from '../../engine/types';
import { TileView } from './TileView';
import { useGameStore } from '../../engine/store';

interface DiscardPondProps {
  discards: Discard[];
  playerIndex: number;
}

export const DiscardPond: React.FC<DiscardPondProps> = ({ discards, playerIndex }) => {
  const { gameState } = useGameStore();
  const { turnPhase, lastDiscard, yakuResults } = gameState;

  const isRonWin = turnPhase === 'agari' && yakuResults?.some(res => !res.isTsumo);

  // Discard ponds are typically rendered in rows of 6 tiles
  const rows: Discard[][] = [];
  for (let i = 0; i < discards.length; i += 6) {
    rows.push(discards.slice(i, i + 6));
  }

  return (
    <div className={`discard-pond pond-pos-${playerIndex}`}>
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="pond-row">
          {row.map((discard, dIdx) => {
            const isRonWinningTile = isRonWin && lastDiscard && discard.tile.id === lastDiscard.id;
            return (
              <TileView
                key={`${rowIdx}-${dIdx}-${discard.tile.id}`}
                tile={discard.tile}
                isSideways={discard.isRiichi}
                isGrayed={discard.isCalled && !isRonWinningTile}
                className={isRonWinningTile ? 'ron-target-glow' : ''}
              />
            );
          })}
        </div>
      ))}
      {discards.length === 0 && <div className="pond-empty" />}
    </div>
  );
};
