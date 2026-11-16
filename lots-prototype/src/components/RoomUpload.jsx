import React from 'react';
import { useFileDrop } from '../lib/hooks';

// The pieces for taking a photo of the buyer's own room, shared by the lot
// page ("Your room") and the compare sheet ("Compare in your room").

const FileInput = ({ onFile }) => (
    <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) onFile(f);
        }}
    />
);

/**
 * The empty state: a big drop zone that is also a file picker. Fills its
 * (positioned) parent. `eyebrow` and `onBack` make it step 2 of picking a
 * surface first (SurfaceStep): "Step 2 of 2 · Floor", with a way back.
 */
export function RoomDropZone({ title, text, error, onFile, eyebrow, onBack, backLabel }) {
    const [dragging, drop] = useFileDrop(onFile);
    return (
        <>
            {/* Scrolls when the box is short, so the button is never cut off. */}
            <label
                {...drop}
                className={`absolute inset-2 md:inset-4 rounded-[18px] border-2 border-dashed overflow-y-auto cursor-pointer transition-colors ${
                    dragging ? 'border-ink bg-white/80' : 'border-ink/25 bg-white/40 hover:bg-white/70'
                }`}
            >
                <div className={`min-h-full grid place-items-center text-center p-4 md:p-8 ${onBack ? 'pt-12 md:pt-14' : ''}`}>
                    <div className="max-w-[440px]">
                        {eyebrow ? <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-clay">{eyebrow}</p> : <PhotoIcon />}
                        <p className="mt-1 md:mt-3 font-bold text-[15px] md:text-[18px]">{title}</p>
                        <p className="hidden sm:block mt-1.5 text-[13px] text-ink-2 leading-relaxed">{text}</p>
                        <span className="mt-2.5 md:mt-4 inline-flex h-10 px-5 items-center rounded-full bg-ink text-paper text-[13px] font-bold">Choose a photo</span>
                        <p className="mt-2 text-[11.5px] text-ink-3">Or drop it here · used only for this preview, never saved</p>
                        {error && <p className="mt-2 text-[12px] text-clay font-semibold">{error}</p>}
                    </div>
                </div>
                <FileInput onFile={onFile} />
            </label>
            {onBack && (
                <button
                    type="button"
                    onClick={onBack}
                    className="absolute top-4 left-4 md:top-7 md:left-7 z-10 h-8 px-3 rounded-full bg-white/90 border border-ink/15 text-[12px] font-bold inline-flex items-center gap-1 hover:border-ink"
                >
                    <span aria-hidden="true">←</span> {backLabel}
                </button>
            )}
        </>
    );
}

/**
 * Step 1 of putting a stone in the buyer's own room: WHERE it goes, before
 * any photo. Without it the stone went on whatever wall the model thought
 * most prominent, and the buyer could not tell where it would land.
 * Fills its (positioned) parent.
 */
export function SurfaceStep({ title, note, surfaces, onPick }) {
    return (
        <div className="absolute inset-2 md:inset-4 rounded-[18px] border-2 border-dashed border-ink/25 bg-white/40 overflow-y-auto">
            <div className="min-h-full grid place-items-center text-center p-3 md:p-8">
                <div className="max-w-[560px]">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-clay">Step 1 of 2</p>
                    <p className="mt-1 font-bold text-[15px] md:text-[18px]">{title}</p>
                    <div className="mt-2.5 md:mt-4 flex flex-wrap justify-center gap-1.5 md:gap-2">
                        {surfaces.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => onPick(s.id)}
                                title={s.hint}
                                className="rounded-full md:rounded-2xl border border-ink/15 bg-white/80 px-3 py-1.5 md:px-4 md:py-2.5 text-left hover:border-ink transition-colors"
                            >
                                <span className="block text-[12.5px] md:text-[14px] font-bold">{s.label}</span>
                                <span className="hidden md:block text-[11.5px] text-ink-3">{s.hint}</span>
                            </button>
                        ))}
                    </div>
                    {note && <p className="hidden sm:block mt-3 text-[12.5px] text-ink-2">{note}</p>}
                </div>
            </div>
        </div>
    );
}

/** A small "New photo" button that swaps the room photo. */
export const NewPhotoButton = ({ onFile }) => (
    <label className="h-10 px-4 rounded-full border border-ink/20 text-[13px] font-bold inline-flex items-center cursor-pointer hover:border-ink shrink-0">
        New photo
        <FileInput onFile={onFile} />
    </label>
);

export const CameraIcon = ({ className = 'w-3.5 h-3.5' }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
);

const PhotoIcon = () => (
    <svg viewBox="0 0 24 24" className="mx-auto w-8 h-8 md:w-10 md:h-10 text-ink-2" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 16l5-5 4 4 3-3 6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="16.5" cy="9" r="1.6" fill="currentColor" />
    </svg>
);
