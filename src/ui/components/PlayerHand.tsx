import React from 'react';
import { PlayerState, Tile, Meld, SuitType } from '../../engine/types';
import { TileView } from './TileView';
import { useGameStore } from '../../engine/store';
import { getTenpaiDiscardsWithWaits, TenpaiDiscardInfo, calculateShanten, indexToSuitAndValue } from '../../engine/shanten';

interface PlayerHandProps {
  player: PlayerState;
  playerIndex: number;
  isActive: boolean;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({ player, playerIndex, isActive }) => {
  const { gameState, cheatMode, discard, selectCall, riichiPending, setRiichiPending, isOnlineMode, mySeatIndex } = useGameStore();
  const { activePlayerIndex, turnPhase, drawnTile, activeCalls, winnerIndices, lastDiscard, players, doraIndicators, honba, kyoutaku } = gameState;

  const isHuman = isOnlineMode ? playerIndex === mySeatIndex : playerIndex === 0;
  const isDiscardPhase = isActive && (turnPhase === 'discard' || turnPhase === 'kan_draw');

  // Find if player has a Riichi option active or is already in Riichi
  const isRiichiDeclared = player.isRiichi || player.isDoubleRiichi;

  // Determine if this player is the winner of the round
  const isWinner = winnerIndices?.includes(playerIndex) || false;
  const winnerResult = gameState.yakuResults?.find(res => res.playerIndex === playerIndex);
  const isTsumoWin = winnerResult?.isTsumo || false;
  const isRonWin = winnerResult ? !winnerResult.isTsumo : false;

  // Reveal player hands when they win, or if they are human / cheat mode is on
  const shouldReveal = isHuman || cheatMode || ((turnPhase === 'agari' || turnPhase === 'game_over') && isWinner);

  // local hover states and calculations for tenpai wait indicators
  const [hoveredTileId, setHoveredTileId] = React.useState<number | null>(null);

  const tenpaiDiscards = (isHuman && (turnPhase === 'discard' || turnPhase === 'kan_draw'))
    ? getTenpaiDiscardsWithWaits(player.hand, player.melds.length)
    : [];

  const getRemainingTileCount = (target: Tile): number => {
    let count = 0;
    player.hand.forEach(t => {
      if (t.suit === target.suit && t.value === target.value) count++;
    });
    players.forEach(p => {
      p.melds.forEach(m => {
        m.tiles.forEach(t => {
          if (t.suit === target.suit && t.value === target.value) count++;
        });
      });
      p.discards.forEach(d => {
        if (d.tile.suit === target.suit && d.tile.value === target.value) count++;
      });
    });
    doraIndicators.forEach(t => {
      if (t.suit === target.suit && t.value === target.value) count++;
    });
    return Math.max(0, 4 - count);
  };

  // Separate the drawn tile from the rest of the hand (rendered on the right)
  let handTiles = [...player.hand];
  let drawnTileInHand: Tile | null = null;

  if (isActive && drawnTile) {
    // Find drawn tile in hand
    const drawnIdx = handTiles.findIndex(t => t.id === drawnTile.id);
    if (drawnIdx !== -1) {
      drawnTileInHand = handTiles[drawnIdx];
      handTiles.splice(drawnIdx, 1);
    }
  }

  // If Ron win: append the winning tile as the drawn tile for rendering
  if (turnPhase === 'agari' && isWinner && isRonWin && lastDiscard) {
    drawnTileInHand = lastDiscard;
  }

  const riichiWaits = React.useMemo(() => {
    if (!isHuman || !isRiichiDeclared) return [];
    const waits: { suit: SuitType; value: number }[] = [];
    const openMeldCount = player.melds.length;
    for (let wIdx = 0; wIdx < 34; wIdx++) {
      const tInfo = indexToSuitAndValue(wIdx);
      const dummyTile: Tile = { id: 9999, suit: tInfo.suit, value: tInfo.value, isRed: false };
      const testHand = [...handTiles, dummyTile];
      if (calculateShanten(testHand, openMeldCount) === -1) {
        waits.push(tInfo);
      }
    }
    return waits;
  }, [isHuman, isRiichiDeclared, handTiles, player.melds.length]);

  const totalRemainingCount = React.useMemo(() => {
    if (riichiWaits.length === 0) return 0;
    return riichiWaits.reduce((acc, w) => {
      const dummyTile: Tile = { id: 9999, suit: w.suit, value: w.value, isRed: false };
      return acc + getRemainingTileCount(dummyTile);
    }, 0);
  }, [riichiWaits]);

  // Handle tile discard click
  const handleDiscardClick = (tileId: number) => {
    if (!isDiscardPhase) return;

    // Check if the player is in Riichi. If so, they can ONLY discard the drawn tile
    if (isRiichiDeclared && drawnTileInHand && tileId !== drawnTileInHand.id) {
      return; // Force tsumogiri for Riichi players
    }

    if (riichiPending) {
      // Ensure the selected tile is a valid Riichi discard
      if (!tenpaiDiscards.some(d => d.discardTileId === tileId)) {
        return; // Ignore clicking non-Tenpai discards when Riichi is pending
      }
      discard(tileId, true);
      setRiichiPending(false);
    } else {
      discard(tileId, false);
    }
  };

  // Render open melds (Furo)
  const renderMeld = (meld: Meld, meldIdx: number) => {
    const { type, tiles, fromPlayer } = meld;
    
    // Ankan (Closed Kan) representation:
    // Two outer tiles face-down (or up) and two middle tiles face-up (or down).
    // Let's show: 1st tile face-down, 2nd & 3rd face-up, 4th face-down.
    if (type === 'ankan') {
      return (
        <div key={meldIdx} className="meld-group ankan-group">
          <TileView /> {/* Face-down */}
          <TileView tile={tiles[1]} />
          <TileView tile={tiles[2]} />
          <TileView /> {/* Face-down */}
        </div>
      );
    }

    // Determine which tile in the meld was taken from whom and needs to be rotated
    // Seating relative offsets:
    // Left (Kamicha): (playerIndex + 3) % 4
    // Opposite (Toimicha): (playerIndex + 2) % 4
    // Right (Shimocha): (playerIndex + 1) % 4
    const isLeft = fromPlayer === (playerIndex + 3) % 4;
    const isOpposite = fromPlayer === (playerIndex + 2) % 4;
    const isRight = fromPlayer === (playerIndex + 1) % 4;

    return (
      <div key={meldIdx} className="meld-group">
        {tiles.map((t, tIdx) => {
          let isSideways = false;
          
          // Rotation rules for Chi/Pon/Daiminkan:
          if (type === 'chi' || type === 'pon') {
            // Chi: always taken from Kamicha (Left), so rotate 1st tile
            if (type === 'chi' && tIdx === 0) {
              isSideways = true;
            }
            // Pon:
            // Taken from Left: rotate 1st tile
            // Taken from Opposite: rotate 2nd tile
            // Taken from Right: rotate 3rd tile
            if (type === 'pon') {
              if (isLeft && tIdx === 0) isSideways = true;
              if (isOpposite && tIdx === 1) isSideways = true;
              if (isRight && tIdx === 2) isSideways = true;
            }
          } else if (type === 'daiminkan' || type === 'kakan') {
            // Kan:
            // Taken from Left: rotate 1st tile
            // Taken from Opposite: rotate 2nd (or 3rd) tile
            // Taken from Right: rotate 4th tile
            if (isLeft && tIdx === 0) isSideways = true;
            if (isOpposite && tIdx === 1) isSideways = true;
            if (isRight && tIdx === 3) isSideways = true;
          }

          return <TileView key={t.id} tile={t} isSideways={isSideways} />;
        })}
      </div>
    );
  };

  const screenPos = isOnlineMode ? (playerIndex - mySeatIndex + 4) % 4 : playerIndex;

  return (
    <div className={`player-hand-container player-pos-${screenPos} ${isActive ? 'active-turn' : ''}`}>
      {turnPhase === 'agari' && winnerResult && (
        <div className="table-win-yaku-banner glassmorphic">
          <div className="banner-yaku-title">
            {winnerResult.isTsumo ? 'ツモ' : 'ロン'}! {winnerResult.points.toLocaleString()} 点
          </div>
          <div className="banner-yaku-details">
            {winnerResult.fu} 符 {winnerResult.han + winnerResult.doraCount + winnerResult.akaDoraCount + winnerResult.uraDoraCount} 翻
            {(honba > 0 || kyoutaku > 0) && (
              <span className="banner-breakdown-sub">
                (素点: {(winnerResult.points - honba * 300 - kyoutaku * 1000).toLocaleString()}
                {honba > 0 ? ` + 本場: ${honba * 300}` : ''}
                {kyoutaku > 0 ? ` + 供託: ${kyoutaku * 1000}` : ''})
              </span>
            )}
          </div>
          <div className="banner-yaku-list">
            {winnerResult.yakuList.slice(0, 3).join(' ・ ')}
            {winnerResult.yakuList.length > 3 ? ' ...' : ''}
          </div>
        </div>
      )}

      {isHuman && isRiichiDeclared && riichiWaits.length > 0 && turnPhase !== 'agari' && (
        <div className="riichi-waits-banner glassmorphic">
          <span className="waits-label">待ち (残 {totalRemainingCount}枚):</span>
          <div className="waits-tiles">
            {riichiWaits.map((w, wIdx) => {
              const dummyTile: Tile = { id: 11000 + wIdx, suit: w.suit, value: w.value, isRed: false };
              const remaining = getRemainingTileCount(dummyTile);
              return (
                <div key={wIdx} className="wait-tile-item">
                  <TileView tile={dummyTile} />
                  <span className="wait-count">{remaining}枚</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hand layout */}
      <div className="hand-tiles-wrapper">
        {/* Main Hand */}
        <div className="hand-tiles">
          {handTiles.map(tile => {
            const isClickable = isHuman && isDiscardPhase && (!isRiichiDeclared || !drawnTileInHand);
            const isRiichiOpt = riichiPending && tenpaiDiscards.some(d => d.discardTileId === tile.id);
            
            return (
              <div 
                key={tile.id} 
                className="hand-tile-item-container"
                onMouseEnter={() => isHuman && setHoveredTileId(tile.id)}
                onMouseLeave={() => isHuman && setHoveredTileId(null)}
              >
                {riichiPending && hoveredTileId === tile.id && (
                  (() => {
                    const match = tenpaiDiscards.find(d => d.discardTileId === tile.id);
                    if (!match) return null;
                    return (
                      <div className="hover-waits-popup glassmorphic">
                        <span className="waits-popup-label">待ち:</span>
                        <div className="waits-tiles-row">
                          {match.waits.map((w, wIdx) => {
                            const dummyTile: Tile = { id: 10000 + wIdx, suit: w.suit, value: w.value, isRed: false };
                            const remaining = getRemainingTileCount(dummyTile);
                            return (
                              <div key={wIdx} className="wait-tile-wrapper">
                                <TileView tile={dummyTile} />
                                <span className="wait-tile-count">{remaining}枚</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                )}

                <TileView
                  tile={shouldReveal ? tile : undefined}
                  selectable={isClickable}
                  onClick={() => handleDiscardClick(tile.id)}
                  className={isRiichiOpt ? 'riichi-option' : ''}
                />
              </div>
            );
          })}
        </div>

        {/* Drawn Tile (separated) */}
        {drawnTileInHand && (
          (() => {
            const isRiichiOpt = riichiPending && tenpaiDiscards.some(d => d.discardTileId === drawnTileInHand!.id);
            return (
              <div 
                className="drawn-tile-gap hand-tile-item-container"
                onMouseEnter={() => isHuman && setHoveredTileId(drawnTileInHand!.id)}
                onMouseLeave={() => isHuman && setHoveredTileId(null)}
              >
                {riichiPending && hoveredTileId === drawnTileInHand!.id && (
                  (() => {
                    const match = tenpaiDiscards.find(d => d.discardTileId === drawnTileInHand!.id);
                    if (!match) return null;
                    return (
                      <div className="hover-waits-popup glassmorphic">
                        <span className="waits-popup-label">待ち:</span>
                        <div className="waits-tiles-row">
                          {match.waits.map((w, wIdx) => {
                            const dummyTile: Tile = { id: 10000 + wIdx, suit: w.suit, value: w.value, isRed: false };
                            const remaining = getRemainingTileCount(dummyTile);
                            return (
                              <div key={wIdx} className="wait-tile-wrapper">
                                <TileView tile={dummyTile} />
                                <span className="wait-tile-count">{remaining}枚</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                )}

                <TileView
                  tile={shouldReveal ? drawnTileInHand : undefined}
                  selectable={isHuman && isDiscardPhase}
                  onClick={() => handleDiscardClick(drawnTileInHand!.id)}
                  className={`${turnPhase === 'agari' && isWinner ? (isTsumoWin ? 'tsumo-won-glow' : 'ron-won-glow') : ''} ${isRiichiOpt ? 'riichi-option' : ''} ${turnPhase !== 'agari' ? 'tile-draw-in' : ''}`}
                />
              </div>
            );
          })()
        )}

        {/* Declared Melds */}
        {player.melds.length > 0 && (
          <div className="player-melds">
            {player.melds.map((m, idx) => renderMeld(m, idx))}
          </div>
        )}
      </div>
    </div>
  );
};
