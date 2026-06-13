import React from 'react';
import { useGameStore } from '../../engine/store';
import { PlayerHand } from './PlayerHand';
import { DiscardPond } from './DiscardPond';
import { GameInfo } from './GameInfo';
import { ActionButtons } from './ActionButtons';
import { RoundOverModal } from './RoundOverModal';
import { WIND_NAMES } from '../../engine/constants';

export const MahjongTable: React.FC = () => {
  const { gameState, isOnlineMode, mySeatIndex } = useGameStore();
  const { players, activePlayerIndex } = gameState;

  const getScreenPos = (idx: number) => {
    return isOnlineMode ? (idx - mySeatIndex + 4) % 4 : idx;
  };

  return (
    <div className="mahjong-table-area glassmorphic">
      <div className="table-inner">
        
        {/* Central Information Board */}
        <GameInfo />

        {/* Sleek Player Info Badges in the 4 corners of the table felt */}
        {players.map((player, idx) => {
          const isTurn = idx === activePlayerIndex;
          const isDealer = player.seatWind === 'E';
          const isRiichi = player.isRiichi || player.isDoubleRiichi;
          const screenPos = getScreenPos(idx);
          return (
            <div 
              key={`badge-${player.id}`} 
              className={`table-player-badge seat-pos-${screenPos} ${isTurn ? 'is-active-turn' : ''} ${isDealer ? 'is-dealer' : ''} ${isRiichi ? 'is-riichi' : ''}`}
            >
              <div className="badge-wind">{WIND_NAMES[player.seatWind]}</div>
              <div className="badge-details">
                <span className="badge-name">
                  {player.name}
                  {player.isAuto && <span className="badge-ai-tag">AI</span>}
                </span>
                <span className="badge-score">{player.score.toLocaleString()} 点</span>
              </div>
              {isRiichi && <span className="badge-status-tag riichi">REACH</span>}
              {player.isFuriten && <span className="badge-status-tag furiten">振聴</span>}
            </div>
          );
        })}

        {/* Ponds (Discards) for each player */}
        {players.map((player, idx) => (
          <DiscardPond
            key={`pond-${player.id}`}
            discards={player.discards}
            playerIndex={idx}
          />
        ))}

        {/* Hands for each player */}
        {players.map((player, idx) => (
          <PlayerHand
            key={`hand-${player.id}`}
            player={player}
            playerIndex={idx}
            isActive={idx === activePlayerIndex}
          />
        ))}

        {/* Action button overlays for Human calls */}
        <ActionButtons />

        {/* Round Over / Draw / Game Over summaries modal */}
        <RoundOverModal />

      </div>
    </div>
  );
};
