import React from 'react';

/**
 * HollowLogo — shared brand mark for web + mobile.
 *
 * The mark is a ~330° arc ring (open at the top, like a void/eclipse),
 * which perfectly echoes the word "hollow."
 *
 * Props:
 *   size      – px size of the ring mark (default 24)
 *   showText  – whether to render the "hollow." wordmark beside the ring (default true)
 *   textSize  – font size of the wordmark in px (default derived from size)
 *   color     – stroke / text color (default '#ffffff')
 *   style     – extra style on the wrapper
 */
export default function HollowLogo({
  size = 24,
  showText = true,
  textSize,
  color = '#ffffff',
  style = {}
}) {
  const strokeWidth = size * 0.115; // ~2.5 at size=22
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Arc: 330° ring open at the top (from ~15° to ~345°, going clockwise)
  const startAngle = 15;  // degrees, measured from top (12 o'clock)
  const endAngle   = 345;
  const toRad = (deg) => ((deg - 90) * Math.PI) / 180; // offset so 0° = top

  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));

  const derivedTextSize = textSize || Math.round(size * 0.95);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.42, ...style }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
        aria-label="hollow logo mark"
      >
        <path
          d={`M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {showText && (
        <span
          style={{
            fontFamily: "'Inter', -apple-system, sans-serif",
            fontWeight: 800,
            fontSize: `${derivedTextSize}px`,
            letterSpacing: '-0.03em',
            color,
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          hollow.
        </span>
      )}
    </div>
  );
}
