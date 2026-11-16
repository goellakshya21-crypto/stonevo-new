import React, { useMemo, useRef, useState } from 'react';
import { pickForScene, planTour, RENDER_SCENES, runQueue, saveTour, styleName } from '../lib/renders';
import { placeOf } from '../lib/applications';
import { Arrow } from './ui';

// How many lots each room needs rendered for the site to look alive: the hero
// rooms rotate through several, every other room needs one or two for its card.
const STARTER = [
    ['bathroom', 8],
    ['kitchen', 6],
    ['living', 4],
    ['bedroom', 4],
    ['pooja', 6],
    ['vanity', 1],
    ['floor', 1],
    ['dining', 2],
    ['foyer', 2],
    ['staircase', 2],
    ['balcony', 2],
];

// When architectural styles went into the art direction (11 Nov 2026).
// Anything saved earlier is plain, or styled with one look per room type.
const STYLED_SINCE = Date.parse('2026-11-11T00:00:00Z');
const savedAt = (url) => {
    const v = new URL(url, window.location.origin).searchParams.get('v');
    const t = v ? parseInt(v, 36) : 0;
    return t > 1e12 ? t : 0; // "?v=1" and the like: from before versioning
};

/**
 * Team page: render lots in rooms with the live visualiser, one at a time.
 * In production this is the "render on listing" step in admin.
 */
