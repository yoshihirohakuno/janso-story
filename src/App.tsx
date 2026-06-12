import React, { useState } from 'react';
import { useGameStore } from './engine/store';
import { MahjongTable } from './ui/components/MahjongTable';
import { ScoreBoard } from './ui/components/ScoreBoard';
import './ui/index.css';

export const App: React.FC = () => {
  const { isGameStarted, setupNewGame } = useGameStore();

  // Lobby states for name customization
  const [names, setNames] = useState<string[]>(['あなた (自分)', '雀士AI 桐生', '雀士AI 冴島', '雀士AI 真島']);
  const [autos, setAutos] = useState<boolean[]>([false, true, true, true]); // seat 0 is human, others bot

  const handleNameChange = (idx: number, val: string) => {
    const updated = [...names];
    updated[idx] = val;
    setNames(updated);
  };

  const handleAutoToggle = (idx: number) => {
    const updated = [...autos];
    updated[idx] = !updated[idx];
    setAutos(updated);
  };

  const handleStartGame = () => {
    // Start East-South Match (東南戦)
    setupNewGame(names, autos);
  };

  if (!isGameStarted) {
    // Lobby Setup View
    return (
      <div className="lobby-container">
        <div className="lobby-box glassmorphic fade-in">
          <div className="lobby-header">
            <h1>雀荘物語</h1>
            <p className="subtitle">麻雀エンジン開発フェーズ - ローカル対局室</p>
          </div>

          <div className="setup-section">
            <h3>雀士設定 (シーティング)</h3>
            <div className="seating-setup-grid">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className={`seat-setup-row seat-color-${idx}`}>
                  <div className="seat-meta">
                    <span className="seat-index-label">{idx + 1}号席</span>
                    <span className={`default-wind-badge ${idx === 0 ? 'ton' : ''}`}>
                      {['東', '南', '西', '北'][idx]}
                    </span>
                  </div>
                  <input
                    type="text"
                    className="name-input"
                    value={names[idx]}
                    onChange={(e) => handleNameChange(idx, e.target.value)}
                    placeholder={`プレイヤー ${idx + 1}`}
                  />
                  <div className="control-toggle">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={autos[idx]}
                        onChange={() => handleAutoToggle(idx)}
                      />
                      <span className="slider" />
                    </label>
                    <span className="toggle-label">{autos[idx] ? 'AI代打' : '手動操作'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="match-rules-summary">
            <h3>対局ルール</h3>
            <div className="rules-grid">
              <div className="rule-item"><span>配給原点</span><strong>25,000 点</strong></div>
              <div className="rule-item"><span>返り点</span><strong>30,000 点</strong></div>
              <div className="rule-item"><span>形式</span><strong>東南戦 (東南戦完走)</strong></div>
              <div className="rule-item"><span>赤ドラ</span><strong>あり (赤五3枚)</strong></div>
              <div className="rule-item"><span>喰いタン/後付け</span><strong>あり</strong></div>
              <div className="rule-item"><span>ダブロン</span><strong>あり</strong></div>
              <div className="rule-item"><span>切り上げ満貫</span><strong>あり (デフォルト)</strong></div>
              <div className="rule-item"><span>トビ終了</span><strong>あり</strong></div>
            </div>
          </div>

          <button className="start-match-btn glow-animation" onClick={handleStartGame}>
            対局開始 (配牌へ)
          </button>
        </div>
      </div>
    );
  }

  // Active Game View
  return (
    <div className="app-game-layout">
      {/* Game Table Grid */}
      <div className="table-viewport">
        <MahjongTable />
      </div>

      {/* Sidebar Controls and logs */}
      <ScoreBoard />
    </div>
  );
};

export default App;
