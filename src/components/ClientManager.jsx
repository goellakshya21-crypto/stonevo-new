import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { X, Users, UserPlus, Phone, Loader2, Trash2, Check, UserCheck, Link as LinkIcon, Pencil } from 'lucide-react';
import { useRequirements } from '../context/RequirementsContext';

const ClientManager = ({ isOpen, onClose }) => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [architectPhone, setArchitectPhone] = useState(null);
    const [newClient, setNewClient] = useState({ name: '', phone: '', address: '' });
    const [requests, setRequests] = useState([]);
    const [fetchingRequests, setFetchingRequests] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const { linkToClient, activeRoomId } = useRequirements();

    useEffect(() => {
        if (!isOpen) return;
        fetchArchitectData();
    }, [isOpen]);

    const fetchArchitectData = async () => {
        setLoading(true);
        try {
            const leadId = localStorage.getItem('stonevo_lead_id');
            if (!leadId) throw new Error("Not logged in");

            const { data: leadData } = await supabase.from('leads').select('phone').eq('id', leadId).single();
            if (leadData) {
                setArchitectPhone(leadData.phone);
                await Promise.all([
                    fetchClients(leadData.phone),
                    fetchRequests(leadData.phone)
                ]);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async (archPhone) => {
        try {
            const { data, error: fetchErr } = await supabase
                .from('client_whitelist')
                .select('*')
                .eq('architect_phone', archPhone);

            if (fetchErr) {
                if (fetchErr.code === '42P01') {
                     console.warn("Table client_whitelist does not exist yet.");
                     setClients([{ id: 'mock1', client_name: 'Mock Client (Admin Only)', phone_number: '9999999999' }]);
                } else {
                    throw fetchErr;
                }
            } else {
                const whitelist = data || [];
                // Enrich with client UUIDs so requirements linking works correctly
                if (whitelist.length > 0) {
                    const phones = whitelist.map(c => c.phone_number);
                    const { data: leadsData } = await supabase
                        .from('leads')
                        .select('id, phone')
                        .in('phone', phones)
                        .eq('status', 'approved');
                    const enriched = whitelist.map(c => ({
                        ...c,
                        lead_id: leadsData?.find(l => l.phone === c.phone_number)?.id || null
                    }));
                    setClients(enriched);
                } else {
                    setClients(whitelist);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchRequests = async (archPhone) => {
        setFetchingRequests(true);
        try {
            const { data } = await supabase
                .from('leads')
                .select('*')
                .eq('status', 'pending')
                .eq('company_name', `PENDING_REQUEST:${archPhone}`);
            setRequests(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setFetchingRequests(false);
        }
    };

    const handleAcceptRequest = async (req) => {
        try {
            // 1. Whitelist the client — get the new room UUID back
            const { data: newRoom, error: whitelistErr } = await supabase
                .from('client_whitelist')
                .insert([{
                    phone_number: req.phone,
                    architect_phone: architectPhone,
                    client_name: req.full_name
                }])
                .select('id')
                .single();

            if (whitelistErr) throw whitelistErr;

            // 2. Approve the lead AND stamp the room_id so the client can find it directly
            await supabase
                .from('leads')
                .update({
                    status: 'approved',
                    company_name: `Authorized by Architect`,
                    room_id: newRoom.id
                })
                .eq('id', req.id);

            await Promise.all([fetchClients(architectPhone), fetchRequests(architectPhone)]);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleRejectRequest = async (reqId) => {
        try {
            await supabase
                .from('leads')
                .update({ status: 'rejected' })
                .eq('id', reqId);
            await fetchRequests(architectPhone);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddClient = async (e) => {
        e.preventDefault();
        if (!architectPhone) return;
        
        const cleanPhone = newClient.phone.replace(/\D/g, '').slice(-10);
        if (cleanPhone.length < 10) {
            setError("Please enter a valid 10-digit number");
            return;
        }

        setAdding(true);
        setError('');

        try {
            // 1. Create the whitelist entry — get the new room UUID back
            const { data: newRoom, error: insErr } = await supabase
                .from('client_whitelist')
                .insert([{
                    phone_number: cleanPhone,
                    architect_phone: architectPhone,
                    client_name: newClient.name,
                    project_address: newClient.address
                }])
                .select('id')
                .single();

            if (insErr) {
                if (insErr.code === '42P01') throw new Error("Database table not created yet. Ask Administrator to create 'client_whitelist'.");
                throw insErr;
            }

            // 2. Stamp room_id on the client's leads record if they already exist
            await supabase
                .from('leads')
                .update({ room_id: newRoom.id })
                .eq('phone', cleanPhone);

            setNewClient({ name: '', phone: '', address: '' });
            await fetchClients(architectPhone);
        } catch (err) {
            setError(err.message);
        } finally {
            setAdding(false);
        }
    };

    const handleRenameClient = async (id) => {
        if (!editingName.trim()) return;
        try {
            await supabase.from('client_whitelist').update({ client_name: editingName.trim() }).eq('id', id);
            setEditingId(null);
            await fetchClients(architectPhone);
        } catch (err) {
            console.error('Failed to rename:', err);
        }
    };

    const handleRemoveClient = async (id) => {
        try {
            await supabase.from('client_whitelist').delete().eq('id', id);
            await fetchClients(architectPhone);
        } catch(err) {
            console.error("Failed to remove:", err);
        }
    };

    if (!isOpen) return null;

    console.log("Rendering ClientManager Portal...");

    return createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-stone-900 border border-white/10 w-full max-w-2xl rounded-2xl p-6 relative shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors">
                    <X size={20} />
                </button>
                
                <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
                    <div className="p-3 bg-[#eca413]/10 rounded-full">
                        <Users className="text-[#eca413]" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-serif text-white italic">Client Authorization Manager</h2>
                        <p className="text-stone-400 text-xs uppercase tracking-widest">Verify clients for Stonevo Access</p>
                    </div>
                </div>

                {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded">{error}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Requests & Current List */}
                    <div className="space-y-8">
                        {/* Incoming Requests Section */}
                        {requests.length > 0 && (
                            <div className="bg-[#eca413]/5 border border-[#eca413]/20 rounded-xl p-4">
                                <h3 className="text-xs font-bold text-[#eca413] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <UserCheck size={14} /> Incoming Requests ({requests.length})
                                </h3>
                                <div className="space-y-3">
                                    {requests.map(req => (
                                        <div key={req.id} className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/5">
                                            <div>
                                                <p className="text-white text-sm font-medium">{req.full_name || 'Anonymous'}</p>
                                                <p className="text-stone-500 text-[10px] font-mono">{req.phone}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handleAcceptRequest(req)}
                                                    className="p-1.5 bg-green-500/20 hover:bg-green-500/40 text-green-400 rounded-md transition-all"
                                                    title="Accept"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleRejectRequest(req.id)}
                                                    className="p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-md transition-all"
                                                    title="Reject"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Authorized Clients Section */}
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Authorized Clients</h3>
                            {loading ? (
                                <div className="flex items-center gap-2 text-stone-500 text-sm"><Loader2 className="animate-spin" size={16}/> Loading...</div>
                            ) : clients.length === 0 ? (
                                <p className="text-stone-500 text-sm italic">No clients authorized yet.</p>
                            ) : (
                                <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {clients.map(c => (
                                        <div key={c.id} className="p-3 bg-white/5 rounded-lg border border-white/5">
                                            {editingId === c.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        autoFocus
                                                        value={editingName}
                                                        onChange={e => setEditingName(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') handleRenameClient(c.id); if (e.key === 'Escape') setEditingId(null); }}
                                                        className="flex-1 bg-white/10 border border-bronze/40 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-bronze"
                                                    />
                                                    <button onClick={() => handleRenameClient(c.id)} className="shrink-0 p-1.5 bg-bronze/20 hover:bg-bronze text-bronze hover:text-white rounded transition-all"><Check size={14} /></button>
                                                    <button onClick={() => setEditingId(null)} className="shrink-0 p-1.5 bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white rounded transition-all"><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <div className="min-w-0 mr-2">
                                                        <div className="flex items-center gap-2 group/name">
                                                            <p className="text-white text-sm font-medium truncate">{c.client_name || 'Unnamed Client'}</p>
                                                            <button
                                                                onClick={() => { setEditingId(c.id); setEditingName(c.client_name || ''); }}
                                                                className="opacity-0 group-hover/name:opacity-100 transition-opacity text-stone-500 hover:text-bronze shrink-0"
                                                            >
                                                                <Pencil size={11} />
                                                            </button>
                                                        </div>
                                                        <p className="text-stone-400 text-xs font-mono">{c.phone_number}</p>
                                                        {c.project_address && <p className="text-stone-500 text-[10px] mt-0.5">{c.project_address}</p>}
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={() => { linkToClient(c.id, c.client_name); onClose(); }}
                                                            className={`p-2 rounded-md transition-all ${activeRoomId === c.id ? 'bg-bronze text-white' : 'bg-white/5 text-stone-400 hover:text-white hover:bg-white/10'}`}
                                                            title="Link this client's project"
                                                        >
                                                            <LinkIcon size={16} />
                                                        </button>
                                                        <button onClick={() => handleRemoveClient(c.id)} className="text-stone-500 hover:text-red-400 transition-colors p-2">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Add Section */}
                    <div className="bg-black/40 p-5 rounded-xl border border-white/5">
                        <h3 className="text-sm font-bold text-[#eca413] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <UserPlus size={16} /> Whitelist New Client
                        </h3>
                        <form onSubmit={handleAddClient} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] text-stone-400 uppercase tracking-widest">Client Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={newClient.name}
                                    onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-[#eca413] outline-none transition-colors"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-stone-400 uppercase tracking-widest">Phone Number (10 digit)</label>
                                <input 
                                    type="tel" 
                                    required 
                                    value={newClient.phone}
                                    onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                                    placeholder="e.g. 9876543210"
                                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-[#eca413] outline-none transition-colors font-mono"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-stone-400 uppercase tracking-widest">Project Address</label>
                                <textarea 
                                    value={newClient.address}
                                    onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                                    placeholder="e.g. Skyline Residency, Flat 402"
                                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-[#eca413] outline-none transition-colors h-20 resize-none"
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={adding}
                                className="w-full mt-4 bg-[#eca413] text-black font-bold uppercase tracking-widest text-xs py-3 rounded hover:bg-white transition-colors flex justify-center items-center gap-2"
                            >
                                {adding ? <Loader2 size={16} className="animate-spin" /> : 'Authorize Client'}
                            </button>
                            <p className="text-[9px] text-stone-500 tracking-wide mt-2">
                                Authorizing a phone number allows the client to register using your architectural credentials.
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ClientManager;
