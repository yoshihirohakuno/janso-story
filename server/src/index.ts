import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { initGame, startRound, drawTile, discardTile, submitCall, advanceRound } from '../../src/engine/game.js';
import { GameState, Tile } from '../../src/engine/types.js';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

interface OnlinePlayer {
  socketId: string;
  name: string;
  seatIndex: number;
  isAuto: boolean;
}

interface Room {
  code: string;
  players: OnlinePlayer[];
  gameState: GameState | null;
  isStarted: boolean;
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>(); // socketId -> roomCode

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function broadcastState(room: Room) {
  io.to(room.code).emit('state_update', {
    gameState: room.gameState,
    roomPlayers: room.players
  });
}

function runServerBotTurns(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || !room.gameState || !room.isStarted) return;
  const { gameState } = room;
  const { activePlayerIndex, turnPhase, players, activeCalls } = gameState;

  if (turnPhase === 'game_over' || turnPhase === 'agari' || turnPhase === 'ryukyoku') {
    return;
  }

  // 1. Handle Active Call decisions for bots
  if (turnPhase === 'wait_call' && activeCalls.length > 0) {
    const botCalls = activeCalls.filter(c => players[c.playerIndex].isAuto);
    if (botCalls.length > 0) {
      const ronCall = botCalls.find(c => c.type === 'ron');
      if (ronCall) {
        room.gameState = submitCall(gameState, ronCall.playerIndex, 'ron');
        broadcastState(room);
        setTimeout(() => runServerBotTurns(roomCode), 1000);
        return;
      }
      const passCall = botCalls[0];
      room.gameState = submitCall(gameState, passCall.playerIndex, 'pass');
      broadcastState(room);
      const delay = passCall.type === 'pass' ? 200 : 1000;
      setTimeout(() => runServerBotTurns(roomCode), delay);
      return;
    }
    return; // Humans have active calls, wait for them
  }

  // 2. Handle Bot normal drawing/discarding
  const activePlayer = players[activePlayerIndex];
  if (activePlayer.isAuto) {
    if (turnPhase === 'draw') {
      room.gameState = drawTile(gameState);
      broadcastState(room);
      setTimeout(() => runServerBotTurns(roomCode), 800);
    } else if (turnPhase === 'discard') {
      const tsumoOption = activeCalls.find(c => c.playerIndex === activePlayerIndex && c.type === 'tsumo');
      if (tsumoOption) {
        room.gameState = submitCall(gameState, activePlayerIndex, 'tsumo');
        broadcastState(room);
        setTimeout(() => runServerBotTurns(roomCode), 1000);
        return;
      }
      const discardTileObj = gameState.drawnTile || activePlayer.hand[activePlayer.hand.length - 1];
      room.gameState = discardTile(gameState, activePlayerIndex, discardTileObj.id, false);
      broadcastState(room);
      setTimeout(() => runServerBotTurns(roomCode), 1000);
    }
  } else {
    // 3. Handle Human player in Riichi (auto-discard on server)
    if (activePlayer.isRiichi || activePlayer.isDoubleRiichi) {
      if (turnPhase === 'discard') {
        const myCalls = activeCalls.filter(c => c.playerIndex === activePlayerIndex);
        if (myCalls.length === 0) {
          const discardTileObj = gameState.drawnTile || activePlayer.hand[activePlayer.hand.length - 1];
          if (discardTileObj) {
            setTimeout(() => {
              const latestRoom = rooms.get(roomCode);
              if (
                latestRoom &&
                latestRoom.gameState &&
                latestRoom.gameState.activePlayerIndex === activePlayerIndex &&
                latestRoom.gameState.turnPhase === 'discard' &&
                !latestRoom.gameState.players[activePlayerIndex].isAuto &&
                (latestRoom.gameState.players[activePlayerIndex].isRiichi || latestRoom.gameState.players[activePlayerIndex].isDoubleRiichi)
              ) {
                const latestCalls = latestRoom.gameState.activeCalls.filter(c => c.playerIndex === activePlayerIndex);
                if (latestCalls.length === 0) {
                  latestRoom.gameState = discardTile(latestRoom.gameState, activePlayerIndex, discardTileObj.id, false);
                  broadcastState(latestRoom);
                  setTimeout(() => runServerBotTurns(roomCode), 1000);
                }
              }
            }, 1000);
          }
        }
      }
    }
  }
}

