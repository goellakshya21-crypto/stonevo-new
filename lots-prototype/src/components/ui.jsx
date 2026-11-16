import React from 'react';
import { BRAND } from '../lib/brand';
import { downloadImage } from '../lib/download';

export const Brand = ({ className = '', light = false }) => (
    <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
        <span className={`font-brand text-[28px] leading-none ${light ? 'text-paper' : 'text-ink'}`}>{BRAND.name}</span>
        <span
            className={`text-[10px] font-extrabold uppercase tracking-[0.22em] px-1.5 py-0.5 rounded ${
                light ? 'bg-paper/15 text-paper' : 'bg-clay text-paper'
            }`}
        >
            {BRAND.tag}
        </span>
    </span>
);

export const Heart = ({ filled }) => (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" aria-hidden="true">
        <path
            d="M12 20.5s-7.5-4.4-7.5-10A4.5 4.5 0 0 1 12 7.6a4.5 4.5 0 0 1 7.5 2.9c0 5.6-7.5 10-7.5 10Z"
            fill={filled ? '#B24D29' : 'none'}
            stroke={filled ? '#B24D29' : 'currentColor'}
            strokeWidth="1.8"
            strokeLinejoin="round"
        />
    </svg>
);

export const Pin = ({ className = 'w-3.5 h-3.5' }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="10" r="2.3" fill="currentColor" />
    </svg>
);

export const Arrow = ({ dir = 'right', className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ transform: dir === 'left' ? 'scaleX(-1)' : undefined }}>
        <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const Check = ({ className = 'w-3.5 h-3.5' }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const Close = ({ className = 'w-5 h-5' }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

export const LiveDot = () => (
    <span className="relative inline-flex w-2 h-2">
        <span className="absolute inset-0 rounded-full bg-moss opacity-60 animate-ping" />
        <span className="relative w-2 h-2 rounded-full bg-moss" />
    </span>
);

// Toggle chip used for surfaces and filters.
export const ChatIcon = ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M4 5.5h16v10H9.5L5 19.5v-4H4z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        <path d="M8 9.5h8M8 12.5h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
);

export const PhoneIcon = ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
            d="M6.5 4h3l1.5 4-2 1.3a10 10 0 0 0 5.7 5.7l1.3-2 4 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 6a2 2 0 0 1 2-2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
        />
    </svg>
);

export const VideoIcon = ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="3" y="6.5" width="12.5" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <path d="M15.5 10.5l5-3v9l-5-3z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
);

export const DownloadIcon = ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/**
 * A round download button for the corner of a picture. `getSrc` may be async
 * (a book-match panel is composed on demand).
 */
export function DownloadButton({ getSrc, name, label = 'Download this picture', text = '', className = '' }) {
    const [busy, setBusy] = React.useState(false);
    return (
        <button
            type="button"
            onClick={async (e) => {
                e.stopPropagation();
                if (busy) return;
                setBusy(true);
                try {
                    await downloadImage(await getSrc(), name);
                } finally {
                    setBusy(false);
                }
            }}
            aria-label={label}
            title={label}
            className={`h-9 px-3 rounded-full bg-white/90 backdrop-blur text-ink text-[12.5px] font-bold inline-flex items-center gap-1.5 shadow-sm hover:bg-white disabled:opacity-60 ${className}`}
            disabled={busy}
        >
            <DownloadIcon className={`w-4 h-4 ${busy ? 'animate-pulse' : ''}`} />
            <span className={text ? '' : 'hidden sm:inline'}>{busy ? 'Preparing…' : text || 'Download'}</span>
        </button>
    );
}

export const KeyIcon = ({ className = 'w-4 h-4' }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="8" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <path d="M12 12h9M18 12v3.5M15.5 12v2.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
);

export const Chip = ({ active, onClick, children, className = '' }) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
            active ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-white/60 text-ink-2 hover:border-ink/40 hover:text-ink'
        } ${className}`}
    >
        {children}
    </button>
);
