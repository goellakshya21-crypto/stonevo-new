import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminUpload from '../components/AdminUpload';
import AdminWhitelist from '../components/AdminWhitelist';
import AdminChatRooms from '../components/AdminChatRooms';

function AdminPage() {
    console.log('AdminPage rendering...');
    const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'whitelist'

    return (
        <div className="min-h-screen bg-stone-100 font-sans selection:bg-stone-200 relative">
            <div className="absolute top-0 left-0 bg-red-500 text-white text-[8px] z-[999] px-1 pointer-events-none">ADMIN_LOADED_BOOTSTRAP</div>
            {/* Admin Header */}
            <header className="bg-stone-900 text-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-white rounded-none transform rotate-45"></div>
                        <h1 className="text-lg font-serif font-bold tracking-widest text-white uppercase italic">Stonevo Intelligence</h1>
                        <span className="hidden md:inline px-2 py-0.5 bg-stone-700 text-[10px] rounded text-stone-300 font-medium tracking-widest uppercase ml-2">Internal Portal</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/" className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-white transition-colors">View Public Site</Link>
                    </div>
                </div>
            </header>

            {/* Management Content */}
            <main className="max-w-6xl mx-auto px-4 py-12">
                <div className="mb-8 border-l-4 border-stone-900 pl-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-serif font-bold text-stone-800">Operational Management</h2>
                        <p className="text-stone-500 text-sm mt-1">High-accuracy stone analysis and inventory ingestion pipeline.</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center space-x-2 bg-stone-200/50 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('inventory')}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-md ${activeTab === 'inventory' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                        >
                            Stone Inventory
                        </button>
                        <button
                            onClick={() => setActiveTab('whitelist')}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-md ${activeTab === 'whitelist' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                        >
                            Whitelist Registry
                        </button>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-md ${activeTab === 'chat' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                        >
                            Project Rooms
                        </button>
                    </div>
                </div>

                {activeTab === 'inventory' ? (
                    <div className="border-2 border-dashed border-stone-200 p-4 min-h-[400px]">
                        <AdminUpload onCancel={() => { }} />
                    </div>
                ) : activeTab === 'whitelist' ? (
                    <div className="border-2 border-dashed border-bronze/20 p-4 min-h-[400px]">
                        <AdminWhitelist />
                    </div>
                ) : (
                    <AdminChatRooms />
                )}
            </main>

            <footer className="py-8 bg-stone-200 text-stone-500 text-[10px] text-center uppercase tracking-[0.2em]">
                Stonevo Intelligence Group • Precise • Architectural • Intelligent
            </footer>
        </div>
    );
}

export default AdminPage;
