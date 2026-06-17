import { CHARACTER_SPEC_BY_RUNTIME_ID } from './characterSpecs';
import {
  HAKURYUTEI_MAP_SPEC,
  getHakuryuteiInteractionNpcId,
  getHakuryuteiStageLayout,
  isHakuryuteiBlocked,
} from './mapSpecs';
import type {
  CharacterId,
  Direction,
  Position,
  RpgNpc,
  RpgNpcRuntimeState,
  StoryStage,
  UpgradeId,
} from './types';

export const RPG_MAP_WIDTH = HAKURYUTEI_MAP_SPEC.size.width;
export const RPG_MAP_HEIGHT = HAKURYUTEI_MAP_SPEC.size.height;

export const STORY_LABELS: Record<StoryStage, string> = {
  tutorial_before: '初めての雀荘',
  tutorial_match_started: '初回対局中',
  tutorial_after: '初回対局後',
  shop_entrusted: '三元楼を引き受けた日',
  regular_match_unlocked: '常連客勝負解放',
  rival_appeared: 'ライバル登場',
  district_tournament_unlocked: '地区大会解放',
  expansion_unlocked: '店舗拡張解放',
};

export const STAGE_ORDER: StoryStage[] = [
  'tutorial_before',
  'tutorial_match_started',
  'tutorial_after',
  'shop_entrusted',
  'regular_match_unlocked',
  'rival_appeared',
  'district_tournament_unlocked',
  'expansion_unlocked',
];

const NPC_FALLBACKS: Record<CharacterId, { name: string; role: string }> = {
  misaki: { name: '美咲', role: '主人公' },
  kenta: { name: '健太', role: '彼氏' },
  kurokawa: { name: '黒川', role: '三元楼 店主' },
  takeji: { name: 'タケ爺', role: '常連客' },
  reina: { name: '氷室レイナ', role: '最初のライバル' },
  regular: { name: '常連のジロー', role: '近所の打ち手' },
};

const getNpcDisplayMeta = (npcId: CharacterId) => {
  const spec = CHARACTER_SPEC_BY_RUNTIME_ID[npcId];
  if (spec) {
    return {
      name: spec.appearance.display_name,
      role: spec.story.role_label,
    };
  }
  return NPC_FALLBACKS[npcId];
};

export const UPGRADE_DEFS: Record<UpgradeId, {
  label: string;
  description: string;
  cost: number;
  reputation: number;
  visitors: number;
}> = {
  bulb_repair: {
    label: '電球を交換する',
    description: '薄暗い店内が明るくなり、初めての客が来やすくなる。',
    cost: 500,
    reputation: 1,
    visitors: 2,
  },
  wifi: {
    label: 'Wi-Fiを設置する',
    description: '女子大生トリオが来店し始める。SNSで話題になるかも。',
    cost: 1200,
    reputation: 2,
    visitors: 4,
  },
  table_clean: {
    label: '卓を磨いて整備する',
    description: '常連客の評判が上がり、口コミが広がる。',
    cost: 1800,
    reputation: 3,
    visitors: 5,
  },
  signboard: {
    label: '新しい看板を付ける',
    description: '三元楼の存在感が増し、Phase 2への扉が開く。',
    cost: 2800,
    reputation: 5,
    visitors: 6,
  },
};

const dialogueMap: Record<CharacterId, Partial<Record<StoryStage, string[]>>> = {
  kenta: {
    tutorial_before: [
      'ここ最高だろ。俺のホームグラウンド。',
      '黒川さんに挨拶したら、一局だけ打ってみよう。負けても俺が横で見てるから。',
    ],
    tutorial_match_started: [
      '（リーチ！）',
    ],
    tutorial_after: [
      '黒川さん、様子がおかしい。奥の部屋を見に行ったほうがいいかもしれない。',
    ],
    shop_entrusted: [
      'まさか君が店を任されることになるなんてな。俺もできる限り手伝うよ。',
      '今リーチかかってるから待って。',
    ],
  },
  kurokawa: {
    tutorial_before: [
      'ふむ。おぬし——経営学部じゃな？',
      'よし。この店を、おぬしに譲ろう。',
      '麻雀を打って得た得点で、この店を立て直してほしい。',
      'これは賭け麻雀ではないぞい。',
    ],
    tutorial_match_started: [
      '卓に座ったなら最後まで打て。半端な気持ちは牌に嫌われる。',
    ],
    tutorial_after: [
      '……すまん、少し奥で休む。三元楼を、ほんの少しだけ見ていてくれ。',
      '三元楼は客との信頼で続いてきた。数字と勝負、どちらも見落とすな。',
    ],
    shop_entrusted: [
      '三元楼を守るなら、客の顔と卓の流れを覚えろ。',
      'これは賭け麻雀ではないぞい。',
    ],
    regular_match_unlocked: [
      '……悪くない。',
    ],
  },
  takeji: {
    tutorial_before: [
      'おや、新顔さんだね。牌は怖がると逃げるよ。まずは笑って座ればいい。',
    ],
    tutorial_after: [
      '黒川の旦那がいないなら、常連が店を荒らさないよう見張っておくよ。',
    ],
    shop_entrusted: [
      '店番初日から大変だねえ。だが、勝った客にはまた次の卓が待っているもんさ。',
    ],
  },
  regular: {
    shop_entrusted: [
      '黒川さんが戻るまで、あんたが店を見るのかい？なら一度、腕を見せてもらおうか。',
    ],
    regular_match_unlocked: [
      '今日も一局どうだい。三元楼は少しずつ活気が戻ってきたな。',
    ],
  },
  reina: {
    rival_appeared: [
      'ここが噂の三元楼？店番の子が勝ち続けていると聞いたわ。',
      '私は氷室レイナ。次に卓を囲む時は、遠慮なく潰しにいくから。',
    ],
  },
  misaki: {
    tutorial_before: [
      '……デートって言ってたよね？',
      '初めての雀荘。タバコの匂い、牌の音、知らない人たちの視線。少しだけ胸が高鳴る。',
    ],
  },
};

