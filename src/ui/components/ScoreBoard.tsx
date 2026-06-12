import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../../engine/store';
import { WIND_NAMES } from '../../engine/constants';

export const ScoreBoard: React.FC = () => {
  const { gameState, cheatMode, gameLogs, toggleCheatMode, setupNewGame } = useGameStore();
  const { players, activePlayerIndex, wind, roundNumber, honba, kyoutaku } = gameState;

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to the bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameLogs]);

  const handleRestart = () => {
    if (window.confirm('対局をリセットして新しく開始しますか？')) {
      setupNewGame();
    }
  };

  return (
    <div className="scoreboard-sidebar glassmorphic">
      {/* Game Title */}
      <div className="sidebar-header">
        <h2 className="game-title">雀荘物語（仮）</h2>
        <span className="subtitle">フェーズ1: 麻雀エンジン開発</span>
      </div>

      {/* Match Round Progress */}
      <div className="round-progress-box">
        <span className="progress-label">対局ステータス</span>
        <div className="progress-val">
          {WIND_NAMES[wind]}
          {roundNumber}局 {honba}本場
        </div>
        <div className="stick-sub-labels">
          <span>供託リーチ棒: {kyoutaku}本</span>
        </div>
      </div>

      {/* Players List */}
      <div className="players-list-panel">
        <h3 className="section-title">雀士スコア</h3>
        <div className="players-grid">
          {players.map((player, idx) => {
            const isTurn = idx === activePlayerIndex;
            const isDealer = player.seatWind === 'E';
            const isRiichi = player.isRiichi || player.isDoubleRiichi;
            
            return (
              <div 
                key={player.id} 
                className={`player-score-card ${isTurn ? 'is-turn' : ''} ${isDealer ? 'is-dealer' : ''}`}
              >
                <div className="player-meta">
                  <span className={`seat-wind wind-${player.seatWind}`}>{player.seatWind}</span>
                  <span className="player-name">
                    {player.name}
                    {player.isAuto && <span className="bot-tag">AI</span>}
                  </span>
                </div>
                <div className="player-stats">
                  <span className="player-points">{player.score.toLocaleString()} 点</span>
                  {isRiichi && (
                    <span className="riichi-stick-indicator" title="リーチ宣言中">
                      <span className="riichi-stick-dot" />
                    </span>
                  )}
                  {player.isFuriten && (
                    <span className="furiten-badge">振聴</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Game Logs Panel */}
      <div className="game-logs-panel">
        <h3 className="section-title">対局ログ</h3>
        <div className="logs-scroll-area">
          {gameLogs.map((log, idx) => (
            <div key={idx} className="log-item">
              <span className="log-time">[{idx + 1}]</span> {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Debug & Controls Panel */}
      <div className="controls-panel">
        <h3 className="section-title">開発設定</h3>
        <div className="checkbox-control">
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={cheatMode} 
              onChange={toggleCheatMode} 
            />
            <span className="slider" />
          </label>
          <span className="label-text">相手の手牌を公開する (Cheat)</span>
        </div>

        <button className="restart-btn" onClick={handleRestart}>
          対局を最初からやり直す
        </button>
      </div>
    </div>
  );
};
