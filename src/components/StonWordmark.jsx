import React, { useId } from 'react';

/**
 * STON wordmark drawn to match the brand logo:
 * rounded geometric S, plain T, perfect-circle O, and the sliced N
 * (corner-to-corner diagonal with thin slits), in gradient gold.
 *
 * `height` accepts a number (px) or any CSS length (e.g. "0.72em").
 * Width scales automatically from the 474x100 viewBox.
 */
const StonWordmark = ({ height = 18, className, style }) => {
    const gradId = `stonGold-${useId().replace(/:/g, '')}`;
    return (
        <svg
            className={className}
            style={{ display: 'inline-block', verticalAlign: 'baseline', ...style }}
            height={height}
            viewBox="0 0 474 100"
            role="img"
            aria-label="STON"
        >
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EFCF8B" />
                    <stop offset="55%" stopColor="#D2A757" />
                    <stop offset="100%" stopColor="#A87B33" />
                </linearGradient>
            </defs>

            {/* S — rounded geometric, flat terminals */}
            <path
                d="M78,7 H30 Q8,7 8,28 Q8,50 30,50 H55 Q78,50 78,72 Q78,93 55,93 H7"
                fill="none" stroke={`url(#${gradId})`} strokeWidth="13"
            />

            {/* T */}
            <path
                d="M126,7 H210 M168,7 V93"
                fill="none" stroke={`url(#${gradId})`} strokeWidth="13"
            />

            {/* O — perfect circle */}
            <circle cx="302" cy="50" r="43.5" fill="none" stroke={`url(#${gradId})`} strokeWidth="13" />

            {/* N — traced from the logo: diagonal exactly stem-width, flush tips,
                hairline slits shearing the stem caps */}
            <g transform="translate(394,0)" fill={`url(#${gradId})`}>
                <path d="M0,0 L13,0 L80,100 L67,100 Z" />
                <path d="M0,10.8 L13,30.2 L13,100 L0,100 Z" />
                <path d="M67,0 L80,0 L80,89.2 L67,69.8 Z" />
            </g>
        </svg>
    );
};

export default StonWordmark;
