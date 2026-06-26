import type {
  CharacterId,
  Direction,
  Position,
  RpgNpcSpriteVariant,
  StoryStage,
} from './types';

export type HakuryuteiZoneId =
  | 'entrance'
  | 'reception'
  | 'table_area'
  | 'waiting_area'
  | 'restroom'
  | 'center_area';

interface GridRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MapZone extends GridRect {
  id: HakuryuteiZoneId;
  label: string;
  description: string;
}

interface MahjongTableSpec extends GridRect {
  id: string;
  seats: number;
  type: 'automatic';
  capacity: 4;
  states: Array<'empty' | 'waiting' | 'playing' | 'tournament'>;
}

interface FacilitySpec extends GridRect {
  interaction?: string;
  function?: string;
  collision: boolean;
}

interface MapEventSpec {
  id: string;
  trigger_zone: HakuryuteiZoneId | 'counter';
  summary: string;
  stages: StoryStage[];
  trigger_rect?: GridRect;
}

interface StageNpcLayoutSpec {
  npc_id: CharacterId;
  position: Position;
  facing: Direction;
  sprite: RpgNpcSpriteVariant;
  zone: HakuryuteiZoneId;
  behavior: string;
  notes: string[];
}

interface StageTableStateSpec {
  table_id: string;
  state: 'empty' | 'waiting' | 'playing' | 'tournament';
  occupants: string;
  note: string;
}

interface StageLayoutSpec {
  mood: string;
  active_event_ids: string[];
  npc_layouts: StageNpcLayoutSpec[];
  table_states: StageTableStateSpec[];
}

interface CollisionArea extends GridRect {
  id: string;
  label: string;
}

interface SpawnPointMap {
  player_entrance: Position;
  owner_counter: Position;
  kenta_intro: Position;
  takeji_regular: Position;
  regular_sofa: Position;
  reina_showdown: Position;
}

interface HakuryuteiMapSpec {
  map_id: 'hakuryutei_main';
  name: '三元楼';
  type: 'mahjong_parlor';
  era: '1990s_japan';
  style: 'snes_rpg';
  perspective: 'isometric_3quarter';
  tile_size: '16x16';
  size: {
    width: 30;
    height: 20;
    pixel_width: 480;
    pixel_height: 320;
  };
  floor: {
    tile: 'carpet_purple';
    walkable: true;
  };
  wall: {
    material: 'dark_wood';
    height_tiles: 2;
    collision: true;
  };
  counter: GridRect & {
    interaction: 'reception';
    label: string;
  };
  npc_spawns: {
    kurokawa: {
      id: CharacterId;
      spawn: Position;
      role: 'shop_owner';
    };
  };
  mahjong_tables: MahjongTableSpec[];
  npc_group: {
    regulars: {
      count: 12;
      visit_rate: 'daily';
      behaviors: Array<'play_mahjong' | 'drink' | 'read_magazine' | 'talk'>;
    };
  };
  facilities: {
    vending_machine: FacilitySpec;
    magazine_rack: FacilitySpec;
    sofa: FacilitySpec;
    shoe_rack: FacilitySpec;
    restroom_door: FacilitySpec;
  };
  decorations: {
    scroll: {
      title: '一打入魂';
    };
    price_board: {
      general: 400;
      student: 300;
      free: 400;
    };
    ranking_board: {
      update: 'daily';
    };
  };
  navigation: MapZone[];
  events: MapEventSpec[];
  environment: {
    atmosphere: ['warm', 'nostalgic', 'busy'];
    lighting: 'indoor_warm';
    wood_ratio: 'high';
    plants: 'present';
    clutter: 'moderate';
    cleanliness: 80;
  };
  collision_areas: CollisionArea[];
  interaction_points: {
    owner_counter_talk: GridRect & {
      npc_id: CharacterId;
    };
  };
  spawn_points: SpawnPointMap;
  stage_layouts: Record<StoryStage, StageLayoutSpec>;
}

