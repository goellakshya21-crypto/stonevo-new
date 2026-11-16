// Short stone videos from yards (decided 2026-11-15): a few seconds walking
// along the slab, so buyers see the real stone move in the light.
//
// Prototype: kept in this browser's IndexedDB, because a few seconds of phone
// video is megabytes and localStorage holds about five in all (the photos are
// already there). Like the rest of the yard data, it lives in this browser
// only. Production: a Supabase storage bucket, uploaded through a server route
// that checks the length and size and transcodes to MP4 (H.264), so every
// phone can play it (an iPhone's HEVC .mov does not play everywhere).
import { useEffect, useState } from 'react';

export const MAX_VIDEO_SECS = 5;
export const MAX_VIDEO_MB = 25;

const DB = 'ston-media';
const STORE = 'videos';

const openDb = () =>
    new Promise((resolve, reject) => {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

const run = async (mode, fn) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(req?.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
    });
};

export const putVideo = (id, blob) => run('readwrite', (s) => s.put(blob, id));
export const getVideo = (id) => run('readonly', (s) => s.get(id));

/** A video's length as people say it: 4 s, 4.5 s. */
export const secsLabel = (secs) => (secs ? `${Math.round(secs * 10) / 10} s` : 'short');

/** How long a video runs, in seconds (null when the browser cannot tell). */
export const videoSeconds = (file) =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.muted = true;
        v.onloadedmetadata = () => {
            const d = v.duration;
            URL.revokeObjectURL(url);
            resolve(Number.isFinite(d) ? d : null);
        };
        v.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('This video could not be read here. Record it with the phone camera and try again.'));
        };
        v.src = url;
    });

/** A playable URL for a stored video, freed when the component goes. */
export function useVideoUrl(id) {
    const [state, setState] = useState({ id: null, url: null });
    useEffect(() => {
        if (!id) return undefined;
        let alive = true;
        let made = null;
        getVideo(id)
            .then((blob) => {
                if (!alive || !blob) return;
                made = URL.createObjectURL(blob);
                setState({ id, url: made });
            })
            .catch(() => {});
        return () => {
            alive = false;
            if (made) URL.revokeObjectURL(made);
        };
    }, [id]);
    return state.id === id ? state.url : null;
}
