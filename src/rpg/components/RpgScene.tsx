import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Coins,
  DoorOpen,
  Gamepad2,
  MessageCircle,
  RotateCcw,
  Save,
  Star,
  Trophy,
  Users,
} from 'lucide-react';
import { CHARACTER_SPEC_BY_RUNTIME_ID } from '../characterSpecs';
import { RPG_MAP_HEIGHT, RPG_MAP_WIDTH, STORY_LABELS, UPGRADE_DEFS } from '../data';
import {
  getHakuryuteiEventAt,
  getHakuryuteiInteractionNpcId,
  getHakuryuteiNavigationArea,
  getHakuryuteiStageLayout,
  HAKURYUTEI_MAP_SPEC,
} from '../mapSpecs';
import { useRpgStore } from '../store';
import type { Direction, Position, RpgNpc } from '../types';
import '../index.css';

interface RpgSceneProps {
  onStartTutorialMatch: () => void;
  onOpenMahjongLobby: () => void;
}

interface SpriteProps {
  name: string;
  position: Position;
  facing: Direction;
  sprite: RpgNpc['sprite'] | 'hero';
  isPlayer?: boolean;
  isMoving?: boolean;
  isTarget?: boolean;
  spriteFrameUrl?: string | null;   // 美咲(プレイヤー)用 or NPC画像ベース共用
  motionOffset?: Position;
}

const MISAKI_FRAME_NUMBERS: Record<Direction, number[]> = {
  up: [1, 2, 3, 4],
  right: [5, 6, 7, 8],
  down: [9, 10, 11, 12],
  left: [13, 14, 15, 16],
};

// 健太: 美咲と同じ 4方向×4コマ = 16枚 方式
const KENTA_FRAME_NUMBERS: Record<Direction, number[]> = {
  up: [1, 2, 3, 4],
  right: [5, 6, 7, 8],
  down: [9, 10, 11, 12],
  left: [13, 14, 15, 16],
};

// 黒川（店主）: 美咲・健太と同じ 4方向×4コマ = 16枚 方式
const KUROKAWA_FRAME_NUMBERS: Record<Direction, number[]> = {
  up: [1, 2, 3, 4],
  right: [5, 6, 7, 8],
  down: [9, 10, 11, 12],
  left: [13, 14, 15, 16],
};

const MOVEMENT_KEYS: Record<string, Direction> = {
  arrowup: 'up',
  w: 'up',
  arrowdown: 'down',
  s: 'down',
  arrowleft: 'left',
  a: 'left',
  arrowright: 'right',
  d: 'right',
};

const getMisakiFrameUrl = (facing: Direction, frameIndex: number) => {
  const frameNumbers = MISAKI_FRAME_NUMBERS[facing];
  const frameNumber = frameNumbers[frameIndex % frameNumbers.length];
  return `/rpg/misaki-walk-frames/edited-photo_${frameNumber}.png`;
};

const getKentaFrameUrl = (facing: Direction, frameIndex: number) => {
  const frameNumbers = KENTA_FRAME_NUMBERS[facing];
  const frameNumber = frameNumbers[frameIndex % frameNumbers.length];
  return `/rpg/kenta-walk-frames/edited-photo_${frameNumber}.png`;
};

const getKurakawaFrameUrl = (facing: Direction, frameIndex: number) => {
  const frameNumbers = KUROKAWA_FRAME_NUMBERS[facing];
  const frameNumber = frameNumbers[frameIndex % frameNumbers.length];
  return `/rpg/kurokawa-walk-frames/edited-photo_${frameNumber}.png`;
};

// ポートレート画像URL取得
const getPortraitUrl = (npcId: string) =>
  `/rpg/portraits/${npcId}-normal.png`;

