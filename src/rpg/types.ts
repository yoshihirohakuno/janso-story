export type Direction = 'up' | 'down' | 'left' | 'right';
export type CharacterSpecId =
  | 'char_misaki'
  | 'char_kenta'
  | 'char_kurokawa'
  | 'char_reina'
  | 'char_takeji';

export type SpriteAnimationName = 'idle' | 'walk' | 'run' | 'victory' | 'thinking';
export type CharacterRole =
  | 'protagonist'
  | 'boyfriend'
  | 'mentor'
  | 'rival'
  | 'regular_customer';
export type MahjongRank = 'beginner' | 'amateur' | 'veteran' | 'pro' | 'legend';
export type NpcType = 'player_avatar' | 'story_support' | 'mentor' | 'rival_boss' | 'regular_customer';
export type RpgNpcSpriteVariant =
  | 'hero'
  | 'boyfriend'
  | 'owner'
  | 'regular'
  | 'rival'
  | 'customer';

export type StoryStage =
  | 'tutorial_before'
  | 'tutorial_match_started'
  | 'tutorial_after'
  | 'shop_entrusted'
  | 'regular_match_unlocked'
  | 'rival_appeared'
  | 'district_tournament_unlocked'
  | 'expansion_unlocked';

export type CharacterId = 'misaki' | 'kenta' | 'kurokawa' | 'takeji' | 'reina' | 'regular';

export type UpgradeId = 'bulb_repair' | 'wifi' | 'table_clean' | 'signboard';

export interface Position {
  x: number;
  y: number;
}

export interface ColorPaletteGroup {
  name: string;
  swatches: string[];
}

export interface CharacterAppearanceSpec {
  display_name: string;
  reading: string;
  age: number;
  height_cm: number;
  build: string;
  silhouette: string[];
  hair: {
    color: string;
    style: string;
    details: string[];
  };
  eyes: {
    color: string;
    shape: string;
    details: string[];
  };
  costume: Record<string, string>;
  accessory: string[];
  theme_color: string[];
  palette: {
    skin: ColorPaletteGroup;
    hair: ColorPaletteGroup;
    primary: ColorPaletteGroup;
    secondary: ColorPaletteGroup;
    accent: ColorPaletteGroup;
    outline: string;
  };
}

export interface SpriteAnimationSpec {
  frames: number;
  fps: number;
  loop: boolean;
  emphasis: string;
  key_poses: string[];
}

export interface SpriteSheetBlockSpec {
  animation: SpriteAnimationName;
  start_row: number;
  row_count: number;
  start_column: number;
  frame_count: number;
  direction_order: Direction[];
  notes: string[];
}

export interface CharacterSpriteSheetSpec {
  atlas_width: number;
  atlas_height: number;
  frame_width: number;
  frame_height: number;
  columns: number;
  rows: number;
  padding: number;
  origin: 'top_left';
  animation_order: SpriteAnimationName[];
  blocks: SpriteSheetBlockSpec[];
  export_files: {
    atlas: string;
    preview: string;
  };
}

export interface CharacterSpriteSpec {
  size: {
    width: number;
    height: number;
  };
  pivot: {
    x: number;
    y: number;
  };
  collision_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  directions: Direction[];
  directional_notes: Record<Direction, string[]>;
  animations: Record<SpriteAnimationName, SpriteAnimationSpec>;
  sheet: CharacterSpriteSheetSpec;
  production_notes: string[];
}

export interface PortraitExpressionSpec {
  id: string;
  label: string;
  eyebrows: string;
  eyes: string;
  mouth: string;
  head_tilt: 'none' | 'left' | 'right' | 'forward';
  blush: boolean;
  use_cases: string[];
}

export interface CharacterPortraitSpec {
  width: number;
  height: number;
  camera: string;
  lighting: string;
  expressions: string[];
  expression_set: PortraitExpressionSpec[];
  production_notes: string[];
}

