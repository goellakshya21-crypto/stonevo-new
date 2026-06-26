import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const RequirementsContext = createContext();

export const RequirementsProvider = ({ children }) => {
    const [projectRequirements, setProjectRequirements] = useState(null);
    const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
    const [lastSaveStatus, setLastSaveStatus] = useState({ status: 'idle', at: null, error: null, savedAs: null });
    const [lastFetchStatus, setLastFetchStatus] = useState({ status: 'idle', at: null, error: null, fetchedFor: null, rowFound: false });
    const activeDraftRef = useRef(null);
    const autoSaveTimerRef = useRef(null);
    const prevLeadIdRef = useRef(null);

    const [leadId, setLeadIdState] = useState(() => {
        try {
            return localStorage.getItem('stonevo_lead_id');
        } catch {
            return null;
        }
    });

    // Always keep localStorage in sync with state
    const setLeadId = useCallback((id) => {
        setLeadIdState(id);
        try {
            if (id) {
                localStorage.setItem('stonevo_lead_id', id);
            } else {
                localStorage.removeItem('stonevo_lead_id');
            }
        } catch { /* storage unavailable */ }
    }, []);

    const [activeRoomId, setActiveRoomId] = useState(() => {
        try {
            return localStorage.getItem('stonevo_active_room_id');
        } catch {
            return null;
        }
    });

    const [activeProjectName, setActiveProjectName] = useState(() => {
        try {
            return localStorage.getItem('stonevo_active_project_name');
        } catch {
            return null;
        }
    });

    // Self-heal: on app boot, validate that activeRoomId still points at a real leads row.
    // If it doesn't (left over from an old architecture using whitelist UUIDs), clear it.
    useEffect(() => {
        if (!activeRoomId) return;
        let cancelled = false;
        (async () => {
            const { data } = await supabase
                .from('leads')
                .select('id')
                .eq('id', activeRoomId)
                .maybeSingle();
            if (cancelled) return;
            if (!data) {
                console.warn('[Ston] activeRoomId', activeRoomId, 'is not a valid leads.id — clearing (stale localStorage from old architecture).');
                try {
                    localStorage.removeItem('stonevo_active_room_id');
                    localStorage.removeItem('stonevo_active_project_name');
                } catch {}
                setActiveRoomId(null);
                setActiveProjectName(null);
            }
        })();
        return () => { cancelled = true; };
    }, []); // run once on mount

    useEffect(() => {
        const idToFetch = activeRoomId || leadId;

        // If the active identity changed, wipe the previous user's data immediately
        // so their stones never bleed into the new session.
        if (prevLeadIdRef.current !== (activeRoomId || leadId)) {
            setProjectRequirements(null);
            activeDraftRef.current = null;
            prevLeadIdRef.current = activeRoomId || leadId;
        }

        if (idToFetch) {
            fetchRequirements(idToFetch);
        }
    }, [leadId, activeRoomId]);

    // Real-time subscription — architect sees client changes live, client sees architect changes live
    useEffect(() => {
        const idToWatch = activeRoomId || leadId;
        if (!idToWatch) return;

        const channel = supabase
            .channel(`req_${idToWatch}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'project_requirements',
                filter: `lead_id=eq.${idToWatch}`
            }, (payload) => {
                if (payload.new?.data) {
                    setProjectRequirements(payload.new.data);
                    activeDraftRef.current = payload.new.data;
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [leadId, activeRoomId]);

    const fetchRequirements = useCallback(async (id) => {
        if (!id) return;
        const draftBeforeFetch = activeDraftRef.current;
        try {
            const { data: rows, error } = await supabase
                .from('project_requirements')
                .select('*')
                .eq('lead_id', id)
                .order('updated_at', { ascending: false })
                .limit(1);

            if (error) throw error;
            const row = rows?.[0];
            console.log('[Ston][fetch]', { lead_id: id, found: !!row, data: row?.data });
            setLastFetchStatus({ status: 'ok', at: new Date().toISOString(), error: null, fetchedFor: id, rowFound: !!row });
            if (row) {
                const reqData = row.data || row;
                if (activeDraftRef.current === draftBeforeFetch) {
                    setProjectRequirements(reqData);
                    activeDraftRef.current = reqData;
                }
            } else {
                if (activeDraftRef.current === draftBeforeFetch) {
                    setProjectRequirements(null);
                    activeDraftRef.current = null;
                }
            }
        } catch (err) {
            console.error('[Ston][fetch] ERROR:', err);
            setLastFetchStatus({ status: 'error', at: new Date().toISOString(), error: err.message || String(err), fetchedFor: id, rowFound: false });
        }
    }, []);

    // Atomic upsert — requires UNIQUE constraint on lead_id.
    // Run this SQL once in Supabase:
    //   ALTER TABLE project_requirements ADD CONSTRAINT project_requirements_lead_id_key UNIQUE (lead_id);
    // NOTE: errors are re-thrown so callers can surface them to the user.
    const persistToDb = useCallback(async (saveId, data, extra = {}) => {
        if (!saveId) {
            const err = new Error('No saveId — user not logged in?');
            setLastSaveStatus({ status: 'error', at: new Date().toISOString(), error: err.message, savedAs: null });
            throw err;
        }
        const payload = {
            lead_id: saveId,
            data,
            status: 'draft',
            updated_at: new Date().toISOString(),
            ...extra
        };
        console.log('[Ston][save] attempting upsert', { lead_id: saveId, stoneCount: (data?.floors || []).reduce((c, f) => c + (f?.rooms || []).reduce((rc, r) => rc + (r?.stones || []).filter(s => s?.name?.trim()).length, 0), 0) });
        const { error } = await supabase
            .from('project_requirements')
            .upsert(payload, { onConflict: 'lead_id' });
        if (error) {
            console.error('[Ston][save] ERROR:', error);
            setLastSaveStatus({ status: 'error', at: new Date().toISOString(), error: error.message || JSON.stringify(error), savedAs: saveId });
            throw error;
        }
        console.log('[Ston][save] OK lead_id=', saveId);
        setLastSaveStatus({ status: 'ok', at: new Date().toISOString(), error: null, savedAs: saveId });
    }, []);

    const addToRequirements = useCallback(async (stone) => {
        // If requirements haven't loaded yet (user clicked "Add Stone" before fetchRequirements
        // completed), fetch from DB first so we don't lose previously saved stones.
        let sourceData = activeDraftRef.current || projectRequirements;
        const saveId = activeRoomId || leadId;

        if (!sourceData && saveId) {
            try {
                const { data: rows } = await supabase
                    .from('project_requirements')
                    .select('data')
                    .eq('lead_id', saveId)
                    .order('updated_at', { ascending: false })
                    .limit(1);
                if (rows?.[0]?.data) {
                    sourceData = rows[0].data;
                    activeDraftRef.current = sourceData;
                    setProjectRequirements(sourceData);
                }
            } catch { /* proceed with empty if fetch fails */ }
        }

        let floors = [];
        if (sourceData) {
            if (Array.isArray(sourceData)) {
                floors = JSON.parse(JSON.stringify(sourceData));
            } else if (sourceData.floors && Array.isArray(sourceData.floors)) {
                floors = JSON.parse(JSON.stringify(sourceData.floors));
            }
        }

        if (floors.length === 0) {
            floors = [{
                id: 'floor_' + Date.now(),
                floorNo: "Ground Floor",
                description: "Initial Concept",
                rooms: [{
                    id: 'room_' + Date.now(),
                    roomName: "Gallery Selections",
                    stones: []
                }]
            }];
        }

        let targetFloor = floors[0];
        let targetRoom = targetFloor.rooms?.find(r => r.roomName === "Gallery Selections") || targetFloor.rooms?.[0];

        if (!targetRoom) {
            targetFloor.rooms = [{ id: 'room_gallery_' + Date.now(), roomName: "Gallery Selections", stones: [] }];
            targetRoom = targetFloor.rooms[0];
        }

        const newStone = {
            id: 'stone_' + Date.now() + '_' + Math.random().toString(36).substring(7),
            name: stone.name || "Stone Specimen",
            colour: `${[].concat(stone.physical_properties?.color || []).join(', ')}`,
            application: [].concat(stone.physical_properties?.application || [])[0] || 'Surface',
            price: [].concat(stone.physical_properties?.priceRange || [])[0] || '',
            image_url: stone.imageUrl || stone.image_url,
            quantity: "",
            area: ""
        };

        const updatedFloors = floors.map(floor => {
            if (floor.id === targetFloor.id) {
                return {
                    ...floor,
                    rooms: (floor.rooms || []).map(room => {
                        if (room.id === targetRoom.id) {
                            const validStones = (room.stones || []).filter(s => s && s.name?.trim() !== "");
                            return {
                                ...room,
                                stones: [...validStones, newStone]
                            };
                        }
                        return room;
                    })
                };
            }
            return floor;
        });

        // Preserve flooring/requestAudit/requestSourcing fields if they already exist
        const newData = {
            ...(sourceData && !Array.isArray(sourceData) ? sourceData : {}),
            floors: updatedFloors
        };
        setProjectRequirements(newData);
        activeDraftRef.current = newData;
        setIsConfiguratorOpen(true);

        // Cancel any pending debounced save (from updateActiveDraft) — ours is more up-to-date
        clearTimeout(autoSaveTimerRef.current);
        // Save immediately so the other party sees it in real-time. AWAIT so failures surface.
        try {
            await persistToDb(saveId, newData);
        } catch (err) {
            console.error('[addToRequirements] DB save failed:', err);
            try { window.alert(`Save failed: ${err.message || err}\n\n(leadId=${leadId}, activeRoomId=${activeRoomId}, savedAs=${saveId})`); } catch {}
        }
    }, [projectRequirements, leadId, activeRoomId, persistToDb]);

    // Hard-clears the entire session — call this on logout / switch account
    const clearSession = useCallback(() => {
        clearTimeout(autoSaveTimerRef.current);
        setProjectRequirements(null);
        activeDraftRef.current = null;
        prevLeadIdRef.current = null;
        setLeadIdState(null);
        setActiveRoomId(null);
        setActiveProjectName(null);
        try {
            localStorage.removeItem('stonevo_lead_id');
            localStorage.removeItem('stonevo_user_phone');
            localStorage.removeItem('stonevo_user_name');
            localStorage.removeItem('stonevo_active_room_id');
            localStorage.removeItem('stonevo_active_project_name');
        } catch { /* storage unavailable */ }
    }, []);

    const linkToClient = useCallback((clientId, clientName) => {
        localStorage.setItem('stonevo_active_room_id', clientId);
        localStorage.setItem('stonevo_active_project_name', clientName);
        setActiveRoomId(clientId);
        setActiveProjectName(clientName);
    }, []);

    const unlinkClient = useCallback(() => {
        localStorage.removeItem('stonevo_active_room_id');
        localStorage.removeItem('stonevo_active_project_name');
        setActiveRoomId(null);
        setActiveProjectName(null);
    }, []);

    const saveRequirements = useCallback(async (data) => {
        // When linked to a client, save to the client's row, not the architect's
        let currentLeadId = activeRoomId || leadId;
        if (!currentLeadId) {
            currentLeadId = 'GUEST_' + Math.random().toString(36).substring(7);
            localStorage.setItem('stonevo_lead_id', currentLeadId);
            setLeadId(currentLeadId);
        }

        const floors = data.floors || (Array.isArray(data) ? data : []);
        const totalArea = floors.reduce((acc, floor) => {
            if (!floor) return acc;
            return acc + (floor.rooms || []).reduce((rAcc, room) => {
                if (!room) return rAcc;
                return rAcc + (room.stones || []).reduce((sAcc, stone) => {
                    if (!stone) return sAcc;
                    return sAcc + (Number(stone.area) || 0);
                }, 0);
            }, 0);
        }, 0);

        try {
            await persistToDb(currentLeadId, data, { total_area: totalArea });
            setProjectRequirements(data);
            activeDraftRef.current = data;
            setIsConfiguratorOpen(false);
            return { success: true };
        } catch (err) {
            console.error('Error saving requirements:', err);
            return { success: false, error: err.message };
        }
    }, [leadId, activeRoomId, persistToDb]);

    const updateActiveDraft = useCallback((data) => {
        const currentDataStr = JSON.stringify(activeDraftRef.current || projectRequirements);
        const newDataStr = JSON.stringify(data);

        if (currentDataStr !== newDataStr) {
            activeDraftRef.current = data;
            setProjectRequirements(data);

            // Only persist if there is at least one named stone — prevents blank
            // form initialization from overwriting real saved data in the DB.
            const floors = data?.floors || (Array.isArray(data) ? data : []);
            const hasNamedStone = floors.some(f =>
                (f?.rooms || []).some(r =>
                    (r?.stones || []).some(s => s?.name?.trim())
                )
            );
            if (!hasNamedStone) return;

            // Debounced auto-save so deletions and edits persist to DB
            clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = setTimeout(() => {
                const saveId = activeRoomId || leadId;
                persistToDb(saveId, data).catch(err => console.error('[updateActiveDraft] DB save failed:', err));
            }, 800);
        }
    }, [projectRequirements, leadId, activeRoomId, persistToDb]);

    const getFloors = useCallback(() => {
        const data = activeDraftRef.current || projectRequirements;
        if (!data) return [];
        if (Array.isArray(data)) return data;
        return data.floors || [];
    }, [projectRequirements]);

    const stoneCount = useMemo(() => {
        return getFloors().reduce((count, floor) => {
            if (!floor) return count;
            return count + (floor.rooms || []).reduce((rCount, room) => {
                if (!room) return rCount;
                return rCount + (room.stones || []).filter(s => s && s.name?.trim()).length;
            }, 0);
        }, 0);
    }, [getFloors]);

    const refetchNow = useCallback(() => {
        const idToFetch = activeRoomId || leadId;
        if (idToFetch) fetchRequirements(idToFetch);
    }, [activeRoomId, leadId, fetchRequirements]);

    const contextValue = useMemo(() => ({
        projectRequirements,
        isConfiguratorOpen,
        setIsConfiguratorOpen,
        addToRequirements,
        saveRequirements,
        updateActiveDraft,
        stoneCount,
        activeDraft: activeDraftRef.current || projectRequirements,
        activeRoomId,
        activeProjectName,
        linkToClient,
        unlinkClient,
        isLinked: !!activeRoomId,
        leadId,
        setLeadId,
        clearSession,
        lastSaveStatus,
        lastFetchStatus,
        refetchNow
    }), [
        projectRequirements,
        isConfiguratorOpen,
        addToRequirements,
        saveRequirements,
        updateActiveDraft,
        stoneCount,
        leadId,
        activeRoomId,
        activeProjectName,
        linkToClient,
        unlinkClient,
        setLeadId,
        clearSession,
        lastSaveStatus,
        lastFetchStatus,
        refetchNow
    ]);

    return (
        <RequirementsContext.Provider value={contextValue}>
            {children}
        </RequirementsContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useRequirements = () => useContext(RequirementsContext);
