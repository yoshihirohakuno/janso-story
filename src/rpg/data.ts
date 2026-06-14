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
  shop_entrusted: '白龍亭を託された日',
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
  kurokawa: { name: '黒川', role: '白龍亭 店主' },
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
  extra_table: {
    label: '卓を一台増やす',
    description: '同時に打てる客が増え、来客数が伸びる。',
    cost: 18000,
    reputation: 4,
    visitors: 8,
  },
  signboard: {
    label: '看板を新しくする',
    description: '白龍亭の存在感が増し、町で噂になる。',
    cost: 12000,
    reputation: 6,
    visitors: 4,
  },
  drink_menu: {
    label: 'ドリンクメニュー追加',
    description: '長く遊ぶ客が増え、常連化しやすくなる。',
    cost: 8000,
    reputation: 3,
    visitors: 5,
  },
  event_day: {
    label: '週末大会を開催',
    description: '腕自慢が集まり、ライバル登場のきっかけになる。',
    cost: 24000,
    reputation: 8,
    visitors: 12,
  },
};

const dialogueMap: Record<CharacterId, Partial<Record<StoryStage, string[]>>> = {
  kenta: {
    tutorial_before: [
      '美咲、緊張しなくていいよ。ここは昔からある白龍亭って店なんだ。',
      '黒川さんに挨拶したら、一局だけ打ってみよう。負けても俺が横で見てるから。',
    ],
    tutorial_match_started: [
      'さっきの一局、落ち着いて打ててた。あとは結果を待とう。',
    ],
    tutorial_after: [
      '黒川さん、様子がおかしい。奥の部屋を見に行ったほうがいいかもしれない。',
    ],
    shop_entrusted: [
      'まさか君が店を任されることになるなんてな。俺もできる限り手伝うよ。',
    ],
  },
  kurokawa: {
    tutorial_before: [
      'ここは白龍亭。牌を握る者の本音が、卓の上に出る店だ。',
      '初めてなら、まずは一局。怖がるな。勝つより先に、相手の呼吸を見ろ。',
    ],
    tutorial_match_started: [
      '卓に座ったなら最後まで打て。半端な気持ちは牌に嫌われる。',
    ],
    tutorial_after: [
      '……すまん、少し奥で休む。店を、ほんの少しだけ見ていてくれ。',
      '白龍亭は客との信頼で続いてきた。数字と勝負、どちらも見落とすな。',
    ],
    shop_entrusted: [
      '店を守るなら、客の顔と卓の流れを覚えろ。白龍亭はお前に預ける。',
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
      '今日も一局どうだい。白龍亭は少しずつ活気が戻ってきたな。',
    ],
  },
  reina: {
    rival_appeared: [
      'ここが噂の白龍亭？店番の子が勝ち続けていると聞いたわ。',
      '私は氷室レイナ。次に卓を囲む時は、遠慮なく潰しにいくから。',
    ],
  },
  misaki: {
    tutorial_before: [
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
    kenta: [{ x: 9, y: 8 }, { x: 10, y: 8 }, { x: 10, y: 9 }, { x: 9, y: 9 }],
    takeji: [{ x: 3, y: 15 }, { x: 4, y: 15 }, { x: 4, y: 16 }, { x: 3, y: 16 }],
  },
  tutorial_match_started: {
    kenta: [{ x: 11, y: 11 }, { x: 12, y: 11 }, { x: 11, y: 11 }, { x: 11, y: 12 }],
  },
  tutorial_after: {
    kenta: [{ x: 10, y: 5 }, { x: 11, y: 5 }, { x: 10, y: 5 }, { x: 10, y: 6 }],
    takeji: [{ x: 23, y: 8 }, { x: 24, y: 8 }, { x: 23, y: 8 }, { x: 23, y: 9 }],
  },
  shop_entrusted: {
    kenta: [{ x: 18, y: 18 }, { x: 19, y: 18 }, { x: 18, y: 18 }, { x: 18, y: 17 }],
    takeji: [{ x: 23, y: 10 }, { x: 24, y: 10 }, { x: 24, y: 9 }, { x: 23, y: 9 }],
    regular: [{ x: 27, y: 7 }, { x: 26, y: 7 }, { x: 26, y: 8 }, { x: 27, y: 8 }],
  },
  regular_match_unlocked: {
    takeji: [{ x: 18, y: 11 }, { x: 19, y: 11 }, { x: 19, y: 12 }, { x: 18, y: 12 }],
    regular: [{ x: 24, y: 8 }, { x: 25, y: 8 }, { x: 25, y: 9 }, { x: 24, y: 9 }],
  },
  rival_appeared: {
    takeji: [{ x: 23, y: 10 }, { x: 24, y: 10 }, { x: 23, y: 10 }, { x: 23, y: 9 }],
    regular: [{ x: 27, y: 7 }, { x: 27, y: 8 }, { x: 26, y: 8 }, { x: 26, y: 7 }],
    reina: [{ x: 23, y: 12 }, { x: 24, y: 12 }, { x: 23, y: 12 }, { x: 23, y: 13 }],
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
