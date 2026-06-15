import { create } from 'zustand';
import {
  createStageNpcRuntimeStates,
  getDialogues,
  isBlockedPosition,
  UPGRADE_DEFS,
} from './data';
import { HAKURYUTEI_MAP_SPEC } from './mapSpecs';
import type {
  CharacterId,
  DialogueState,
  Direction,
  Position,
  RpgNpcRuntimeState,
  RpgMatchResult,
  RpgPersistentState,
  RpgRecords,
  StoryStage,
  UpgradeId,
} from './types';

const SAVE_KEY = 'janso-story-rpg-save-v1';

const defaultRecords: RpgRecords = {
  matches: 0,
  wins: 0,
  bestRank: null,
  bestScore: null,
};

const createDefaultState = (): RpgPersistentState => ({
  storyStage: 'tutorial_before',
  money: 12000,
  reputation: 3,
  storeLevel: 1,
  visitors: 8,
  regulars: 1,
  unlockedCharacters: ['misaki', 'kenta', 'kurokawa', 'takeji'],
  position: HAKURYUTEI_MAP_SPEC.spawn_points.player_entrance,
  facing: 'up',
  records: defaultRecords,
  upgrades: {
    extra_table: false,
    signboard: false,
    drink_menu: false,
    event_day: false,
  },
  currentMatch: null,
  lastSavedAt: null,
});

const readSavedState = (): Partial<RpgPersistentState> | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) as Partial<RpgPersistentState> : null;
  } catch {
    return null;
  }
};

const toPersistentState = (state: RpgPersistentState): RpgPersistentState => ({
  storyStage: state.storyStage,
  money: state.money,
  reputation: state.reputation,
  storeLevel: state.storeLevel,
  visitors: state.visitors,
  regulars: state.regulars,
  unlockedCharacters: state.unlockedCharacters,
  position: state.position,
  facing: state.facing,
  records: state.records,
  upgrades: state.upgrades,
  currentMatch: state.currentMatch,
  lastSavedAt: state.lastSavedAt,
});

const writeSavedState = (state: RpgPersistentState) => {
  if (typeof window === 'undefined') return;

  const payload: RpgPersistentState = {
    ...toPersistentState(state),
    lastSavedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
};

const removeSavedState = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SAVE_KEY);
};

const mergeState = (saved: Partial<RpgPersistentState> | null): RpgPersistentState => {
  const defaults = createDefaultState();
  if (!saved) return defaults;

  return {
    ...defaults,
    ...saved,
    position: saved.position ?? defaults.position,
    records: { ...defaults.records, ...saved.records },
    upgrades: { ...defaults.upgrades, ...saved.upgrades },
    unlockedCharacters: saved.unlockedCharacters ?? defaults.unlockedCharacters,
  };
};

const getNextPosition = (position: Position, direction: Direction): Position => {
  switch (direction) {
    case 'up':
      return { x: position.x, y: position.y - 1 };
    case 'down':
      return { x: position.x, y: position.y + 1 };
    case 'left':
      return { x: position.x - 1, y: position.y };
    case 'right':
      return { x: position.x + 1, y: position.y };
  }
};

const unlockCharacters = (current: CharacterId[], additions: CharacterId[]) => (
  Array.from(new Set([...current, ...additions]))
);

interface RpgStore extends RpgPersistentState {
  npcStates: RpgNpcRuntimeState[];
  dialogue: DialogueState | null;
  statusMessage: string;
  hasSave: boolean;
  movePlayer: (direction: Direction) => boolean;
  startDialogue: (npcId: CharacterId, characterName: string) => void;
  advanceDialogue: () => void;
  closeDialogue: () => void;
  startTutorialMatch: () => void;
  applyMatchResult: (result: RpgMatchResult) => void;
  buyUpgrade: (upgradeId: UpgradeId) => void;
  saveGame: () => void;
  loadGame: () => void;
  resetGame: () => void;
  tickNpcMovement: () => void;
}

const savedState = readSavedState();