export const getDialogues = (npcId: CharacterId, stage: StoryStage): string[] => {
  const stageDialogues = dialogueMap[npcId]?.[stage];
  if (stageDialogues) return stageDialogues;

  if (stage === 'shop_entrusted' || stage === 'regular_match_unlocked') {
    return dialogueMap[npcId]?.shop_entrusted ?? ['……'];
  }

  return dialogueMap[npcId]?.tutorial_before ?? ['……'];
};

export const isStageAtLeast = (stage: StoryStage, required: StoryStage) => (
  STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(required)
);

export const getVisibleNpcs = (stage: StoryStage): RpgNpc[] => (
  getHakuryuteiStageLayout(stage).npc_layouts.map((layout) => {
    const meta = getNpcDisplayMeta(layout.npc_id);
    return {
      id: layout.npc_id,
      name: meta.name,
      role: meta.role,
      position: layout.position,
      facing: layout.facing,
      sprite: layout.sprite,
    };
  })
);

const NPC_PATROL_ROUTES: Partial<Record<StoryStage, Partial<Record<CharacterId, Position[]>>>> = {
  tutorial_before: {
    kenta: [{ x: 7, y: 8 }, { x: 7, y: 9 }, { x: 7, y: 10 }, { x: 7, y: 9 }],
    takeji: [{ x: 3, y: 15 }, { x: 4, y: 15 }, { x: 4, y: 16 }, { x: 3, y: 16 }],
  },
  tutorial_match_started: {
    kenta: [{ x: 14, y: 11 }, { x: 14, y: 12 }, { x: 14, y: 11 }, { x: 14, y: 10 }],
  },
  tutorial_after: {
    kenta: [{ x: 20, y: 4 }, { x: 21, y: 4 }, { x: 22, y: 4 }, { x: 21, y: 4 }],
    takeji: [{ x: 24, y: 8 }, { x: 25, y: 8 }, { x: 25, y: 9 }, { x: 24, y: 9 }],
  },
  shop_entrusted: {
    kenta: [{ x: 18, y: 18 }, { x: 17, y: 18 }, { x: 18, y: 18 }, { x: 18, y: 17 }],
    takeji: [{ x: 24, y: 10 }, { x: 25, y: 10 }, { x: 25, y: 9 }, { x: 24, y: 9 }],
    regular: [{ x: 25, y: 8 }, { x: 25, y: 9 }, { x: 24, y: 9 }, { x: 24, y: 8 }],
  },
  regular_match_unlocked: {
    takeji: [{ x: 14, y: 11 }, { x: 14, y: 12 }, { x: 14, y: 13 }, { x: 14, y: 12 }],
    regular: [{ x: 24, y: 8 }, { x: 25, y: 8 }, { x: 25, y: 9 }, { x: 24, y: 9 }],
  },
  rival_appeared: {
    takeji: [{ x: 24, y: 10 }, { x: 25, y: 10 }, { x: 24, y: 10 }, { x: 24, y: 9 }],
    regular: [{ x: 25, y: 8 }, { x: 25, y: 9 }, { x: 24, y: 9 }, { x: 24, y: 8 }],
    reina: [{ x: 24, y: 12 }, { x: 25, y: 12 }, { x: 24, y: 12 }, { x: 24, y: 13 }],
  },
};

export const createStageNpcRuntimeStates = (stage: StoryStage): RpgNpcRuntimeState[] => (
  getVisibleNpcs(stage).map((npc) => {
    const route = NPC_PATROL_ROUTES[stage]?.[npc.id] ?? [npc.position];
    return {
      ...npc,
      route,
      routeIndex: 0,
      waitTicks: npc.id === 'kurokawa' ? 9999 : 5,
      moving: false,
    };
  })
);

export const isBlockedPosition = (
  position: Position,
  stage: StoryStage,
  npcs: RpgNpc[] = getVisibleNpcs(stage),
) => {
  if (
    position.x < 0 ||
    position.y < 0 ||
    position.x >= RPG_MAP_WIDTH ||
    position.y >= RPG_MAP_HEIGHT
  ) {
    return true;
  }

  if (isHakuryuteiBlocked(position)) return true;

  return npcs.some(
    (npc) => npc.position.x === position.x && npc.position.y === position.y,
  );
};

export const getNpcAt = (
  position: Position,
  stage: StoryStage,
  npcs: RpgNpc[] = getVisibleNpcs(stage),
) => (
  npcs.find(
    (npc) => npc.position.x === position.x && npc.position.y === position.y,
  ) ?? null
);

export const getTalkTarget = (
  position: Position,
  facing: Direction,
  stage: StoryStage,
  npcs: RpgNpc[] = getVisibleNpcs(stage),
) => {
  const interactionNpcId = getHakuryuteiInteractionNpcId(position);
  if (interactionNpcId) {
    return npcs.find((npc) => npc.id === interactionNpcId) ?? null;
  }

  const nextPosition = {
    up: { x: position.x, y: position.y - 1 },
    down: { x: position.x, y: position.y + 1 },
    left: { x: position.x - 1, y: position.y },
    right: { x: position.x + 1, y: position.y },
  }[facing];

  return getNpcAt(nextPosition, stage, npcs);
};
