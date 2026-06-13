import React from 'react';
import { useGameStore } from '../../engine/store';
import { TileView } from './TileView';
import { WIND_NAMES } from '../../engine/constants';

export const GameInfo: React.FC = () => {
  const { gameState } = useGameStore();
  const {
    wind,
    roundNumber,
    honba,
    kyoutaku,
    doraIndicators,
    wallIndex,
    activePlayerIndex,
    turnPhase,
  } = gameState;

  // Remaining tiles in live wall (live wall has 122 tiles total)
  const remainingTiles = Math.max(0, 122 - wallIndex);

  // Active direction label
  const directions = ['下家 (0)', '対面 (1)', '上家 (2)', '自分 (3)']; // Seating labels
  // But standard is: Player 0 is South/East, let's show names of active player
  const activePlayerName = gameState.players[activePlayerIndex].name;

  return (
    <div className="game-info-center-board">
      {/* Center Square Info */}
      <div className="center-square">
        {/* Round Name */}
        <div className="round-name">
          {WIND_NAMES[wind]}
          {roundNumber}局
        </div>

        {/* Honba & Kyoutaku */}
        <div className="sticks-count">
          <div className="stick honba-stick" title={`本場: ${honba}`}>
            <span className="stick-dot red" />
            <span className="stick-label">{honba} 本場</span>
          </div>
          <div className="stick riichi-stick" title={`供託: ${kyoutaku}`}>
            <span className="stick-dot black" />
            <span className="stick-label">{kyoutaku} 供託</span>
          </div>
        </div>

        {/* Wall Count */}
        <div className="wall-count">
          <span>残 {remainingTiles} 牌</span>
        </div>

        {/* Active turn light */}
        <div className={`active-player-indicator active-p-${activePlayerIndex}`}>
          <div className="indicator-light" />
        </div>
      </div>

      {/* Dora Indicators Section */}
      <div className="dora-indicator-panel">
        <span className="dora-title">ドラ表示牌</span>
        <div className="dora-tiles">
          {/* Show active dora indicators, and remaining face down up to 5 total */}
          {Array.from({ length: 5 }).map((_, idx) => {
            const indicator = doraIndicators[idx];
            if (indicator) {
              return <TileView key={indicator.id} tile={indicator} className="tile-flip-in" />;
            }
            // Draw face-down for unrevealed dora indicators
            return <TileView key={`hidden-dora-${idx}`} />;
          })}
        </div>
      </div>
    </div>
  );
};
