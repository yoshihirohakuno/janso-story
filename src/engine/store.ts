import { create } from 'zustand';
import { GameState, Tile, CallOption, PlayerState } from './types';
import { initGame, startRound, drawTile, discardTile, submitCall, advanceRound } from './game';

interface GameStore {
  gameState: GameState;
  cheatMode: boolean;
  isGameStarted: boolean;
  gameLogs: string[];
  
  // Actions
  setupNewGame: (names?: string[], autos?: boolean[]) => void;
  startNextRound: () => void;
  discard: (tileId: number, isRiichi?: boolean) => void;
  selectCall: (playerIndex: number, type: CallOption['type'], tiles?: Tile[]) => void;
  confirmRoundEnd: () => void;
  toggleCheatMode: () => void;
  addLog: (msg: string) => void;
  runBotTurns: () => void; // Triggered to automate bot actions
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: initGame(),
  cheatMode: false,
  isGameStarted: false,
  gameLogs: [],

  setupNewGame: (names, autos) => {
    const initialState = initGame(names, autos);
    const roundStartedState = startRound(initialState);
    set({
      gameState: roundStartedState,
      isGameStarted: true,
      gameLogs: ['東風戦を開始しました。', '東1局 配牌を行いました。'],
    });
    // Run initial bot turns if dealer is bot
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
    
    set({
      gameState: nextState,
      gameLogs: [...get().gameLogs, actionLog],
    });

    // Run bot triggers
    setTimeout(() => get().runBotTurns(), 1000);
  },

  selectCall: (playerIndex, type, tiles = []) => {
    const state = get().gameState;
    const player = state.players[playerIndex];
    let callLog = '';
    
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

    // If it's a win, print yaku details
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

    // If it's a pass decision, run next step quickly (e.g. 200ms) to avoid sluggishness.
    // Otherwise wait 1000ms so the user can see the call action.
    const delay = type === 'pass' ? 200 : 1000;
    setTimeout(() => get().runBotTurns(), delay);
  },

  confirmRoundEnd: () => {
    const state = get().gameState;
    const nextState = advanceRound(state);
    
    let logMsg = '';
    if (nextState.turnPhase === 'game_over') {
      logMsg = '対局終了しました。最終結果を表示します。';
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

  // Automated gameplay loop for bots
  runBotTurns: () => {
    const { gameState, runBotTurns } = get();
    const { activePlayerIndex, turnPhase, players, activeCalls } = gameState;

    if (turnPhase === 'game_over' || turnPhase === 'agari' || turnPhase === 'ryukyoku') {
      return;
    }

    // 1. Handle Active Call decisions for bots
    if (turnPhase === 'wait_call' && activeCalls.length > 0) {
      // Find any bots with call options
      const botCalls = activeCalls.filter(c => players[c.playerIndex].isAuto);
      if (botCalls.length > 0) {
        // Find if any bot can Ron
        const ronCall = botCalls.find(c => c.type === 'ron');
        if (ronCall) {
          // Bot Rons!
          get().selectCall(ronCall.playerIndex, 'ron');
          return;
        }
        
        // Otherwise bots pass on Pon/Chi/Kan
        // We pass for the first bot call option we find
        const passCall = botCalls[0];
        get().selectCall(passCall.playerIndex, 'pass');
        return;
      }
      return; // Humans have active calls, wait for them
    }

    // 2. Handle Bot normal drawing/discarding
    const activePlayer = players[activePlayerIndex];
    if (activePlayer.isAuto) {
      if (turnPhase === 'draw') {
        // Draw tile
        const nextState = drawTile(gameState);
        set({ gameState: nextState });
        setTimeout(() => get().runBotTurns(), 800); // 800ms thinking delay
      } else if (turnPhase === 'discard') {
        // Bot has drawn or has calls, needs to discard
        // If bot can declare Tsumo, let them win!
        const tsumoOption = activeCalls.find(c => c.playerIndex === activePlayerIndex && c.type === 'tsumo');
        if (tsumoOption) {
          get().selectCall(activePlayerIndex, 'tsumo');
          return;
        }

        // If bot can declare Riichi, let them do it?
        // To keep bot simple, they just discard.
        // Bot selects a discard.
        // Standard bot: discard the drawn tile (tsumogiri) or just discard the last tile in hand
        const discardTileObj = gameState.drawnTile || activePlayer.hand[activePlayer.hand.length - 1];
        get().discard(discardTileObj.id);
      }
    }
  }
}));
