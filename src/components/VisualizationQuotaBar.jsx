import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * How many renders you have, and how many you have spent.
 *
 * Shown only to users who actually have a cap -- the hook hands back null for
 * uncapped accounts, so nobody is given a meter that can never fill.
 *
 * The point is that running out should never be a surprise. Before this, the
 * first sign was the wall at the hundredth render.
 *
 * Colour carries the same message as the number so it reads at a glance:
 * bronze while there is room, amber for the last fifth, red once spent.
 */
const VisualizationQuotaBar = ({ quota }) => {
    if (!quota || quota.limit == null) return null;

    const limit = Number(quota.limit) || 0;
    const used = Math.min(Number(quota.used) || 0, limit);
    const remaining = Math.max(0, limit - used);
    // Guard the divide: a limit of 0 means "none allowed", which is full, not NaN.
    const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 100;

    const exhausted = remaining === 0;
    const low = !exhausted && remaining <= Math.max(1, limit * 0.2);
    const barColor = exhausted ? 'bg-red-500' : low ? 'bg-amber-400' : 'bg-bronze';
    const textColor = exhausted ? 'text-red-400' : low ? 'text-amber-400' : 'text-stone-300';

    return (
        <div
            className="flex items-center gap-3 pl-3 pr-4 py-2 rounded-full bg-stone-900/70 border border-white/10 backdrop-blur-md"
            title={`${used} of ${limit} visualisations used · ${remaining} left`}
        >
            <Sparkles size={12} className={exhausted ? 'text-red-400' : 'text-bronze'} />
            <div className="flex flex-col gap-1 min-w-[92px]">
                <div className="flex items-baseline justify-between gap-3 leading-none">
                    <span className="text-[8px] uppercase tracking-widest text-stone-500 font-bold">
                        Visualisations
                    </span>
                    <span className={`text-[10px] font-bold tabular-nums ${textColor}`}>
                        {used}<span className="text-stone-600">/{limit}</span>
                    </span>
                </div>
                <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default VisualizationQuotaBar;
