import React from 'react';
import { PlayerState, Tile, Meld } from '../../engine/types';
import { TileView } from './TileView';
import { useGameStore } from '../../engine/store';

interface PlayerHandProps {
  player: PlayerState;
  playerIndex: number;
  isActive: boolean;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({ player, playerIndex, isActive }) => {
  const { gameState, cheatMode, discard, selectCall } = useGameStore();
  const { activePlayerIndex, turnPhase, drawnTile, activeCalls, winnerIndices, lastDiscard } = gameState;

  const isHuman = playerIndex === 0;
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

  // Handle tile discard click
  const handleDiscardClick = (tileId: number) => {
    if (!isDiscardPhase) return;

    // Check if the player is in Riichi. If so, they can ONLY discard the drawn tile
    if (isRiichiDeclared && drawnTileInHand && tileId !== drawnTileInHand.id) {
      return; // Force tsumogiri for Riichi players
    }

    // Check if Riichi is being declared in this turn
    // If the human clicked the "Riichi" action button, we expect them to select a tile
    // that keeps them in Tenpai.
    // In our simplified UI, if the player has a pending "Riichi" call choice,
    // they can click the Riichi button first, then click a tile.
    // Let's check if the player clicked "Riichi" and has it pending.
    // Actually, in our game flow, submitCall('riichi') just flags that the player is declaring Riichi.
    // Let's check if there's an active call option for Riichi that has been selected.
    // If so, we discard it as a Riichi declaration!
    // We can check if 'riichi' is in the player's possible calls, and they toggled it.
    // Let's check the store's state or simply look at state.
    // In game.ts: if player chooses Riichi call, it transitions back to discard phase,
    // and when they discard, we flag isRiichi = true.
    // How do we know they are discarding as Riichi?
    // We can store a local UI flag or state "riichiPending".
    // For simplicity, let's see if the player has `activeCalls` containing a 'riichi' option.
    // If they click a tile while they are allowed to declare Riichi, we can ask them or check.
    // Actually, let's look at `gameState.activeCalls`. If it has a 'riichi' option,
    // we can show a "Riichi" action button. When clicked, it activates a "Riichi Mode" in the UI,
    // and the next tile they click to discard will be discarded with `isRiichi = true`.
    // Let's implement this! We can check if the UI has a local state or if we pass a parameter.
    // Let's handle this in the ActionButtons and local state.

    // For now, normal discard:
    // If the player clicked "Riichi" action button (which we will track via a state),
    // we discard as Riichi.
    // Let's check if there is a global flag or state. We can check if the store has a pending Riichi.
    // Let's check:
    const storeState = useGameStore.getState();
    const isPendingRiichi = storeState.gameState.activeCalls.some(c => c.playerIndex === playerIndex && c.type === 'riichi') && 
                            storeState.gameState.turnPhase === 'discard' &&
                            // If they clicked Riichi button, we can check if they selected it.
                            // To make it super simple: if the player can declare Riichi, we show a button.
                            // Let's check if they activated "Riichi Mode".
                            (window as any).riichiPending === true;

    if (isPendingRiichi) {
      discard(tileId, true);
      (window as any).riichiPending = false;
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

  return (
    <div className={`player-hand-container player-pos-${playerIndex} ${isActive ? 'active-turn' : ''}`}>
      {/* Hand layout */}
      <div className="hand-tiles-wrapper">
        {/* Main Hand */}
        <div className="hand-tiles">
          {handTiles.map(tile => {
            const isClickable = isHuman && isDiscardPhase && (!isRiichiDeclared || !drawnTileInHand);
            
            return (
              <TileView
                key={tile.id}
                tile={shouldReveal ? tile : undefined}
                selectable={isClickable}
                onClick={() => handleDiscardClick(tile.id)}
              />
            );
          })}
        </div>

        {/* Drawn Tile (separated) */}
        {drawnTileInHand && (
          <div className="drawn-tile-gap">
            <TileView
              tile={shouldReveal ? drawnTileInHand : undefined}
              selectable={isHuman && isDiscardPhase}
              onClick={() => handleDiscardClick(drawnTileInHand!.id)}
              className={turnPhase === 'agari' && isWinner ? (isTsumoWin ? 'tsumo-won-glow' : 'ron-won-glow') : ''}
            />
          </div>
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
