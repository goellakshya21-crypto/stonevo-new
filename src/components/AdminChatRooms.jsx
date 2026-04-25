import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProjectChat } from '../hooks/useProjectChat';
import { Send, MessageCircle, CheckCheck, Paperclip, FileText } from 'lucide-react';

const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Renders inline image, PDF card, or upload spinner
const FileMessage = ({ msg, isMine }) => {
    if (msg.isUploading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
                <div style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'acr-spin 0.8s linear infinite', color: isMine ? '#000' : '#A37D4B' }} />
                <span style={{ fontSize: 12, color: isMine ? '#000' : '#786F60' }}>Uploading…</span>
            </div>
        );
    }
    if (msg.file_type === 'image' && msg.file_url) {
        return (
            <a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: 10, overflow: 'hidden', lineHeight: 0 }}>
                <img src={msg.file_url} alt={msg.file_name || 'image'} style={{ display: 'block', maxWidth: 240, maxHeight: 200, width: '100%', objectFit: 'cover', borderRadius: 10 }} />
            </a>
        );
    }
    if (msg.file_type === 'pdf' && msg.file_url) {
        return (
            <a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: isMine ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.05)', borderRadius: 10, textDecoration: 'none', border: isMine ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.08)' }}>
                <FileText size={26} color={isMine ? '#000' : '#A37D4B'} style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: isMine ? '#000' : '#e7e2d8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{msg.file_name}</p>
                    <p style={{ fontSize: 10, color: isMine ? 'rgba(0,0,0,0.55)' : '#786F60', margin: '2px 0 0' }}>PDF · Tap to open</p>
                </div>
            </a>
        );
    }
    return null;
};

