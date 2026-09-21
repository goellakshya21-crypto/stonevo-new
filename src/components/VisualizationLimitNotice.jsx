import React from 'react';
import { Lock } from 'lucide-react';
import StonWordmark from './StonWordmark';

/**
 * Shown when a user has spent every visualisation they were allotted.
 *
 * Deliberately not styled as an error. Nothing has gone wrong and there is
 * nothing to retry -- an allowance ran out, which is an ordinary commercial
 * fact. A red failure screen would send people hunting for a bug and then to
 * support, so this states the position plainly and says who to talk to.
 *
 * The numbers are shown because "you have used all 100" is answerable, whereas
 * "you can no longer use this site" invites an argument.
 *
 * Props:
 *   limit        how many they were allowed (optional)
 *   onClose      dismiss, when the notice is covering something still usable
 */
const VisualizationLimitNotice = ({ limit, onClose }) => (
    <div className="absolute inset-0 z-[120] bg-[#0f0d0a] flex items-center justify-center p-8 text-center">
        <div className="max-w-md">
            <div className="mb-8 flex justify-center opacity-90">
                <StonWordmark height={20} />
            </div>

            <div className="w-14 h-14 rounded-full bg-[#eca413]/10 border border-[#eca413]/20 flex items-center justify-center mx-auto mb-6">
                <Lock className="text-[#eca413]" size={22} />
            </div>

            <h2 className="text-2xl md:text-3xl font-serif text-white mb-4 italic">
                You have reached your limit
            </h2>

            <p className="text-white/50 text-sm leading-relaxed mb-2">
                {limit != null
                    ? <>You have used all <span className="text-[#eca413] font-semibold">{limit}</span> of the visualisations on your account.</>
                    : <>You have used all of the visualisations on your account.</>}
            </p>
            <p className="text-white/40 text-xs leading-relaxed mb-8">
                Everything else on the site stays available. To have more added, please speak to the Ston team.
            </p>

            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    className="px-7 py-3 bg-[#eca413] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all"
                >
                    Back to the gallery
                </button>
            )}
        </div>
    </div>
);

export default VisualizationLimitNotice;