export const useRpgStore = create<RpgStore>((set, get) => ({
  ...mergeState(savedState),
  npcStates: createStageNpcRuntimeStates(mergeState(savedState).storyStage),
  dialogue: null,
  statusMessage: savedState
    ? '保存データを読み込みました。'
    : '健太に連れられ、初めて白龍亭へ来ました。',
  hasSave: Boolean(savedState),

  movePlayer: (direction) => {
    const state = get();
    const nextPosition = getNextPosition(state.position, direction);

    if (isBlockedPosition(nextPosition, state.storyStage, state.npcStates)) {
      set({
        facing: direction,
        statusMessage: 'これ以上は進めません。',
      });
      return false;
    }

    set({
      position: nextPosition,
      facing: direction,
      statusMessage: '',
    });
    return true;
  },

  startDialogue: (npcId, characterName) => {
    const lines = getDialogues(npcId, get().storyStage);
    set({
      dialogue: {
        npcId,
        characterName,
        lines,
        currentLine: 0,
      },
      statusMessage: '',
    });
  },

  advanceDialogue: () => {
    const dialogue = get().dialogue;
    if (!dialogue) return;

    if (dialogue.currentLine < dialogue.lines.length - 1) {
      set({
        dialogue: {
          ...dialogue,
          currentLine: dialogue.currentLine + 1,
        },
      });
      return;
    }

    set({ dialogue: null });
  },

  closeDialogue: () => {
    set({ dialogue: null });
  },

  startTutorialMatch: () => {
    set({
      storyStage: 'tutorial_match_started',
      npcStates: createStageNpcRuntimeStates('tutorial_match_started'),
      currentMatch: {
        id: 'tutorial',
        title: '白龍亭 初めての一局',
        opponentNames: ['健太', 'タケ爺', '黒川'],
      },
      dialogue: null,
      statusMessage: '卓につきました。初回対局を開始します。',
    });
    writeSavedState(get());
    set({ hasSave: true, lastSavedAt: new Date().toISOString() });
  },

  applyMatchResult: (result) => {
    const state = get();
    const nextRecords: RpgRecords = {
      matches: state.records.matches + 1,
      wins: state.records.wins + (result.victory ? 1 : 0),
      bestRank: state.records.bestRank === null
        ? result.rank
        : Math.min(state.records.bestRank, result.rank),
      bestScore: state.records.bestScore === null
        ? result.score
        : Math.max(state.records.bestScore, result.score),
    };

    let nextStage: StoryStage = state.storyStage;
    let nextMessage = result.victory
      ? '初回対局に勝利。白龍亭の空気が少し変わりました。'
      : '初回対局を終えました。悔しさも、次の一局への材料です。';
    let nextUnlocked = state.unlockedCharacters;
    let regularsGain = result.victory ? 1 : 0;

    if (result.context === 'tutorial') {
      if (result.victory) {
        nextStage = 'shop_entrusted';
        nextUnlocked = unlockCharacters(state.unlockedCharacters, ['regular']);
        nextMessage = '勝利の直後、黒川が奥で倒れ込みました。美咲は白龍亭を一時的に任されます。';
      } else {
        nextStage = 'tutorial_after';
        regularsGain = 0;
      }
    }

    if (result.context === 'regular' && result.victory) {
      nextStage = 'regular_match_unlocked';
      nextMessage = '常連客との勝負で評判が広がりました。';
    }

    set({
      storyStage: nextStage,
      npcStates: createStageNpcRuntimeStates(nextStage),
      money: Math.max(0, state.money + result.earnedMoney),
      reputation: Math.max(0, state.reputation + result.reputationChange),
      visitors: Math.max(0, state.visitors + (result.victory ? 4 : 1)),
      regulars: Math.max(0, state.regulars + regularsGain),
      unlockedCharacters: nextUnlocked,
      records: nextRecords,
      currentMatch: null,
      position: HAKURYUTEI_MAP_SPEC.spawn_points.player_entrance,
      facing: 'up',
      statusMessage: nextMessage,
      dialogue: null,
    });
    writeSavedState(get());
    set({ hasSave: true, lastSavedAt: new Date().toISOString() });
  },

  buyUpgrade: (upgradeId) => {
    const state = get();
    const upgrade = UPGRADE_DEFS[upgradeId];

    if (state.upgrades[upgradeId]) {
      set({ statusMessage: 'この強化はすでに導入済みです。' });
      return;
    }

    if (state.money < upgrade.cost) {
      set({ statusMessage: '資金が足りません。まずは対局で稼ぎましょう。' });
      return;
    }

    const nextUpgrades = {
      ...state.upgrades,
      [upgradeId]: true,
    };

    const purchasedCount = Object.values(nextUpgrades).filter(Boolean).length;
    const nextStage = upgradeId === 'event_day' && state.storyStage === 'shop_entrusted'
      ? 'rival_appeared'
      : state.storyStage;

    set({
      upgrades: nextUpgrades,
      money: state.money - upgrade.cost,
      reputation: state.reputation + upgrade.reputation,
      visitors: state.visitors + upgrade.visitors,
      storeLevel: Math.max(state.storeLevel, 1 + Math.floor(purchasedCount / 2)),
      storyStage: nextStage,
      npcStates: createStageNpcRuntimeStates(nextStage),
      unlockedCharacters: upgradeId === 'event_day'
        ? unlockCharacters(state.unlockedCharacters, ['reina'])
        : state.unlockedCharacters,
      statusMessage: `${upgrade.label}を導入しました。`,
    });
    writeSavedState(get());
    set({ hasSave: true, lastSavedAt: new Date().toISOString() });
  },

  saveGame: () => {
    writeSavedState(get());
    set({
      hasSave: true,
      lastSavedAt: new Date().toISOString(),
      statusMessage: 'セーブしました。',
    });
  },

  loadGame: () => {
    const nextSavedState = readSavedState();
    if (!nextSavedState) {
      set({ statusMessage: '保存データがありません。' });
      return;
    }

    set({
      ...mergeState(nextSavedState),
      npcStates: createStageNpcRuntimeStates(mergeState(nextSavedState).storyStage),
      dialogue: null,
      hasSave: true,
      statusMessage: '保存データを読み込みました。',
    });
  },

  resetGame: () => {
    removeSavedState();
    set({
      ...createDefaultState(),
      npcStates: createStageNpcRuntimeStates(createDefaultState().storyStage),
      dialogue: null,
      hasSave: false,
      statusMessage: 'RPGプロトタイプを最初から開始しました。',
    });
  },

  tickNpcMovement: () => {
    const state = get();
    if (state.dialogue || state.currentMatch) return;

    const nextNpcStates = state.npcStates.map((npc) => {
      if (npc.route.length <= 1) {
        return {
          ...npc,
          moving: false,
        };
      }

      if (npc.waitTicks > 0) {
        return {
          ...npc,
          waitTicks: npc.waitTicks - 1,
          moving: false,
        };
      }

      const nextRouteIndex = (npc.routeIndex + 1) % npc.route.length;
      const nextPosition = npc.route[nextRouteIndex];
      const dx = nextPosition.x - npc.position.x;
      const dy = nextPosition.y - npc.position.y;
      const nextFacing: Direction =
        Math.abs(dx) > Math.abs(dy)
          ? (dx >= 0 ? 'right' : 'left')
          : (dy >= 0 ? 'down' : 'up');

      const blockedByPlayer =
        state.position.x === nextPosition.x && state.position.y === nextPosition.y;
      const blockedByNpc = state.npcStates.some(
        (other) => other.id !== npc.id &&
          other.position.x === nextPosition.x &&
          other.position.y === nextPosition.y,
      );

      if (blockedByPlayer || blockedByNpc || isBlockedPosition(nextPosition, state.storyStage, state.npcStates.filter((other) => other.id !== npc.id))) {
        return {
          ...npc,
          facing: nextFacing,
          waitTicks: 4,
          moving: false,
        };
      }

      return {
        ...npc,
        position: nextPosition,
        routeIndex: nextRouteIndex,
        facing: nextFacing,
        waitTicks: 5,
        moving: true,
      };
    });

    set({ npcStates: nextNpcStates });
  },
}));