export const HAKURYUTEI_MAP_SPEC: HakuryuteiMapSpec = {
  map_id: 'hakuryutei_main',
  name: '三元楼',
  type: 'mahjong_parlor',
  era: '1990s_japan',
  style: 'snes_rpg',
  perspective: 'isometric_3quarter',
  tile_size: '16x16',
  size: {
    width: 30,
    height: 20,
    pixel_width: 480,
    pixel_height: 320,
  },
  floor: {
    tile: 'carpet_purple',
    walkable: true,
  },
  wall: {
    material: 'dark_wood',
    height_tiles: 2,
    collision: true,
  },
  counter: {
    x: 11,
    y: 1,
    width: 6,
    height: 2,
    interaction: 'reception',
    label: '受付カウンター',
  },
  npc_spawns: {
    kurokawa: {
      id: 'kurokawa',
      spawn: { x: 14, y: 2 },
      role: 'shop_owner',
    },
  },
  mahjong_tables: [
    {
      id: 'table_01',
      x: 4,
      y: 7,
      width: 4,
      height: 4,
      seats: 4,
      type: 'automatic',
      capacity: 4,
      states: ['empty', 'waiting', 'playing', 'tournament'],
    },
    {
      id: 'table_02',
      x: 13,
      y: 7,
      width: 4,
      height: 4,
      seats: 4,
      type: 'automatic',
      capacity: 4,
      states: ['empty', 'waiting', 'playing', 'tournament'],
    },
    {
      id: 'table_03',
      x: 5,
      y: 14,
      width: 4,
      height: 4,
      seats: 4,
      type: 'automatic',
      capacity: 4,
      states: ['empty', 'waiting', 'playing', 'tournament'],
    },
    {
      id: 'table_04',
      x: 22,
      y: 14,
      width: 4,
      height: 4,
      seats: 4,
      type: 'automatic',
      capacity: 4,
      states: ['empty', 'waiting', 'playing', 'tournament'],
    },
  ],
  npc_group: {
    regulars: {
      count: 12,
      visit_rate: 'daily',
      behaviors: ['play_mahjong', 'drink', 'read_magazine', 'talk'],
    },
  },
  facilities: {
    vending_machine: {
      x: 28,
      y: 4,
      width: 2,
      height: 4,
      interaction: 'buy_drink',
      collision: true,
    },
    magazine_rack: {
      x: 24,
      y: 5,
      width: 3,
      height: 3,
      interaction: 'read_tip',
      collision: true,
    },
    sofa: {
      x: 26,
      y: 6,
      width: 4,
      height: 4,
      function: 'waiting_area',
      collision: true,
    },
    shoe_rack: {
      x: 2,
      y: 18,
      width: 6,
      height: 2,
      collision: true,
    },
    restroom_door: {
      x: 0,
      y: 3,
      width: 2,
      height: 3,
      interaction: 'restroom',
      collision: false,
    },
  },
  decorations: {
    scroll: {
      title: '一打入魂',
    },
    price_board: {
      general: 400,
      student: 300,
      free: 400,
    },
    ranking_board: {
      update: 'daily',
    },
  },
  navigation: [
    {
      id: 'entrance',
      label: '入口',
      description: '初回来店イベントと出入りの導線。',
      x: 11,
      y: 17,
      width: 8,
      height: 3,
    },
    {
      id: 'reception',
      label: '受付',
      description: '店主との会話、受付、支払い処理。',
      x: 10,
      y: 1,
      width: 10,
      height: 4,
    },
    {
      id: 'table_area',
      label: '卓エリア',
      description: '4卓の麻雀対局が行われるメインフロア。',
      x: 2,
      y: 6,
      width: 25,
      height: 12,
    },
    {
      id: 'waiting_area',
      label: '待合',
      description: 'ソファ、自販機、雑誌ラックがある待機スペース。',
      x: 23,
      y: 4,
      width: 7,
      height: 8,
    },
    {
      id: 'restroom',
      label: '化粧室前',
      description: '左側のトイレ導線。',
      x: 0,
      y: 2,
      width: 3,
      height: 5,
    },
    {
      id: 'center_area',
      label: '中央通路',
      description: '大会開催や演出用の主動線。',
      x: 11,
      y: 8,
      width: 10,
      height: 7,
    },
  ],
  events: [
    {
      id: 'first_visit',
      trigger_zone: 'entrance',
      summary: '主人公が健太に連れられて三元楼へ初来店する。',
      stages: ['tutorial_before', 'tutorial_match_started', 'tutorial_after'],
    },
    {
      id: 'owner_talk',
      trigger_zone: 'counter',
      summary: '黒川との初会話。卓に着く導線へ接続する。',
      stages: ['tutorial_before', 'tutorial_match_started', 'tutorial_after'],
      trigger_rect: {
        x: 12,
        y: 4,
        width: 5,
        height: 2,
      },
    },
    {
      id: 'tournament',
      trigger_zone: 'center_area',
      summary: '大会開催時に卓エリア中央へ演出とNPCを集約する。',
      stages: ['rival_appeared', 'district_tournament_unlocked', 'expansion_unlocked'],
    },
  ],
  environment: {
    atmosphere: ['warm', 'nostalgic', 'busy'],
    lighting: 'indoor_warm',
    wood_ratio: 'high',
    plants: 'present',
    clutter: 'moderate',
    cleanliness: 80,
  },
  collision_areas: [
    { id: 'left_bookshelf', label: '左側本棚と壁面', x: 0, y: 0, width: 8, height: 8 },
    { id: 'left_sofa', label: '左側ソファと待合テーブル', x: 0, y: 9, width: 6, height: 5 },
    { id: 'counter', label: '受付カウンター', x: 8, y: 2, width: 12, height: 3 },
    { id: 'table_01', label: '上段左卓と椅子', x: 8, y: 5, width: 7, height: 6 },
    { id: 'table_02', label: '上段右卓と椅子', x: 16, y: 5, width: 8, height: 6 },
    { id: 'table_03', label: '下段左卓と椅子', x: 6, y: 10, width: 8, height: 7 },
    { id: 'table_04', label: '下段右卓と椅子', x: 16, y: 10, width: 8, height: 7 },
    { id: 'top_wall', label: '上側壁面（カウンター後ろ）', x: 8, y: 0, width: 13, height: 2 },
    { id: 'right_wall', label: '右側壁面・料金表・トイレドア', x: 21, y: 0, width: 9, height: 8 },
    { id: 'bottom_left_wall', label: '入口左側の壁', x: 0, y: 17, width: 11, height: 3 },
    { id: 'bottom_right_wall', label: '入口右側の壁', x: 19, y: 17, width: 11, height: 3 },
  ],
  interaction_points: {
    owner_counter_talk: {
      x: 12,
      y: 5,
      width: 6,
      height: 3,
      npc_id: 'kurokawa',
    },
  },
  spawn_points: {
    player_entrance: { x: 15, y: 18 },
    owner_counter: { x: 14, y: 2 },
    kenta_intro: { x: 7, y: 9 },
    takeji_regular: { x: 3, y: 15 },
    regular_sofa: { x: 25, y: 8 },
    reina_showdown: { x: 24, y: 12 },
  },
  stage_layouts: {
    tutorial_before: {
      mood: '初来店の緊張と通常営業のざわめきが混ざる導入シーン。',
      active_event_ids: ['first_visit', 'owner_talk'],
      npc_layouts: [
        {
          npc_id: 'kurokawa',
          position: { x: 14, y: 2 },
          facing: 'down',
          sprite: 'owner',
          zone: 'reception',
          behavior: '受付越しに新顔を見定める。',
          notes: ['プレイヤーは受付前からのみ会話できる。'],
        },
        {
          npc_id: 'kenta',
          position: { x: 7, y: 9 },
          facing: 'right',
          sprite: 'boyfriend',
          zone: 'table_area',
          behavior: '美咲を卓へ案内する。',
          notes: ['卓上ではなく左側通路に立たせ、受付への主導線を塞がない。'],
        },
        {
          npc_id: 'takeji',
          position: { x: 3, y: 15 },
          facing: 'right',
          sprite: 'regular',
          zone: 'table_area',
          behavior: '新顔へ気さくに声を掛ける。',
          notes: ['下段左卓の常連空気を作る。'],
        },
      ],
      table_states: [
        { table_id: 'table_01', state: 'playing', occupants: '常連卓', note: '入口側から見える賑わいを担当。' },
        { table_id: 'table_02', state: 'playing', occupants: '会社員卓', note: '健太の案内先に近い主卓。' },
        { table_id: 'table_03', state: 'waiting', occupants: '次局待ち', note: '主人公が座る余地を感じさせる。' },
        { table_id: 'table_04', state: 'playing', occupants: '奥側の勝負卓', note: '店の奥行きを見せる背景卓。' },
      ],
    },
    tutorial_match_started: {
      mood: '初対局前の張りつめた空気。店内の音が少し遠く感じられる。',
      active_event_ids: ['first_visit', 'owner_talk'],
      npc_layouts: [
        {
          npc_id: 'kurokawa',
          position: { x: 14, y: 2 },
          facing: 'down',
          sprite: 'owner',
          zone: 'reception',
          behavior: '受付から卓全体を監督する。',
          notes: ['黒川はカウンターを離れない。'],
        },
        {
          npc_id: 'kenta',
          position: { x: 14, y: 11 },
          facing: 'up',
          sprite: 'boyfriend',
          zone: 'center_area',
          behavior: '少し離れて初対局を見守る。',
          notes: ['主人公の背後に回り込まない位置を維持する。'],
        },
        {
          npc_id: 'takeji',
          position: { x: 3, y: 15 },
          facing: 'up',
          sprite: 'regular',
          zone: 'table_area',
          behavior: '下段卓から様子を窺う。',
          notes: ['会話よりも空気作り寄りの配置。'],
        },
      ],
      table_states: [
        { table_id: 'table_01', state: 'playing', occupants: '常連卓', note: 'いつも通りの牌音で主人公の緊張を際立てる。' },
        { table_id: 'table_02', state: 'playing', occupants: '見学付き卓', note: '初対局の注目を集める中心卓。' },
        { table_id: 'table_03', state: 'playing', occupants: '静かな常連卓', note: '店の通常営業感を維持する。' },
        { table_id: 'table_04', state: 'waiting', occupants: '空き卓', note: '奥に余白を作って画面を詰まらせない。' },
      ],
    },
    tutorial_after: {
      mood: '対局直後のざわめきの中に、店の異変が混じり始める。',
      active_event_ids: ['owner_talk'],
      npc_layouts: [
        {
          npc_id: 'kurokawa',
          position: { x: 14, y: 2 },
          facing: 'down',
          sprite: 'owner',
          zone: 'reception',
          behavior: '短い言葉だけを残し、奥へ引こうとしている。',
          notes: ['主人公は受付前から最後の会話を取る。'],
        },
        {
          npc_id: 'kenta',
          position: { x: 20, y: 4 },
          facing: 'left',
          sprite: 'boyfriend',
          zone: 'reception',
          behavior: '黒川の様子を気にして受付付近に寄る。',
          notes: ['事件の前兆を伝える導線。'],
        },
        {
          npc_id: 'takeji',
          position: { x: 24, y: 8 },
          facing: 'left',
          sprite: 'regular',
          zone: 'waiting_area',
          behavior: '異変を察しつつ騒がず見守る。',
          notes: ['待合側に退かせて画面中央を空ける。'],
        },
      ],
      table_states: [
        { table_id: 'table_01', state: 'waiting', occupants: '様子見の卓', note: '客も少し手を止めている。' },
        { table_id: 'table_02', state: 'playing', occupants: '進行中の卓', note: '店が完全には止まっていないことを示す。' },
        { table_id: 'table_03', state: 'empty', occupants: '離席中', note: '事件後の不穏さを作る。' },
        { table_id: 'table_04', state: 'playing', occupants: '奥卓', note: '奥側だけ通常営業の温度を残す。' },
      ],
    },
    shop_entrusted: {
      mood: '店主不在の緊張の中で、美咲が店の中心へ立つ章。',
      active_event_ids: [],
      npc_layouts: [
        {
          npc_id: 'kurokawa',
          position: { x: 14, y: 2 },
          facing: 'down',
          sprite: 'owner',
          zone: 'reception',
          behavior: 'カウンターの奥で構えている。',
          notes: ['経営権譲渡後もカウンター裏に残り、ルール等について尋ねられる。'],
        },
        {
          npc_id: 'kenta',
          position: { x: 18, y: 18 },
          facing: 'left',
          sprite: 'boyfriend',
          zone: 'entrance',
          behavior: '入口側で店の出入りを気に掛ける。',
          notes: ['主人公の導線を邪魔しない位置で支援役に回る。'],
        },
        {
          npc_id: 'takeji',
          position: { x: 24, y: 10 },
          facing: 'left',
          sprite: 'regular',
          zone: 'waiting_area',
          behavior: '常連への声掛けと情報集めを担う。',
          notes: ['待合の相談役として機能させる。'],
        },
        {
          npc_id: 'regular',
          position: { x: 25, y: 8 },
          facing: 'left',
          sprite: 'customer',
          zone: 'waiting_area',
          behavior: '店番を任された美咲の様子を見定める。',
          notes: ['常連客との最初の勝負へつながる。'],
        },
      ],
      table_states: [
        { table_id: 'table_01', state: 'waiting', occupants: '常連が様子見', note: '店の先行きを測る空気を出す。' },
        { table_id: 'table_02', state: 'empty', occupants: '受付待ち', note: '黒川不在の影響を見せる。' },
        { table_id: 'table_03', state: 'playing', occupants: '応援常連卓', note: '最低限の営業は続いている。' },
        { table_id: 'table_04', state: 'waiting', occupants: '新顔待ち', note: '後のライバル導線用の空き。' },
      ],
    },
    regular_match_unlocked: {
      mood: '店の空気が少し戻り、常連戦が日常へ組み込まれ始める。',
      active_event_ids: [],
      npc_layouts: [
        {
          npc_id: 'kurokawa',
          position: { x: 14, y: 2 },
          facing: 'down',
          sprite: 'owner',
          zone: 'reception',
          behavior: 'カウンターの奥で構えている。',
          notes: ['経営権譲渡後もカウンター裏に残り、ルール等について尋ねられる。'],
        },
        {
          npc_id: 'takeji',
          position: { x: 14, y: 11 },
          facing: 'left',
          sprite: 'regular',
          zone: 'center_area',
          behavior: '卓間を歩き、客同士の空気をつなぐ。',
          notes: ['美咲の相談役として中央へ寄せる。'],
        },
        {
          npc_id: 'regular',
          position: { x: 24, y: 8 },
          facing: 'left',
          sprite: 'customer',
          zone: 'waiting_area',
          behavior: '再戦を匂わせながら雑誌棚付近で時間を潰す。',
          notes: ['待合から卓へ移る前の会話導線。'],
        },
      ],
      table_states: [
        { table_id: 'table_01', state: 'playing', occupants: '常連卓', note: '評判回復で客足が戻る。' },
        { table_id: 'table_02', state: 'waiting', occupants: '対戦募集卓', note: 'プレイヤーが入りやすい卓。' },
        { table_id: 'table_03', state: 'playing', occupants: '近所卓', note: '口コミで客が戻った状態。' },
        { table_id: 'table_04', state: 'empty', occupants: '奥卓準備中', note: 'ライバル登場まで余白を残す。' },
      ],
    },
    rival_appeared: {
      mood: '三元楼の空気が一段冷え、店の視線が入口より奥へ集まる。',
      active_event_ids: ['tournament'],
      npc_layouts: [
        {
          npc_id: 'kurokawa',
          position: { x: 14, y: 2 },
          facing: 'down',
          sprite: 'owner',
          zone: 'reception',
          behavior: 'カウンターの奥で構えている。',
          notes: ['経営権譲渡後もカウンター裏に残り、ルール等について尋ねられる。'],
        },
        {
          npc_id: 'takeji',
          position: { x: 24, y: 10 },
          facing: 'left',
          sprite: 'regular',
          zone: 'waiting_area',
          behavior: '只事ではない客の気配を察して黙る。',
          notes: ['騒がずに空気を変える。'],
        },
        {
          npc_id: 'regular',
          position: { x: 25, y: 8 },
          facing: 'left',
          sprite: 'customer',
          zone: 'waiting_area',
          behavior: '雑誌に目を落としつつもレイナを気にしている。',
          notes: ['店内の緊張を受ける受け皿。'],
        },
        {
          npc_id: 'reina',
          position: { x: 24, y: 12 },
          facing: 'left',
          sprite: 'rival',
          zone: 'table_area',
          behavior: '奥卓の脇に静かに立ち、主人公を待つ。',
          notes: ['話しかけやすさと威圧感の両立位置。'],
        },
      ],
      table_states: [
        { table_id: 'table_01', state: 'playing', occupants: '常連卓', note: '平時の空気がまだ残る。' },
        { table_id: 'table_02', state: 'waiting', occupants: '注目卓', note: 'レイナ戦の舞台候補。' },
        { table_id: 'table_03', state: 'playing', occupants: '様子見の客卓', note: '店の視線が散るのを防ぐ。' },
        { table_id: 'table_04', state: 'tournament', occupants: 'ライバル卓', note: '奥側を強敵の領域として見せる。' },
      ],
    },
    district_tournament_unlocked: {
      mood: '店内が大会前夜のような高揚に包まれ、会話の密度が上がる。',
      active_event_ids: ['tournament'],
      npc_layouts: [
        {
          npc_id: 'kurokawa',
          position: { x: 14, y: 2 },
          facing: 'down',
          sprite: 'owner',
          zone: 'reception',
          behavior: 'カウンターの奥で構えている。',
          notes: ['経営権譲渡後もカウンター裏に残り、ルール等について尋ねられる。'],
        },
        {
          npc_id: 'kenta',
          position: { x: 14, y: 13 },
          facing: 'right',
          sprite: 'boyfriend',
          zone: 'table_area',
          behavior: '再合流し、主人公の背中を押す。',
          notes: ['chapter5 rejoin を店内配置へ反映。'],
        },
        {
          npc_id: 'takeji',
          position: { x: 14, y: 11 },
          facing: 'left',
          sprite: 'regular',
          zone: 'center_area',
          behavior: '大会常連の噂話を集めている。',
          notes: ['中央通路の情報拠点。'],
        },
        {
          npc_id: 'regular',
          position: { x: 25, y: 8 },
          facing: 'down',
          sprite: 'customer',
          zone: 'waiting_area',
          behavior: '観戦客としてソファ側に陣取る。',
          notes: ['待合を大会前の人だまりに見せる。'],
        },
        {
          npc_id: 'reina',
          position: { x: 24, y: 12 },
          facing: 'left',
          sprite: 'rival',
          zone: 'center_area',
          behavior: '大会の話題を持ち込み、主人公へ宣戦布告する。',
          notes: ['中央で主人公と対峙しやすい位置。'],
        },
      ],
      table_states: [
        { table_id: 'table_01', state: 'playing', occupants: '前哨戦卓', note: '大会前の肩慣らし卓。' },
        { table_id: 'table_02', state: 'tournament', occupants: '予選候補卓', note: '中央寄りで注目を集める。' },
        { table_id: 'table_03', state: 'playing', occupants: '常連卓', note: '店の地元感を残す。' },
        { table_id: 'table_04', state: 'waiting', occupants: '観戦席化', note: '奥の視線をレイナへ集める。' },
      ],
    },
    expansion_unlocked: {
      mood: '経営が軌道に乗り、三元楼が再び誇りを取り戻した状態。',
      active_event_ids: ['tournament'],
      npc_layouts: [
        {
          npc_id: 'kurokawa',
          position: { x: 14, y: 2 },
          facing: 'down',
          sprite: 'owner',
          zone: 'reception',
          behavior: '店の成長を静かに見届ける。',
          notes: ['帰還後もカウンターが定位置。'],
        },
        {
          npc_id: 'kenta',
          position: { x: 14, y: 13 },
          facing: 'right',
          sprite: 'boyfriend',
          zone: 'table_area',
          behavior: '日常の支援役として店に馴染んでいる。',
          notes: ['主人公の横に立ちすぎない。'],
        },
        {
          npc_id: 'takeji',
          position: { x: 14, y: 11 },
          facing: 'left',
          sprite: 'regular',
          zone: 'center_area',
          behavior: '新しい客をつなぐ世話役を続ける。',
          notes: ['経営安定後も情報役を維持。'],
        },
        {
          npc_id: 'regular',
          position: { x: 25, y: 8 },
          facing: 'left',
          sprite: 'customer',
          zone: 'waiting_area',
          behavior: 'すっかり常連として落ち着いている。',
          notes: ['店の再建成功を象徴する。'],
        },
      ],
      table_states: [
        { table_id: 'table_01', state: 'playing', occupants: '常連卓', note: '入口側の稼働率が高い。' },
        { table_id: 'table_02', state: 'playing', occupants: '大会帰り卓', note: '店の格が上がった後の主卓。' },
        { table_id: 'table_03', state: 'playing', occupants: '地元卓', note: '安定した日常営業を見せる。' },
        { table_id: 'table_04', state: 'waiting', occupants: '増設候補卓', note: '拡張余地を演出する。' },
      ],
    },
  },
};

