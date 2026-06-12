import React from 'react';
import { Tile } from '../../engine/types';

interface TileViewProps {
  tile?: Tile; // If undefined, renders a face-down tile
  isSideways?: boolean; // For Riichi or called tiles
  isGrayed?: boolean; // For claimed discards
  onClick?: () => void;
  selectable?: boolean;
  className?: string;
}

// Map from internal tile representation to official Unicode Mahjong characters with Emoji Selector (\uFE0F)
const UNICODE_TILES: { [key: string]: string } = {
  'z1': '🀀\uFE0F', 'z2': '🀁\uFE0F', 'z3': '🀂\uFE0F', 'z4': '🀃\uFE0F', // 東南西北
  'z5': '🀆\uFE0F', 'z6': '🀅\uFE0F', 'z7': '🀄\uFE0F',         // 白發中
  'm1': '🀇\uFE0F', 'm2': '🀈\uFE0F', 'm3': '🀉\uFE0F', 'm4': '🀊\uFE0F', 'm5': '🀋\uFE0F', 'm6': '🀌\uFE0F', 'm7': '🀍\uFE0F', 'm8': '🀎\uFE0F', 'm9': '🀏\uFE0F', // 萬子
  's1': '🀐\uFE0F', 's2': '🀑\uFE0F', 's3': '🀒\uFE0F', 's4': '🀓\uFE0F', 's5': '🀔\uFE0F', 's6': '🀕\uFE0F', 's7': '🀖\uFE0F', 's8': '🀗\uFE0F', 's9': '🀘\uFE0F', // 索子
  'p1': '🀙\uFE0F', 'p2': '🀚\uFE0F', 'p3': '🀛\uFE0F', 'p4': '🀜\uFE0F', 'p5': '🀝\uFE0F', 'p6': '🀞\uFE0F', 'p7': '🀟\uFE0F', 'p8': '🀠\uFE0F', 'p9': '🀡\uFE0F'  // 筒子
};

// Helper function to map tiles to local high-fidelity SVG assets
const getTileSvgPath = (suit: string, value: number, isRed?: boolean): string => {
  if (isRed) {
    if (suit === 'm') return '/tiles/Man5-Dora.svg';
    if (suit === 'p') return '/tiles/Pin5-Dora.svg';
    if (suit === 's') return '/tiles/Sou5-Dora.svg';
  }
  
  switch (suit) {
    case 'm':
      return `/tiles/Man${value}.svg`;
    case 'p':
      return `/tiles/Pin${value}.svg`;
    case 's':
      return `/tiles/Sou${value}.svg`;
    case 'z':
      // Honours: 東南西北白發中
      const honors = ['Ton', 'Nan', 'Shaa', 'Pei', 'Haku', 'Hatsu', 'Chun'];
      return `/tiles/${honors[value - 1]}.svg`;
    default:
      return '';
  }
};

export const TileView: React.FC<TileViewProps> = ({
  tile,
  isSideways = false,
  isGrayed = false,
  onClick,
  selectable = false,
  className = '',
}) => {
  if (!tile) {
    // Render Face-Down Tile (Back of tile)
    return (
      <div 
        className={`mahjong-tile tile-back ${isSideways ? 'sideways' : ''} ${className}`}
        title="裏向き牌"
      >
        <div className="tile-back-pattern" />
      </div>
    );
  }

  const { suit, value, isRed } = tile;
  let tileClass = `tile-${suit}`;

  if (isRed) {
    tileClass += ' tile-red-dora';
  }

  // Corner label for quick accessibility (e.g. 5mr, 1z)
  const cornerLabel = `${value}${suit === 'z' ? 'z' : suit}${isRed ? 'r' : ''}`;
  const unicodeChar = UNICODE_TILES[`${suit}${value}`] || '';
  const svgPath = getTileSvgPath(suit, value, isRed);

  return (
    <div
      className={`mahjong-tile tile-face ${tileClass} ${isSideways ? 'sideways' : ''} ${
        isGrayed ? 'grayed' : ''
      } ${selectable ? 'selectable' : ''} ${className}`}
      onClick={selectable && onClick ? onClick : undefined}
      title={`${isRed ? '赤' : ''}${value}${suit}`}
    >
      <div className="tile-center">
        {svgPath ? (
          <img 
            src={svgPath} 
            alt={cornerLabel} 
            className="tile-svg-glyph" 
            draggable={false}
          />
        ) : (
          <span className="tile-unicode-glyph">{unicodeChar}</span>
        )}
      </div>
    </div>
  );
};
