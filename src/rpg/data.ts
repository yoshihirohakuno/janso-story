import { CHARACTER_SPEC_BY_RUNTIME_ID } from './characterSpecs';
import {
  HAKURYUTEI_MAP_SPEC,
  getHakuryuteiInteractionNpcId,
  getHakuryuteiStageLayout,
  isHakuryuteiBlocked,
} from './mapSpecs';
import type {
  CharacterId,
  DialogueState,
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
  takeji: { name: 'ヤスおじさん', role: '常連客' },
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
  table_add_2: {
    label: '卓を1台追加 (2台目)',
    description: '収容人数+2名・売上UP。「わしの4卓で40年やってきた」（黒川）',
    cost: 2000,
    reputation: 1,
    visitors: 2,
  },
  table_add_3: {
    label: '卓を1台追加 (3台目)',
    description: 'さらに卓を追加して売上を強化する。',
    cost: 2000,
    reputation: 1,
    visitors: 2,
  },
  table_add_4: {
    label: '卓を1台追加 (4台目)',
    description: '4卓すべてが揃い、店内のスペースが埋まる。',
    cost: 2000,
    reputation: 1,
    visitors: 2,
  },
  bulb_repair: {
    label: '電球を交換する',
    description: '暗い店内が明るくなり、客足が向上する。「暗い方が牌の傷が目立たんのじゃ」',
    cost: 500,
    reputation: 1,
    visitors: 2,
  },
  toilet_repair: {
    label: 'トイレを修繕',
    description: '女性客の増加やクチコミが改善する。「20年ぶりに直す。壊れてたことに気づかなんだ」',
    cost: 1200,
    reputation: 2,
    visitors: 3,
  },
  floor_new: {
    label: '床を新調する',
    description: '清潔感あふれる綺麗な床板に変更する。「この床のきしみも味じゃかったんじゃがな」',
    cost: 1000,
    reputation: 2,
    visitors: 3,
  },
  wallpaper_change: {
    label: '壁紙を変更する',
    description: '壁の黄ばみが消え、明るい印象になる。「黄ばみも歴史じゃと思うんじゃが」',
    cost: 900,
    reputation: 2,
    visitors: 3,
  },
  auto_table: {
    label: '自動雀卓にする',
    description: '対局スピード・回転率が向上する。「牌を積むのが仕事じゃったのに…」',
    cost: 3500,
    reputation: 4,
    visitors: 5,
  },
  tea_service: {
    label: 'お茶サービス開始',
    description: '顧客満足度と来店頻度が向上する。「急須が1本しかない。美咲が走り回る」',
    cost: 300,
    reputation: 1,
    visitors: 1,
  },
  wifi: {
    label: 'Wi-Fi設置',
    description: '女子大生トリオなどの新規客が定着する。「電気代が2倍になったぞい」',
    cost: 1500,
    reputation: 2,
    visitors: 3,
  },
  drink_bar: {
    label: 'ドリンクバーを設置',
    description: '客単価と滞在時間が向上する。「お茶だけで良かったじゃろうに」',
    cost: 1800,
    reputation: 3,
    visitors: 4,
  },
  extend_hours: {
    label: '営業時間延長',
    description: '売上がアップするが、美咲の睡眠時間が減る。「健太がナチュラルに終電を逃す」',
    cost: 0,
    reputation: 1,
    visitors: 2,
  },
};

