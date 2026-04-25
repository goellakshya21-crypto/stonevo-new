import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useProjectChat } from '../hooks/useProjectChat';
import { X, Send, MessageCircle, CheckCheck, Paperclip, FileText } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Renders inline image, PDF card, or upload spinner
const FileMessage = ({ msg, isMine }) => {
    if (msg.isUploading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
                <div style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'sv-spin 0.8s linear infinite', color: isMine ? '#000' : '#A37D4B' }} />
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

const ChatPanel = ({ projectId, role, userName, onClose }) => {
    const { messages, isLoading, sendMessage, sendFile } = useProjectChat(projectId, role, userName);
    const [text, setText] = useState('');
    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const [nameMap, setNameMap] = useState({});

    useEffect(() => { inputRef.current?.focus(); }, []);
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

    const isMine = (msg) => msg.sender_name === userName;
    const isFileMsg = (msg) => !!(msg.file_type);
    const roleColor = (r) => r === 'architect' ? '#c49a3c' : (r === 'client' || r === 'builder') ? '#38bdf8' : '#34d399';
    const roleLabel = (r) => r === 'architect' ? 'Architect' : (r === 'client' || r === 'builder') ? 'Client' : 'Stonevo';

    return (
        <div style={{ position: 'fixed', bottom: 92, right: 24, zIndex: 2147483646, width: 360, height: 520, background: '#111110', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.7)' }}>
            {/* Header */}
            <div style={{ background: '#1a1917', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(163,125,75,0.2)', border: '1px solid rgba(163,125,75,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <span style={{ color: '#A37D4B', fontSize: 11, fontWeight: 700 }}>SV</span>
                        <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, background: '#34d399', borderRadius: '50%', border: '2px solid #1a1917' }} />
                    </div>
                    <div>
                        <p style={{ color: 'white', fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1 }}>Project Room</p>
                        <p style={{ color: '#786F60', fontSize: 10, margin: '3px 0 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {role === 'architect' ? 'Architect View' : role === 'admin' ? 'Admin View' : 'Client View'}
                        </p>
                    </div>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#786F60', padding: 6, display: 'flex', borderRadius: 8 }}>
                    <X size={16} />
                </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 4, background: '#0d0d0c' }}>
                {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <div style={{ width: 20, height: 20, border: '2px solid rgba(163,125,75,0.2)', borderTopColor: '#A37D4B', borderRadius: '50%', animation: 'sv-spin 0.8s linear infinite' }} />
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                        <MessageCircle size={32} color="#3a3530" />
                        <p style={{ color: '#574F44', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>No messages yet</p>
                    </div>
                ) : messages.map((msg, i) => (
                    <div key={msg.id || msg._optimisticId || i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine(msg) ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
                        <p style={{ color: roleColor(msg.sender_role), fontSize: 10, fontWeight: 700, margin: '0 0 3px 2px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            {resolveName(msg.sender_name)} · {roleLabel(msg.sender_role)}
                        </p>
                        <div style={{ maxWidth: '78%', padding: isFileMsg(msg) ? '4px' : '9px 14px', borderRadius: isMine(msg) ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMine(msg) ? '#A37D4B' : '#1e1d1b', color: isMine(msg) ? '#000' : '#e7e2d8', opacity: msg.isOptimistic ? 0.7 : 1, wordBreak: 'break-word', overflow: 'hidden' }}>
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

            {/* Input */}
            <form onSubmit={handleSend} style={{ background: '#1a1917', borderTop: '1px solid rgba(255,255,255,0.06)', padding: 12, display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                {/* Hidden file input */}
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />
                {/* Paperclip */}
                <button type="button" onClick={() => fileInputRef.current?.click()} title="Attach photo or PDF" style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Paperclip size={15} color="#786F60" />
                </button>
                <input
                    ref={inputRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
                    placeholder="Message..."
                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: 'white', outline: 'none', fontFamily: 'inherit' }}
                />
                <button type="submit" disabled={!text.trim()} style={{ width: 40, height: 40, borderRadius: 12, background: text.trim() ? '#A37D4B' : '#2a2723', border: 'none', cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Send size={16} color={text.trim() ? '#000' : '#574F44'} />
                </button>
            </form>

            <style>{`@keyframes sv-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

class PanelBoundary extends React.Component {
    constructor(props) { super(props); this.state = { err: null }; }
    static getDerivedStateFromError(e) { return { err: e }; }
    render() {
        if (this.state.err) return (
            <div style={{ position: 'fixed', bottom: 92, right: 24, zIndex: 2147483646, width: 320, padding: 20, background: '#1a1917', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 16, color: '#ef4444', fontSize: 12 }}>
                Chat error: {this.state.err.message}
            </div>
        );
        return this.props.children;
    }
}

const ProjectChat = ({ projectId, role, userName, isLinked }) => {
    const [open, setOpen] = useState(false);

    const ui = (
        <>
            <button
                onClick={() => setOpen(o => !o)}
                style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 2147483647, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 50, background: '#A37D4B', border: '2px solid rgba(255,255,255,0.6)', cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,0.8), 0 0 0 4px rgba(163,125,75,0.3)', color: '#000', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit' }}
            >
                {open ? <X size={18} color="#000" /> : <MessageCircle size={18} color="#000" />}
                {!open && 'Project Room'}
            </button>

            {open && !isLinked ? (
                <div style={{ position: 'fixed', bottom: 92, right: 28, zIndex: 2147483646, width: 300, padding: '24px 20px', background: '#1a1917', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.7)', textAlign: 'center' }}>
                    <MessageCircle size={28} color="#A37D4B" style={{ margin: '0 auto 12px' }} />
                    {role === 'architect' ? (
                        <>
                            <p style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>No client linked</p>
                            <p style={{ color: '#786F60', fontSize: 11, lineHeight: 1.5, margin: 0 }}>Use the <strong style={{ color: '#A37D4B' }}>Switch Client</strong> dropdown in the header to link to a client's project room.</p>
                        </>
                    ) : (
                        <>
                            <p style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>No project room yet</p>
                            <p style={{ color: '#786F60', fontSize: 11, lineHeight: 1.5, margin: 0 }}>Your project room will be available once your architect links you to a project.</p>
                        </>
                    )}
                </div>
            ) : open && (
                <PanelBoundary>
                    <ChatPanel
                        projectId={projectId}
                        role={role}
                        userName={userName}
                        onClose={() => setOpen(false)}
                    />
                </PanelBoundary>
            )}
        </>
    );

    return createPortal(ui, document.body);
};

export default ProjectChat;