export interface CharacterPersonalitySpec {
  optimism: number;
  kindness: number;
  confidence: number;
  ambition: number;
  greed: number;
  patience: number;
  pride: number;
  notes: string[];
  speech_traits: string[];
}

export interface CharacterMahjongStyleSpec {
  rank: MahjongRank;
  archetype: string;
  attack: number;
  defense: number;
  speed: number;
  reading: number;
  call_rate: number;
  riichi_rate: number;
  favorite: string[];
  weakness: string[];
  opening: string;
  midgame: string;
  endgame: string;
}

export interface CharacterDialogueSpec {
  greeting: string;
  victory: string;
  defeat: string;
  tournament: string;
  extra: Record<string, string>;
}

export interface CharacterStorySpec {
  role: CharacterRole;
  role_label: string;
  overview: string;
  chapter_flags: Record<string, string>;
  relationship_hooks: string[];
  mystery_hooks: string[];
}

export interface CharacterSystemLinkSpec {
  npc_type: NpcType;
  visit_frequency: string;
  friendship_base: number | null;
  event_rewards: Record<string, string>;
  economy_hooks: string[];
}

export interface CharacterMapStagePresenceSpec {
  stage: StoryStage;
  map_id: string;
  zone: string;
  anchor: string;
  behavior: string;
  purpose: string;
}

export interface CharacterMapUsageSpec {
  home_map_id: string;
  default_zone: string;
  collision_profile: 'standard' | 'wide' | 'counter_only';
  route_notes: string[];
  stage_presence: CharacterMapStagePresenceSpec[];
}

export interface CharacterSpec {
  id: CharacterSpecId;
  runtime_id: CharacterId;
  appearance: CharacterAppearanceSpec;
  sprite: CharacterSpriteSpec;
  portrait: CharacterPortraitSpec;
  personality: CharacterPersonalitySpec;
  mahjong_style: CharacterMahjongStyleSpec;
  dialogue: CharacterDialogueSpec;
  story: CharacterStorySpec;
  system_link: CharacterSystemLinkSpec;
  map_usage: CharacterMapUsageSpec;
}

export interface CharacterArtStyleSpec {
  era: string;
  references: string[];
  perspective: string;
  sprite_size: string;
  portrait_style: string;
  color_depth: string;
  outline: string;
  lighting: string;
  render_rules: string[];
  avoidance_rules: string[];
}

export interface DialogueState {
  npcId: CharacterId;
  characterName: string;
  lines: string[];
  speakerLines?: Array<{
    npcId: CharacterId;
    characterName: string;
    text: string;
    choices?: string[];
  }>;
  currentLine: number;
}


export interface RpgMatchContext {
  id: 'tutorial' | 'regular' | 'rival';
  title: string;
  opponentNames: string[];
}

export interface RpgMatchResult {
  context: RpgMatchContext['id'];
  victory: boolean;
  rank: number;
  score: number;
  earnedMoney: number;
  reputationChange: number;
  unlockedEvents: string[];
}

export interface RpgRecords {
  matches: number;
  wins: number;
  bestRank: number | null;
  bestScore: number | null;
}

export interface RpgPersistentState {
  storyStage: StoryStage;
  openingCutscenePlayed: boolean;
  ryou: number;
  reputation: number;
  storeLevel: number;
  visitors: number;
  regulars: number;
  unlockedCharacters: CharacterId[];
  position: Position;
  facing: Direction;
  records: RpgRecords;
  upgrades: Record<UpgradeId, boolean>;
  currentMatch: RpgMatchContext | null;
  lastSavedAt: string | null;
}

export interface RpgNpc {
  id: CharacterId;
  name: string;
  role: string;
  position: Position;
  facing: Direction;
  sprite: RpgNpcSpriteVariant;
}

export interface RpgNpcRuntimeState extends RpgNpc {
  moving: boolean;
  route: Position[];
  routeIndex: number;
  waitTicks: number;
}
