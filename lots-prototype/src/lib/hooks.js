import { useCallback, useEffect, useState } from 'react';

export function useMediaQuery(q) {
    const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q).matches : false);
    const [m, setM] = useState(get);
    useEffect(() => {
        const mq = window.matchMedia(q);
        const on = () => setM(mq.matches);
        on();
        mq.addEventListener('change', on);
        return () => mq.removeEventListener('change', on);
    }, [q]);
    return m;
}

export const useIsDesktop = () => useMediaQuery('(min-width: 768px)');
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

/** Drop a file onto an element: returns whether one is being dragged over it, and the props to spread. */
export function useFileDrop(onFile) {
    const [dragging, setDragging] = useState(false);
    const props = {
        onDragOver: (e) => {
            e.preventDefault();
            setDragging(true);
        },
        onDragLeave: () => setDragging(false),
        onDrop: (e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
        },
    };
    return [dragging, props];
}

// Saved lots: a per-browser convenience, so plain localStorage is fine here.
// It can be empty or throw (private mode, blocked storage) — never required.
const SAVED_KEY = 'lots-proto-saved';
export function useSaved() {
    const [saved, setSaved] = useState(() => {
        try {
            return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'));
        } catch {
            return new Set();
        }
    });
    const toggle = useCallback((id) => {
        setSaved((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            try {
                localStorage.setItem(SAVED_KEY, JSON.stringify([...next]));
            } catch {
                /* storage unavailable — keep it in memory */
            }
            return next;
        });
    }, []);
    return [saved, toggle];
}
