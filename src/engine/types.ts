export type SuitType = 'm' | 'p' | 's' | 'z';

export interface Tile {
  id: number;       // Unique ID from 0 to 135
  suit: SuitType;   // 'm' (Manzu), 'p' (Pinzu), 's' (Souzu), 'z' (Jiihai/Honors)
  value: number;    // 1-9 for suit tiles. For z: 1-4 = East/South/West/North, 5-7 = White/Green/Red dragons
  isRed: boolean;   // True if it is a red five (Aka Dora)
}

export type MeldType = 'chi' | 'pon' | 'daiminkan' | 'ankan' | 'kakan';

export interface Meld {
  type: MeldType;
  tiles: Tile[];
  fromPlayer: number;       // Seat index of player the tile was taken from (-1 for ankan)
  calledTile: Tile;         // The specific tile that was taken (for ankan, just one of the 4)
}

export interface Discard {
  tile: Tile;
  isRiichi: boolean;        // Placed sideways
  isCalled: boolean;        // Taken by another player's meld
  isTsumogiri: boolean;     // Discarded immediately after drawing
}

export interface PlayerState {
  id: number;               // Seating index (0: East/Dealer at round start, 1: South, 2: West, 3: North)
  name: string;
  score: number;            // Starts at 25000
  hand: Tile[];             // Private hand (sorted, excluding open melds)
  melds: Meld[];            // Open melds (and closed Kans)
  discards: Discard[];      // Discard history
  isRiichi: boolean;
  isDoubleRiichi: boolean;
  riichiTurn: number | null;// Turn index when Riichi was declared
  isIppatsu: boolean;       // Eligible for Ippatsu
  seatWind: 'E' | 'S' | 'W' | 'N';
  isFuriten: boolean;       // If player is in Furiten (cannot Ron)
  isAuto: boolean;          // If controlled by bot (auto-discard)
}

export type TurnPhase =
  | 'draw'                  // Player draws a tile
  | 'discard'               // Player needs to discard a tile
  | 'wait_call'             // Waiting for other players to Pon/Chi/Kan/Ron
  | 'kan_draw'              // Drawing from the dead wall (Rinshan) after Kan
  | 'agari'                 // Round ended by win
  | 'ryukyoku'              // Round ended by draw
  | 'game_over';            // Match ended

export interface GameState {
  wind: 'E' | 'S';          // East or South round (東風戦/東南戦)
  roundNumber: number;      // 1 to 4
  honba: number;            // Counter for dealer repeat / exhaustive draw
  kyoutaku: number;         // Count of 1000-point Riichi sticks on table
  dealerIndex: number;      // Seat index of current dealer
  wall: Tile[];             // The full tile wall (136 tiles)
  wallIndex: number;        // Current normal draw position (starts at 53 after initial deal)
  deadWall: Tile[];         // Dead wall (14 tiles at the end of the wall)
  doraIndicators: Tile[];   // Revealed Dora indicators (starts with 1, up to 5)
  uraDoraIndicators: Tile[];// Hidden Dora indicators (revealed for Riichi wins)
  players: PlayerState[];
  activePlayerIndex: number;
  turnPhase: TurnPhase;
  lastDiscard: Tile | null;
  lastDiscardPlayer: number | null;
  drawnTile: Tile | null;   // The tile just drawn by the active player
  isFirstTurn: boolean;     // For Tenhou/Chiihou/Kyuushu Kyuuhei checks
  winnerIndices: number[] | null;
  yakuResults: {
    playerIndex: number;
    yakuList: string[];
    han: number;
    fu: number;
    points: number;       // Total payout incl. kyoutaku & honba
    basePoints: number;   // Pure role score (excl. kyoutaku & honba)
    kyoutaku: number;     // Kyoutaku sticks collected (count)
    honba: number;        // Honba count at time of win
    isTsumo: boolean;
    doraCount: number;
    uraDoraCount: number;
    akaDoraCount: number;
  }[] | null;
  scoreChanges: number[] | null;
  activeCalls: CallOption[];// Pending calls that can be made by players
  selectedCallPlayer: number | null; // For tracking who is making a call
}

export interface CallOption {
  playerIndex: number;
  type: 'chi' | 'pon' | 'kan' | 'riichi' | 'tsumo' | 'ron' | 'ankan' | 'kakan' | 'pass';
  tiles: Tile[];            // The tiles from the hand used to form the meld (or winning hand)
  calledTile?: Tile;        // The tile being claimed (discarded by lastDiscardPlayer)
  priority: number;         // Ron = 3, Pon/Kan = 2, Chi = 1, Pass = 0
}
