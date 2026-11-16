import React, { useEffect, useState } from 'react';

/** Seconds since `since`, ticking. */
export function Elapsed({ since }) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    return <>{Math.max(0, Math.round((now - since) / 1000))} s</>;
}

/** The card shown over a picture while the visualiser works. */
export function RenderingNote({ started, title, hint = 'usually 15–25 s' }) {
    return (
        <div className="rounded-2xl bg-paper/95 backdrop-blur px-5 py-4 shadow-card" role="status">
            <div className="mx-auto w-8 h-8 rounded-full border-[3px] border-ink/15 border-t-ink animate-spin" />
            <p className="mt-3 font-bold text-[14px]">{title}</p>
            <p className="text-[12.5px] text-ink-3 tabular-nums">
                <Elapsed since={started} /> · {hint}
            </p>
        </div>
    );
}
