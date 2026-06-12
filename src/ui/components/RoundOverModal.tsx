import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../engine/store';
import { TileView } from './TileView';
import { WIND_NAMES } from '../../engine/constants';
import { sortTiles } from '../../engine/constants';
import { Tile, Meld } from '../../engine/types';

interface ScoreTickerProps {
  startScore: number;
  endScore: number;
  change: number;
}

const ScoreTicker: React.FC<ScoreTickerProps> = ({ startScore, endScore, change }) => {
  const [currentScore, setCurrentScore] = useState(startScore);

  useEffect(() => {
    setCurrentScore(startScore);
    if (change === 0) return;

    const duration = 1200; // 1.2 seconds animation
    const startTime = performance.now();
    let animationFrameId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress); // Ease out quadratic
      const val = Math.round(startScore + change * easeProgress);
      setCurrentScore(val);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCurrentScore(endScore);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [startScore, endScore, change]);

  return <>{currentScore.toLocaleString()} 点</>;
};

export const RoundOverModal: React.FC = () => {
  const { gameState, confirmRoundEnd, setupNewGame } = useGameStore();
  const { turnPhase, winnerIndices, yakuResults, scoreChanges, players, wind, roundNumber, honba, doraIndicators, uraDoraIndicators } = gameState;

  if (turnPhase !== 'agari' && turnPhase !== 'ryukyoku' && turnPhase !== 'game_over') {
    return null;
  }

  const handleNext = () => {
    if (turnPhase === 'game_over') {
      setupNewGame();
    } else {
      confirmRoundEnd();
    }
  };

  const getTitle = () => {
    if (turnPhase === 'game_over') {
      const tobiPlayer = players.find(p => p.score < 0);
      if (tobiPlayer) {
        return `⚠️ 対局終了 (${tobiPlayer.name} のトビ終了) ⚠️`;
      }
      return '🌟 対局終了 (最終結果) 🌟';
    }
    if (turnPhase === 'ryukyoku') return '流局 (Exhaustive Draw)';
    
    // Check if double ron occurred
    if (winnerIndices && winnerIndices.length > 1) return '🎊 ダブロン発生！ 🎊';
    
    const res = yakuResults?.[0];
    const winnerName = players[winnerIndices?.[0] || 0].name;
    return `和了! - ${winnerName} の和了 (${res?.isTsumo ? 'ツモ' : 'ロン'})`;
  };

  const renderRankings = () => {
    // Sort players by score descending
    const rankedPlayers = [...players].sort((a, b) => b.score - a.score);
    return (
      <div className="final-rankings-board">
        <h3 className="ranking-title">最終順位</h3>
        <div className="rankings-list">
          {rankedPlayers.map((player, rankIdx) => (
            <div key={player.id} className={`rank-row rank-${rankIdx + 1}`}>
              <span className="rank-num">{rankIdx + 1}位</span>
              <span className="rank-name">{player.name} {player.isAuto ? '(AI)' : ''}</span>
              <span className="rank-points">{player.score.toLocaleString()} 点</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="round-over-modal-backdrop">
      <div className="round-over-modal glassmorphic">
        <div className="modal-title-header">{getTitle()}</div>
        
        {turnPhase !== 'game_over' && (
          <div className="round-meta-summary">
            {WIND_NAMES[wind]}
            {roundNumber}局 {honba}本場
          </div>
        )}

        {/* 1. AGARI (WIN) DETAILS */}
        {turnPhase === 'agari' && yakuResults && (
          <div className="winners-breakdown-area">
            {yakuResults.map((res, wIdx) => {
              const winner = players[res.playerIndex];
              const changes = scoreChanges ? scoreChanges[res.playerIndex] : 0;
              const winLabel = res.isTsumo ? 'ツモ' : 'ロン';
              
              // Sort the winning hand tiles for neat rendering
              const displayHand = sortTiles(winner.hand);

              return (
                <div key={wIdx} className="winner-details-card glassmorphic">
                  <div className="winner-title">
                    <span className="win-badge">{winLabel}</span>
                    <span className="winner-name-label">{winner.name} ({winner.seatWind}家)</span>
                  </div>

                  {/* Winning hand display */}
                  <div className="winning-hand-display">
                    <div className="hand-tiles-label">和了手牌:</div>
                    <div className="tiles-row">
                      {displayHand.map(t => (
                        <TileView key={t.id} tile={t} />
                      ))}
                    </div>
                  </div>

                  {/* Melds if any */}
                  {winner.melds.length > 0 && (
                    <div className="winning-melds-display">
                      <div className="hand-tiles-label">副露面子:</div>
                      <div className="melds-row">
                        {winner.melds.map((meld, mIdx) => (
                          <div key={mIdx} className="meld-group">
                            {meld.tiles.map(t => (
                              <TileView key={t.id} tile={t} />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dora and Ura Dora indicators */}
                  <div className="indicators-display">
                    <div className="indicator-group">
                      <span className="ind-label">ドラ表示牌:</span>
                      <div className="ind-tiles">
                        {doraIndicators.map(t => <TileView key={t.id} tile={t} />)}
                      </div>
                    </div>
                    {winner.isRiichi && (
                      <div className="indicator-group">
                        <span className="ind-label">裏ドラ表示牌:</span>
                        <div className="ind-tiles">
                          {uraDoraIndicators.map(t => <TileView key={t.id} tile={t} />)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Yaku breakdown */}
                  <div className="yaku-breakdown">
                    <div className="yaku-list-tags">
                      {res.yakuList.map((yk, yIdx) => (
                        <span key={yIdx} className="yaku-tag">{yk}</span>
                      ))}
                      {res.akaDoraCount > 0 && <span className="yaku-tag dora">赤ドラ x{res.akaDoraCount}</span>}
                      {res.doraCount > 0 && <span className="yaku-tag dora">ドラ x{res.doraCount}</span>}
                      {res.uraDoraCount > 0 && <span className="yaku-tag dora">裏ドラ x{res.uraDoraCount}</span>}
                    </div>

                    <div className="score-summary-numbers">
                      <span className="summary-han-fu">{res.fu} 符 / {res.han + res.doraCount + res.akaDoraCount + res.uraDoraCount} 翻</span>
                      <span className="summary-score-value">{res.points.toLocaleString()} 点</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. RYUKYOKU (DRAW) DETAILS */}
        {turnPhase === 'ryukyoku' && (
          <div className="draw-details-card">
            <h3 className="section-title">流局結果</h3>
            <div className="tenpai-status-list">
              {players.map(player => {
                // Check if player was Tenpai
                // To do so in the UI, we can check if they have a shanten of 0
                // Shanten is calculated at check time
                const isTenpai = player.hand.length > 0 && (player.hand.length % 3 === 1) && 
                  (player.hand.length === 13) && // Standard closed hand size before win
                  (player.discards.length > 0);
                
                // Let's show Tenpai status based on score change instead (if they received points, they were Tenpai)
                const scoreChange = scoreChanges ? scoreChanges[player.id] : 0;
                const wasTenpai = scoreChange > 0 || (scoreChange === 0 && scoreChanges?.every(c => c === 0)); // simple proxy, or let's calculate shanten directly!
                
                // Wait, we can check their hand shanten
                const counts = new Array(34).fill(0);
                for (const t of player.hand) counts[t.value]++;
                
                return (
                  <div key={player.id} className="player-draw-status">
                    <div className="player-meta-box">
                      <span className={`seat-wind wind-${player.seatWind}`}>{player.seatWind}</span>
                      <span className="player-name-label">{player.name}</span>
                    </div>
                    <div className="tenpai-badge-container">
                      {scoreChange > 0 ? (
                        <span className="tenpai-badge is-tenpai">聴牌 (Tenpai)</span>
                      ) : scoreChange < 0 ? (
                        <span className="tenpai-badge is-not-tenpai">不聴 (No-Ten)</span>
                      ) : (
                        <span className="tenpai-badge neutral">全員聴牌 / 全員不聴</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. GAME OVER (FINAL RANKINGS) */}
        {turnPhase === 'game_over' && renderRankings()}

        {/* 4. SCORE CHANGES DISPLAY */}
        {turnPhase !== 'game_over' && scoreChanges && (
          <div className="score-changes-board">
            <h3 className="section-title">得点移動</h3>
            <div className="score-changes-row">
              {players.map(player => {
                const change = scoreChanges[player.id];
                return (
                  <div key={player.id} className="score-change-cell">
                    <div className="cell-player-meta">
                      <span className={`seat-wind wind-${player.seatWind}`}>{player.seatWind}</span>
                      <span className="cell-player-name">{player.name}</span>
                    </div>
                    <div className="cell-scores">
                      <span className="old-score">{(player.score - change).toLocaleString()} 点</span>
                      <span className={`score-diff ${change > 0 ? 'plus' : change < 0 ? 'minus' : ''} ${change !== 0 ? 'pulse-glow' : ''}`}>
                        {change > 0 ? `+${change.toLocaleString()}` : change === 0 ? '±0' : change.toLocaleString()}
                      </span>
                      <span className="new-score">
                        <ScoreTicker 
                          startScore={player.score - change}
                          endScore={player.score}
                          change={change}
                        />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. NEXT ACTION BUTTON */}
        <div className="modal-actions-area">
          <button className="confirm-next-btn glow-animation" onClick={handleNext}>
            {turnPhase === 'game_over' ? 'ロビーに戻る (新しい対局を開始)' : '次の局へ進む'}
          </button>
        </div>
      </div>
    </div>
  );
};
