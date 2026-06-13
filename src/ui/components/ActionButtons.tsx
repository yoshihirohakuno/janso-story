import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../engine/store';
import { CallOption, Tile } from '../../engine/types';
import { TileView } from './TileView';

export const ActionButtons: React.FC = () => {
  const { gameState, selectCall, riichiPending, setRiichiPending, isOnlineMode, mySeatIndex } = useGameStore();
  const { activeCalls, turnPhase } = gameState;

  // We are player 0 (local) or mySeatIndex (online)
  const humanIndex = isOnlineMode ? mySeatIndex : 0;
  const myCalls = activeCalls.filter(c => c.playerIndex === humanIndex);

  const [selectedType, setSelectedType] = useState<CallOption['type'] | null>(null);
  const [showMeldChoices, setShowMeldChoices] = useState<CallOption[]>([]);

  // Reset local state when calls change
  useEffect(() => {
    setSelectedType(null);
    setShowMeldChoices([]);
    setRiichiPending(false);
  }, [activeCalls]);

  if (turnPhase === 'agari' || turnPhase === 'ryukyoku' || turnPhase === 'game_over') {
    return null;
  }

  if (myCalls.length === 0 && !riichiPending) {
    return null;
  }

  // Group options by type
  const hasRon = myCalls.some(c => c.type === 'ron');
  const hasTsumo = myCalls.some(c => c.type === 'tsumo');
  const hasRiichi = myCalls.some(c => c.type === 'riichi');
  const hasPon = myCalls.some(c => c.type === 'pon');
  const hasChi = myCalls.some(c => c.type === 'chi');
  const hasKan = myCalls.some(c => c.type === 'kan');
  const hasAnkan = myCalls.some(c => c.type === 'ankan');
  const hasKakan = myCalls.some(c => c.type === 'kakan');

  // Handle clicking a main action button
  const handleActionClick = (type: CallOption['type']) => {
    const matchingOptions = myCalls.filter(c => c.type === type);

    if (type === 'ron' || type === 'tsumo') {
      // Ron/Tsumo execute immediately (no choice needed)
      selectCall(humanIndex, type, matchingOptions[0].tiles);
    } else if (type === 'riichi') {
      // Riichi mode: flag the UI that the user wants to declare Riichi,
      // and let them select a discard.
      setRiichiPending(true);
      // Note: We don't submit the call yet. The call will be submitted
      // when they discard a tile with isRiichi = true.
    } else {
      // For Chi, Pon, Kan, Ankan, Kakan:
      // If there are multiple combinations, show choices. Otherwise, submit immediately.
      if (matchingOptions.length > 1) {
        setSelectedType(type);
        setShowMeldChoices(matchingOptions);
      } else {
        selectCall(humanIndex, type, matchingOptions[0].tiles);
      }
    }
  };

  const handleMeldChoiceSelect = (option: CallOption) => {
    selectCall(humanIndex, option.type, option.tiles);
    setSelectedType(null);
    setShowMeldChoices([]);
  };

  const handlePass = () => {
    if (riichiPending) {
      setRiichiPending(false);
    } else {
      selectCall(humanIndex, 'pass');
    }
  };

  return (
    <div className="action-buttons-overlay">
      {/* Meld Combination Selectors */}
      {showMeldChoices.length > 0 && selectedType && (
        <div className="meld-choice-picker glassmorphic">
          <div className="picker-title">組み合わせを選択してください</div>
          <div className="choices-row">
            {showMeldChoices.map((opt, idx) => (
              <div 
                key={idx} 
                className="choice-card"
                onClick={() => handleMeldChoiceSelect(opt)}
              >
                <div className="choice-tiles">
                  {opt.tiles.map(t => (
                    <TileView key={t.id} tile={t} />
                  ))}
                  {/* Also show the called tile in the combination preview */}
                  {opt.calledTile && (
                    <div className="called-preview-wrapper">
                      <span className="called-tag">鳴き</span>
                      <TileView tile={opt.calledTile} isSideways={true} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Buttons Row */}
      {showMeldChoices.length === 0 && (
        <div className="action-buttons-row">
          {riichiPending && (
            <div className="riichi-guidance-msg">
              リーチ宣言牌を選択して打牌してください
            </div>
          )}

          {!riichiPending && (
            <>
              {hasRon && (
                <button className="action-btn btn-ron glow-animation" onClick={() => handleActionClick('ron')}>
                  ロン
                </button>
              )}
              {hasTsumo && (
                <button className="action-btn btn-tsumo glow-animation" onClick={() => handleActionClick('tsumo')}>
                  ツモ
                </button>
              )}
              {hasRiichi && (
                <button className="action-btn btn-riichi" onClick={() => handleActionClick('riichi')}>
                  リーチ
                </button>
              )}
              {hasPon && (
                <button className="action-btn btn-pon" onClick={() => handleActionClick('pon')}>
                  ポン
                </button>
              )}
              {hasChi && (
                <button className="action-btn btn-chi" onClick={() => handleActionClick('chi')}>
                  チー
                </button>
              )}
              {hasKan && (
                <button className="action-btn btn-kan" onClick={() => handleActionClick('kan')}>
                  カン
                </button>
              )}
              {hasAnkan && (
                <button className="action-btn btn-kan" onClick={() => handleActionClick('ankan')}>
                  暗槓
                </button>
              )}
              {hasKakan && (
                <button className="action-btn btn-kan" onClick={() => handleActionClick('kakan')}>
                  加槓
                </button>
              )}
            </>
          )}

          <button className="action-btn btn-pass" onClick={handlePass}>
            {riichiPending ? 'キャンセル' : 'パス'}
          </button>
        </div>
      )}
    </div>
  );
};
