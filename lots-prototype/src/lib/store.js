// A small store kept in this browser's localStorage, shared by every component
// that reads it and kept in step across open tabs (a booking made in one tab
// shows in the team panel in another at once). Prototype only: production
// keeps these in Supabase behind server routes (PLAN.md).
import { useSyncExternalStore } from 'react';

export function makeStore(key, initial) {
    const load = () => {
        try {
            return JSON.parse(localStorage.getItem(key) || 'null') ?? initial;
        } catch {
            return initial;
        }
    };
    let state = load();
    const subs = new Set();
    const notify = () => subs.forEach((fn) => fn());
    if (typeof window !== 'undefined') {
        window.addEventListener('storage', (e) => {
            if (e.key !== key) return;
            state = load();
            notify();
        });
    }
    return {
        get: () => state,
        set(next) {
            state = typeof next === 'function' ? next(state) : next;
            try {
                localStorage.setItem(key, JSON.stringify(state));
            } catch {
                /* full or blocked: kept for this visit */
            }
            notify();
        },
        subscribe(fn) {
            subs.add(fn);
            return () => subs.delete(fn);
        },
    };
}

/** The store's value, re-rendering when it changes. */
export const useStore = (store) => useSyncExternalStore(store.subscribe, store.get);
