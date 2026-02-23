import React from 'react';
import { Link } from 'react-router-dom';
import AdminUpload from '../components/AdminUpload';

function AdminPage() {
    return (
        <div className="min-h-screen bg-stone-100 font-sans selection:bg-stone-200">
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
                <div className="mb-8 border-l-4 border-stone-900 pl-4">
                    <h2 className="text-3xl font-serif font-bold text-stone-800">Operational Management</h2>
                    <p className="text-stone-500 text-sm mt-1">High-accuracy stone analysis and inventory ingestion pipeline.</p>
                </div>

                <AdminUpload onCancel={() => { }} />
            </main>

            <footer className="py-8 bg-stone-200 text-stone-500 text-[10px] text-center uppercase tracking-[0.2em]">
                Stonevo Intelligence Group • Precise • Architectural • Intelligent
            </footer>
        </div>
    );
}

export default AdminPage;