const PixelSprite: React.FC<SpriteProps> = ({
  name,
  position,
  facing,
  sprite,
  isPlayer = false,
  isMoving = false,
  isTarget = false,
  spriteFrameUrl = null,
  motionOffset = { x: 0, y: 0 },
}) => {
  // 画像フレームが渡された場合は画像ベース描画（プレイヤー・NPC共通）
  const hasImageFrame = spriteFrameUrl != null;

  // 画像ベースNPCはプレイヤーと同じ絶対配置（グリッドセル基準だとサイズが小さくなるため）
  const useAbsolutePos = isPlayer || hasImageFrame;

  const spriteStyle: React.CSSProperties = useAbsolutePos
    ? {
      left: `${((position.x + motionOffset.x + 0.5) / RPG_MAP_WIDTH) * 100}%`,
      top: `${((position.y + motionOffset.y + 1) / RPG_MAP_HEIGHT) * 100}%`,
    }
    : {
      gridColumn: position.x + 1,
      gridRow: position.y + 1,
    };

  return (
    <div
      className={`rpg-sprite sprite-${sprite} facing-${facing} ${isPlayer ? 'is-player' : ''} ${isMoving ? 'is-moving' : ''} ${isTarget ? 'is-target' : ''} ${hasImageFrame && !isPlayer ? 'is-image-npc' : ''}`}
      style={spriteStyle}
      title={name}
    >
      <span className="sprite-shadow" />
      {hasImageFrame ? (
        <img
          className="sprite-frame-image"
          src={spriteFrameUrl}
          alt=""
          draggable={false}
        />
      ) : (
        <>
          <span className="sprite-hair" />
          <span className="sprite-face" />
          <span className="sprite-body" />
          <span className="sprite-arms" />
          <span className="sprite-legs" />
          <span className="sprite-feet" />
        </>
      )}
      {!isPlayer ? <span className="sprite-nameplate">{name}</span> : null}
    </div>
  );
};

const StatPill: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
  <div className="rpg-stat-pill">
    <span className="rpg-stat-icon">{icon}</span>
    <span className="rpg-stat-label">{label}</span>
    <strong>{value}</strong>
  </div>
);

const getZoneLabel = (zoneId: string) => (
  HAKURYUTEI_MAP_SPEC.navigation.find((zone) => zone.id === zoneId)?.label ?? zoneId
);