const InlineChat = ({ projectId, roomLabel }) => {
    const { messages, isLoading, sendMessage, sendFile } = useProjectChat(projectId, 'admin', 'Stonevo Team');
    const [text, setText] = useState('');
    const scrollRef = useRef(null);
    const fileInputRef = useRef(null);
    const [nameMap, setNameMap] = useState({});

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    // Resolve phone-number sender_names → real names from leads + architect_whitelist
    useEffect(() => {
        if (!messages.length) return;
        const phones = [...new Set(
            messages.map(m => m.sender_name?.replace(/\D/g, '').slice(-10)).filter(p => p?.length >= 7)
        )];
        if (!phones.length) return;
        // Use ilike %phone so "545678345" matches "9545678345" in DB (country-code safe)
        const clientFilter = phones.map(p => `phone.ilike.%${p}`).join(',');
        const archFilter   = phones.map(p => `phone_number.ilike.%${p}`).join(',');
        Promise.all([
            supabase.from('leads').select('phone, full_name').or(clientFilter),
            supabase.from('architect_whitelist').select('phone_number, full_name').or(archFilter),
        ]).then(([{ data: clientData }, { data: archData }]) => {
            const map = {};
            // Normalize stored phone to last-10 digits as the map key
            clientData?.forEach(l => {
                if (l.full_name && l.phone) map[l.phone.replace(/\D/g, '').slice(-10)] = l.full_name;
            });
            archData?.forEach(a => {
                if (a.full_name && a.phone_number) map[a.phone_number.replace(/\D/g, '').slice(-10)] = a.full_name;
            });
            setNameMap(prev => ({ ...prev, ...map }));
        });
    }, [messages.length]);

    const resolveName = (raw) => {
        if (!raw) return raw;
        const digits = raw.replace(/\D/g, '').slice(-10);
        return (digits.length >= 7 && nameMap[digits]) ? nameMap[digits] : raw;
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (text.trim()) { sendMessage(text.trim()); setText(''); }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) { sendFile(file); e.target.value = ''; }
    };

    const isMine = (msg) => msg.sender_name === 'Stonevo Team';
    const isFileMsg = (msg) => !!(msg.file_type);
    const roleColor = (r) => r === 'architect' ? '#c49a3c' : (r === 'client' || r === 'builder') ? '#38bdf8' : '#34d399';
    const roleLabel = (r) => r === 'architect' ? 'Architect' : (r === 'client' || r === 'builder') ? 'Client' : 'Stonevo';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 4, background: '#0d0d0c' }}>
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-5 h-5 border-2 border-stone-700 border-t-stone-400 rounded-full animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                        <MessageCircle size={28} color="#3a3530" />
                        <p style={{ color: '#574F44', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>No messages yet in this room</p>
                    </div>
                ) : messages.map((msg, i) => (
                    <div key={msg.id || msg._optimisticId || i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine(msg) ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
                        <p style={{ color: roleColor(msg.sender_role), fontSize: 10, fontWeight: 700, margin: '0 0 3px 2px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            {resolveName(msg.sender_name)} · {roleLabel(msg.sender_role)}
                        </p>
                        <div style={{ maxWidth: '78%', padding: isFileMsg(msg) ? '4px' : '9px 14px', borderRadius: isMine(msg) ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMine(msg) ? '#A37D4B' : '#1e1d1b', color: isMine(msg) ? '#000' : '#e7e2d8', wordBreak: 'break-word', overflow: 'hidden', opacity: msg.isOptimistic ? 0.7 : 1 }}>
                            {isFileMsg(msg)
                                ? <FileMessage msg={msg} isMine={isMine(msg)} />
                                : <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>{msg.message}</p>
                            }
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, padding: '0 4px', flexDirection: isMine(msg) ? 'row-reverse' : 'row' }}>
                            <span style={{ color: '#574F44', fontSize: 9 }}>{formatTime(msg.created_at)}</span>
                            {isMine(msg) && !msg.isOptimistic && <CheckCheck size={11} color="#A37D4B" style={{ opacity: 0.7 }} />}
                        </div>
                    </div>
                ))}
            </div>
            <form onSubmit={handleSend} style={{ background: '#1a1917', borderTop: '1px solid rgba(255,255,255,0.06)', padding: 12, display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                {/* Hidden file input */}
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />
                {/* Paperclip */}
                <button type="button" onClick={() => fileInputRef.current?.click()} title="Attach photo or PDF" style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Paperclip size={15} color="#786F60" />
                </button>
                <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
                    placeholder={`Message ${roomLabel}...`}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: 'white', outline: 'none', fontFamily: 'inherit' }}
                />
                <button type="submit" disabled={!text.trim()} style={{ width: 40, height: 40, borderRadius: 12, background: text.trim() ? '#A37D4B' : '#2a2723', border: 'none', cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Send size={16} color={text.trim() ? '#000' : '#574F44'} />
                </button>
            </form>
            <style>{`@keyframes acr-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

const AdminChatRooms = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        const fetchRooms = async () => {
            setLoading(true);
            try {
                // Each client_whitelist row = one group (architect + client + admin)
                // Room ID = pair.id (the whitelist record UUID), shared by all three parties
                const { data: pairs, error } = await supabase
                    .from('client_whitelist')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) { console.error('Rooms fetch error:', error); setLoading(false); return; }
                if (!pairs?.length) { setRooms([]); setLoading(false); return; }

                const clientPhones = [...new Set(pairs.map(p => p.phone_number))];
                const archPhones   = [...new Set(pairs.map(p => p.architect_phone))];

                const [{ data: clientLeads }, { data: archList }] = await Promise.all([
                    supabase.from('leads').select('phone, full_name').in('phone', clientPhones),
                    supabase.from('architect_whitelist').select('phone_number, full_name').in('phone_number', archPhones),
                ]);

                const enriched = pairs.map(p => ({
                    roomId: p.id,
                    clientName:    clientLeads?.find(l => l.phone === p.phone_number)?.full_name || p.client_name,
                    clientPhone:   p.phone_number,
                    architectName: archList?.find(a => a.phone_number === p.architect_phone)?.full_name || p.architect_phone,
                    projectAddress: p.project_address,
                }));

                setRooms(enriched);
            } catch (err) {
                console.error('AdminChatRooms error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchRooms();
    }, []);

    return (
        <div className="flex rounded-xl overflow-hidden border border-stone-200" style={{ height: 600 }}>
            {/* Sidebar */}
            <div className="w-72 flex-shrink-0 border-r border-stone-200 bg-white flex flex-col">
                <div className="px-4 py-3 border-b border-stone-100">
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-600">Active Project Rooms</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">All parties share one room per client</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="w-5 h-5 border-2 border-stone-200 border-t-stone-500 rounded-full animate-spin" />
                        </div>
                    ) : rooms.length === 0 ? (
                        <div className="p-4 text-center">
                            <p className="text-stone-400 text-xs">No active project rooms yet.</p>
                            <p className="text-stone-300 text-[10px] mt-1">Rooms appear once a client saves requirements.</p>
                        </div>
                    ) : rooms.map(r => (
                        <button
                            key={r.roomId}
                            onClick={() => setSelected(r)}
                            className={`w-full text-left px-4 py-3 border-b border-stone-50 hover:bg-stone-50 transition-colors ${selected?.roomId === r.roomId ? 'bg-stone-100 border-l-2 border-l-amber-600' : ''}`}
                        >
                            <p className="text-sm font-medium text-stone-800 truncate">{r.clientName}</p>
                            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide mt-0.5 truncate">with {r.architectName}</p>
                            {r.projectAddress && <p className="text-[10px] text-stone-400 mt-0.5 truncate">{r.projectAddress}</p>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat panel */}
            <div className="flex-1 flex flex-col" style={{ background: '#111110' }}>
                {selected ? (
                    <>
                        <div style={{ background: '#1a1917', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(163,125,75,0.2)', border: '1px solid rgba(163,125,75,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: '#A37D4B', fontSize: 12, fontWeight: 700 }}>{selected.clientName[0]?.toUpperCase()}</span>
                            </div>
                            <div>
                                <p style={{ color: 'white', fontSize: 14, fontWeight: 600, margin: 0 }}>{selected.clientName}</p>
                                <p style={{ color: '#786F60', fontSize: 10, margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    Client · {selected.clientPhone} &nbsp;·&nbsp; Arch · {selected.architectName}
                                </p>
                            </div>
                        </div>
                        <InlineChat projectId={selected.roomId} roomLabel={selected.clientName} />
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <MessageCircle size={36} color="#3a3530" />
                        <p style={{ color: '#574F44', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Select a room to chat</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminChatRooms;