export const UPGRADE_PREREQUISITES: Record<UpgradeId, UpgradeId | null> = {
  table_add_2: null,
  table_add_3: 'table_add_2',
  table_add_4: 'table_add_3',
  bulb_repair: 'table_add_4',
  toilet_repair: 'bulb_repair',
  floor_new: 'toilet_repair',
  wallpaper_change: 'floor_new',
  auto_table: 'wallpaper_change',
  tea_service: null,
  wifi: null,
  drink_bar: null,
  extend_hours: null,
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

export const getOpeningSceneDialogue = (): NonNullable<DialogueState['speakerLines']> => [
  // シーン2
  {
    npcId: 'kenta',
    characterName: '健太',
    text: 'おーい黒川さん！　彼女連れてきました！',
  },
  {
    npcId: 'kurokawa',
    characterName: '黒川',
    text: 'ほう。彼女さん……初めてかね？',
  },
  {
    npcId: 'misaki',
    characterName: '美咲',
    text: 'あ、はい。田中美咲です。よろしくお願いします。',
  },
  // シーン3
  {
    npcId: 'kurokawa',
    characterName: '黒川',
    text: '田中さんは、お仕事は……いや、学生さんかね？',
  },
  {
    npcId: 'misaki',
    characterName: '美咲',
    text: '大学2年です。',
  },
  {
    npcId: 'kenta',
    characterName: '健太',
    text: '経営学部なんですよ、美咲！',
  },
  // シーン4
  {
    npcId: 'kurokawa',
    characterName: '黒川',
    text: '……！！　経営学部とな？？',
  },
  {
    npcId: 'misaki',
    characterName: '美咲',
    text: 'え、はい……それが何か……？',
  },
  {
    npcId: 'kurokawa',
    characterName: '黒川',
    text: 'おお……おお！　ついに現れたか……！',
  },
  {
    npcId: 'kenta',
    characterName: '健太',
    text: '（黒川さん、テンション高くなった？）',
  },
  {
    npcId: 'kurokawa',
    characterName: '黒川',
    text: '長きにわたり、わしはこの店を立て直せる者を待っておった。',
  },
  {
    npcId: 'kurokawa',
    characterName: '黒川',
    text: '経営学部……まさに、伝説に語られし者ぞ。',
  },
  {
    npcId: 'misaki',
    characterName: '美咲',
    text: '伝説は大げさです！　ただの2年生です！',
  },
  // シーン5
  {
    npcId: 'kurokawa',
    characterName: '黒川',
    text: '田中よ。単刀直入に聞こう。',
  },
  {
    npcId: 'kurokawa',
    characterName: '黒川',
    text: 'この店、譲り受けてみる気はないかね？',
  },
  {
    npcId: 'kenta',
    characterName: '健太',
    text: 'お、面白そう。麻雀打てるならなんでもいいよ。',
  },
  {
    npcId: 'misaki',
    characterName: '美咲',
    text: '健太くん、話の重みを理解して……',
    choices: ['……考えてみます', 'いえ、無理です'],
  },
];

export const getOpeningLoopDialogue = (): NonNullable<DialogueState['speakerLines']> => [
  {
    npcId: 'kurokawa',
    characterName: '黒川',
    text: 'そうか。……では、もう一度聞こう。経営学部の者よ、この店を継いでくれぬか？',
    choices: ['……考えてみます', 'いえ、無理です'],
  },
];

export const getOpeningScene6Dialogue = (): NonNullable<DialogueState['speakerLines']> => [
  {
    npcId: 'kurokawa',
    characterName: '黒川',
    text: 'よし。では、その力——まことに伝説の者か——',
  },
  {
    npcId: 'kurokawa',
    characterName: '黒川',
    text: 'わしと一局、見せてみよ。',
  },
  {
    npcId: 'misaki',
    characterName: '美咲',
    text: 'え、私何も知らな——',
  },
  {
    npcId: 'kenta',
    characterName: '健太',
    text: '楽しそうじゃん！　俺も打つ打つ！',
  },
  {
    npcId: 'misaki',
    characterName: '美咲',
    text: '健太くんは呼ばれてないでしょ！',
  },
  {
    npcId: 'kurokawa',
    characterName: '黒川',
    text: 'おい、ヤス。卓が足りん。付き合え。',
  },
  {
    npcId: 'takeji',
    characterName: 'ヤスおじさん',
    text: 'ええよ。',
  },
];

export const getPostMatchDialogue = (victory: boolean): NonNullable<DialogueState['speakerLines']> => {
  const scene8: NonNullable<DialogueState['speakerLines']> = victory
    ? [
        {
          npcId: 'kurokawa',
          characterName: '黒川',
          text: '……勝ったか。初めてで、勝ったか。',
        },
        {
          npcId: 'misaki',
          characterName: '美咲',
          text: 'よくわからないまま勝っちゃいました……',
        },
        {
          npcId: 'kurokawa',
          characterName: '黒川',
          text: 'うむ。これは思った以上に……うむ。',
        },
        {
          npcId: 'takeji',
          characterName: 'ヤスおじさん',
          text: '（ぼそっと）……牌、おかしかったんちゃうか。',
        },
        {
          npcId: 'misaki',
          characterName: '美咲',
          text: '（なんか、ちょっと……面白いかも）',
        },
      ]
    : [
        {
          npcId: 'kurokawa',
          characterName: '黒川',
          text: '負けたな。じゃが——筋は、悪くない。',
        },
        {
          npcId: 'misaki',
          characterName: '美咲',
          text: '負けたのに褒められると、ちょっと悔しいです……',
        },
        {
          npcId: 'takeji',
          characterName: 'ヤスおじさん',
          text: '（ぼそっと）……牌、おかしかったんちゃうか。',
        },
        {
          npcId: 'kurokawa',
          characterName: '黒川',
          text: 'その悔しさが、ちょうどよい。',
        },
        {
          npcId: 'misaki',
          characterName: '美咲',
          text: '（次は勝ちたい、って思ってる私……？）',
        },
      ];

  const scene9: NonNullable<DialogueState['speakerLines']> = [
    // シーン9
    {
      npcId: 'kurokawa',
      characterName: '黒川',
      text: 'よし。少しはやる気になったようじゃな。ならば——この店のルールを教えておこう。',
    },
    {
      npcId: 'kurokawa',
      characterName: '黒川',
      text: '（黄ばんだ規約の紙を提示した） 麻雀で得た点数が、そのまま店を直す「両」になる。ただし——これは賭け麻雀ではないぞい。',
    },
    {
      npcId: 'misaki',
      characterName: '美咲',
      text: 'いや、賭けと何が違うんですか！？',
    },
    {
      npcId: 'kurokawa',
      characterName: '黒川',
      text: '細かいことを気にするな。経営学部の悪いクセじゃ。',
    },
    {
      npcId: 'kurokawa',
      characterName: '黒川',
      text: 'どうじゃ？ 三元楼の経営を引き受けてくれるかね？',
      choices: ['引き受ける', '断る'],
    },
  ];

  return [
    ...scene8,
    ...scene9,
  ];
};

export const getPostMatchLoopDialogue = (): NonNullable<DialogueState['speakerLines']> => [
  {
    npcId: 'kurokawa',
    characterName: '黒川',
    text: 'そうか。……では、もう一度聞こう。',
    choices: ['引き受ける', '断る'],
  },
];

export const getPostMatchScene10Dialogue = (): NonNullable<DialogueState['speakerLines']> => [
  {
    npcId: 'kurokawa',
    characterName: '黒川',
    text: 'よい。今日からこの店は、おぬしのものじゃ。',
  },
  {
    npcId: 'takeji',
    characterName: 'ヤスおじさん',
    text: 'ルールはじいさ……黒川さんが言うた通りや。あとは打って、店直して、また打つだけや。',
  },
  {
    npcId: 'misaki',
    characterName: '美咲',
    text: 'シンプルなんですね。',
  },
  {
    npcId: 'takeji',
    characterName: 'ヤスおじさん',
    text: 'シンプルやで。ただし牌がおかしい日もある。',
  },
  {
    npcId: 'misaki',
    characterName: '美咲',
    text: 'それさっきも言ってましたよね！？',
  },
  {
    npcId: 'kenta',
    characterName: '健太',
    text: 'ここのお茶うまいな。',
  },
  {
    npcId: 'misaki',
    characterName: '美咲',
    text: 'そこは反応するところじゃない。',
  },
  {
    npcId: 'misaki',
    characterName: '美咲',
    text: '（やる気が出てきた……これも経営学部の血か……？）',
  },
  {
    npcId: 'misaki',
    characterName: 'ナレーション',
    text: 'こうして美咲の、誰も頼んでいない雀荘経営がはじまった。',
  },
];


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