export default function Studio({ lots, renders, onRendered, onTourSaved, onHome }) {
    const [queue, setQueue] = useState([]); // {key, lot, sceneId, status, ms, url, error}
    const [count, setCount] = useState(3);
    const running = useRef(false);
    // Unique per queued render, so a retry of a failed lot gets its own row.
    const seq = useRef(0);

    const done = useMemo(() => {
        const out = [];
        Object.entries(renders).forEach(([id, r]) =>
            Object.keys(RENDER_SCENES).forEach((s) => r[s] && out.push({ id, name: r.name, scene: s, url: r[s] })),
        );
        return out;
    }, [renders]);

    const patch = (key, p) => setQueue((q) => q.map((it) => (it.key === key ? { ...it, ...p } : it)));

    // Returns the items that rendered.
    const run = async (items) => {
        if (running.current) return [];
        running.current = true;
        const ok = [];
        await runQueue(items, {
            onStart: (it) => patch(it.key, { status: 'rendering' }),
            onDone: (it, url, ms) => {
                patch(it.key, { status: 'done', url, ms });
                onRendered(it.lot, it.sceneId, url);
                ok.push(it);
            },
            onFail: (it, error, ms) => patch(it.key, { status: 'failed', error, ms }),
        });
        running.current = false;
        return ok;
    };

    // The hero tour: nine spaces, nine lots, nine architectural styles.
    const [tourNote, setTourNote] = useState('');
    const renderTour = async () => {
        if (running.current) return;
        setTourNote('');
        const plan = await planTour(lots);
        const items = plan.map((p) => ({ key: `${p.lot.id}-${p.sceneId}-${++seq.current}`, lot: p.lot, sceneId: p.sceneId, styleId: p.styleId, status: 'queued' }));
        setQueue((q) => [...q, ...items]);
        const ok = await run(items);
        if (!ok.length) return setTourNote('No tour render finished, so the tour was not changed.');
        const saved = ok.map((it) => ({ lotId: it.lot.id, scene: it.sceneId, style: it.styleId }));
        await saveTour(saved);
        onTourSaved(saved);
        setTourNote(`Tour saved: ${saved.length} of ${items.length} slides.`);
    };

    const enqueue = (sceneId) => {
        const taken = new Set(queue.filter((q) => q.sceneId === sceneId && q.status !== 'failed').map((q) => q.lot.id));
        const picks = pickForScene(lots, renders, sceneId, count + taken.size).filter((l) => !taken.has(l.id)).slice(0, count);
        const items = picks.map((lot) => ({ key: `${lot.id}-${sceneId}-${++seq.current}`, lot, sceneId, status: 'queued' }));
        setQueue((q) => [...q, ...items]);
        run(items);
    };

    const enqueueAll = () => {
        const items = [];
        const queued = new Map();
        STARTER.forEach(([sceneId, n]) => {
            const have = done.filter((d) => d.scene === sceneId).length;
            pickForScene(lots, renders, sceneId, Math.max(0, n - have), queued).forEach((lot) => {
                queued.set(lot.id, (queued.get(lot.id) || 0) + 1);
                items.push({ key: `${lot.id}-${sceneId}-${++seq.current}`, lot, sceneId, status: 'queued' });
            });
        });
        setQueue((q) => [...q, ...items]);
        run(items);
    };

    // Renders older than the art direction (applications.js) look plain. Each
    // saved URL carries its save time in `?v=` (base 36), so they can be found
    // without any extra bookkeeping. Hero rooms first.
    const plain = useMemo(() => {
        const order = ['bathroom', 'kitchen', 'living', 'bedroom', 'pooja', 'dining', 'vanity', 'floor', 'foyer', 'staircase', 'balcony'];
        return done
            .filter((d) => savedAt(d.url) < STYLED_SINCE && lots.some((l) => l.id === d.id))
            .sort((a, b) => order.indexOf(a.scene) - order.indexOf(b.scene));
    }, [done, lots]);

    const restyle = () => {
        const items = plain.map((d) => ({ key: `${d.id}-${d.scene}-${++seq.current}`, lot: lots.find((l) => l.id === d.id), sceneId: d.scene, status: 'queued' }));
        setQueue((q) => [...q, ...items]);
        run(items);
    };

    const active = queue.filter((q) => q.status === 'queued' || q.status === 'rendering').length;
    const spent = queue.filter((q) => q.status === 'done').length;

    return (
        <section className="pt-24 md:pt-28 pb-20 max-w-[1320px] mx-auto px-4 md:px-8">
            <button onClick={onHome} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink-3 hover:text-ink">
                <Arrow dir="left" className="w-3.5 h-3.5" /> Back to the site
            </button>
            <h1 className="mt-3 font-brand text-[44px] md:text-[56px] leading-none">Render studio</h1>
            <p className="mt-3 max-w-[720px] text-ink-2 text-[15px] leading-relaxed">
                Puts lots into real-looking rooms with the live site's visualiser: the same prompt, slab book-match and model (Gemini 2.5 Flash Image on
                Vertex) as the Visualise button. Each render takes 15–25 seconds and costs about $0.04; a batch waits 20 seconds between renders, because Vertex refuses image requests sent back to back. It is saved and reused for every visitor. In
                production this happens once, when a lot is listed.
            </p>

            <div className="mt-8 rounded-[20px] border border-ink/10 bg-white/60 p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={renderTour}
                        disabled={active > 0}
                        className="h-11 px-5 rounded-full bg-clay text-paper font-bold text-[14px] disabled:opacity-40"
                    >
                        Render the hero tour
                    </button>
                    <span className="text-[13px] text-ink-2">
                        The first screen&apos;s default: 9 slides, each a different space, lot and architectural style. About $0.36.
                        {tourNote && <b className="text-ink"> {tourNote}</b>}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={enqueueAll}
                        disabled={active > 0}
                        className="h-11 px-5 rounded-full bg-ink text-paper font-bold text-[14px] disabled:opacity-40"
                    >
                        Render the starter set
                    </button>
                    <span className="text-[13px] text-ink-2">
                        Tops each room up to: {STARTER.map(([id, n]) => `${RENDER_SCENES[id].label.toLowerCase()} ${n}`).join(' · ')}
                    </span>
                </div>
                {plain.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={restyle}
                            disabled={active > 0}
                            className="h-11 px-5 rounded-full border border-ink/25 font-bold text-[14px] hover:border-ink disabled:opacity-40"
                        >
                            Restyle the older renders ({plain.length})
                        </button>
                        <span className="text-[13px] text-ink-2">
                            Re-renders the rooms made before the architectural styles, hero rooms first. About ${(plain.length * 0.04).toFixed(2)}. It shares the Vertex
                            quota with the live Visualise button, so run it when the live site is quiet.
                        </span>
                    </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3 mr-1">Or render</span>
                    <select
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                        className="h-9 rounded-full border border-ink/15 bg-white px-3 text-[13px] font-semibold"
                        aria-label="How many"
                    >
                        {[1, 3, 6].map((n) => (
                            <option key={n} value={n}>
                                {n} more
                            </option>
                        ))}
                    </select>
                    {Object.entries(RENDER_SCENES).map(([id, s]) => (
                        <button
                            key={id}
                            onClick={() => enqueue(id)}
                            disabled={active > 0}
                            className="h-9 px-3 rounded-full border border-ink/20 text-[13px] font-semibold hover:border-ink disabled:opacity-40"
                        >
                            {s.label} ({done.filter((d) => d.scene === id).length})
                        </button>
                    ))}
                </div>
                {queue.length > 0 && (
                    <p className="text-[13px] text-ink-2" data-testid="studio-status">
                        {active ? `Rendering… ${active} left` : 'Queue finished'} · {spent} rendered this session (≈ ${(spent * 0.04).toFixed(2)})
                        {queue.some((q) => q.status === 'failed') && ` · ${queue.filter((q) => q.status === 'failed').length} failed`}
                    </p>
                )}
            </div>

            {queue.length > 0 && (
                <ul className="mt-6 grid gap-2">
                    {queue.map((q) => (
                        <li key={q.key} className="flex items-center gap-3 rounded-xl bg-white/60 border border-ink/10 px-3 py-2 text-[13.5px]">
                            <img src={q.url || q.lot.image} alt="" className="w-16 h-10 rounded-md object-cover bg-paper-3" />
                            <span className="font-bold">{q.lot.name}</span>
                            <span className="text-ink-3">{RENDER_SCENES[q.sceneId].label}{q.styleId ? ` · ${styleName(q.styleId)}` : ''}</span>
                            <span
                                className={`ml-auto font-semibold ${
                                    q.status === 'done' ? 'text-moss' : q.status === 'failed' ? 'text-clay' : 'text-ink-3'
                                }`}
                            >
                                {q.status === 'done' && `Done · ${(q.ms / 1000).toFixed(0)} s`}
                                {q.status === 'rendering' && 'Rendering…'}
                                {q.status === 'queued' && 'Queued'}
                                {q.status === 'failed' && `Failed: ${q.error}`}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <h2 className="mt-12 font-brand text-[32px]">Saved renders ({done.length})</h2>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {done.map((d) => (
                    <figure key={d.url} className="rounded-[14px] overflow-hidden bg-white/60 border border-ink/10">
                        <img src={d.url} alt={`${d.name} in a ${placeOf(RENDER_SCENES[d.scene])}`} loading="lazy" className="w-full aspect-[1408/736] object-cover" />
                        <figcaption className="px-3 py-2 text-[12.5px]">
                            <b>{d.name}</b> <span className="text-ink-3">· {RENDER_SCENES[d.scene].label}</span>
                        </figcaption>
                    </figure>
                ))}
            </div>
        </section>
    );
}
