import React, { useMemo, useState } from 'react';
import LotCard from './LotCard';
import { CITIES, costFor, FAMILIES, inr, SORTS, SPACES, suitsSpace } from '../lib/lots';
import { BUDGET_FILTERS, COLOUR_GROUPS } from '../lib/requirements';
import { Arrow, Chip, Close } from './ui';

const PAGE = 24;

/** All lots, with the filters a small-space buyer actually thinks in. */
export default function Gallery({
    lots,
    renders,
    filters,
    setFilters,
    saved,
    onToggleSave,
    onOpenSaved,
    onOpen,
    onHome,
    compare,
    onToggleCompare,
    onPickCompare,
    onOpenCompare,
    onRequirement,
    designPick = null,
    onDesignPick,
    onCancelDesignPick,
}) {
    // `pin`: the lot a home-page card was showing when it was clicked. It goes
    // first and is marked, so the stone you clicked is the first thing you see.
    // `budget` (₹) and `size` (sq ft) come from the budget filter or a shared
    // requirement. With a size or a space, the budget is for that much stone;
    // otherwise it is for the whole lot.
    const { q = '', space = '', city = '', family = '', colour = '', sort = 'newest', savedOnly = false, pin = '', budget = 0, size = 0 } = filters;
    const set = (patch) => setFilters({ ...filters, ...patch });

    // "Show more" count belongs to one set of filters; change them and it resets.
    const filterKey = JSON.stringify([q, space, city, family, colour, sort, savedOnly, budget, size]);
    const [page, setPage] = useState({ key: filterKey, n: PAGE });
    const shown = page.key === filterKey ? page.n : PAGE;

    const cityCounts = useMemo(() => {
        const m = {};
        lots.forEach((l) => (m[l.cityKey] = (m[l.cityKey] || 0) + 1));
        return m;
    }, [lots]);

    // Colour groups (the same ones a shared requirement uses), each with the
    // colour tags it covers; a group no lot is in is not offered.
    const colourGroups = useMemo(() => COLOUR_GROUPS.filter((g) => lots.some((l) => l.colors.some((c) => g.tags.includes(c)))), [lots]);
    const colourTags = COLOUR_GROUPS.find((g) => g.id === colour)?.tags;

    const spaceObj = SPACES.find((s) => s.id === space);
    // Spaces carry no size of their own (decided 2026-11-15): the buyer types how
    // much they need. A space only says which stones may go there.
    const basis = Number(size) || 0; // sq ft the buyer needs (and the budget is for); 0 = whole lot
    const results = useMemo(() => {
        const needle = q.trim().toLowerCase();
        const costOf = (l) => (basis ? costFor(l, basis) : l.lotTotal);
        return (
            lots
                .filter((l) => !needle || `${l.name} ${l.family} ${l.colors.join(' ')} ${l.city.name}`.toLowerCase().includes(needle))
                .filter((l) => !spaceObj || suitsSpace(l, spaceObj))
                .filter((l) => !size || l.sqft >= size)
                .filter((l) => !budget || costOf(l) <= budget)
                .filter((l) => !city || l.cityKey === city)
                .filter((l) => !family || l.family === family)
                .filter((l) => !colourTags || l.colors.some((c) => colourTags.includes(c)))
                // Choosing for Design a room: only stones that may go on that surface.
                .filter((l) => !designPick || !designPick.avoid.includes(l.family))
                .filter((l) => !savedOnly || saved.has(l.id))
                .sort((a, b) => (b.id === pin) - (a.id === pin) || SORTS[sort].fn(a, b))
        );
    }, [lots, q, spaceObj, city, family, colourTags, designPick, sort, savedOnly, saved, pin, size, budget, basis]);

    const anyFilter = q || space || city || family || colour || savedOnly || budget || size;
    // The shared-requirement budget may not be one of the filter's presets.
    const budgetChoices = [...new Set([...BUDGET_FILTERS, ...(budget ? [budget] : [])])].sort((a, b) => a - b);

    return (
        <section className={`pt-24 md:pt-28 max-w-[1320px] mx-auto px-4 md:px-8 ${compare.on ? 'pb-36' : 'pb-20'}`}>
            <button onClick={onHome} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink-3 hover:text-ink">
                <Arrow dir="left" className="w-3.5 h-3.5" /> Back to the room
            </button>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="font-brand text-[44px] md:text-[56px] leading-none">All small lots</h1>
                    <p className="mt-2 text-ink-2 text-[15px]">
                        {results.length} of {lots.length} lots · every one a single lot, sold once
                    </p>
                </div>
                <div className="flex w-full md:w-auto gap-2">
                    <label className="relative flex-1 md:w-[340px]">
                        <span className="sr-only">Search lots</span>
                        <input
                            value={q}
                            onChange={(e) => set({ q: e.target.value })}
                            placeholder="Search a stone, colour or city"
                            className="w-full h-12 rounded-full border border-ink/15 bg-white/80 pl-5 pr-4 text-[14px] outline-none focus:border-ink"
                        />
                    </label>
                    {!designPick && (
                        <button
                            onClick={onToggleCompare}
                            aria-pressed={compare.on}
                            className={`h-12 px-5 rounded-full font-bold text-[14px] shrink-0 transition-colors ${
                                compare.on ? 'bg-ink text-paper' : 'border border-ink/20 hover:border-ink'
                            }`}
                        >
                            {compare.on ? 'Cancel compare' : 'Compare'}
                        </button>
                    )}
                </div>
            </div>

            {designPick && (
                <div
                    className="mt-5 rounded-2xl border-2 bg-white/85 px-4 py-3 flex flex-wrap items-center gap-3"
                    style={{ borderColor: designPick.color }}
                    role="status"
                >
                    <span
                        className="w-8 h-8 rounded-full grid place-items-center text-[14px] font-extrabold text-white shrink-0"
                        style={{ background: designPick.color }}
                    >
                        {designPick.n}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block font-bold text-[15px]">Tap a stone for the {designPick.label.toLowerCase()}</span>
                        <span className="block text-[12.5px] text-ink-3">
                            For Design a room.{' '}
                            {designPick.avoid.length ? `Only stones that may go on a ${designPick.kind} are shown.` : 'Use the filters to narrow it down.'}
                        </span>
                    </span>
                    <button
                        type="button"
                        onClick={onCancelDesignPick}
                        className="h-10 px-4 rounded-full border border-ink/20 text-[13px] font-bold hover:border-ink shrink-0"
                    >
                        Back without choosing
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="sticky top-[60px] md:top-[68px] z-20 -mx-4 md:-mx-8 px-4 md:px-8 mt-6 py-3 bg-paper/90 backdrop-blur border-y border-ink/10 space-y-2.5">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3 shrink-0 w-[64px]">Space</span>
                    <Chip active={!space} onClick={() => set({ space: '' })}>
                        Any space
                    </Chip>
                    {SPACES.map((s) => (
                        <Chip key={s.id} active={space === s.id} onClick={() => set({ space: space === s.id ? '' : s.id })}>
                            {s.label}
                        </Chip>
                    ))}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3 shrink-0 w-[64px]">Stone</span>
                    <Chip active={!family} onClick={() => set({ family: '' })}>
                        All
                    </Chip>
                    {FAMILIES.map((f) => (
                        <Chip key={f} active={family === f} onClick={() => set({ family: family === f ? '' : f })}>
                            {f}
                        </Chip>
                    ))}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3 shrink-0 w-[64px]">Colour</span>
                    <Chip active={!colour} onClick={() => set({ colour: '' })}>
                        All
                    </Chip>
                    {colourGroups.map((g) => (
                        <Chip key={g.id} active={colour === g.id} onClick={() => set({ colour: colour === g.id ? '' : g.id })}>
                            <span className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-ink/15" style={{ background: g.hex }} />
                            {g.label}
                        </Chip>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3 shrink-0 w-[64px]">From</span>
                    <select
                        value={city}
                        onChange={(e) => set({ city: e.target.value })}
                        className="h-9 rounded-full border border-ink/15 bg-white/70 px-3 text-[12.5px] font-semibold outline-none"
                        aria-label="Ships from"
                    >
                        <option value="">Anywhere in India</option>
                        {Object.entries(CITIES)
                            .filter(([k]) => cityCounts[k])
                            .map(([k, c]) => (
                                <option key={k} value={k}>
                                    {c.name} ({cityCounts[k]})
                                </option>
                            ))}
                    </select>
                    <select
                        value={sort}
                        onChange={(e) => set({ sort: e.target.value })}
                        className="h-9 rounded-full border border-ink/15 bg-white/70 px-3 text-[12.5px] font-semibold outline-none"
                        aria-label="Sort"
                    >
                        {Object.entries(SORTS).map(([k, s]) => (
                            <option key={k} value={k}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                    <label
                        className={`h-9 inline-flex items-center gap-1.5 rounded-full border pl-3 pr-2.5 text-[12.5px] font-semibold ${
                            size ? 'border-ink bg-white' : 'border-ink/15 bg-white/70'
                        }`}
                    >
                        <span className="text-ink-3">You need</span>
                        <input
                            inputMode="numeric"
                            value={size || ''}
                            onChange={(e) => set({ size: Number(e.target.value.replace(/\D/g, '').slice(0, 4)) || 0 })}
                            placeholder="–"
                            className="w-11 bg-transparent outline-none font-bold tabular-nums text-ink text-center"
                            aria-label="How many sq ft you need"
                        />
                        <span className="text-ink-3">sq ft</span>
                    </label>
                    <select
                        value={budget}
                        onChange={(e) => set({ budget: Number(e.target.value) })}
                        className={`h-9 rounded-full border px-3 text-[12.5px] font-semibold outline-none ${budget ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-white/70'}`}
                        aria-label="Budget"
                    >
                        <option value={0}>Any budget</option>
                        {budgetChoices.map((b) => (
                            <option key={b} value={b}>
                                Up to {inr(b)}
                            </option>
                        ))}
                    </select>
                    {budget > 0 && <span className="text-[12px] text-ink-3 font-semibold">{basis ? `for your ${basis} sq ft` : 'for the whole lot'}</span>}
                    <Chip active={savedOnly} onClick={() => (savedOnly || !onOpenSaved ? set({ savedOnly: !savedOnly }) : onOpenSaved())}>
                        Saved ({saved.size})
                    </Chip>
                    {anyFilter && (
                        <button onClick={() => setFilters({ sort })} className="text-[12.5px] font-bold text-clay underline underline-offset-4 ml-1">
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            {results.length ? (
                <>
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-8">
                        {results.slice(0, shown).map((l) => (
                            <LotCard
                                key={l.id}
                                lot={l}
                                renders={renders}
                                saved={saved.has(l.id)}
                                onToggleSave={onToggleSave}
                                onOpen={(l) => onOpen(l, { sceneId: spaceObj?.room, sqft: basis || undefined })}
                                selectable={compare.on || !!designPick}
                                selected={!designPick && compare.picks.some((p) => p.id === l.id)}
                                onSelect={designPick ? onDesignPick : onPickCompare}
                                note={l.id === pin ? 'The one you picked' : ''}
                                job={basis ? { sqft: basis, cost: costFor(l, basis) } : null}
                            />
                        ))}
                    </div>
                    {shown < results.length && (
                        <div className="mt-10 text-center">
                            <button
                                onClick={() => setPage({ key: filterKey, n: shown + PAGE })}
                                className="h-12 px-6 rounded-full border border-ink/20 font-bold text-[14px] hover:border-ink"
                            >
                                Show more · {results.length - shown} left
                            </button>
                        </div>
                    )}
                    <RequirementNudge onClick={() => onRequirement({ space, sqft: Number(size) || undefined })} />
                </>
            ) : (
                <div className="mt-16 text-center">
                    <p className="font-brand text-[30px]">No lot matches that yet.</p>
                    <p className="mt-2 text-ink-2">New lots come in every week. Share what you need and we&apos;ll message you when one fits.</p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                        <button
                            onClick={() => onRequirement({ space, sqft: Number(size) || undefined })}
                            className="h-11 px-5 rounded-full bg-ink text-paper font-bold text-[14px]"
                        >
                            Share your requirement
                        </button>
                        <button
                            onClick={() => setFilters({ sort })}
                            className="h-11 px-5 rounded-full border border-ink/20 font-bold text-[14px] hover:border-ink"
                        >
                            Show all lots
                        </button>
                    </div>
                </div>
            )}

            {compare.on && !designPick && (
                <CompareTray picks={compare.picks} ownRoom={compare.ownRoom} onPick={onPickCompare} onOpen={onOpenCompare} onCancel={onToggleCompare} />
            )}
        </section>
    );
}

// Under the results: for buyers who have not found it yet.
function RequirementNudge({ onClick }) {
    return (
        <div className="mt-12 rounded-[22px] bg-white/70 border border-ink/10 p-5 md:p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
                <p className="font-brand text-[26px] leading-tight">Not quite it?</p>
                <p className="text-[14px] text-ink-2">Share your space and budget. We call with options, and message you when a new lot fits.</p>
            </div>
            <button onClick={onClick} className="h-11 px-5 rounded-full bg-ink text-paper font-bold text-[14px] inline-flex items-center gap-2">
                Share your requirement <Arrow />
            </button>
        </div>
    );
}

// Pinned to the bottom while choosing: the two picks, and the button.
function CompareTray({ picks, ownRoom, onPick, onOpen, onCancel }) {
    return (
        <div className="fixed inset-x-0 bottom-0 z-30 p-3 md:p-4 pointer-events-none">
            <div className="pointer-events-auto mx-auto max-w-[760px] rounded-[22px] bg-ink text-paper shadow-float p-3 md:p-3.5 flex items-center gap-2 md:gap-3 fade-up">
                {[0, 1].map((i) => {
                    const l = picks[i];
                    return (
                        <div key={i} className="flex-1 min-w-0 flex items-center gap-2 rounded-2xl bg-paper/10 p-1.5 pr-2">
                            {l ? (
                                <>
                                    <img src={l.image} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
                                    <span className="text-[13px] font-bold truncate">{l.name}</span>
                                    <button
                                        onClick={() => onPick(l)}
                                        aria-label={`Remove ${l.name}`}
                                        className="ml-auto shrink-0 text-paper/60 hover:text-paper"
                                    >
                                        <Close className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="w-9 h-9 rounded-xl border-2 border-dashed border-paper/30 shrink-0" />
                                    <span className="text-[13px] text-paper/60 truncate">
                                        Pick a {i === 0 ? 'lot' : 'second lot'}
                                        {ownRoom && i === 1 ? ' for your room' : ''}
                                    </span>
                                </>
                            )}
                        </div>
                    );
                })}
                <button
                    onClick={onOpen}
                    disabled={picks.length < 2}
                    className="h-11 px-4 md:px-5 rounded-full bg-paper text-ink font-bold text-[13.5px] disabled:opacity-40 shrink-0"
                >
                    Compare
                </button>
                <button
                    onClick={onCancel}
                    aria-label="Cancel compare"
                    className="hidden sm:grid w-9 h-9 place-items-center text-paper/60 hover:text-paper shrink-0"
                >
                    <Close className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