io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create room
  socket.on('create_room', ({ playerName }, callback) => {
    const code = generateCode();
    const room: Room = {
      code,
      players: [{
        socketId: socket.id,
        name: playerName || 'Player 1',
        seatIndex: 0,
        isAuto: false
      }],
      gameState: null,
      isStarted: false
    };
    rooms.set(code, room);
    socketToRoom.set(socket.id, code);
    socket.join(code);
    console.log(`Room created: ${code} by ${playerName}`);
    callback({ success: true, roomCode: code, seatIndex: 0 });
  });

  // Join room
  socket.on('join_room', ({ roomCode, playerName }, callback) => {
    const code = roomCode.toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      return callback({ success: false, error: '部屋が見つかりません' });
    }
    if (room.isStarted) {
      return callback({ success: false, error: '対局は既に開始されています' });
    }
    if (room.players.length >= 4) {
      return callback({ success: false, error: '満員です' });
    }

    const seatIndex = room.players.length;
    const newPlayer: OnlinePlayer = {
      socketId: socket.id,
      name: playerName || `Player ${seatIndex + 1}`,
      seatIndex,
      isAuto: false
    };

    room.players.push(newPlayer);
    socketToRoom.set(socket.id, code);
    socket.join(code);
    console.log(`User ${playerName} joined room: ${code}`);

    callback({ success: true, roomCode: code, seatIndex });
    
    // Broadcast updated player list
    io.to(code).emit('lobby_update', { roomPlayers: room.players });
  });

  // Start match
  socket.on('start_match', () => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (!room || room.isStarted) return;

    room.isStarted = true;

    // Fill remaining seats with bots
    const names = new Array(4).fill('');
    const autos = new Array(4).fill(true);
    room.players.forEach(p => {
      names[p.seatIndex] = p.name;
      autos[p.seatIndex] = false;
    });

    for (let i = 0; i < 4; i++) {
      if (!names[i]) {
        names[i] = `AI プレイヤー ${i + 1}`;
        autos[i] = true;
        room.players.push({
          socketId: 'bot',
          name: names[i],
          seatIndex: i,
          isAuto: true
        });
      }
    }

    room.gameState = initGame(names, autos);
    room.gameState = startRound(room.gameState);

    broadcastState(room);

    // Run first bot turns if dealer is a bot
    setTimeout(() => runServerBotTurns(code), 1000);
  });

  // Player action: Discard tile
  socket.on('discard', ({ tileId, isRiichi }) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (!room || !room.gameState) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player || player.seatIndex !== room.gameState.activePlayerIndex) return;

    room.gameState = discardTile(room.gameState, player.seatIndex, tileId, isRiichi);
    broadcastState(room);

    setTimeout(() => runServerBotTurns(code), 1000);
  });

  // Player action: Submit meld/call option
  socket.on('submit_call', ({ type, tiles }) => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (!room || !room.gameState) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    room.gameState = submitCall(room.gameState, player.seatIndex, type, tiles);
    broadcastState(room);

    const delay = type === 'pass' ? 200 : 1000;
    setTimeout(() => runServerBotTurns(code), delay);
  });

  // Next round confirmation
  socket.on('confirm_next_round', () => {
    const code = socketToRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (!room || !room.gameState) return;

    room.gameState = advanceRound(room.gameState);
    if (room.gameState.turnPhase !== 'game_over') {
      room.gameState = startRound(room.gameState);
    }
    broadcastState(room);

    setTimeout(() => runServerBotTurns(code), 1000);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const code = socketToRoom.get(socket.id);
    if (code) {
      const room = rooms.get(code);
      if (room) {
        const idx = room.players.findIndex(p => p.socketId === socket.id);
        if (idx !== -1) {
          if (room.isStarted) {
            // If the game started, turn the disconnected human player into an AI bot so game doesn't halt
            room.players[idx].isAuto = true;
            room.players[idx].socketId = 'disconnected';
            if (room.gameState) {
              room.gameState.players[idx].isAuto = true;
            }
            console.log(`User ${room.players[idx].name} disconnected. Replaced with Bot.`);
            broadcastState(room);
            // Trigger bot turn checks
            setTimeout(() => runServerBotTurns(code), 1000);
          } else {
            // Remove from lobby
            const removed = room.players.splice(idx, 1)[0];
            console.log(`User ${removed.name} left lobby: ${code}`);
            if (room.players.length === 0) {
              rooms.delete(code);
              console.log(`Room ${code} deleted (empty)`);
            } else {
              io.to(code).emit('lobby_update', { roomPlayers: room.players });
            }
          }
        }
      }
      socketToRoom.delete(socket.id);
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Multiplayer WebSocket server running on port ${PORT}`);
});
