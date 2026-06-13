import { setupWall } from './wall';
import { calculateShanten, tileToIndex } from './shanten';
import { evaluateHand } from './yaku';
import { calculatePoints, redistributeScores, roundUp100 } from './scoring';
import { sortTiles } from './constants';
const STARTING_SCORE = 25000;
// Initialize a new game state (match start)
export function initGame(playerNames = ['Player 1', 'Player 2', 'Player 3', 'Player 4'], playerIsAuto = [false, true, true, true]) {
    const players = playerNames.map((name, idx) => ({
        id: idx,
        name,
        score: STARTING_SCORE,
        hand: [],
        melds: [],
        discards: [],
        isRiichi: false,
        isDoubleRiichi: false,
        riichiTurn: null,
        isIppatsu: false,
        seatWind: ['E', 'S', 'W', 'N'][idx],
        isFuriten: false,
        isAuto: playerIsAuto[idx],
    }));
    const initialDeck = setupWall();
    return {
        wind: 'E',
        roundNumber: 1,
        honba: 0,
        kyoutaku: 0,
        dealerIndex: 0,
        wall: initialDeck.wall,
        deadWall: initialDeck.deadWall,
        doraIndicators: initialDeck.doraIndicators,
        uraDoraIndicators: initialDeck.uraDoraIndicators,
        players,
        activePlayerIndex: 0,
        turnPhase: 'draw',
        lastDiscard: null,
        lastDiscardPlayer: null,
        drawnTile: null,
        isFirstTurn: true,
        winnerIndices: null,
        yakuResults: null,
        scoreChanges: null,
        activeCalls: [],
        selectedCallPlayer: null,
        wallIndex: 0
    };
}
// Start a new round (deals tiles, resets round variables, keeps scores)
export function startRound(state) {
    const next = { ...state };
    const wallSetup = setupWall();
    next.wall = wallSetup.wall;
    next.deadWall = wallSetup.deadWall;
    next.doraIndicators = wallSetup.doraIndicators;
    next.uraDoraIndicators = wallSetup.uraDoraIndicators;
    next.wallIndex = 0;
    next.isFirstTurn = true;
    next.lastDiscard = null;
    next.lastDiscardPlayer = null;
    next.winnerIndices = null;
    next.yakuResults = null;
    next.scoreChanges = null;
    next.activeCalls = [];
    next.selectedCallPlayer = null;
    // Seating wind rotation
    // SeatWind of player i = (i - dealerIndex + 4) % 4
    const windCycle = ['E', 'S', 'W', 'N'];
    next.players = next.players.map((p, idx) => {
        const seatOffset = (idx - next.dealerIndex + 4) % 4;
        return {
            ...p,
            hand: [],
            melds: [],
            discards: [],
            isRiichi: false,
            isDoubleRiichi: false,
            riichiTurn: null,
            isIppatsu: false,
            seatWind: windCycle[seatOffset],
            isFuriten: false,
        };
    });
    // Deal hands: Parent gets 14, children get 13
    // Live wall index tracker
    let dealIdx = 0;
    for (let i = 0; i < 4; i++) {
        const playerIdx = (next.dealerIndex + i) % 4;
        const drawCount = playerIdx === next.dealerIndex ? 14 : 13;
        const handTiles = next.wall.slice(dealIdx, dealIdx + drawCount);
        next.players[playerIdx].hand = sortTiles(handTiles);
        dealIdx += drawCount;
    }
    next.wallIndex = dealIdx;
    next.activePlayerIndex = next.dealerIndex;
    // If dealer has 14 tiles, they are in the 'discard' phase immediately (they already drew their 14th tile)
    const dealer = next.players[next.dealerIndex];
    next.drawnTile = dealer.hand[13]; // Last tile dealt
    next.turnPhase = 'discard';
    // Check dealer's starting hand for Tenhou or Kyuushu Kyuuhei
    next.activeCalls = calculateDrawPhaseCalls(next, next.dealerIndex, next.drawnTile);
    return next;
}
// Draw a tile for the active player
export function drawTile(state) {
    const next = { ...state };
    const player = next.players[next.activePlayerIndex];
    // Check if live wall is empty
    const normalDrawLimit = 122; // 136 - 14 dead wall tiles
    if (next.wallIndex >= normalDrawLimit) {
        return handleExhaustiveDraw(next);
    }
    // Draw tile
    const tile = next.wall[next.wallIndex];
    next.wallIndex++;
    next.drawnTile = tile;
    // Add to player hand
    player.hand = [...player.hand, tile];
    next.turnPhase = 'discard';
    // Check for Tsumo, Ankan, Kakan, Riichi
    next.activeCalls = calculateDrawPhaseCalls(next, next.activePlayerIndex, tile);
    return next;
}
// Discard a tile
export function discardTile(state, playerIndex, tileId, isRiichiDeclaration = false) {
    const next = { ...state };
    const player = next.players[playerIndex];
    // Find tile in hand
    const tileIdxInHand = player.hand.findIndex(t => t.id === tileId);
    if (tileIdxInHand === -1)
        return state; // Invalid tile
    const tile = player.hand[tileIdxInHand];
    // Remove from hand
    const newHand = [...player.hand];
    newHand.splice(tileIdxInHand, 1);
    player.hand = sortTiles(newHand);
    const isTsumogiri = next.drawnTile !== null && next.drawnTile.id === tileId;
    next.drawnTile = null;
    // Clear Ippatsu if we are discarding and it was not a win
    if (player.isIppatsu && !isRiichiDeclaration) {
        player.isIppatsu = false;
    }
    // Create discard entry
    const discard = {
        tile,
        isRiichi: isRiichiDeclaration,
        isCalled: false,
        isTsumogiri,
    };
    player.discards.push(discard);
    // If declaring Riichi:
    if (isRiichiDeclaration) {
        if (next.isFirstTurn) {
            player.isDoubleRiichi = true;
        }
        else {
            player.isRiichi = true;
        }
        player.riichiTurn = player.discards.length;
        player.isIppatsu = true;
    }
    next.lastDiscard = tile;
    next.lastDiscardPlayer = playerIndex;
    // Update Furiten states for all players
    updateFuritenStates(next);
    // Check if other players can call (Ron, Pon, Kan, Chi) on this discard
    const calls = calculateDiscardPhaseCalls(next, playerIndex, tile);
    if (calls.length > 0) {
        next.activeCalls = calls;
        next.turnPhase = 'wait_call';
    }
    else {
        // If someone declared Riichi and it wasn't called: pay 1000 points
        if (isRiichiDeclaration) {
            player.score -= 1000;
            next.kyoutaku += 1;
        }
        // Advance to next player
        next.activePlayerIndex = (playerIndex + 1) % 4;
        next.turnPhase = 'draw';
        // First turn cycle ends if we reach dealer again or if any call was made
        if (next.activePlayerIndex === next.dealerIndex) {
            next.isFirstTurn = false;
        }
        // Check special draws
        if (checkSpecialDraws(next)) {
            return next;
        }
        return drawTile(next);
    }
    return next;
}
// Process a call action (Chi, Pon, Kan, Riichi, Tsumo, Ron, Ankan, Kakan, Pass)
export function submitCall(state, playerIndex, callType, tiles = []) {
    const next = { ...state };
    // Find player's call option
    const option = next.activeCalls.find(c => c.playerIndex === playerIndex && c.type === callType);
    if (!option && callType !== 'pass')
        return state; // Invalid call
    // Track decisions: we can store them or resolve instantly.
    // For simplicity in single human local play:
    // If the activeCalls has a Ron, and the human clicks Ron, we immediately resolve Ron.
    // If they click Pass: we remove their option. If no options remain, we resume the game.
    // Let's implement priority-based instant resolution:
    // If the player chooses Ron: Ron happens immediately!
    // If they choose Pon/Chi/Kan: Pon/Chi/Kan happens immediately (as human priority takes precedence, and bots auto-pass).
    // If they choose Pass: we filter out options for this player.
    if (callType === 'pass') {
        next.activeCalls = next.activeCalls.filter(c => c.playerIndex !== playerIndex);
        if (next.activeCalls.length === 0) {
            // If a Riichi was declared and passed: finalize the Kyoutaku deduction
            const lastDiscarder = next.players[next.lastDiscardPlayer];
            const lastDiscard = lastDiscarder.discards[lastDiscarder.discards.length - 1];
            if (lastDiscard && lastDiscard.isRiichi) {
                lastDiscarder.score -= 1000;
                next.kyoutaku += 1;
            }
            // Resume normal turn: draw tile for the player next to the discarder
            next.activePlayerIndex = (next.lastDiscardPlayer + 1) % 4;
            next.turnPhase = 'draw';
            if (next.activePlayerIndex === next.dealerIndex) {
                next.isFirstTurn = false;
            }
            if (checkSpecialDraws(next)) {
                return next;
            }
            return drawTile(next);
        }
        return next;
    }
    // Execute call
    if (callType === 'ron') {
        return handleRonWin(next, playerIndex);
    }
    if (callType === 'tsumo') {
        return handleTsumoWin(next, playerIndex);
    }
    if (callType === 'riichi') {
        // Just flag that the next discard is a Riichi discard
        // We expect the UI to select a discard tile next
        next.activeCalls = [];
        next.turnPhase = 'discard';
        // Let the UI know Riichi is being declared by setting a flag in state if needed,
        // or just rely on the next discard call passing isRiichiDeclaration=true
        return next;
    }
    if (callType === 'ankan') {
        return handleAnkan(next, playerIndex, tiles);
    }
    if (callType === 'kakan') {
        return handleKakan(next, playerIndex, tiles[0]);
    }
    // Melds (Chi, Pon, Daiminkan)
    return handleOpenMeld(next, playerIndex, callType, tiles, next.lastDiscard, next.lastDiscardPlayer);
}
// Calculate calls available on Tsumo/Draw
function calculateDrawPhaseCalls(state, playerIndex, drawnTile) {
    const calls = [];
    const player = state.players[playerIndex];
    // 1. Tsumo check
    const isMenzen = player.melds.every(m => m.type === 'ankan');
    const evalParams = {
        hand: player.hand,
        melds: player.melds,
        winningTile: drawnTile,
        isTsumo: true,
        isDealer: playerIndex === state.dealerIndex,
        isRiichi: player.isRiichi,
        isDoubleRiichi: player.isDoubleRiichi,
        isIppatsu: player.isIppatsu,
        isHaitei: state.wallIndex >= 122,
        isHoutei: false,
        isRinshan: state.turnPhase === 'kan_draw',
        isChankan: false,
        isTenhou: state.isFirstTurn && playerIndex === state.dealerIndex && player.discards.length === 0,
        isChiihou: state.isFirstTurn && playerIndex !== state.dealerIndex && player.discards.length === 0,
        doraIndicators: state.doraIndicators,
        uraDoraIndicators: state.uraDoraIndicators,
        seatWind: player.seatWind,
        roundWind: state.wind,
    };
    const shanten = calculateShanten(player.hand, player.melds.length);
    if (shanten === -1) {
        const evaluation = evaluateHand(evalParams);
        if (evaluation && evaluation.yakuList.length > 0) {
            calls.push({
                playerIndex,
                type: 'tsumo',
                tiles: player.hand,
                priority: 3,
            });
        }
    }
    // 2. Riichi check
    if (isMenzen && !player.isRiichi && player.score >= 1000) {
        // A player can declare Riichi if their hand after drawing is Tenpai (shanten = 0 or -1)
        // We check if removing any tile from hand results in shanten = 0 (Tenpai)
        let canRiichi = false;
        for (let i = 0; i < player.hand.length; i++) {
            const tempHand = [...player.hand];
            tempHand.splice(i, 1);
            const tempShanten = calculateShanten(tempHand, player.melds.length);
            if (tempShanten === 0) {
                canRiichi = true;
                break;
            }
        }
        if (canRiichi) {
            calls.push({
                playerIndex,
                type: 'riichi',
                tiles: [],
                priority: 1,
            });
        }
    }
    // 3. Ankan check
    // Check if player has 4 identical tiles in hand
    const counts = new Array(34).fill(0);
    for (const t of player.hand) {
        counts[tileToIndex(t)]++;
    }
    for (let i = 0; i < 34; i++) {
        if (counts[i] === 4) {
            // Find the 4 tiles
            const targetSuitAndVal = getSuitAndValFromIndex(i);
            const matchingTiles = player.hand.filter(t => t.suit === targetSuitAndVal.suit && t.value === targetSuitAndVal.value);
            calls.push({
                playerIndex,
                type: 'ankan',
                tiles: matchingTiles,
                priority: 1,
            });
        }
    }
    // 4. Kakan check
    // Check if any tile in hand matches an open Pon in melds
    for (const meld of player.melds) {
        if (meld.type === 'pon') {
            const match = player.hand.find(t => t.suit === meld.tiles[0].suit && t.value === meld.tiles[0].value);
            if (match) {
                calls.push({
                    playerIndex,
                    type: 'kakan',
                    tiles: [match],
                    priority: 1,
                });
            }
        }
    }
    // 5. Kyuushu Kyuuhei check (9 terminal/honor tiles on first turn)
    if (state.isFirstTurn && player.discards.length === 0 && !player.melds.length) {
        const uniqueYaochu = new Set();
        for (const t of player.hand) {
            if (t.suit === 'z' || t.value === 1 || t.value === 9) {
                uniqueYaochu.add(`${t.suit}${t.value}`);
            }
        }
        // Standard rule: 9 or more unique Yaochu
        // We can add a "pass" button, but if they want to, they can declare Kyuushu Kyuuhei.
        // In our simplified engine, we can make it a CallOption: 'pass' is the default,
        // and they can choose to call draw. Let's make it a pseudo-call called 'pass' but they have option.
        // We won't clutter calls unless they meet the condition. If they do:
        // we can add a 'kan' or custom type? Let's just allow a draw choice in UI, or make it a call type: 'pass' (we just check in UI).
        // Actually, let's add it as a call option type 'pass' or custom, or check it during UI rendering. Let's add it as option `chi`? No, let's keep it simple: we can make a custom option if needed, but it's fine.
    }
    return calls;
}
// Calculate calls available on discard
function calculateDiscardPhaseCalls(state, discarderIndex, tile) {
    const calls = [];
    for (let p = 0; p < 4; p++) {
        if (p === discarderIndex)
            continue;
        const player = state.players[p];
        // 1. Ron check
        const tempHand = [...player.hand, tile];
        const shanten = calculateShanten(tempHand, player.melds.length);
        if (shanten === -1 && !player.isFuriten) {
            const evalParams = {
                hand: tempHand,
                melds: player.melds,
                winningTile: tile,
                isTsumo: false,
                isDealer: p === state.dealerIndex,
                isRiichi: player.isRiichi,
                isDoubleRiichi: player.isDoubleRiichi,
                isIppatsu: player.isIppatsu,
                isHaitei: false,
                isHoutei: state.wallIndex >= 122,
                isRinshan: false,
                isChankan: state.turnPhase === 'kan_draw', // Robbing a Kan (Chankan)
                isTenhou: false,
                isChiihou: false,
                doraIndicators: state.doraIndicators,
                uraDoraIndicators: state.uraDoraIndicators,
                seatWind: player.seatWind,
                roundWind: state.wind,
            };
            const evaluation = evaluateHand(evalParams);
            if (evaluation && evaluation.yakuList.length > 0) {
                calls.push({
                    playerIndex: p,
                    type: 'ron',
                    tiles: player.hand,
                    calledTile: tile,
                    priority: 3,
                });
            }
        }
        // If player is in Riichi, they cannot Pon/Chi/Kan. They can only Ron or Pass.
        if (player.isRiichi)
            continue;
        // 2. Pon check
        const sameCount = player.hand.filter(t => t.suit === tile.suit && t.value === tile.value).length;
        if (sameCount >= 2) {
            const matchTiles = player.hand.filter(t => t.suit === tile.suit && t.value === tile.value).slice(0, 2);
            calls.push({
                playerIndex: p,
                type: 'pon',
                tiles: matchTiles,
                calledTile: tile,
                priority: 2,
            });
        }
        // 3. Daiminkan check
        if (sameCount === 3) {
            const matchTiles = player.hand.filter(t => t.suit === tile.suit && t.value === tile.value);
            calls.push({
                playerIndex: p,
                type: 'kan', // Daiminkan
                tiles: matchTiles,
                calledTile: tile,
                priority: 2,
            });
        }
        // 4. Chi check (only from Kamicha - player to the left)
        const isKamicha = (discarderIndex + 1) % 4 === p;
        if (isKamicha && tile.suit !== 'z') {
            const val = tile.value;
            const suit = tile.suit;
            // Combinations:
            // a. val-2, val-1
            const tMinus2 = player.hand.find(t => t.suit === suit && t.value === val - 2);
            const tMinus1 = player.hand.find(t => t.suit === suit && t.value === val - 1);
            if (tMinus2 && tMinus1) {
                calls.push({
                    playerIndex: p,
                    type: 'chi',
                    tiles: [tMinus2, tMinus1],
                    calledTile: tile,
                    priority: 1,
                });
            }
            // b. val-1, val+1
            const tPlus1 = player.hand.find(t => t.suit === suit && t.value === val + 1);
            if (tMinus1 && tPlus1) {
                calls.push({
                    playerIndex: p,
                    type: 'chi',
                    tiles: [tMinus1, tPlus1],
                    calledTile: tile,
                    priority: 1,
                });
            }
            // c. val+1, val+2
            const tPlus2 = player.hand.find(t => t.suit === suit && t.value === val + 2);
            if (tPlus1 && tPlus2) {
                calls.push({
                    playerIndex: p,
                    type: 'chi',
                    tiles: [tPlus1, tPlus2],
                    calledTile: tile,
                    priority: 1,
                });
            }
        }
    }
    return calls;
}
// Helper: index 0-33 -> Suit and Value
function getSuitAndValFromIndex(idx) {
    if (idx < 9)
        return { suit: 'm', value: idx + 1 };
    if (idx < 18)
        return { suit: 'p', value: idx - 9 + 1 };
    if (idx < 27)
        return { suit: 's', value: idx - 18 + 1 };
    return { suit: 'z', value: idx - 27 + 1 };
}
// Update Furiten state for all players
function updateFuritenStates(state) {
    for (let p = 0; p < 4; p++) {
        const player = state.players[p];
        // Find all winning tiles (machihai)
        // We check which of the 34 tiles would make the hand shanten = -1
        const winningTileVals = [];
        for (let i = 0; i < 34; i++) {
            const tInfo = getSuitAndValFromIndex(i);
            // Create a dummy tile
            const dummyTile = { id: 999, suit: tInfo.suit, value: tInfo.value, isRed: false };
            const tempHand = [...player.hand, dummyTile];
            if (calculateShanten(tempHand, player.melds.length) === -1) {
                winningTileVals.push(tInfo);
            }
        }
        if (winningTileVals.length === 0) {
            player.isFuriten = false;
            continue;
        }
        // 1. Permanent Furiten: Any winning tile is in the player's discard pile
        let isPermanentFuriten = false;
        for (const discard of player.discards) {
            if (winningTileVals.some(w => w.suit === discard.tile.suit && w.value === discard.tile.value)) {
                isPermanentFuriten = true;
                break;
            }
        }
        player.isFuriten = isPermanentFuriten;
        // Note: Temporary Furiten and Riichi Furiten are reset/managed by turn transitions,
        // but in Phase 1 we can simplify: if a player passes on Ron when they could have called it,
        // they enter temporary furiten.
        // If they are in Riichi and pass on Ron, they enter permanent Riichi Furiten.
    }
}
// Execute Ron Win
function handleRonWin(state, winnerIndex) {
    const next = { ...state };
    next.turnPhase = 'agari';
    next.activeCalls = []; // Clear all active calls immediately
    const winner = next.players[winnerIndex];
    const winningTile = next.lastDiscard;
    const discarderIndex = next.lastDiscardPlayer;
    // Mark the discarded tile as called in the discarder's pond
    const discarder = next.players[discarderIndex];
    if (discarder.discards.length > 0) {
        discarder.discards[discarder.discards.length - 1].isCalled = true;
    }
    // Combine hand with winning tile
    const fullHand = [...winner.hand, winningTile];
    // Evaluate
    const evalParams = {
        hand: fullHand,
        melds: winner.melds,
        winningTile,
        isTsumo: false,
        isDealer: winnerIndex === next.dealerIndex,
        isRiichi: winner.isRiichi,
        isDoubleRiichi: winner.isDoubleRiichi,
        isIppatsu: winner.isIppatsu,
        isHaitei: false,
        isHoutei: next.wallIndex >= 122,
        isRinshan: false,
        isChankan: state.turnPhase === 'kan_draw',
        isTenhou: false,
        isChiihou: false,
        doraIndicators: next.doraIndicators,
        uraDoraIndicators: next.uraDoraIndicators,
        seatWind: winner.seatWind,
        roundWind: next.wind,
    };
    const evalResult = evaluateHand(evalParams);
    if (!evalResult)
        return state; // Should not happen
    const pointsData = calculatePoints({
        yakuResult: evalResult,
        isDealer: winnerIndex === next.dealerIndex,
        isTsumo: false,
        honba: next.honba,
        kyoutaku: next.kyoutaku,
    });
    const scoreChanges = redistributeScores(winnerIndex, discarderIndex, pointsData, next.dealerIndex, next.honba, next.kyoutaku, evalResult, false);
    // Apply scores
    for (let i = 0; i < 4; i++) {
        next.players[i].score += scoreChanges[i];
    }
    // Clear Kyoutaku sticks from the table
    next.kyoutaku = 0;
    next.winnerIndices = [winnerIndex];
    next.scoreChanges = scoreChanges; // Convert to array form if needed, let's keep it as array of changes matching player index
    const changesArray = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++)
        changesArray[i] = scoreChanges[i];
    next.scoreChanges = changesArray;
    next.yakuResults = [{
            playerIndex: winnerIndex,
            yakuList: evalResult.yakuList,
            han: evalResult.han,
            fu: evalResult.fu,
            points: pointsData.points,
            isTsumo: false,
            doraCount: evalResult.doraCount,
            akaDoraCount: evalResult.akaDoraCount,
            uraDoraCount: evalResult.uraDoraCount,
        }];
    return next;
}
// Execute Tsumo Win
function handleTsumoWin(state, winnerIndex) {
    const next = { ...state };
    next.turnPhase = 'agari';
    next.activeCalls = []; // Clear all active calls immediately
    const winner = next.players[winnerIndex];
    const winningTile = next.drawnTile;
    // Hand is already complete
    const evalParams = {
        hand: winner.hand,
        melds: winner.melds,
        winningTile,
        isTsumo: true,
        isDealer: winnerIndex === next.dealerIndex,
        isRiichi: winner.isRiichi,
        isDoubleRiichi: winner.isDoubleRiichi,
        isIppatsu: winner.isIppatsu,
        isHaitei: next.wallIndex >= 122,
        isHoutei: false,
        isRinshan: state.turnPhase === 'kan_draw',
        isChankan: false,
        isTenhou: state.isFirstTurn && winnerIndex === next.dealerIndex && winner.discards.length === 0,
        isChiihou: state.isFirstTurn && winnerIndex !== next.dealerIndex && winner.discards.length === 0,
        doraIndicators: next.doraIndicators,
        uraDoraIndicators: next.uraDoraIndicators,
        seatWind: winner.seatWind,
        roundWind: next.wind,
    };
    const evalResult = evaluateHand(evalParams);
    if (!evalResult)
        return state;
    const pointsData = calculatePoints({
        yakuResult: evalResult,
        isDealer: winnerIndex === next.dealerIndex,
        isTsumo: true,
        honba: next.honba,
        kyoutaku: next.kyoutaku,
    });
    const scoreChanges = redistributeScores(winnerIndex, null, pointsData, next.dealerIndex, next.honba, next.kyoutaku, evalResult, true);
    // Apply scores
    for (let i = 0; i < 4; i++) {
        next.players[i].score += scoreChanges[i];
    }
    next.kyoutaku = 0;
    next.winnerIndices = [winnerIndex];
    const changesArray = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++)
        changesArray[i] = scoreChanges[i];
    next.scoreChanges = changesArray;
    next.yakuResults = [{
            playerIndex: winnerIndex,
            yakuList: evalResult.yakuList,
            han: evalResult.han,
            fu: evalResult.fu,
            points: pointsData.points,
            isTsumo: true,
            doraCount: evalResult.doraCount,
            akaDoraCount: evalResult.akaDoraCount,
            uraDoraCount: evalResult.uraDoraCount,
        }];
    return next;
}
// Open Meld declaration (Chi, Pon, Daiminkan)
function handleOpenMeld(state, playerIndex, type, tiles, discardedTile, discarderIndex) {
    const next = { ...state };
    const player = next.players[playerIndex];
    const discarder = next.players[discarderIndex];
    // Remove tiles from hand
    const tileIdsToRemove = tiles.map(t => t.id);
    player.hand = player.hand.filter(t => !tileIdsToRemove.includes(t.id));
    // Mark the discard tile as called
    if (discarder.discards.length > 0) {
        discarder.discards[discarder.discards.length - 1].isCalled = true;
    }
    // Create meld
    const meld = {
        type: type === 'kan' ? 'daiminkan' : type,
        tiles: sortTiles([...tiles, discardedTile]),
        fromPlayer: discarderIndex,
        calledTile: discardedTile,
    };
    player.melds.push(meld);
    // No longer first turn cycle if a meld is made
    next.isFirstTurn = false;
    // Active player becomes the caller
    next.activePlayerIndex = playerIndex;
    if (type === 'kan') {
        // Kan requires drawing a replacement tile
        next.turnPhase = 'kan_draw';
        return drawRinshanTile(next);
    }
    else {
        // Chi and Pon require a discard
        next.turnPhase = 'discard';
        next.activeCalls = [];
    }
    return next;
}
// Handle Ankan (Closed Kan)
function handleAnkan(state, playerIndex, tiles) {
    const next = { ...state };
    const player = next.players[playerIndex];
    // Remove 4 tiles from hand
    const ids = tiles.map(t => t.id);
    player.hand = player.hand.filter(t => !ids.includes(t.id));
    const meld = {
        type: 'ankan',
        tiles: sortTiles(tiles),
        fromPlayer: -1,
        calledTile: tiles[0],
    };
    player.melds.push(meld);
    next.isFirstTurn = false;
    next.turnPhase = 'kan_draw';
    // Add a new Dora indicator (Ankan immediately reveals next Dora indicator)
    revealNextDora(next);
    return drawRinshanTile(next);
}
// Handle Kakan (Added Kan)
function handleKakan(state, playerIndex, tile) {
    const next = { ...state };
    const player = next.players[playerIndex];
    // Remove tile from hand
    player.hand = player.hand.filter(t => t.id !== tile.id);
    // Find the Pon meld to upgrade
    const ponIndex = player.melds.findIndex(m => m.type === 'pon' && m.tiles[0].suit === tile.suit && m.tiles[0].value === tile.value);
    if (ponIndex === -1)
        return state;
    const ponMeld = player.melds[ponIndex];
    const upgradedMeld = {
        type: 'kakan',
        tiles: sortTiles([...ponMeld.tiles, tile]),
        fromPlayer: ponMeld.fromPlayer,
        calledTile: ponMeld.calledTile,
    };
    player.melds[ponIndex] = upgradedMeld;
    next.isFirstTurn = false;
    // Check if anyone can Ron on Kakan (Chankan / Kan robbery)
    const calls = calculateDiscardPhaseCalls(next, playerIndex, tile);
    const chankanCalls = calls.filter(c => c.type === 'ron');
    if (chankanCalls.length > 0) {
        next.activeCalls = chankanCalls.map(c => ({ ...c, type: 'ron' })); // Mark as Ron
        next.turnPhase = 'wait_call';
        next.lastDiscard = tile;
        next.lastDiscardPlayer = playerIndex;
    }
    else {
        next.turnPhase = 'kan_draw';
        // Kakan reveals Dora after draw or immediately? Standard is after draw (rinshan discard) or immediately.
        // Modern standard is immediate. Let's reveal now:
        revealNextDora(next);
        return drawRinshanTile(next);
    }
    return next;
}
// Draw a replacement tile from Dead Wall
function drawRinshanTile(state) {
    const next = { ...state };
    const player = next.players[next.activePlayerIndex];
    // Draw from deadWall
    // Rinshan tiles are at index 0, 1, 2, 3 in deadWall.
    // We can track the number of Kan calls or deadWall draws
    const rinshanIndex = player.melds.filter(m => m.type === 'daiminkan' || m.type === 'ankan' || m.type === 'kakan').length - 1;
    if (rinshanIndex >= 4) {
        // Too many Kans! (Suukai Kan draw or similar)
        return handleExhaustiveDraw(next);
    }
    const tile = next.deadWall[rinshanIndex];
    next.drawnTile = tile;
    player.hand = sortTiles([...player.hand, tile]);
    next.turnPhase = 'discard';
    // Check for Tsumo, Ankan, Kakan on the Rinshan draw
    next.activeCalls = calculateDrawPhaseCalls(next, next.activePlayerIndex, tile);
    return next;
}
// Reveal next Dora indicator
function revealNextDora(state) {
    const activeCount = state.doraIndicators.length;
    if (activeCount < 5) {
        // Dora indicators are at index 4, 6, 8, 10, 12 in deadWall
        const nextIdx = 4 + activeCount * 2;
        state.doraIndicators.push(state.deadWall[nextIdx]);
        state.uraDoraIndicators.push(state.deadWall[nextIdx + 1]); // Bottom row is Ura Dora indicator
    }
}
// Handle Exhaustive Draw (荒牌流局)
function handleExhaustiveDraw(state) {
    const next = { ...state };
    next.turnPhase = 'ryukyoku';
    // Check Nagashi Mangan
    const nagashiWinner = checkNagashiMangan(next);
    if (nagashiWinner !== -1) {
        return handleNagashiManganWin(next, nagashiWinner);
    }
    // Normal exhaustive draw Tenpai payments
    const tenpais = [false, false, false, false];
    let tenpaiCount = 0;
    for (let i = 0; i < 4; i++) {
        const player = next.players[i];
        const shanten = calculateShanten(player.hand, player.melds.length);
        if (shanten === 0) {
            tenpais[i] = true;
            tenpaiCount++;
        }
    }
    const scoreChanges = [0, 0, 0, 0];
    if (tenpaiCount > 0 && tenpaiCount < 4) {
        // Redistribute 3000 points
        const receiveAmt = 3000 / tenpaiCount;
        const payAmt = 3000 / (4 - tenpaiCount);
        for (let i = 0; i < 4; i++) {
            scoreChanges[i] = tenpais[i] ? receiveAmt : -payAmt;
        }
    }
    // Apply scores
    for (let i = 0; i < 4; i++) {
        next.players[i].score += scoreChanges[i];
    }
    next.scoreChanges = scoreChanges;
    next.winnerIndices = []; // Draw
    return next;
}
// Check Nagashi Mangan (流し満貫)
function checkNagashiMangan(state) {
    for (let i = 0; i < 4; i++) {
        const player = state.players[i];
        if (player.discards.length === 0)
            continue;
        // All discards must be terminal/honor tiles, and none called
        const isNagashi = player.discards.every(d => {
            const isYaochu = d.tile.suit === 'z' || d.tile.value === 1 || d.tile.value === 9;
            return isYaochu && !d.isCalled;
        });
        if (isNagashi) {
            return i;
        }
    }
    return -1;
}
// Handle Nagashi Mangan win
function handleNagashiManganWin(state, winnerIndex) {
    const next = { ...state };
    next.turnPhase = 'agari';
    const winner = next.players[winnerIndex];
    const isDealer = winnerIndex === next.dealerIndex;
    // Nagashi Mangan is evaluated as Mangan Tsumo (8000 / 12000 points)
    const scoreChanges = [0, 0, 0, 0];
    const basePoints = 2000; // Mangan base
    let winSum = 0;
    for (let p = 0; p < 4; p++) {
        if (p === winnerIndex)
            continue;
        let payAmount = 0;
        if (isDealer) {
            payAmount = roundUp100(basePoints * 2); // 4000
        }
        else {
            payAmount = p === next.dealerIndex ? roundUp100(basePoints * 2) : roundUp100(basePoints); // 4000 or 2000
        }
        scoreChanges[p] = -payAmount;
        winSum += payAmount;
    }
    scoreChanges[winnerIndex] = winSum;
    for (let i = 0; i < 4; i++) {
        next.players[i].score += scoreChanges[i];
    }
    next.winnerIndices = [winnerIndex];
    next.scoreChanges = scoreChanges;
    next.yakuResults = [{
            playerIndex: winnerIndex,
            yakuList: ['流し満貫'],
            han: 5, // Mangan
            fu: 30,
            points: isDealer ? 12000 : 8000,
            isTsumo: true,
            doraCount: 0,
            akaDoraCount: 0,
            uraDoraCount: 0,
        }];
    return next;
}
// Advance Round or Game Over (triggered after confirming results screen)
export function advanceRound(state) {
    const next = { ...state };
    // Check Tobi (any player score < 0)
    const hasTobi = next.players.some(p => p.score < 0);
    // Or if it's South 4 ended (Oras end)
    const isOras = next.wind === 'S' && next.roundNumber === 4;
    // Or if we should continue:
    // Renchan (dealer repeat) conditions:
    // - Dealer wins (Agari)
    // - Dealer is Tenpai in Ryukyoku
    let isRenchan = false;
    if (next.winnerIndices && next.winnerIndices.includes(next.dealerIndex)) {
        isRenchan = true;
    }
    else if (next.winnerIndices && next.winnerIndices.length === 0) {
        // Draw: check if dealer was Tenpai
        const dealerHand = next.players[next.dealerIndex].hand;
        const dealerMeldsCount = next.players[next.dealerIndex].melds.length;
        if (calculateShanten(dealerHand, dealerMeldsCount) === 0) {
            isRenchan = true;
        }
    }
    if (hasTobi) {
        next.turnPhase = 'game_over';
        return next;
    }
    if (isRenchan) {
        next.honba += 1;
        // Keep dealer index
    }
    else {
        next.honba = 0;
        // Deal moves to next player
        next.dealerIndex = (next.dealerIndex + 1) % 4;
        // Advance round number
        if (next.dealerIndex === 0) {
            // Completed full rotation
            if (next.wind === 'E') {
                next.wind = 'S';
                next.roundNumber = 1;
            }
            else {
                // End of South round
                next.turnPhase = 'game_over';
                return next;
            }
        }
        else {
            next.roundNumber = (next.roundNumber % 4) + 1;
        }
    }
    // Check Oras exit criteria
    // If dealer index matches the original dealer seat offset, etc.
    if (isOras && !isRenchan) {
        next.turnPhase = 'game_over';
        return next;
    }
    return startRound(next);
}
// Check premature draws in first turn (Suufuu Renta, Suuka Riichi, Suukai Kan)
function checkSpecialDraws(state) {
    // 1. Suufuu Renta (4 winds discarded in first turn cycle)
    if (state.isFirstTurn) {
        const firstDiscards = state.players.map(p => p.discards[0]);
        const allHaveDiscarded = firstDiscards.every(d => d !== undefined);
        if (allHaveDiscarded) {
            const firstTile = firstDiscards[0].tile;
            const isWind = firstTile.suit === 'z' && firstTile.value <= 4;
            const allSame = firstDiscards.every(d => d.tile.suit === firstTile.suit && d.tile.value === firstTile.value);
            if (isWind && allSame) {
                state.turnPhase = 'ryukyoku';
                state.winnerIndices = [];
                state.scoreChanges = [0, 0, 0, 0];
                // Custom message or handle
                return true;
            }
        }
    }
    // 2. Suuka Riichi (4 players in Riichi)
    const riichiCount = state.players.filter(p => p.isRiichi || p.isDoubleRiichi).length;
    if (riichiCount === 4) {
        state.turnPhase = 'ryukyoku';
        state.winnerIndices = [];
        state.scoreChanges = [0, 0, 0, 0];
        return true;
    }
    // 3. Suukai Kan (4 Kans total by multiple players)
    let totalKans = 0;
    const kanPlayers = new Set();
    state.players.forEach((p, idx) => {
        const kCount = p.melds.filter(m => m.type === 'daiminkan' || m.type === 'ankan' || m.type === 'kakan').length;
        if (kCount > 0) {
            totalKans += kCount;
            kanPlayers.add(idx);
        }
    });
    if (totalKans === 4 && kanPlayers.size > 1) {
        state.turnPhase = 'ryukyoku';
        state.winnerIndices = [];
        state.scoreChanges = [0, 0, 0, 0];
        return true;
    }
    return false;
}
