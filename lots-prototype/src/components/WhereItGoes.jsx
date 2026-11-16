import React from 'react';
import { SCENE_IDS, SCENES, suits, whyNot } from '../lib/applications';

/**
 * Where a stone of this family will be offered to buyers, and where it will
 * not (with why), from the same rules every view uses (applications.js). For
 * the yard listing a lot, and for our team reviewing it.
 */
export default function WhereItGoes({ family, className = '' }) {
    if (!family) return null;
    const probe = { family };
    const yes = SCENE_IDS.filter((id) => suits(probe, id)).map((id) => SCENES[id].space);
    const no = SCENE_IDS.filter((id) => !suits(probe, id));
    return (
        <div className={`rounded-xl bg-paper-2/70 px-3.5 py-2.5 text-[12.5px] ${className}`}>
            <p className="text-ink-2">
                <b className="text-ink">Offered to buyers for:</b> {yes.join(', ')}.
            </p>
            {no.length > 0 && (
                <p className="mt-0.5 text-clay">
                    <b>Not offered for:</b> {no.map((id) => `${SCENES[id].space} (${whyNot(family, id)})`).join(', ')}.
                </p>
            )}
        </div>
    );
}
