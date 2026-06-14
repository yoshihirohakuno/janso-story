import React, { useEffect, useMemo } from 'react';
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
}

const PixelSprite: React.FC<SpriteProps> = ({
  name,
  position,
  facing,
  sprite,
  isPlayer = false,
  isMoving = false,
  isTarget = false,
}) => (
  <div
    className={`rpg-sprite sprite-${sprite} facing-${facing} ${isPlayer ? 'is-player' : ''} ${isMoving ? 'is-moving' : ''} ${isTarget ? 'is-target' : ''}`}
    style={{ gridColumn: position.x + 1, gridRow: position.y + 1 }}
    title={name}
  >
    <span className="sprite-shadow" />
    <span className="sprite-head" />
    <span className="sprite-body" />
    <span className="sprite-feet" />
    {!isPlayer ? <span className="sprite-nameplate">{name}</span> : null}
  </div>
);

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
  const {
    storyStage,
    money,
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

  const canStartTutorialMatch = (
    (storyStage === 'tutorial_before' && targetNpc?.id === 'kurokawa') ||
    storyStage === 'tutorial_match_started'
  );

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

      const movement: Record<string, Direction> = {
        arrowup: 'up',
        w: 'up',
        arrowdown: 'down',
        s: 'down',
        arrowleft: 'left',
        a: 'left',
        arrowright: 'right',
        d: 'right',
      };

      if (movement[key]) {
        event.preventDefault();
        movePlayer(movement[key]);
        return;
      }

      if ((key === 'enter' || key === ' ') && targetNpc) {
        event.preventDefault();
        startDialogue(targetNpc.id, targetNpc.name);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advanceDialogue, dialogue, movePlayer, startDialogue, targetNpc]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      tickNpcMovement();
    }, 380);

    return () => window.clearInterval(timer);
  }, [tickNpcMovement]);

  const handleStartTutorialMatch = () => {
    startTutorialMatch();
    onStartTutorialMatch();
  };

  return (
    <div className="rpg-shell">
      <header className="rpg-topbar">
        <div className="rpg-title-block">
          <span className="rpg-kicker">白龍亭</span>
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
              {npcStates.map((npc) => (
                <PixelSprite
                  key={npc.id}
                  name={npc.name}
                  position={npc.position}
                  facing={npc.facing}
                  sprite={npc.sprite}
                  isMoving={npc.moving}
                  isTarget={targetNpc?.id === npc.id}
                />
              ))}

              <PixelSprite
                name="美咲"
                position={position}
                facing={facing}
                sprite="hero"
                isPlayer
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
              <button type="button" aria-label="上へ" onClick={() => movePlayer('up')}><ChevronUp size={18} /></button>
              <button type="button" aria-label="左へ" onClick={() => movePlayer('left')}><ChevronLeft size={18} /></button>
              <button type="button" aria-label="下へ" onClick={() => movePlayer('down')}><ChevronDown size={18} /></button>
              <button type="button" aria-label="右へ" onClick={() => movePlayer('right')}><ChevronRight size={18} /></button>
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
            <h2>白龍亭仕様</h2>
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
              <StatPill icon={<Coins size={16} />} label="所持金" value={`${money.toLocaleString()}円`} />
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
                    <b>{purchased ? '導入済' : `${upgrade.cost.toLocaleString()}円`}</b>
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
