import React, { useState } from 'react';
import { MAX_VIDEO_MB, MAX_VIDEO_SECS, putVideo, secsLabel, useVideoUrl, videoSeconds } from '../lib/media';
import { Close } from './ui';

/** A yard's short video of a lot, playing on a loop without sound. */
export default function StoneVideo({ video, className = '', controls = true }) {
    const url = useVideoUrl(video?.id);
    if (!video) return null;
    if (!url) return <div className={`grid place-items-center bg-ink text-paper/70 text-[13px] ${className}`}>Loading the video…</div>;
    return <video key={url} src={url} controls={controls} autoPlay muted loop playsInline className={className} />;
}

/**
 * The yard adds one short video of the lot (optional): 2 to 5 seconds,
 * moving along the slab in daylight. Too long, too big or not a video, and it
 * says why.
 */
export function VideoField({ video, onChange }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const take = async (file) => {
        setError('');
        if (!file.type.startsWith('video/')) {
            setError('That is not a video. Choose one from the phone camera.');
            return;
        }
        if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
            setError(`That video is ${Math.round(file.size / 1024 / 1024)} MB. Keep it under ${MAX_VIDEO_MB} MB: a few seconds is plenty.`);
            return;
        }
        setBusy(true);
        try {
            const secs = await videoSeconds(file);
            if (secs != null && secs > MAX_VIDEO_SECS + 0.5) {
                setError(`That video is ${secsLabel(secs)}. Keep it to ${MAX_VIDEO_SECS} seconds or less: trim it on the phone and add it again.`);
                return;
            }
            const id = `vid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
            await putVideo(id, file);
            onChange({ id, secs, type: file.type });
        } catch (err) {
            setError(err.message || 'Could not add that video.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3">A short video (optional)</p>
            {video ? (
                <div className="mt-2 flex items-center gap-3">
                    <StoneVideo video={video} controls={false} className="w-32 aspect-video rounded-xl object-cover bg-ink shrink-0" />
                    <span className="min-w-0 flex-1 text-[13px]">
                        <span className="block font-bold">{secsLabel(video.secs)} video added</span>
                        <span className="block text-[12.5px] text-ink-3">Buyers see it on the lot page, after our team checks it.</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        aria-label="Remove the video"
                        className="w-9 h-9 rounded-full border border-ink/20 grid place-items-center hover:border-ink shrink-0"
                    >
                        <Close className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <label className="mt-2 flex items-center gap-3 rounded-xl border-2 border-dashed border-ink/20 bg-white/50 px-4 py-3 cursor-pointer hover:bg-white">
                    <PlayIcon className="w-6 h-6 text-ink-2 shrink-0" />
                    <span>
                        <span className="block font-bold text-[13.5px]">{busy ? 'Adding the video…' : 'Add a video'}</span>
                        <span className="block text-[12.5px] text-ink-3">
                            2 to {MAX_VIDEO_SECS} seconds, moving slowly along the slab in daylight. Keep the yard&apos;s name and signboards out of the shot.
                        </span>
                    </span>
                    <input
                        type="file"
                        accept="video/*"
                        className="sr-only"
                        disabled={busy}
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (f) take(f);
                        }}
                    />
                </label>
            )}
            {error && <p className="mt-1.5 text-[12.5px] text-clay font-semibold">{error}</p>}
        </div>
    );
}

export const PlayIcon = ({ className = 'w-4 h-4' }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
    >
        <rect x="2.5" y="5" width="19" height="14" rx="3" />
        <path d="M10 9.2v5.6l4.6-2.8z" fill="currentColor" stroke="none" />
    </svg>
);
