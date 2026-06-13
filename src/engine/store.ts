import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { GameState, Tile, CallOption, PlayerState } from './types';
import { initGame, startRound, drawTile, discardTile, submitCall, advanceRound } from './game';

interface GameStore {
  gameState: GameState;
  cheatMode: boolean;
  isGameStarted: boolean;
  gameLogs: string[];
  announcement: { type: string; playerName: string } | null;
  riichiPending: boolean;
  
  // Online Mode variables
  isOnlineMode: boolean;
  roomCode: string | null;
  socket: Socket | null;
  roomPlayers: any[];
  mySeatIndex: number;
  serverUrl: string;
  onlineLobbyError: string | null;
  
  // Actions
  setupNewGame: (names?: string[], autos?: boolean[]) => void;
  startNextRound: () => void;
  discard: (tileId: number, isRiichi?: boolean) => void;
  selectCall: (playerIndex: number, type: CallOption['type'], tiles?: Tile[]) => void;
  confirmRoundEnd: () => void;
  toggleCheatMode: () => void;
  addLog: (msg: string) => void;
  runBotTurns: () => void;
  setRiichiPending: (pending: boolean) => void;
  
  // Online Actions
  connectOnline: (url: string) => void;
  disconnectOnline: () => void;
  createRoomOnline: (playerName: string) => void;
  joinRoomOnline: (roomCode: string, playerName: string) => void;
  startMatchOnline: () => void;
  setOnlineMode: (isOnline: boolean) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: initGame(),
  cheatMode: false,
  isGameStarted: false,
  gameLogs: [],
  announcement: null,
  riichiPending: false,

  // Online Mode default state
  isOnlineMode: false,
  roomCode: null,
  socket: null,
  roomPlayers: [],
  mySeatIndex: 0,
  serverUrl: 'http://localhost:3001',
  onlineLobbyError: null,

  setRiichiPending: (pending) => set({ riichiPending: pending }),

  setOnlineMode: (isOnline) => set({ isOnlineMode: isOnline }),

  connectOnline: (url) => {
    const currentSocket = get().socket;
    if (currentSocket) {
      currentSocket.disconnect();
    }
    
    // Connect to server
    const newSocket = io(url);
    
    newSocket.on('connect', () => {
      console.log('Connected to multiplayer server:', url);
      set({ onlineLobbyError: null });
    });

    newSocket.on('connect_error', () => {
      set({ onlineLobbyError: 'サーバーに接続できません。IPアドレス/ポートを確認してください。' });
    });

    newSocket.on('lobby_update', ({ roomPlayers }) => {
      set({ roomPlayers });
    });

    newSocket.on('state_update', ({ gameState, roomPlayers }) => {
      set({
        gameState,
        roomPlayers,
        isGameStarted: true,
        // Sync logs from the authoritative state if possible, or append new logs
        gameLogs: gameState.yakuResults 
          ? [...get().gameLogs, `🏆 ${gameState.players[gameState.winnerIndices[0]].name} があがりました！`]
          : get().gameLogs
      });
    });

    set({ socket: newSocket, serverUrl: url });
  },