export const RpgScene: React.FC<RpgSceneProps> = ({ onStartTutorialMatch, onOpenMahjongLobby }) => {
  const [playerFrameIndex, setPlayerFrameIndex] = useState(0);
  const [playerMoving, setPlayerMoving] = useState(false);
  const [playerRenderPosition, setPlayerRenderPosition] = useState<Position | null>(null);
  const [playerMotionOffset, setPlayerMotionOffset] = useState<Position>({ x: 0, y: 0 });
  // 健太のフレームアニメーション用（NPC共通のグローバルフレームカウンター）
  const [npcFrameIndex, setNpcFrameIndex] = useState(0);
  const playerMoveTimerRef = useRef<number | null>(null);
  const playerMovingRef = useRef(false);
  const heldDirectionRef = useRef<Direction | null>(null);
  const {
    storyStage,
    ryou,
    reputation,
    storeLevel,
    visitors,
    regulars,
    position,
    facing,
    records,
    upgrades,
    dialogue,
    statusMessage,
    hasSave,
    lastSavedAt,
    currentMatch,
    npcStates,
    movePlayer,
    startDialogue,
    advanceDialogue,
    startTutorialMatch,
    buyUpgrade,
    saveGame,
    loadGame,
    resetGame,
    tickNpcMovement,
  } = useRpgStore();

  const stageLayout = useMemo(() => getHakuryuteiStageLayout(storyStage), [storyStage]);
  const currentArea = useMemo(
    () => getHakuryuteiNavigationArea(position),
    [position],
  );
  const currentEvent = useMemo(
    () => getHakuryuteiEventAt(position, storyStage),
    [position, storyStage],
  );
  const targetNpc = useMemo(
    () => {
      const interactionNpcId = getHakuryuteiInteractionNpcId(position);
      if (interactionNpcId) {
        return npcStates.find((npc) => npc.id === interactionNpcId) ?? null;
      }

      const nextPosition = {
        up: { x: position.x, y: position.y - 1 },
        down: { x: position.x, y: position.y + 1 },
        left: { x: position.x - 1, y: position.y },
        right: { x: position.x + 1, y: position.y },
      }[facing];

      return npcStates.find(
        (npc) => npc.position.x === nextPosition.x && npc.position.y === nextPosition.y,
      ) ?? null;
    },
    [facing, npcStates, position],
  );
  const misakiSpec = CHARACTER_SPEC_BY_RUNTIME_ID.misaki ?? null;
  const focusedSpec = targetNpc
    ? CHARACTER_SPEC_BY_RUNTIME_ID[targetNpc.id] ?? null
    : misakiSpec;
  const focusedName = targetNpc?.name ?? misakiSpec?.appearance.display_name ?? '美咲';
  const focusedRole = focusedSpec?.story.role_label ?? targetNpc?.role ?? '主人公';
  const focusedPresence = focusedSpec?.map_usage.stage_presence.find(
    (presence) => presence.stage === storyStage,
  ) ?? null;
  const focusedLayout = targetNpc
    ? stageLayout.npc_layouts.find((layout) => layout.npc_id === targetNpc.id) ?? null
    : null;
  const activeTableCount = stageLayout.table_states.filter((table) => table.state !== 'empty').length;
  const misakiFrameUrl = useMemo(
    () => getMisakiFrameUrl(facing, playerMoving ? playerFrameIndex : 0),
    [facing, playerFrameIndex, playerMoving],
  );

  const canStartTutorialMatch = (
    (storyStage === 'tutorial_before' && targetNpc?.id === 'kurokawa') ||
    storyStage === 'tutorial_match_started'
  );

  const moveMisaki = useCallback((direction: Direction) => {
    if (playerMovingRef.current) return;

    const before = useRpgStore.getState().position;
    const moved = movePlayer(direction);
    const after = useRpgStore.getState().position;

    if (playerMoveTimerRef.current) {
      window.clearTimeout(playerMoveTimerRef.current);
    }

    if (!moved || (before.x === after.x && before.y === after.y)) {
      setPlayerRenderPosition(null);
      setPlayerMotionOffset({ x: 0, y: 0 });
      playerMovingRef.current = false;
      setPlayerMoving(false);
      return;
    }

    setPlayerFrameIndex((frameIndex) => (frameIndex + 1) % 4);
    setPlayerRenderPosition(before);
    setPlayerMotionOffset({ x: 0, y: 0 });
    playerMovingRef.current = true;
    setPlayerMoving(true);

    window.requestAnimationFrame(() => {
      setPlayerMotionOffset({
        x: after.x - before.x,
        y: after.y - before.y,
      });
    });

    playerMoveTimerRef.current = window.setTimeout(() => {
      setPlayerRenderPosition(null);
      setPlayerMotionOffset({ x: 0, y: 0 });
      playerMovingRef.current = false;
      setPlayerMoving(false);
      playerMoveTimerRef.current = null;
    }, 230);
  }, [movePlayer]);

  useEffect(() => () => {
    if (playerMoveTimerRef.current) {
      window.clearTimeout(playerMoveTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (dialogue) {
        if (key === 'enter' || key === ' ') {
          event.preventDefault();
          advanceDialogue();
        }
        return;
      }

      if (MOVEMENT_KEYS[key]) {
        event.preventDefault();
        heldDirectionRef.current = MOVEMENT_KEYS[key];
        moveMisaki(MOVEMENT_KEYS[key]);
        return;
      }

      if ((key === 'enter' || key === ' ') && targetNpc) {
        event.preventDefault();
        startDialogue(targetNpc.id, targetNpc.name);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const direction = MOVEMENT_KEYS[event.key.toLowerCase()];
      if (direction && heldDirectionRef.current === direction) {
        heldDirectionRef.current = null;
      }
    };

    const releaseHeldDirection = () => {
      heldDirectionRef.current = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', releaseHeldDirection);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', releaseHeldDirection);
    };
  }, [advanceDialogue, dialogue, moveMisaki, startDialogue, targetNpc]);

  useEffect(() => {
    if (dialogue) {
      heldDirectionRef.current = null;
    }
  }, [dialogue]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const heldDirection = heldDirectionRef.current;
      if (heldDirection) {
        moveMisaki(heldDirection);
      }
    }, 36);

    return () => window.clearInterval(timer);
  }, [moveMisaki]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      tickNpcMovement();
    }, 380);

    return () => window.clearInterval(timer);
  }, [tickNpcMovement]);

  // NPCフレームアニメーションタイマー（380ms = NPC移動周期に合わせる）
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNpcFrameIndex((prev) => (prev + 1) % 4);
    }, 380);
    return () => window.clearInterval(timer);
  }, []);

  const handleStartTutorialMatch = () => {
    startTutorialMatch();
    onStartTutorialMatch();
  };

  const holdDpadDirection = (direction: Direction) => {
    heldDirectionRef.current = direction;
    moveMisaki(direction);
  };

  const releaseDpadDirection = (direction: Direction) => {
    if (heldDirectionRef.current === direction) {
      heldDirectionRef.current = null;
    }
  };

  return (
    <div className="rpg-shell">
      <header className="rpg-topbar">
        <div className="rpg-title-block">
          <span className="rpg-kicker">三元楼</span>
          <h1>雀荘物語</h1>
          <p>{STORY_LABELS[storyStage]}</p>
        </div>
        <div className="rpg-top-actions">
          <button className="rpg-command-btn" type="button" onClick={saveGame}>
            <Save size={16} />
            セーブ
          </button>
          <button className="rpg-command-btn" type="button" onClick={loadGame} disabled={!hasSave}>
            <RotateCcw size={16} />
            ロード
          </button>
          <button className="rpg-command-btn ghost" type="button" onClick={onOpenMahjongLobby}>
            <DoorOpen size={16} />
            対局ロビー
          </button>
        </div>
      </header>

      <main className="rpg-main">
        <section className="rpg-map-panel" aria-label="雀荘内マップ">
          <div className="rpg-parlor-scene">
            <div
              className="rpg-scene-overlay"
              style={{
                gridTemplateColumns: `repeat(${RPG_MAP_WIDTH}, 1fr)`,
                gridTemplateRows: `repeat(${RPG_MAP_HEIGHT}, 1fr)`,
              }}
            >
              {npcStates.map((npc) => {
                // 健太・黒川は画像ベーススプライト（美咲と同じ16枚PNG方式）
                const npcFrameUrl = npc.id === 'kenta'
                  ? getKentaFrameUrl(npc.facing, npc.moving ? npcFrameIndex : 0)
                  : npc.id === 'kurokawa'
                    ? getKurakawaFrameUrl(npc.facing, npc.moving ? npcFrameIndex : 0)
                    : null;
                return (
                  <PixelSprite
                    key={npc.id}
                    name={npc.name}
                    position={npc.position}
                    facing={npc.facing}
                    sprite={npc.sprite}
                    isMoving={npc.moving}
                    isTarget={targetNpc?.id === npc.id}
                    spriteFrameUrl={npcFrameUrl}
                  />
                );
              })}

              <PixelSprite
                name="美咲"
                position={playerRenderPosition ?? position}
                facing={facing}
                sprite="hero"
                isPlayer
                isMoving={playerMoving}
                spriteFrameUrl={misakiFrameUrl}
                motionOffset={playerMotionOffset}
              />
            </div>
          </div>

          <div className="rpg-map-footer">
            <div className="rpg-context-line">
              <Gamepad2 size={16} />
              {targetNpc
                ? `${targetNpc.name}に話しかけられます`
                : `${currentArea?.label ?? HAKURYUTEI_MAP_SPEC.name}を移動中`}
            </div>
            <nav className="rpg-dpad" aria-label="移動操作">
              <button
                type="button"
                aria-label="上へ"
                onPointerDown={() => holdDpadDirection('up')}
                onPointerUp={() => releaseDpadDirection('up')}
                onPointerLeave={() => releaseDpadDirection('up')}
                onPointerCancel={() => releaseDpadDirection('up')}
              >
                <ChevronUp size={18} />
              </button>
              <button
                type="button"
                aria-label="左へ"
                onPointerDown={() => holdDpadDirection('left')}
                onPointerUp={() => releaseDpadDirection('left')}
                onPointerLeave={() => releaseDpadDirection('left')}
                onPointerCancel={() => releaseDpadDirection('left')}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label="下へ"
                onPointerDown={() => holdDpadDirection('down')}
                onPointerUp={() => releaseDpadDirection('down')}
                onPointerLeave={() => releaseDpadDirection('down')}
                onPointerCancel={() => releaseDpadDirection('down')}
              >
                <ChevronDown size={18} />
              </button>
              <button
                type="button"
                aria-label="右へ"
                onPointerDown={() => holdDpadDirection('right')}
                onPointerUp={() => releaseDpadDirection('right')}
                onPointerLeave={() => releaseDpadDirection('right')}
                onPointerCancel={() => releaseDpadDirection('right')}
              >
                <ChevronRight size={18} />
              </button>
            </nav>
            <div className="rpg-context-actions">
              <button
                className="rpg-command-btn"
                type="button"
                disabled={!targetNpc}
                onClick={() => targetNpc && startDialogue(targetNpc.id, targetNpc.name)}
              >
                <MessageCircle size={16} />
                話す
              </button>
              <button
                className="rpg-command-btn primary"
                type="button"
                disabled={!canStartTutorialMatch}
                onClick={handleStartTutorialMatch}
              >
                <Trophy size={16} />
                {storyStage === 'tutorial_match_started' ? '対局へ戻る' : '卓につく'}
              </button>
            </div>
          </div>
        </section>

        <aside className="rpg-side-panel">
          <section className="rpg-panel-section">
            <h2>三元楼仕様</h2>
            <div className="rpg-record-grid">
              <span>マップID</span><strong>{HAKURYUTEI_MAP_SPEC.map_id}</strong>
              <span>サイズ</span><strong>{HAKURYUTEI_MAP_SPEC.size.width}x{HAKURYUTEI_MAP_SPEC.size.height}</strong>
              <span>卓数</span><strong>{HAKURYUTEI_MAP_SPEC.mahjong_tables.length}卓</strong>
              <span>時代感</span><strong>{HAKURYUTEI_MAP_SPEC.era}</strong>
              <span>稼働卓</span><strong>{activeTableCount}/{HAKURYUTEI_MAP_SPEC.mahjong_tables.length}</strong>
              <span>現在地</span><strong>{currentArea?.label ?? '-'}</strong>
              <span>イベント</span><strong>{currentEvent?.id ?? '-'}</strong>
            </div>
            <p className="rpg-spec-note">{stageLayout.mood}</p>
          </section>

          <section className="rpg-panel-section">
            <h2>シーン配置</h2>
            <div className="rpg-chip-list">
              {stageLayout.active_event_ids.length > 0
                ? stageLayout.active_event_ids.map((eventId) => (
                  <span key={eventId} className="rpg-chip">{eventId}</span>
                ))
                : <span className="rpg-chip muted">free_scene</span>}
            </div>
            <div className="rpg-cast-list">
              {stageLayout.npc_layouts.map((layout) => {
                const npc = npcStates.find((candidate) => candidate.id === layout.npc_id);
                return (
                  <div key={`${layout.npc_id}-${layout.position.x}-${layout.position.y}`} className="rpg-cast-item">
                    <strong>{npc?.name ?? layout.npc_id}</strong>
                    <span>{getZoneLabel(layout.zone)} / {layout.behavior}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rpg-panel-section">
            <h2>{targetNpc ? '注目キャラ' : '主人公仕様'}</h2>
            <div className="rpg-character-card">
              <div className="rpg-character-head">
                <div>
                  <strong>{focusedName}</strong>
                  <small>{focusedRole}</small>
                </div>
                {focusedSpec && <span className="rpg-character-rank">{focusedSpec.mahjong_style.rank}</span>}
              </div>
              <div className="rpg-record-grid">
                <span>年齢 / 身長</span>
                <strong>{focusedSpec ? `${focusedSpec.appearance.age} / ${focusedSpec.appearance.height_cm}cm` : '-'}</strong>
                <span>打ち筋</span>
                <strong>{focusedSpec?.mahjong_style.archetype ?? targetNpc?.role ?? '-'}</strong>
                <span>スプライト</span>
                <strong>
                  {focusedSpec
                    ? `${focusedSpec.sprite.sheet.frame_width}x${focusedSpec.sprite.sheet.frame_height} / ${focusedSpec.sprite.sheet.columns}x${focusedSpec.sprite.sheet.rows}`
                    : '-'}
                </strong>
                <span>現在の役割</span>
                <strong>{focusedLayout?.behavior ?? focusedPresence?.behavior ?? '-'}</strong>
              </div>
              {focusedSpec ? (
                <>
                  <div className="rpg-color-swatches">
                    {focusedSpec.appearance.theme_color.map((color) => (
                      <span
                        key={color}
                        className="rpg-color-swatch"
                        style={{ background: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className="rpg-chip-list">
                    {focusedSpec.portrait.expression_set.map((expression) => (
                      <span key={expression.id} className="rpg-chip">
                        {expression.label}
                      </span>
                    ))}
                  </div>
                  <p className="rpg-spec-note">
                    {focusedPresence?.purpose ?? focusedSpec.sprite.production_notes[0]}
                  </p>
                </>
              ) : (
                <p className="rpg-spec-note">
                  このNPCは汎用常連として扱っています。個別アートより先に、会話と配置の役割を優先しています。
                </p>
              )}
            </div>
          </section>

          <section className="rpg-panel-section">
            <h2>経営状況</h2>
            <div className="rpg-stats-grid">
              <StatPill icon={<Coins size={16} />} label="両" value={`${ryou.toLocaleString()}両`} />
              <StatPill icon={<Star size={16} />} label="評判" value={reputation} />
              <StatPill icon={<Building2 size={16} />} label="店舗Lv" value={storeLevel} />
              <StatPill icon={<Users size={16} />} label="来客/常連" value={`${visitors}/${regulars}`} />
            </div>
          </section>

          <section className="rpg-panel-section">
            <h2>対局成績</h2>
            <div className="rpg-record-grid">
              <span>対局数</span><strong>{records.matches}</strong>
              <span>勝利数</span><strong>{records.wins}</strong>
              <span>最高順位</span><strong>{records.bestRank ? `${records.bestRank}位` : '-'}</strong>
              <span>最高点</span><strong>{records.bestScore ? records.bestScore.toLocaleString() : '-'}</strong>
            </div>
          </section>

          <section className="rpg-panel-section">
            <h2>店舗強化</h2>
            <div className="rpg-upgrade-list">
              {Object.entries(UPGRADE_DEFS).map(([upgradeId, upgrade]) => {
                const purchased = upgrades[upgradeId as keyof typeof upgrades];
                return (
                  <button
                    key={upgradeId}
                    className={`rpg-upgrade-btn ${purchased ? 'purchased' : ''}`}
                    type="button"
                    disabled={purchased}
                    onClick={() => buyUpgrade(upgradeId as keyof typeof upgrades)}
                  >
                    <span>
                      <strong>{upgrade.label}</strong>
                      <small>{upgrade.description}</small>
                    </span>
                    <b>{purchased ? '導入済' : `${upgrade.cost.toLocaleString()}両`}</b>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rpg-panel-section">
            <h2>状態</h2>
            <p className="rpg-status-message">
              {statusMessage || (currentMatch ? `${currentMatch.title}が進行中です。` : '店内はいつもの牌音に包まれています。')}
            </p>
            <div className="rpg-save-meta">
              {lastSavedAt ? `最終保存: ${new Date(lastSavedAt).toLocaleString('ja-JP')}` : '未保存'}
            </div>
            <button className="rpg-reset-btn" type="button" onClick={resetGame}>
              最初から
            </button>
          </section>
        </aside>
      </main>

      {dialogue && (
        <div className="rpg-dialogue-backdrop">
          <div className="rpg-dialogue-window">
            <img
              key={dialogue.npcId}
              className="rpg-dialogue-portrait"
              src={getPortraitUrl(dialogue.npcId)}
              alt={dialogue.characterName}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="rpg-dialogue-name">{dialogue.characterName}</div>
            <p>{dialogue.lines[dialogue.currentLine]}</p>
            <button type="button" onClick={advanceDialogue}>
              {dialogue.currentLine < dialogue.lines.length - 1 ? '次へ' : '閉じる'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