const rectContains = (position: Position, rect: GridRect) => (
  position.x >= rect.x &&
  position.x < rect.x + rect.width &&
  position.y >= rect.y &&
  position.y < rect.y + rect.height
);

// 背景画像に合わせたアップグレード段階ごとの卓衝突エリア
// step0: 1台（中央）/ step1: 2台（左右）/ step2: 3台（上左+下左+下右）/ step3: 4台（2×2）
const TABLE_COLLISION_AREAS_BY_STEP = {
  step0: [
    { id: 'table_03', label: '卓と椅子', x: 7, y: 10, width: 7, height: 5 },
  ],
  step1: [
    { id: 'table_03', label: '左卓と椅子', x: 6, y: 10, width: 7, height: 6 },
    { id: 'table_04', label: '右卓と椅子', x: 17, y: 10, width: 7, height: 6 },
  ],
  step2: [
    { id: 'table_01', label: '上段左卓と椅子', x: 6, y: 6, width: 7, height: 6 },
    { id: 'table_03', label: '下段左卓と椅子', x: 5, y: 12, width: 8, height: 5 },
    { id: 'table_04', label: '下段右卓と椅子', x: 16, y: 12, width: 8, height: 5 },
  ],
  step3: [
    { id: 'table_01', label: '上段左卓と椅子', x: 6, y: 6, width: 7, height: 5 },
    { id: 'table_02', label: '上段右卓と椅子', x: 17, y: 6, width: 7, height: 5 },
    { id: 'table_03', label: '下段左卓と椅子', x: 5, y: 12, width: 8, height: 5 },
    { id: 'table_04', label: '下段右卓と椅子', x: 16, y: 12, width: 8, height: 5 },
  ],
} as const;

