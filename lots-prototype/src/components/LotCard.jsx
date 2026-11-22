import React from 'react';
import { inr, jobLabel } from '../lib/lots';
import { RENDER_SCENES, ROOM_TABS } from '../lib/renders';
import { SCENE_IDS, suits } from '../lib/applications';
import { Check, Heart, Pin } from './ui';

// Hover is pure CSS, so it is instant: only where a pointer can hover (not on
// phones, where a tap would leave it stuck).
const ON_HOVER_HIDE = '[@media(hover:hover)]:group-hover:opacity-0';
const ON_HOVER_SHOW = 'opacity-0 [@media(hover:hover)]:group-hover:opacity-100';

// In compare mode (`selectable`) a card is a choice, not a doorway: clicking it
// picks the lot instead of opening it, as on the live site.
// `note`: a short marker for this card (the gallery uses it for the lot you
// clicked on the home page).
// `job`: jobFor(lot, sqft) when the gallery is pricing the buyer's size.
// `booked`: a buyer has paid the advance and is visiting the yard.
// `pick`: on our designers' choice (Highlights).
//
// Pictures (decided 2026-11-22): the card shows the stone in a room; the
// moment the cursor is on it, the slab photo shows instead. Both pictures load
// together, so the swap needs no loading and no fade. A lot with no room
// picture yet shows its slab photo.
export default function LotCard({ lot, renders, saved, onToggleSave, onOpen, selectable, selected, onSelect, note, job, booked, pick }) {
    const roomId = [...new Set([...ROOM_TABS, ...SCENE_IDS])].find((id) => renders?.[lot.id]?.[id] && suits(lot, id));
    const room = roomId ? renders[lot.id][roomId] : null;

    return (
        <article className="group relative">
            <button
                type="button"
                onClick={() => (selectable ? onSelect(lot) : onOpen(lot))}
                aria-pressed={selectable ? !!selected : undefined}
                className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded-[18px]"
            >
                <div
                    className={`relative aspect-[4/5] rounded-[18px] overflow-hidden bg-paper-3 transition-shadow ${
                        selected ? 'ring-[3px] ring-ink ring-offset-2 ring-offset-paper' : note ? 'ring-[3px] ring-clay ring-offset-2 ring-offset-paper' : ''
                    }`}
                >
                    <img src={lot.image} alt={`${lot.name}, slab photo`} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                    {room && (
                        <img
                            src={room}
                            alt={`${lot.name} in a ${RENDER_SCENES[roomId].label.toLowerCase()}`}
                            loading="lazy"
                            className={`absolute inset-0 w-full h-full object-cover ${ON_HOVER_HIDE}`}
                        />
                    )}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                        <span className="rounded-md bg-clay text-paper text-[11.5px] font-extrabold px-2 py-0.5">−{lot.discountPct}%</span>
                        {lot.isNew && <span className="rounded-md bg-white/90 text-ink text-[11px] font-extrabold px-2 py-0.5">New</span>}
                        {pick && <span className="rounded-md bg-moss text-paper text-[11px] font-extrabold px-2 py-0.5">Designers&apos; choice</span>}
                        {lot.video && <span className="rounded-md bg-ink/80 text-paper text-[11px] font-extrabold px-2 py-0.5">Video</span>}
                        {booked && <span className="rounded-md bg-ink text-paper text-[11px] font-extrabold px-2 py-0.5">Booked</span>}
                    </div>
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/85 backdrop-blur px-2.5 py-1 text-[11.5px] font-bold text-ink">
                        <Pin className="w-3 h-3" /> {lot.city.name}
                    </span>
                    {room && (
                        <>
                            <span className={`absolute bottom-3 right-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-bold ${ON_HOVER_HIDE}`}>
                                {RENDER_SCENES[roomId].label}
                            </span>
                            <span className={`absolute bottom-3 right-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-bold ${ON_HOVER_SHOW}`}>
                                Slab photo
                            </span>
                        </>
                    )}
                </div>
                <div className="pt-3 px-0.5">
                    {note && <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-clay">{note}</p>}
                    <h3 className="font-brand text-[21px] md:text-[22px] leading-tight truncate">{lot.name}</h3>
                    <p className="text-[12.5px] text-ink-3 font-medium truncate">
                        <b className="text-ink-2 tabular-nums">{lot.sqft} sq ft</b> · {lot.family} · {lot.slabs} {lot.slabs === 1 ? 'slab' : 'slabs'}
                    </p>
                    <p className="mt-1.5 flex items-baseline gap-2">
                        <span className="text-[16px] font-extrabold">{inr(lot.price)}</span>
                        <span className="text-[12px] text-ink-3">/sq ft whole lot</span>
                        <span className="text-[12.5px] text-ink-3 line-through">{inr(lot.marketPrice)}</span>
                    </p>
                    <p className="text-[12px] text-ink-3 tabular-nums">{inr(lot.partRate)}/sq ft for part of it</p>
                    {job && (
                        <p className="mt-0.5 text-[12.5px] font-bold text-moss tabular-nums">
                            {inr(job.cost)} for {jobLabel(job)}
                        </p>
                    )}
                </div>
            </button>
            {selectable ? (
                <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute top-2.5 right-2.5 w-9 h-9 rounded-full grid place-items-center shadow-sm ${
                        selected ? 'bg-ink text-paper' : 'bg-white/90 text-transparent border-2 border-ink/30'
                    }`}
                >
                    <Check className="w-4 h-4" />
                </span>
            ) : (
                <button
                    type="button"
                    onClick={() => onToggleSave(lot.id)}
                    aria-label={saved ? `Remove ${lot.name} from saved` : `Save ${lot.name}`}
                    aria-pressed={saved}
                    className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/85 backdrop-blur grid place-items-center text-ink hover:bg-white"
                >
                    <Heart filled={saved} />
                </button>
            )}
        </article>
    );
}
