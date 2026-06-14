import React, { useState } from 'react';
import { useGameStore } from './engine/store';
import { MahjongTable } from './ui/components/MahjongTable';
import { ScoreBoard } from './ui/components/ScoreBoard';
import { RpgScene } from './rpg/components/RpgScene';
import { useRpgStore } from './rpg/store';
import type { RpgMatchResult } from './rpg/types';
import './ui/index.css';

type AppMode = 'rpg' | 'mahjongLobby' | 'mahjongFromRpg';

export const App: React.FC = () => {
  const { 
    isGameStarted, 
    setupNewGame, 
    endGame,
    announcement,
    isOnlineMode,
    roomCode,
    socket,
    roomPlayers,
    mySeatIndex,
    serverUrl,
    onlineLobbyError,
    connectOnline,
    disconnectOnline,
    createRoomOnline,
    joinRoomOnline,
    startMatchOnline,
    setOnlineMode
  } = useGameStore();

  // Lobby states for name customization
  const [names, setNames] = useState<string[]>(['あなた (自分)', '雀士AI 桐生', '雀士AI 冴島', '雀士AI 真島']);
  const [autos, setAutos] = useState<boolean[]>([false, true, true, true]); // seat 0 is human, others bot
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>('rpg');

  const applyRpgMatchResult = useRpgStore((state) => state.applyMatchResult);
  const currentRpgMatch = useRpgStore((state) => state.currentMatch);

  // Online specific state
  const [activeTab, setActiveTab] = useState<'local' | 'online'>('local');
  const [serverUrlInput, setServerUrlInput] = useState('http://localhost:3001');
  const [joinRoomCode, setJoinRoomCode] = useState('');

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
    setAppMode('mahjongLobby');
    setupNewGame(names, autos);
  };

  const handleStartTutorialMatch = () => {
    setAppMode('mahjongFromRpg');
    setupNewGame(['美咲', '健太', 'タケ爺', '黒川'], [false, true, true, true]);
  };

  const handleRpgMatchComplete = (result: RpgMatchResult) => {
    applyRpgMatchResult(result);
    endGame();
    setSidebarOpen(false);
    setAppMode('rpg');
  };

  const handleMockRpgResult = (victory: boolean) => {
    handleRpgMatchComplete({
      context: currentRpgMatch?.id ?? 'tutorial',
      victory,
      rank: victory ? 1 : 3,
      score: victory ? 42800 : 18400,
      earnedMoney: victory ? 7800 : 1200,
      reputationChange: victory ? 8 : -1,
      unlockedEvents: victory ? ['雀荘を託されるイベント'] : [],
    });
  };

  const handleTabChange = (tab: 'local' | 'online') => {
    setActiveTab(tab);
    if (tab === 'local') {
      disconnectOnline();
    } else {
      setOnlineMode(true);
    }
  };

  if (!isGameStarted && appMode === 'rpg') {
    return (
      <RpgScene
        onStartTutorialMatch={handleStartTutorialMatch}
        onOpenMahjongLobby={() => setAppMode('mahjongLobby')}
      />
    );
  }

  if (!isGameStarted) {
    // Lobby Setup View
    return (
      <div className="lobby-container">
        <div className="lobby-box glassmorphic fade-in">
          <div className="lobby-header">
            <h1>雀荘物語</h1>
            <p className="subtitle">麻雀エンジン開発フェーズ - ローカル対局室</p>
            <button className="rpg-command-btn ghost lobby-rpg-return-btn" type="button" onClick={() => setAppMode('rpg')}>
              RPGへ戻る
            </button>
          </div>

          <div className="lobby-tabs">
            <button 
              className={`lobby-tab-btn ${activeTab === 'local' ? 'active' : ''}`}
              onClick={() => handleTabChange('local')}
            >
              ローカル対局 (シングル)
            </button>
            <button 
              className={`lobby-tab-btn ${activeTab === 'online' ? 'active' : ''}`}
              onClick={() => handleTabChange('online')}
            >
              オンライン対局 (マルチ)
            </button>
          </div>

          {activeTab === 'local' ? (
            <>
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
            </>
          ) : !socket ? (
              <div className="setup-section">
                <h3>オンラインサーバー接続設定</h3>
                {onlineLobbyError && (
                  <div className="lobby-error-banner">
                    <span>⚠️</span> {onlineLobbyError}
                  </div>
                )}
                <div className="seating-setup-grid">
                  <div className="seat-setup-row">
                    <div className="seat-meta">
                      <span className="seat-index-label">プレイヤー名</span>
                    </div>
                    <input
                      type="text"
                      className="name-input"
                      value={names[0]}
                      onChange={(e) => handleNameChange(0, e.target.value)}
                      placeholder="あなたの名前"
                    />
                  </div>
                  <div className="seat-setup-row">
                    <div className="seat-meta">
                      <span className="seat-index-label">接続先サーバー</span>
                    </div>
                    <input
                      type="text"
                      className="name-input"
                      value={serverUrlInput}
                      onChange={(e) => setServerUrlInput(e.target.value)}
                      placeholder="http://localhost:3001"
                    />
                  </div>
                </div>
                <button 
                  className="start-match-btn glow-animation" 
                  onClick={() => connectOnline(serverUrlInput)}
                >
                  サーバーに接続
                </button>
              </div>
            ) : !roomCode ? (
              <div className="setup-section">
                <h3>オンラインルーム選択</h3>
                {onlineLobbyError && (
                  <div className="lobby-error-banner">
                    <span>⚠️</span> {onlineLobbyError}
                  </div>
                )}
                <div className="connection-info-bar">
                  <span>
                    <span className="connection-status-dot"></span>
                    接続中: {serverUrl} (雀士名: {names[0]})
                  </span>
                  <button className="disconnect-link-btn" onClick={disconnectOnline}>
                    切断
                  </button>
                </div>

                <div className="lobby-action-row">
                  <div className="lobby-action-box">
                    <h4>新規に対局室を作る</h4>
                    <p className="subtitle" style={{ margin: '0 0 8px 0' }}>あなたがホストとなり、新規に対局ルームを作成します。</p>
                    <button 
                      className="lobby-btn lobby-btn-primary" 
                      onClick={() => createRoomOnline(names[0])}
                    >
                      対局室を作成する
                    </button>
                  </div>

                  <div className="lobby-action-box">
                    <h4>既存の対局室に入る</h4>
                    <p className="subtitle" style={{ margin: '0 0 8px 0' }}>4桁のルームコードを入力して対局に参加します。</p>
                    <div className="room-code-input-group">
                      <input 
                        type="text" 
                        className="name-input"
                        value={joinRoomCode}
                        onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                        placeholder="ABCD"
                        maxLength={4}
                        style={{ textTransform: 'uppercase', textAlign: 'center', letterSpacing: '2px', fontWeight: 'bold' }}
                      />
                      <button 
                        className="lobby-btn lobby-btn-primary"
                        onClick={() => joinRoomOnline(joinRoomCode, names[0])}
                        disabled={joinRoomCode.length !== 4}
                      >
                        参加する
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="setup-section">
                <div className="lobby-room-code-display">
                  <div className="room-code-label">対局室 ルームコード</div>
                  <div className="room-code-value">{roomCode}</div>
                  <p className="subtitle" style={{ margin: 0 }}>この4桁コードを他のプレイヤーに共有して対戦しましょう！</p>
                </div>

                <div className="lobby-players-panel">
                  <h3>入室中の雀士</h3>
                  <div className="lobby-players-grid">
                    {Array.from({ length: 4 }).map((_, seatIdx) => {
                      const player = roomPlayers.find(p => p.seatIndex === seatIdx);
                      const isMe = seatIdx === mySeatIndex;
                      
                      return (
                        <div 
                          key={seatIdx} 
                          className={`lobby-player-slot ${player ? 'occupied' : ''} ${isMe ? 'me' : ''}`}
                        >
                          <div className="slot-player-info">
                            <span className={`slot-index ${isMe ? 'me' : ''}`}>
                              {seatIdx + 1}
                            </span>
                            <span className="slot-name">
                              {player ? player.name : '空席 (AI代打)'}
                            </span>
                          </div>
                          {player && (
                            <span className={`slot-status-badge ${seatIdx === 0 ? 'host' : 'ready'}`}>
                              {seatIdx === 0 ? 'ホスト' : '準備完了'}
                            </span>
                          )}
                          {!player && (
                            <span className="slot-status-badge waiting">待機中</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="lobby-action-row" style={{ gridTemplateColumns: mySeatIndex === 0 ? '1fr 2fr' : '1fr' }}>
                  <button 
                    className="lobby-btn leave-lobby-btn" 
                    onClick={disconnectOnline}
                  >
                    対局室を退室する
                  </button>
                  {mySeatIndex === 0 && (
                    <button 
                      className="lobby-btn lobby-btn-primary glow-animation" 
                      onClick={startMatchOnline}
                    >
                      対局開始 (空席はAI代打)
                    </button>
                  )}
                </div>
                
                {mySeatIndex !== 0 && (
                  <div className="lobby-waiting-msg font-pulse">
                    🔄 ホストが対局を開始するのを待っています...
                  </div>
                )}
              </div>
          )}
        </div>
      </div>
    );
  }

  // Helper to translate action type to visual text
  const getAnnouncementText = (type: string): string => {
    switch (type) {
      case 'riichi': return '立直 (REACH)';
      case 'chi': return 'チー (CHI)';
      case 'pon': return 'ポン (PON)';
      case 'kan':
      case 'ankan':
      case 'kakan':
        return 'カン (KAN)';
      case 'ron': return 'ロン (RON)';
      case 'tsumo': return 'ツモ (TSUMO)';
      default: return type.toUpperCase();
    }
  };

  // Active Game View
  return (
    <div className={`app-game-layout ${sidebarOpen ? 'sidebar-active' : 'sidebar-collapsed'}`}>
      {/* Game Table Grid */}
      <div className="table-viewport">
        {appMode === 'mahjongFromRpg' && (
          <div className="rpg-match-bridge">
            <span>{currentRpgMatch?.title ?? 'RPGイベント対局'}</span>
            <button className="rpg-match-bridge-btn primary" type="button" onClick={() => handleMockRpgResult(true)}>
              勝利結果を反映
            </button>
            <button className="rpg-match-bridge-btn" type="button" onClick={() => handleMockRpgResult(false)}>
              敗北結果を反映
            </button>
          </div>
        )}
        {isOnlineMode && roomCode && (
          <div className="room-info-gamebar">
            <span className="connection-status-dot"></span>
            <span>オンライン対局中 - 対局室: <strong className="room-info-gamebar-code">{roomCode}</strong></span>
          </div>
        )}
        <MahjongTable
          onMatchComplete={appMode === 'mahjongFromRpg' ? handleRpgMatchComplete : undefined}
          matchContext={currentRpgMatch?.id ?? 'tutorial'}
          matchReturnLabel="対局結果をRPGへ返す"
        />
        
        {/* Toggle Sidebar Button */}
        <button 
          className="sidebar-toggle-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? "ログ・スコアを非表示" : "ログ・スコアを表示"}
        >
          {sidebarOpen ? '✕' : '📋'}
        </button>
        
        {/* Full-screen neon announcement overlay */}
        {announcement && (
          <div className={`action-announcement-overlay type-${announcement.type}`}>
            <div className="announcement-content">
              <span className="announcement-player">{announcement.playerName}</span>
              <h2 className="announcement-text">{getAnnouncementText(announcement.type)}</h2>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Controls and logs */}
      <ScoreBoard />
    </div>
  );
};

export default App;
