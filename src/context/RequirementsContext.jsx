import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const RequirementsContext = createContext();

export const RequirementsProvider = ({ children }) => {
    const [projectRequirements, setProjectRequirements] = useState(null);
    const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
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
        try {
            // Use array result — avoids .single() failing if multiple rows exist
            // (can happen when the table has no unique constraint on lead_id)
            const { data: rows, error } = await supabase
                .from('project_requirements')
                .select('*')
                .eq('lead_id', id)
                .order('updated_at', { ascending: false })
                .limit(1);

            if (error) throw error;
            const row = rows?.[0];
            if (row) {
                const reqData = row.data || row;
                setProjectRequirements(reqData);
                activeDraftRef.current = reqData;
            } else {
                setProjectRequirements(null);
                activeDraftRef.current = null;
            }
        } catch (err) {
            console.error('Error fetching requirements:', err);
        }
    }, []);

    // Reliable save: UPDATE first (handles existing row), INSERT if none found.
    // This works even without a unique constraint on lead_id.
    const persistToDb = useCallback(async (saveId, data, extra = {}) => {
        if (!saveId) return;
        try {
            const payload = {
                data,
                status: 'draft',
                updated_at: new Date().toISOString(),
                ...extra
            };
            const { data: updated, error: updateErr } = await supabase
                .from('project_requirements')
                .update(payload)
                .eq('lead_id', saveId)
                .select('id');
            if (updateErr) throw updateErr;

            if (!updated?.length) {
                // No existing row — insert fresh
                const { error: insertErr } = await supabase
                    .from('project_requirements')
                    .insert({ lead_id: saveId, ...payload });
                if (insertErr) throw insertErr;
            }
        } catch (err) {
            console.error('DB save failed:', err);
        }
    }, []);

    const addToRequirements = useCallback((stone) => {
        const sourceData = activeDraftRef.current || projectRequirements;
        
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

        const newData = { floors: updatedFloors };
        setProjectRequirements(newData);
        activeDraftRef.current = newData;
        setIsConfiguratorOpen(true);

        // Auto-save to DB immediately so the other party sees it in real-time
        const saveId = activeRoomId || leadId;
        persistToDb(saveId, newData);
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

            // Debounced auto-save so deletions and edits persist to DB
            clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = setTimeout(() => {
                const saveId = activeRoomId || leadId;
                persistToDb(saveId, data);
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
        setLeadId,
        clearSession
    }), [
        projectRequirements,
        isConfiguratorOpen,
        addToRequirements,
        saveRequirements,
        updateActiveDraft,
        stoneCount,
        activeRoomId,
        activeProjectName,
        linkToClient,
        unlinkClient,
        setLeadId,
        clearSession
    ]);

    return (
        <RequirementsContext.Provider value={contextValue}>
            {children}
        </RequirementsContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useRequirements = () => useContext(RequirementsContext);
