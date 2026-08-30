import React from 'react';

/*
 * Vector chess pieces rendered as inline SVG (classic "cburnett" geometry).
 *
 * Why SVG instead of Unicode text glyphs (♔♕♖♗♘♙):
 *  - Never depends on fonts installed on the device -> no more invisible /
 *    "tofu" pieces on phones, tablets or stripped-down browsers.
 *  - White pieces keep a solid fill + dark outline, so they are clearly
 *    visible on BOTH light and dark squares.
 *  - Scales perfectly to any square size on desktop, tablet and mobile.
 */

function Pawn({ fill }) {
  return (
    <path
      d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
      fill={fill}
      stroke="#000"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function Knight({ fill, eye }) {
  return (
    <>
      <g fill={fill} stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
        <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.99-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.99 2.5-3c1 0 1 3 1 3" />
      </g>
      <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill={eye} stroke={eye} />
      <path d="M15 15.5a.5 1.5 0 1 1-1 0 .5 1.5 0 1 1 1 0z" transform="rotate(30 14.5 15.5)" fill={eye} stroke={eye} />
    </>
  );
}

function Bishop({ fill, detail }) {
  return (
    <>
      <g fill={fill} stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.94 3-2 3-2z" />
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
        <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
      </g>
      <path
        d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"
        fill="none"
        stroke={detail}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </>
  );
}

function Rook({ fill }) {
  return (
    <g fill={fill} stroke="#000" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M9 39h27v-3H9v3z" />
      <path d="M12 36v-4h21v4H12z" />
      <path d="M11 14V9h4v2h5V9h5v2h5V9h4v5" strokeLinecap="butt" />
      <path d="M34 14l-3 3H14l-3-3" />
      <path d="M31 17v12.5H14V17" strokeLinecap="butt" strokeLinejoin="miter" />
      <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
      <path d="M11 14h23" fill="none" strokeLinejoin="miter" />
    </g>
  );
}

function Queen({ fill, detail }) {
  return (
    <g fill={fill} stroke="#000" strokeWidth="1.5" strokeLinejoin="round">
      <path
        d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 23l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 23 6.5 13.5 9 26z"
        strokeLinecap="butt"
      />
      <path
        d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"
        strokeLinecap="butt"
      />
      <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" stroke={detail} />
      <circle cx="6" cy="12" r="2" />
      <circle cx="14" cy="9" r="2" />
      <circle cx="22.5" cy="8" r="2" />
      <circle cx="31" cy="9" r="2" />
      <circle cx="39" cy="12" r="2" />
    </g>
  );
}

function King({ fill, detail }) {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.5 11.63V6M20 8h5" fill="none" stroke="#000" strokeWidth="1.5" strokeLinejoin="miter" />
      <path
        d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5z"
        fill={fill}
        stroke="#000"
        strokeWidth="1.5"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      <path
        d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7z"
        fill={fill}
        stroke="#000"
        strokeWidth="1.5"
      />
      <path
        d="M12.5 30c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0"
        fill="none"
        stroke={detail}
        strokeWidth="1.5"
      />
    </g>
  );
}

/**
 * @param {object} props
 * @param {'w'|'b'} props.color          Piece color.
 * @param {'p'|'r'|'n'|'b'|'q'|'k'} props.type Piece type.
 * @param {string} [props.tint]           Optional override for the main fill
 *                                        (used by equipped piece skins).
 * @param {string} [props.className]      Extra classes appended to the svg.
 * @param {object} [props.style]          Inline styles appended to the svg.
 */
export default function ChessPiece({ color, type, tint, className = '', style }) {
  const fill = tint || (color === 'w' ? '#ffffff' : '#000000');
  const detail = '#ececec';
  const eye = color === 'w' ? '#000000' : '#ececec';

  let content = null;
  switch (type) {
    case 'p':
      content = <Pawn fill={fill} />;
      break;
    case 'n':
      content = <Knight fill={fill} eye={eye} />;
      break;
    case 'b':
      content = <Bishop fill={fill} detail={detail} />;
      break;
    case 'r':
      content = <Rook fill={fill} />;
      break;
    case 'q':
      content = <Queen fill={fill} detail={detail} />;
      break;
    case 'k':
      content = <King fill={fill} detail={detail} />;
      break;
    default:
      return null;
  }

  return (
    <svg
      viewBox="0 0 45 45"
      className={`chess-piece-svg ${className}`.trim()}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {content}
    </svg>
  );
}