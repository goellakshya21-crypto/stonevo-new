import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Home, Layers, ShoppingBag, ArrowRight, X, Search, Sparkles, GripVertical } from 'lucide-react';
import AIVisualizationModal from './AIVisualizationModal';

const StoneSelectionForm = ({ isOpen, onClose, onSubmit, onChange, initialData, inventory = [] }) => {
    const scrollContainerRef = useRef(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastAddedId, setLastAddedId] = useState(null);
    const [requestAudit, setRequestAudit] = useState(false);
    const [requestSourcing, setRequestSourcing] = useState(false);

    const [projectData, setProjectData] = useState([]);
    const [flooringData, setFlooringData] = useState({
        name: "",
        colour: "",
        price: "",
        area: ""
    });

    const [activeSearch, setActiveSearch] = useState({ floorId: null, roomId: null, stoneId: null });
    const [searchResults, setSearchResults] = useState([]);

    const [visualizingStone, setVisualizingStone] = useState(null);
    const [visualizingRoom, setVisualizingRoom] = useState("");
    const [dragOverRoomId, setDragOverRoomId] = useState(null);

    // Initialize state
    React.useEffect(() => {
        if (!initialData || (Array.isArray(initialData) && initialData.length === 0)) {
            setProjectData([
                {
                    id: Date.now(),
                    floorNo: "Ground Floor",
                    description: "Main lobby and executive suites",
                    rooms: [
                        {
                            id: Date.now() + 1,
                            roomName: "Living Room",
                            stones: [
                                { id: Date.now() + 2, name: "Calacatta Oro Marble", colour: "Polished White", quantity: "12", area: "450" }
                            ]
                        }
                    ]
                }
            ]);
        }
    }, []);

    // Update state if initialData changes (e.g., after a successful save or a gallery addition)
    React.useEffect(() => {
        if (initialData) {
            const nextFloors = initialData.floors || (Array.isArray(initialData) ? initialData : []);
            const nextFlooring = initialData.flooring || { name: "", colour: "", price: "", area: "" };

            // Only update if data is materially different to prevent infinite loops
            const currentFloorsStr = JSON.stringify(projectData);
            const nextFloorsStr = JSON.stringify(nextFloors);
            
            if (currentFloorsStr !== nextFloorsStr) {
                setProjectData(nextFloors);
            }
            
            const currentFlooringStr = JSON.stringify(flooringData);
            const nextFlooringStr = JSON.stringify(nextFlooring);
            
            if (currentFlooringStr !== nextFlooringStr) {
                setFlooringData(nextFlooring);
            }

            if (initialData.requestAudit !== undefined) setRequestAudit(initialData.requestAudit);
            if (initialData.requestSourcing !== undefined) setRequestSourcing(initialData.requestSourcing);
        }
    }, [initialData]);

    useEffect(() => {
        if (lastAddedId) {
            const element = document.getElementById(`scroll-target-${lastAddedId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setLastAddedId(null);
            }
        }
    }, [lastAddedId]);

    // Send unsaved changes back UP to parent so they stay synced while form is open
    // Added a small debounce to prevent "jitter" during rapid typing
    useEffect(() => {
        if (!onChange) return;

        const handler = setTimeout(() => {
            onChange({
                floors: projectData,
                flooring: flooringData,
                requestAudit,
                requestSourcing
            });
        }, 500);

        return () => clearTimeout(handler);
    }, [projectData, flooringData, requestAudit, requestSourcing, onChange]);

    if (!isOpen) return null;

    // Calculate live total area
    const totalArea = projectData.reduce((acc, floor) => {
        return acc + floor.rooms.reduce((rAcc, room) => {
            return rAcc + room.stones.reduce((sAcc, stone) => {
                return sAcc + (Number(stone.area) || 0);
            }, 0);
        }, 0);
    }, 0) + (Number(flooringData.area) || 0);

    const addFloor = () => {
        const newId = Date.now();
        setProjectData([...projectData, {
            id: newId,
            floorNo: `Floor ${projectData.length + 1}`,
            description: "New level configuration",
            rooms: [{
                id: Date.now() + 1,
                roomName: "New Room",
                stones: [{ id: Date.now() + 2, name: "", colour: "", quantity: "", area: "" }]
            }]
        }]);

        setLastAddedId(newId);
    };

    const removeFloor = (floorId) => {
        if (projectData.length > 1) {
            setProjectData(projectData.filter(f => f.id !== floorId));
        }
    };

    const addRoom = (floorId) => {
        const newId = Date.now();
        setProjectData(projectData.map(floor => {
            if (floor.id === floorId) {
                return {
                    ...floor,
                    rooms: [...floor.rooms, {
                        id: newId,
                        roomName: "New Room",
                        stones: [{ id: Date.now() + 1, name: "", colour: "", quantity: "", area: "" }]
                    }]
                };
            }
            return floor;
        }));

        setLastAddedId(newId);
    };

    const removeRoom = (floorId, roomId) => {
        setProjectData(projectData.map(floor => {
            if (floor.id === floorId) {
                if (floor.rooms.length > 1) {
                    return { ...floor, rooms: floor.rooms.filter(r => r.id !== roomId) };
                }
            }
            return floor;
        }));
    };

    const addStone = (floorId, roomId) => {
        setProjectData(projectData.map(floor => {
            if (floor.id === floorId) {
                return {
                    ...floor,
                    rooms: floor.rooms.map(room => {
                        if (room.id === roomId) {
                            return {
                                ...room,
                                stones: [...room.stones, { id: Date.now(), name: "", colour: "", quantity: "", area: "" }]
                            };
                        }
                        return room;
                    })
                };
            }
            return floor;
        }));
    };

    const removeStone = (floorId, roomId, stoneId) => {
        setProjectData(projectData.map(floor => {
            if (floor.id === floorId) {
                return {
                    ...floor,
                    rooms: floor.rooms.map(room => {
                        if (room.id === roomId) {
                            if (room.stones.length > 1) {
                                return { ...room, stones: room.stones.filter(s => s.id !== stoneId) };
                            }
                        }
                        return room;
                    })
                };
            }
            return floor;
        }));
    };

    const updateInputValue = (floorId, roomId, stoneId, field, value) => {
        if (field === 'name') {
            setActiveSearch({ floorId, roomId, stoneId });
            if (value.length > 1) {
                const query = value.toLowerCase();
                const matches = inventory.filter(item => {
                    const typeRaw = item.physical_properties?.marble || item.type || '';
                    const colorRaw = item.physical_properties?.color || item.color || '';
                    
                    const typeStr = Array.isArray(typeRaw) ? typeRaw.join(' ') : typeRaw;
                    const colorStr = Array.isArray(colorRaw) ? colorRaw.join(' ') : colorRaw;

                    return item.name?.toLowerCase().includes(query) ||
                        (typeStr && typeStr.toLowerCase().includes(query)) ||
                        (colorStr && colorStr.toLowerCase().includes(query));
                }).slice(0, 5);
                setSearchResults(matches);
            } else {
                setSearchResults([]);
            }
        }

        setProjectData(projectData.map(floor => {
            if (floor.id === floorId) {
                return {
                    ...floor,
                    rooms: floor.rooms.map(room => {
                        if (room.id === roomId) {
                            return {
                                ...room,
                                stones: room.stones.map(stone => {
                                    if (stone.id === stoneId) {
                                        return { ...stone, [field]: value };
                                    }
                                    return stone;
                                })
                            };
                        }
                        return room;
                    })
                };
            }
            return floor;
        }));
    };

    const selectInventoryItem = (floorId, roomId, stoneId, item) => {
        setProjectData(projectData.map(floor => {
            if (floor.id === floorId) {
                return {
                    ...floor,
                    rooms: floor.rooms.map(room => {
                        if (room.id === roomId) {
                            return {
                                ...room,
                                stones: room.stones.map(stone => {
                                    if (stone.id === stoneId) {
                                        return {
                                            ...stone,
                                            name: item.name,
                                            colour: `${item.physical_properties?.color || item.color || ''} / ${item.physical_properties?.finish || item.finish || ''}`,
                                            application: item.physical_properties?.application?.[0] || item.application || 'Flooring',
                                            price: item.physical_properties?.priceRange?.[0] || item.price_range || '',
                                            image_url: item.imageUrl || item.image_url
                                        };
                                    }
                                    return stone;
                                })
                            };
                        }
                        return room;
                    })
                };
            }
            return floor;
        }));
        setActiveSearch({ floorId: null, roomId: null, stoneId: null });
        setSearchResults([]);
    };

    const handleAutoScroll = (e) => {
        if (!scrollContainerRef.current) return;
        
        const container = scrollContainerRef.current;
        const rect = container.getBoundingClientRect();
        const scrollZoneHeight = 100; // 100px from top/bottom to start scrolling
        const scrollSpeed = 15; // Max scroll speed
        
        // Only trigger if we are dragging a stone
        if (!e.dataTransfer.types.includes("movedstone") && !e.target.closest('[draggable="true"]')) {
            // Check for standard move effect anyway to avoid flicker
            e.preventDefault();
        }

        const distanceFromTop = e.clientY - rect.top;
        const distanceFromBottom = rect.bottom - e.clientY;

        if (distanceFromTop < scrollZoneHeight) {
            // Scroll Up
            const intensity = (scrollZoneHeight - distanceFromTop) / scrollZoneHeight;
            container.scrollTop -= scrollSpeed * intensity;
        } else if (distanceFromBottom < scrollZoneHeight) {
            // Scroll Down
            const intensity = (scrollZoneHeight - distanceFromBottom) / scrollZoneHeight;
            container.scrollTop += scrollSpeed * intensity;
        }
        
        e.preventDefault();
    };

    const handleMoveStone = (stoneId, sourceFloorId, sourceRoomId, targetFloorId, targetRoomId) => {
        if (sourceRoomId === targetRoomId) return;

        setProjectData(prev => {
            let movedStone = null;
            // First find and remove the stone
            const updated = prev.map(floor => {
                if (floor.id === sourceFloorId) {
                    return {
                        ...floor,
                        rooms: floor.rooms.map(room => {
                            if (room.id === sourceRoomId) {
                                movedStone = room.stones.find(s => s.id === stoneId);
                                return {
                                    ...room,
                                    stones: room.stones.filter(s => s.id !== stoneId)
                                };
                            }
                            return room;
                        })
                    };
                }
                return floor;
            });

            if (!movedStone) return prev;

            // Then add it to the target
            return updated.map(floor => {
                if (floor.id === targetFloorId) {
                    return {
                        ...floor,
                        rooms: floor.rooms.map(room => {
                            if (room.id === targetRoomId) {
                                return {
                                    ...room,
                                    stones: [...room.stones, movedStone]
                                };
                            }
                            return room;
                        })
                    };
                }
                return floor;
            });
        });
    };

    const updateFloorNo = (floorId, value) => {
        setProjectData(projectData.map(f => f.id === floorId ? { ...f, floorNo: value } : f));
    };

    const updateRoomName = (floorId, roomId, value) => {
        setProjectData(projectData.map(f => f.id === floorId ? {
            ...f,
            rooms: f.rooms.map(r => r.id === roomId ? { ...r, roomName: value } : r)
        } : f));
    };

    const duplicateRoom = (floorId, roomToDuplicate) => {
        const newId = Date.now();
        setProjectData(projectData.map(floor => {
            if (floor.id === floorId) {
                const newRoom = {
                    ...roomToDuplicate,
                    id: newId,
                    roomName: `${roomToDuplicate.roomName} (Copy)`,
                    stones: roomToDuplicate.stones.map(stone => ({
                        ...stone,
                        id: Date.now() + Math.random()
                    }))
                };
                return {
                    ...floor,
                    rooms: [...floor.rooms, newRoom]
                };
            }
            return floor;
        }));

        setLastAddedId(newId);
    };

    const handleSubmitLocal = async (e) => {
        e.preventDefault();
        const finalData = {
            flooring: flooringData,
            floors: projectData,
            service_upsells: {
                requestAudit,
                requestSourcing
            }
        };
        if (onSubmit) {
            setIsSaving(true);
            try {
                await onSubmit(finalData);
            } catch (err) {
                console.error("Submit failed:", err);
            } finally {
                setIsSaving(false);
            }
        } else {
            console.log("Project Data Submitted:", finalData);
            alert("Requirements saved successfully!");
            onClose();
        }
    };

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 md:p-12 overflow-hidden"
            >
                <motion.div
                    ref={scrollContainerRef}
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    onDragOver={handleAutoScroll}
                    className="bg-[#1a150c] border border-white/5 w-full max-w-[1600px] h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative custom-scrollbar text-slate-100"
                >
                    {/* Inline styles to match the provided CSS exactly */}
                    <style>{`
                        .glass-bronze {
                            background: rgba(236, 164, 19, 0.05);
                            backdrop-filter: blur(8px);
                            border: 1px solid rgba(236, 164, 19, 0.2);
                        }
                        .custom-input {
                            background: rgba(255, 255, 255, 0.05);
                            border: 1px solid rgba(255, 255, 255, 0.1);
                            transition: all 0.2s ease;
                        }
                        .custom-input:focus {
                            border-color: #eca413;
                            outline: none;
                            box-shadow: 0 0 0 1px #eca413;
                        }
                    `}</style>

                    {/* Close Button - Positioned in extreme corner to avoid header overlap */}
                    <button
                        onClick={onClose}
                        className="absolute top-8 right-8 p-3 text-slate-500 hover:text-white transition-colors z-[110]"
                    >
                        <X size={24} />
                    </button>

                    <main className="p-8 lg:p-16 w-full">
                        {/* Header */}
                        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">

                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-[10px] font-bold tracking-widest text-[#eca413] uppercase">Institutional Portal</span>
                                    <span className="w-1 h-1 rounded-full bg-[#eca413]/40"></span>
                                    <span className="text-[10px] font-bold tracking-widest text-[#eca413]/60 uppercase">Draft Management</span>
                                </div>
                                <h1 className="text-4xl font-medium text-slate-100 mb-2 font-serif">Add Project Requirements</h1>
                                <p className="text-slate-400 text-sm">Configure high-grade architectural stone requirements across all floor levels.</p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="hidden xl:flex items-center gap-8 mr-4 px-8 border-r border-white/10">
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Estimated Total Area</p>
                                        <p className="text-2xl font-serif text-[#eca413]">
                                            {totalArea.toLocaleString()} <span className="text-xs text-slate-400 font-sans uppercase tracking-[0.2em] ml-1">Sq.Ft</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </header>

                        {/* Configuration Content */}
                        <div className="space-y-12 pb-12">
                            {/* Flooring Requirements Section */}
                            <motion.section
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white/[0.02] border border-[#eca413]/20 rounded-3xl p-8 mb-4"
                            >
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-full bg-[#eca413]/10 border border-[#eca413]/20 flex items-center justify-center text-[#eca413]">
                                        <ShoppingBag size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-serif text-slate-100">Overall Flooring Requirements</h2>
                                        <p className="text-sm text-slate-500">Specify global flooring specifications for the project.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">Flooring Stone Name</label>
                                        <input
                                            type="text"
                                            value={flooringData.name}
                                            onChange={(e) => setFlooringData({ ...flooringData, name: e.target.value })}
                                            placeholder="e.g. Statuario Extra"
                                            className="w-full custom-input px-4 py-4 rounded-lg text-sm text-slate-100"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">Colour / Finish</label>
                                        <input
                                            type="text"
                                            value={flooringData.colour}
                                            onChange={(e) => setFlooringData({ ...flooringData, colour: e.target.value })}
                                            placeholder="e.g. Polished White"
                                            className="w-full custom-input px-4 py-4 rounded-lg text-sm text-slate-100"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">Price / SF</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={flooringData.price}
                                                onChange={(e) => setFlooringData({ ...flooringData, price: e.target.value })}
                                                placeholder="0.00"
                                                className="w-full custom-input px-4 py-4 rounded-lg text-sm text-slate-100 pl-8"
                                            />
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-serif">₹</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">Total Area</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={flooringData.area}
                                                onChange={(e) => setFlooringData({ ...flooringData, area: e.target.value })}
                                                placeholder="0"
                                                className="w-full custom-input px-4 py-4 rounded-lg text-sm text-slate-100 pr-12"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600 uppercase">ft²</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.section>

                            <AnimatePresence mode="popLayout">
                                {projectData.map((floor, floorIndex) => (
                                    <motion.section
                                        key={floor.id}
                                        id={`scroll-target-${floor.id}`}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="space-y-8"
                                    >
                                        {/* Floor Header */}
                                        <div className="flex items-center justify-between border-b border-[#eca413]/20 pb-6">
                                            <div className="flex items-center gap-6">
                                                <span className="w-12 h-12 rounded-full bg-[#eca413]/10 border border-[#eca413]/20 flex items-center justify-center text-[#eca413] font-bold text-lg">
                                                    {(floorIndex + 1).toString().padStart(2, '0')}
                                                </span>
                                                <div>
                                                    <div className="flex items-center gap-4">
                                                        <input
                                                            type="text"
                                                            value={floor.floorNo}
                                                            onChange={(e) => updateFloorNo(floor.id, e.target.value)}
                                                            className="bg-transparent border-none text-2xl font-medium text-slate-100 p-0 focus:ring-0 w-auto min-w-[200px]"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFloor(floor.id)}
                                                            className="text-slate-600 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <p className="text-sm text-slate-500">{floor.description}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Rooms in Floor */}
                                        <div className="space-y-8">
                                            {floor.rooms.map((room) => (
                                                <div 
                                                    key={room.id} 
                                                    id={`scroll-target-${room.id}`} 
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        setDragOverRoomId(room.id);
                                                    }}
                                                    onDragLeave={() => setDragOverRoomId(null)}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        setDragOverRoomId(null);
                                                        try {
                                                            const data = JSON.parse(e.dataTransfer.getData("movedStone"));
                                                            handleMoveStone(data.stoneId, data.floorId, data.roomId, floor.id, room.id);
                                                        } catch (err) {
                                                            console.error("Drop failed:", err);
                                                        }
                                                    }}
                                                    className={`rounded-xl border transition-all p-8 space-y-8 relative group ${dragOverRoomId === room.id ? 'border-[#eca413] bg-[#eca413]/5 ring-1 ring-[#eca413]/20 scale-[1.01]' : 'border-white/5 bg-white/[0.01]'}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                                                                <Home size={20} className="text-slate-400" />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={room.roomName}
                                                                onChange={(e) => updateRoomName(floor.id, room.id, e.target.value)}
                                                                className="bg-transparent border-none text-xl font-medium text-slate-200 p-0 focus:ring-0"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] uppercase tracking-widest text-slate-400 border border-white/5">
                                                                {room.stones.length} Material{room.stones.length !== 1 ? 's' : ''} Defined
                                                            </span>
                                                            <button
                                                                onClick={() => removeRoom(floor.id, room.id)}
                                                                className="text-slate-600 hover:text-red-400 transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Stones Table */}
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-12 gap-6 px-2 text-[10px] uppercase tracking-widest font-bold text-slate-500">
                                                            <div className="col-span-4 flex items-center gap-2">
                                                                <div className="w-5" /> {/* Empty space for drag handle alignment */}
                                                                Stone Type/Name
                                                            </div>
                                                            <div className="col-span-3">Color / Finish</div>
                                                            <div className="col-span-2 text-center">Quantity</div>
                                                            <div className="col-span-2 text-center">Area (Sq.Ft)</div>
                                                            <div className="col-span-1"></div>
                                                        </div>

                                                        {room.stones.map((stone) => (
                                                            <div 
                                                                key={stone.id} 
                                                                className="grid grid-cols-12 gap-6 items-center group/stone"
                                                                draggable="true"
                                                                onDragStart={(e) => {
                                                                    e.dataTransfer.setData("movedStone", JSON.stringify({
                                                                        stoneId: stone.id,
                                                                        floorId: floor.id,
                                                                        roomId: room.id
                                                                    }));
                                                                    e.dataTransfer.effectAllowed = "move";
                                                                }}
                                                            >
                                                                <div className="col-span-4 relative flex items-center gap-2">
                                                                    <div className="cursor-grab active:cursor-grabbing text-slate-700 hover:text-[#eca413] transition-colors p-1">
                                                                        <GripVertical size={16} />
                                                                    </div>
                                                                    <div className="relative flex-1">
                                                                        <input
                                                                            type="text"
                                                                            value={stone.name}
                                                                            onChange={(e) => updateInputValue(floor.id, room.id, stone.id, 'name', e.target.value)}
                                                                            placeholder="Search Collection..."
                                                                            className="w-full custom-input px-4 py-4 rounded-lg text-sm text-slate-100 pr-10"
                                                                        />
                                                                        <Search size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#eca413] transition-colors" />
                                                                    </div>

                                                                    <AnimatePresence>
                                                                        {activeSearch.stoneId === stone.id && searchResults.length > 0 && (
                                                                            <motion.div
                                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                                animate={{ opacity: 1, scale: 1 }}
                                                                                exit={{ opacity: 0, scale: 0.95 }}
                                                                                className="absolute z-[100] top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
                                                                            >
                                                                                {searchResults.map(item => (
                                                                                    <button
                                                                                        key={item.id}
                                                                                        onClick={() => selectInventoryItem(floor.id, room.id, stone.id, item)}
                                                                                        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#eca413] hover:text-black transition-all border-b border-white/5 last:border-0 group select-none cursor-pointer"
                                                                                    >
                                                                                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10">
                                                                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                                                        </div>
                                                                                        <div className="text-left">
                                                                                            <p className="text-sm font-serif italic">{item.name}</p>
                                                                                            <p className="text-[10px] uppercase font-bold opacity-60 group-hover:opacity-100">{item.color} • {item.type}</p>
                                                                                        </div>
                                                                                        <div className="ml-auto text-xs font-mono opacity-60 group-hover:opacity-100">₹{item.price_range}</div>
                                                                                    </button>
                                                                                ))}
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>
                                                                <div className="col-span-3">
                                                                    <input
                                                                        type="text"
                                                                        value={stone.colour}
                                                                        onChange={(e) => updateInputValue(floor.id, room.id, stone.id, 'colour', e.target.value)}
                                                                        placeholder="Finish details..."
                                                                        className="w-full custom-input px-4 py-4 rounded-lg text-sm text-slate-100"
                                                                    />
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <input
                                                                        type="number"
                                                                        value={stone.quantity}
                                                                        onChange={(e) => updateInputValue(floor.id, room.id, stone.id, 'quantity', e.target.value)}
                                                                        placeholder="0"
                                                                        className="w-full custom-input px-4 py-4 rounded-lg text-sm text-slate-100 text-center"
                                                                    />
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            value={stone.area}
                                                                            onChange={(e) => updateInputValue(floor.id, room.id, stone.id, 'area', e.target.value)}
                                                                            placeholder="0"
                                                                            className="w-full custom-input px-4 py-4 rounded-lg text-sm text-slate-100 text-center"
                                                                        />
                                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600 uppercase">ft²</span>
                                                                    </div>
                                                                </div>
                                                                <div className="col-span-1 flex justify-center gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            setVisualizingStone(stone);
                                                                            setVisualizingRoom(room.roomName);
                                                                        }}
                                                                        title={stone.name ? "AI Visualise" : "Select a stone to visualise"}
                                                                        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${stone.name ? 'text-[#eca413] hover:bg-[#eca413]/10' : 'text-slate-600 hover:text-slate-400 opacity-50'}`}
                                                                    >
                                                                        <Sparkles size={18} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => removeStone(floor.id, room.id, stone.id)}
                                                                        className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                                                    >
                                                                        <Trash2 size={20} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* Inline Add Material Button */}
                                                        <button
                                                            onClick={() => addStone(floor.id, room.id)}
                                                            className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#eca413] hover:text-[#eca413]/80 transition-colors font-bold mt-4 ml-2"
                                                        >
                                                            <Plus size={14} />
                                                            Add Material
                                                        </button>
                                                    </div>

                                                    {/* Room Actions */}
                                                    <div className="pt-6 flex gap-4 border-t border-white/5">
                                                        <button
                                                            onClick={() => addRoom(floor.id)}
                                                            className="flex items-center gap-2 px-6 py-3 glass-bronze rounded-lg text-[#eca413] text-sm font-medium hover:bg-[#eca413]/10 transition-all shadow-xl shadow-[#eca413]/5"
                                                        >
                                                            <Plus size={16} />
                                                            Add New Room
                                                        </button>
                                                        <button
                                                            onClick={() => duplicateRoom(floor.id, room)}
                                                            className="flex items-center gap-2 px-6 py-3 border border-white/10 rounded-lg text-slate-400 text-sm font-medium hover:bg-white/5 transition-all"
                                                        >
                                                            <Layers size={16} />
                                                            Duplicate Room
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                        </div>
                                    </motion.section>
                                ))}
                            </AnimatePresence>

                            {/* Add Floor Button */}
                            <div className="pt-12 border-t border-white/5">
                                <button
                                    onClick={addFloor}
                                    className="w-full py-8 glass-bronze rounded-xl flex items-center justify-center gap-4 group hover:bg-[#eca413]/10 transition-all shadow-2xl shadow-[#eca413]/5"
                                >
                                    <div className="w-10 h-10 rounded-full bg-[#eca413]/20 flex items-center justify-center text-[#eca413] border border-[#eca413]/20 transition-transform group-hover:scale-110">
                                        <Layers size={20} />
                                    </div>
                                    <span className="text-xl font-medium text-slate-100 tracking-wide font-serif italic">Add New Floor Requirement</span>
                                </button>
                            </div>

                            {/* Service Integration Upsells */}
                            <section className="bg-stone-900 border border-luxury-bronze/30 rounded-3xl p-8 mt-12 bg-gradient-to-r from-stone-900 to-stone-950 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Sparkles size={120} />
                                </div>
                                <h3 className="text-2xl font-serif text-luxury-cream mb-2 relative z-10">Maximize Value & Mitigate Risk</h3>
                                <p className="text-stone-400 text-sm mb-8 max-w-2xl relative z-10">Our institutional services integrate natively with your requirement draft. Opt-in below before saving.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                    {/* Auditing Toggle */}
                                    <div 
                                        onClick={() => setRequestAudit(!requestAudit)}
                                        className={`p-6 rounded-2xl border cursor-pointer transition-all flex gap-4 ${requestAudit ? 'border-luxury-bronze bg-luxury-bronze/10' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
                                    >
                                        <div className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 mt-1 ${requestAudit ? 'bg-luxury-bronze border-luxury-bronze/0' : 'border-stone-600'}`}>
                                            {requestAudit && <div className="w-3 h-3 bg-stone-950 rounded-sm" />}
                                        </div>
                                        <div>
                                            <h4 className="font-serif text-lg text-white mb-1">Add Stone Audit</h4>
                                            <p className="text-xs text-stone-400 leading-relaxed">Let our experts review this draft for quality risks and precise price benchmarking (₹5k - ₹25k). Highly recommended.</p>
                                        </div>
                                    </div>

                                    {/* Sourcing Toggle */}
                                    <div 
                                        onClick={() => setRequestSourcing(!requestSourcing)}
                                        className={`p-6 rounded-2xl border cursor-pointer transition-all flex gap-4 ${requestSourcing ? 'border-luxury-bronze bg-luxury-bronze/10' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
                                    >
                                        <div className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 mt-1 ${requestSourcing ? 'bg-luxury-bronze border-luxury-bronze/0' : 'border-stone-600'}`}>
                                            {requestSourcing && <div className="w-3 h-3 bg-stone-950 rounded-sm" />}
                                        </div>
                                        <div>
                                            <h4 className="font-serif text-lg text-white mb-1">Submit for Curated Sourcing</h4>
                                            <p className="text-xs text-stone-400 leading-relaxed">Submit these exact requirements to Stonevo for exclusive material shortlisting and robust negotiation.</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Footer */}
                        <footer className="mt-16 pt-12 border-t border-white/5 pb-12">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-8 opacity-40">
                                <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold">
                                    Stone Procurement Configurator v2.4.0 — Institutional Draft View
                                </p>
                                <div className="flex items-center gap-6">
                                    <a href="#" className="text-[10px] text-slate-500 hover:text-[#eca413] transition-colors uppercase tracking-widest font-bold">Privacy Policy</a>
                                    <a href="#" className="text-[10px] text-slate-500 hover:text-[#eca413] transition-colors uppercase tracking-widest font-bold">Contact Support</a>
                                </div>
                            </div>
                        </footer>
                    </main>
                </motion.div>
            </motion.div>

            <AIVisualizationModal
                isOpen={!!visualizingStone}
                onClose={() => setVisualizingStone(null)}
                stone={visualizingStone}
                roomName={visualizingRoom}
            />
        </AnimatePresence>,
        document.body
    );
};

export default StoneSelectionForm;