const getTableCollisionAreas = (upgrades?: Record<string, boolean> | null) => {
  if (!upgrades) return TABLE_COLLISION_AREAS_BY_STEP.step3;
  if (upgrades.table_add_4) return TABLE_COLLISION_AREAS_BY_STEP.step3;
  if (upgrades.table_add_3) return TABLE_COLLISION_AREAS_BY_STEP.step2;
  if (upgrades.table_add_2) return TABLE_COLLISION_AREAS_BY_STEP.step1;
  return TABLE_COLLISION_AREAS_BY_STEP.step0;
};

export const isHakuryuteiBlocked = (position: Position, upgrades?: Record<string, boolean>, stage?: StoryStage) => {
  const isTutorial = stage === 'tutorial_before' || stage === 'tutorial_match_started' || stage === 'tutorial_after';

  // 固定衝突エリア（卓以外）
  const nonTableAreas = HAKURYUTEI_MAP_SPEC.collision_areas.filter((a) => !a.id.startsWith('table_'));
  if (nonTableAreas.some((area) => rectContains(position, area))) return true;

  // 卓衝突エリア（アップグレード段階で変化）
  const tableAreas = getTableCollisionAreas(isTutorial ? null : upgrades);
  return tableAreas.some((area) => rectContains(position, area));
};

export const getHakuryuteiNavigationArea = (position: Position) => (
  HAKURYUTEI_MAP_SPEC.navigation.find((area) => rectContains(position, area)) ?? null
);

export const getHakuryuteiStageLayout = (stage: StoryStage) => (
  HAKURYUTEI_MAP_SPEC.stage_layouts[stage]
);

export const getHakuryuteiEventAt = (position: Position, stage?: StoryStage) => {
  const scopedEvents = stage
    ? HAKURYUTEI_MAP_SPEC.events.filter((event) => event.stages.includes(stage))
    : HAKURYUTEI_MAP_SPEC.events;

  const rectEvent = scopedEvents.find(
    (event) => event.trigger_rect && rectContains(position, event.trigger_rect),
  );
  if (rectEvent) return rectEvent;

  const area = getHakuryuteiNavigationArea(position);
  if (!area) return null;
  return scopedEvents.find((event) => event.trigger_zone === area.id) ?? null;
};

export const getHakuryuteiInteractionNpcId = (position: Position) => {
  const point = HAKURYUTEI_MAP_SPEC.interaction_points.owner_counter_talk;
  if (rectContains(position, point)) {
    return point.npc_id;
  }
  return null;
};