  disconnectOnline: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({
      socket: null,
      isOnlineMode: false,
      roomCode: null,
      roomPlayers: [],
      mySeatIndex: 0,
      isGameStarted: false,
      gameState: initGame(),
      gameLogs: []
    });
  },

  createRoomOnline: (playerName) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('create_room', { playerName }, (res: any) => {
      if (res.success) {
        set({
          roomCode: res.roomCode,
          mySeatIndex: res.seatIndex,
          roomPlayers: [{ socketId: socket.id, name: playerName, seatIndex: 0, isAuto: false }],
          onlineLobbyError: null
        });
      } else {
        set({ onlineLobbyError: res.error });
      }
    });
  },

  joinRoomOnline: (roomCode, playerName) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('join_room', { roomCode, playerName }, (res: any) => {
      if (res.success) {
        set({
          roomCode: res.roomCode,
          mySeatIndex: res.seatIndex,
          onlineLobbyError: null
        });
      } else {
        set({ onlineLobbyError: res.error });
      }
    });
  },

  startMatchOnline: () => {
    const { socket } = get();
    if (!socket) return;
    socket.emit('start_match');
  },

  setupNewGame: (names, autos) => {
    const initialState = initGame(names, autos);
    const roundStartedState = startRound(initialState);
    set({
      gameState: roundStartedState,
      isGameStarted: true,
      gameLogs: ['東風戦を開始しました。', '東1局 配牌を行いました。'],
    });
    setTimeout(() => get().runBotTurns(), 1000);
  },

  startNextRound: () => {
    const state = get().gameState;
    const nextState = startRound(state);
    const roundName = `${nextState.wind === 'E' ? '東' : '南'}${nextState.roundNumber}局`;
    set({
      gameState: nextState,
      gameLogs: [...get().gameLogs, `${roundName} ${nextState.honba}本場 開始しました。`],
    });
    setTimeout(() => get().runBotTurns(), 1000);
  },

  discard: (tileId: number, isRiichi = false) => {
    const { isOnlineMode, socket } = get();
    if (isOnlineMode && socket) {
      socket.emit('discard', { tileId, isRiichi });
      set({ riichiPending: false });
      return;
    }

    const state = get().gameState;
    const player = state.players[state.activePlayerIndex];
    const tile = player.hand.find(t => t.id === tileId);
    
    let suitChar = '';
    if (tile) {
      if (tile.suit === 'm') suitChar = '萬';
      else if (tile.suit === 'p') suitChar = '筒';
      else if (tile.suit === 's') suitChar = '索';
      else {
        suitChar = ['東', '南', '西', '北', '白', '發', '中'][tile.value - 1];
      }
    }
    const tileName = tile?.suit === 'z' ? suitChar : `${tile?.isRed ? '赤' : ''}${tile?.value}${suitChar}`;
    const actionLog = `${player.name}が ${tileName} を打牌${isRiichi ? '（立直）' : ''}`;

    const nextState = discardTile(state, state.activePlayerIndex, tileId, isRiichi);
    
    if (isRiichi) {
      set({ announcement: { type: 'riichi', playerName: player.name }, riichiPending: false });
      setTimeout(() => {
        set({ announcement: null });
      }, 1000);
    }

    set({
      gameState: nextState,
      gameLogs: [...get().gameLogs, actionLog],
    });

    setTimeout(() => get().runBotTurns(), 1000);
  },

  selectCall: (playerIndex, type, tiles = []) => {
    const { isOnlineMode, socket } = get();
    if (isOnlineMode && socket) {
      socket.emit('submit_call', { type, tiles });
      return;
    }

    const state = get().gameState;
    const player = state.players[playerIndex];
    let callLog = '';
    
    if (type !== 'pass') {
      set({ announcement: { type, playerName: player.name } });
      setTimeout(() => {
        set({ announcement: null });
      }, 1000);
    }
    
    if (type === 'ron') {
      callLog = `🔔 ${player.name} がロンを宣言！`;
    } else if (type === 'tsumo') {
      callLog = `🔔 ${player.name} がツモを宣言！`;
    } else if (type === 'pon') {
      callLog = `📢 ${player.name} がポンを宣言`;
    } else if (type === 'chi') {
      callLog = `📢 ${player.name} がチーを宣言`;
    } else if (type === 'kan' || type === 'ankan' || type === 'kakan') {
      callLog = `📢 ${player.name} がカンを宣言`;
    } else if (type === 'riichi') {
      callLog = `⚡ ${player.name} がリーチを宣言！`;
    }

    const nextState = submitCall(state, playerIndex, type, tiles);

    let nextLogs = [...get().gameLogs];
    if (callLog) nextLogs.push(callLog);

    if (nextState.turnPhase === 'agari' && nextState.yakuResults) {
      for (const res of nextState.yakuResults) {
        const pName = nextState.players[res.playerIndex].name;
        nextLogs.push(`🏆 和了者: ${pName}`);
        nextLogs.push(`役: ${res.yakuList.join(', ')} (${res.han}翻 ${res.fu}符)`);
        nextLogs.push(`得点: ${res.points}点`);
      }
    } else if (nextState.turnPhase === 'ryukyoku') {
      nextLogs.push('流局しました。');
    }

    set({
      gameState: nextState,
      gameLogs: nextLogs,
    });

    const delay = type === 'pass' ? 200 : 1000;
    setTimeout(() => get().runBotTurns(), delay);
  },

  confirmRoundEnd: () => {
    const { isOnlineMode, socket } = get();
    if (isOnlineMode && socket) {
      socket.emit('confirm_next_round');
      return;
    }

    const state = get().gameState;
    const nextState = advanceRound(state);
    
    let logMsg = '';
    if (nextState.turnPhase === 'game_over') {
      const tobiPlayer = state.players.find(p => p.score < 0);
      if (tobiPlayer) {
        logMsg = `⚠️ ${tobiPlayer.name} が 0点未満（トビ）となったため、対局終了となりました。最終結果を表示します。`;
      } else {
        logMsg = '対局終了しました。最終結果を表示します。';
      }
    } else {
      const roundName = `${nextState.wind === 'E' ? '東' : '南'}${nextState.roundNumber}局`;
      logMsg = `${roundName} ${nextState.honba}本場 配牌を行いました。`;
    }

    set({
      gameState: nextState,
      gameLogs: [...get().gameLogs, logMsg],
    });

    setTimeout(() => get().runBotTurns(), 1000);
  },

  toggleCheatMode: () => {
    set(state => ({ cheatMode: !state.cheatMode }));
  },

  addLog: (msg) => {
    set(state => ({ gameLogs: [...state.gameLogs, msg] }));
  },

  runBotTurns: () => {
    const { gameState, isOnlineMode } = get();
    // In Online Mode, bot turns are automated entirely on the server side
    if (isOnlineMode) return;

    const { activePlayerIndex, turnPhase, players, activeCalls } = gameState;

    if (turnPhase === 'game_over' || turnPhase === 'agari' || turnPhase === 'ryukyoku') {
      return;
    }

    if (turnPhase === 'wait_call' && activeCalls.length > 0) {
      const botCalls = activeCalls.filter(c => players[c.playerIndex].isAuto);
      if (botCalls.length > 0) {
        const ronCall = botCalls.find(c => c.type === 'ron');
        if (ronCall) {
          get().selectCall(ronCall.playerIndex, 'ron');
          return;
        }
        const passCall = botCalls[0];
        get().selectCall(passCall.playerIndex, 'pass');
        return;
      }
      return;
    }

    const activePlayer = players[activePlayerIndex];
    if (activePlayer.isAuto) {
      if (turnPhase === 'draw') {
        const nextState = drawTile(gameState);
        set({ gameState: nextState });
        setTimeout(() => get().runBotTurns(), 800);
      } else if (turnPhase === 'discard') {
        const tsumoOption = activeCalls.find(c => c.playerIndex === activePlayerIndex && c.type === 'tsumo');
        if (tsumoOption) {
          get().selectCall(activePlayerIndex, 'tsumo');
          return;
        }
        const discardTileObj = gameState.drawnTile || activePlayer.hand[activePlayer.hand.length - 1];
        get().discard(discardTileObj.id);
      }
    } else {
      if (activePlayer.isRiichi || activePlayer.isDoubleRiichi) {
        if (turnPhase === 'discard') {
          const myCalls = activeCalls.filter(c => c.playerIndex === activePlayerIndex);
          if (myCalls.length === 0) {
            const discardTileObj = gameState.drawnTile || activePlayer.hand[activePlayer.hand.length - 1];
            if (discardTileObj) {
              setTimeout(() => {
                const latestState = get().gameState;
                if (
                  latestState.activePlayerIndex === activePlayerIndex &&
                  latestState.turnPhase === 'discard' &&
                  !latestState.players[activePlayerIndex].isAuto &&
                  (latestState.players[activePlayerIndex].isRiichi || latestState.players[activePlayerIndex].isDoubleRiichi)
                ) {
                  const latestCalls = latestState.activeCalls.filter(c => c.playerIndex === activePlayerIndex);
                  if (latestCalls.length === 0) {
                    get().discard(discardTileObj.id, false);
                  }
                }
              }, 1000);
            }
          }
        }
      }
    }
  }
}));
