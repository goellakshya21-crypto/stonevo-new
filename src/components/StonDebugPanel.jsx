import React, { useState, useEffect } from 'react';
import { useRequirements } from '../context/RequirementsContext';
import { supabase } from '../lib/supabaseClient';
import { Bug, X, RefreshCw, Copy } from 'lucide-react';

// Floating diagnostic panel. Toggle with the bug button in the bottom-right corner.
// Shows the actual state of the requirements system so we can see WHY a save/fetch fails.
const StonDebugPanel = ({ chatRole }) => {
    const [open, setOpen] = useState(false);
    const [dbRowCount, setDbRowCount] = useState(null);
    const [dbStoneCount, setDbStoneCount] = useState(null);
    const [dbProbeErr, setDbProbeErr] = useState(null);
    const {
        leadId,
        activeRoomId,
        activeProjectName,
        isLinked,
        stoneCount,
        lastSaveStatus,
        lastFetchStatus,
        refetchNow
    } = useRequirements();

    const idToWatch = activeRoomId || leadId;

    const probeDb = async () => {
        setDbProbeErr(null);
        if (!idToWatch) { setDbRowCount(0); setDbStoneCount(0); return; }
        try {
            const { data: rows, error } = await supabase
                .from('project_requirements')
                .select('data, updated_at')
                .eq('lead_id', idToWatch)
                .order('updated_at', { ascending: false });
            if (error) throw error;
            setDbRowCount(rows?.length || 0);
            const latest = rows?.[0];
            if (latest?.data?.floors) {
                let count = 0;
                for (const f of latest.data.floors) {
                    for (const r of (f?.rooms || [])) {
                        for (const s of (r?.stones || [])) {
                            if (s?.name?.trim()) count++;
                        }
                    }
                }
                setDbStoneCount(count);
            } else {
                setDbStoneCount(0);
            }
        } catch (err) {
            setDbProbeErr(err.message || String(err));
        }
    };

    useEffect(() => {
        if (open) probeDb();
    }, [open, idToWatch]);

    const copyAll = () => {
        const dump = JSON.stringify({
            leadId,
            activeRoomId,
            activeProjectName,
            isLinked,
            chatRole,
            stoneCountInMemory: stoneCount,
            stoneCountInDb: dbStoneCount,
            dbRowCount,
            dbProbeErr,
            lastSaveStatus,
            lastFetchStatus,
            localStorage: {
                stonevo_lead_id: localStorage.getItem('stonevo_lead_id'),
                stonevo_active_room_id: localStorage.getItem('stonevo_active_room_id'),
                stonevo_active_project_name: localStorage.getItem('stonevo_active_project_name'),
                stonevo_user_phone: localStorage.getItem('stonevo_user_phone'),
                stonevo_user_name: localStorage.getItem('stonevo_user_name')
            }
        }, null, 2);
        navigator.clipboard?.writeText(dump);
        alert('Diagnostic snapshot copied to clipboard. Paste it in the chat.');
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-4 left-4 z-[9999] p-2.5 bg-stone-900 border border-bronze/40 rounded-full text-bronze hover:bg-bronze hover:text-stone-950 transition-all shadow-xl"
                title="Ston diagnostics"
            >
                <Bug size={16} />
            </button>
        );
    }

    const Row = ({ label, value, status }) => (
        <div className="flex items-start justify-between gap-3 py-1.5 border-b border-white/5 last:border-0">
            <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold shrink-0">{label}</span>
            <span className={`text-[10px] font-mono text-right break-all max-w-[60%] ${status === 'error' ? 'text-red-400' : status === 'ok' ? 'text-green-400' : 'text-stone-200'}`}>{value ?? '—'}</span>
        </div>
    );

    return (
        <div className="fixed bottom-4 left-4 z-[9999] w-96 max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto bg-stone-950 border border-bronze/40 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-white/10 bg-bronze/10 sticky top-0">
                <div className="flex items-center gap-2 text-bronze">
                    <Bug size={14} />
                    <span className="text-xs font-bold uppercase tracking-widest">Ston Diagnostics</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={probeDb} title="Re-probe DB" className="p-1.5 hover:bg-white/10 rounded text-stone-300"><RefreshCw size={12} /></button>
                    <button onClick={copyAll} title="Copy snapshot" className="p-1.5 hover:bg-white/10 rounded text-stone-300"><Copy size={12} /></button>
                    <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/10 rounded text-stone-300"><X size={14} /></button>
                </div>
            </div>
            <div className="p-3 space-y-3">
                <div>
                    <p className="text-[9px] uppercase tracking-widest text-bronze/70 font-bold mb-1">Identity</p>
                    <Row label="chatRole" value={chatRole || '—'} />
                    <Row label="leadId" value={leadId} />
                    <Row label="activeRoomId" value={activeRoomId} />
                    <Row label="activeProjectName" value={activeProjectName} />
                    <Row label="isLinked" value={String(!!isLinked)} status={isLinked ? 'ok' : undefined} />
                    <Row label="idUsedForSave" value={activeRoomId || leadId} />
                </div>
                <div>
                    <p className="text-[9px] uppercase tracking-widest text-bronze/70 font-bold mb-1">Stones</p>
                    <Row label="In-memory count" value={stoneCount} />
                    <Row label="In DB (latest row)" value={dbStoneCount} />
                    <Row label="DB rows for this lead" value={dbRowCount} />
                </div>
                <div>
                    <p className="text-[9px] uppercase tracking-widest text-bronze/70 font-bold mb-1">Last save</p>
                    <Row label="status" value={lastSaveStatus?.status} status={lastSaveStatus?.status === 'error' ? 'error' : lastSaveStatus?.status === 'ok' ? 'ok' : undefined} />
                    <Row label="savedAs" value={lastSaveStatus?.savedAs} />
                    <Row label="at" value={lastSaveStatus?.at} />
                    {lastSaveStatus?.error && <Row label="error" value={lastSaveStatus.error} status="error" />}
                </div>
                <div>
                    <p className="text-[9px] uppercase tracking-widest text-bronze/70 font-bold mb-1">Last fetch</p>
                    <Row label="status" value={lastFetchStatus?.status} status={lastFetchStatus?.status === 'error' ? 'error' : lastFetchStatus?.status === 'ok' ? 'ok' : undefined} />
                    <Row label="fetchedFor" value={lastFetchStatus?.fetchedFor} />
                    <Row label="rowFound" value={String(lastFetchStatus?.rowFound)} status={lastFetchStatus?.rowFound ? 'ok' : undefined} />
                    {lastFetchStatus?.error && <Row label="error" value={lastFetchStatus.error} status="error" />}
                </div>
                {dbProbeErr && (
                    <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-[10px]">
                        DB probe error: {dbProbeErr}
                    </div>
                )}
                <button
                    onClick={refetchNow}
                    className="w-full py-2 bg-bronze/20 hover:bg-bronze/40 border border-bronze/40 rounded text-bronze text-[10px] uppercase tracking-widest font-bold"
                >
                    Force Refetch From DB
                </button>
            </div>
        </div>
    );
};

export default StonDebugPanel;
