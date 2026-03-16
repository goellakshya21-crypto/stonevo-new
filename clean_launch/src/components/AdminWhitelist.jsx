import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import * as xlsx from 'xlsx';
import { FileSpreadsheet, Upload, CheckCircle2, UserPlus, Search, Edit2, Trash2, X, Plus, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminWhitelist = () => {
    // Current Datastore State
    const [whitelist, setWhitelist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Upload & Parse State
    const [dragActive, setDragActive] = useState(false);
    const [parsedData, setParsedData] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    // Edit/Add Manual State
    const [editingPerson, setEditingPerson] = useState(null); // null means no edit, {} means new person, {...data} means edit existing
    const [formData, setFormData] = useState({ full_name: '', phone_number: '', role: 'architect' });

    useEffect(() => {
        fetchWhitelist();
    }, []);

    const fetchWhitelist = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('architect_whitelist')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setWhitelist(data || []);
        } catch (err) {
            console.error('Error fetching whitelist:', err);
        } finally {
            setLoading(false);
        }
    };

    // === EXCEL PARSING & UPLOAD LOGIC ===

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const workbook = xlsx.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

                const extracted = json.map((row, index) => {
                    // Fuzzy match common headers
                    const getVal = (possibleKeys) => {
                        const key = Object.keys(row).find(k => possibleKeys.some(pk => k.toLowerCase().includes(pk)));
                        return key ? String(row[key]).trim() : '';
                    };

                    const rawName = getVal(['name', 'full name', 'person']);
                    const rawPhone = getVal(['phone', 'mobile', 'contact', 'number']);
                    const rawRole = getVal(['role', 'type', 'profession']);

                    // Clean phone (keep only digits)
                    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

                    return {
                        _id: index, // temporary id for UI
                        full_name: rawName,
                        phone_number: cleanPhone,
                        role: rawRole.toLowerCase() === 'builder' ? 'builder' : 'architect',
                        isValid: rawName.length > 0 && cleanPhone.length === 10
                    };
                });

                setParsedData(extracted);
                setUploadSuccess(false);

            } catch (err) {
                console.error("Error parsing file:", err);
                alert("Failed to parse Excel file. Ensure it's a valid .xlsx or .csv format.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const clearPreview = () => {
        setParsedData([]);
        setUploadSuccess(false);
    };

    const handleBulkUpload = async () => {
        const validRecords = parsedData.filter(d => d.isValid).map(d => ({
            full_name: d.full_name,
            phone_number: d.phone_number,
            role: d.role
        }));

        if (validRecords.length === 0) return alert("No valid records found to upload.");

        setIsUploading(true);
        try {
            // Upsert records in bulk (Supabase supports passing an array)
            const { error } = await supabase
                .from('architect_whitelist')
                .upsert(validRecords, { onConflict: 'phone_number' });

            if (error) throw error;

            setUploadSuccess(true);
            setTimeout(() => {
                clearPreview();
                fetchWhitelist();
            }, 2000);
        } catch (err) {
            console.error('Error uploading to database:', err);
            alert('An error occurred while uploading. Some records may not have saved.');
        } finally {
            setIsUploading(false);
        }
    };


    // === MANUAL EDIT / ADD LOGIC ===

    const openEditModal = (person = null) => {
        if (person) {
            setFormData({ ...person });
        } else {
            setFormData({ full_name: '', phone_number: '', role: 'architect' });
        }
        setEditingPerson(person || {}); // Provide empty object to indicate "new"
    };

    const closeEditModal = () => {
        setEditingPerson(null);
        setFormData({ full_name: '', phone_number: '', role: 'architect' });
    };

    const handleManualSave = async (e) => {
        e.preventDefault();

        // Validation
        const cleanPhone = formData.phone_number.replace(/\D/g, '').slice(-10);
        if (cleanPhone.length !== 10) return alert("Phone number must be 10 digits.");
        if (!formData.full_name.trim()) return alert("Name is required.");

        try {
            const { error } = await supabase
                .from('architect_whitelist')
                .upsert({
                    phone_number: cleanPhone,
                    full_name: formData.full_name,
                    role: formData.role
                }, { onConflict: 'phone_number' });

            if (error) throw error;

            closeEditModal();
            fetchWhitelist();
        } catch (err) {
            console.error("Save Error:", err);
            alert("Failed to save record: " + (err.message || JSON.stringify(err)));
        }
    };

    const handleDelete = async (phone_number) => {
        if (!window.confirm("Are you sure you want to remove this person from the whitelist?")) return;

        try {
            const { error } = await supabase
                .from('architect_whitelist')
                .delete()
                .eq('phone_number', phone_number);

            if (error) throw error;
            fetchWhitelist();
        } catch (err) {
            console.error("Delete Error:", err);
            alert("Failed to delete record.");
        }
    };


    // === FILTERING ===
    const filteredWhitelist = whitelist.filter(person => {
        const q = searchQuery.toLowerCase();
        return (person.full_name || '').toLowerCase().includes(q) ||
            (person.phone_number || '').includes(q) ||
            (person.role || '').toLowerCase().includes(q);
    });


    return (
        <div className="space-y-12">

            {/* BULK UPLOAD SECTION */}
            <section className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
                <div className="mb-6">
                    <h2 className="text-xl font-serif text-stone-800 flex items-center gap-2">
                        <FileSpreadsheet className="text-bronze" size={24} />
                        Bulk Import Appraisals
                    </h2>
                    <p className="text-stone-500 text-sm mt-1">Upload a CSV or Excel file containing Name, Phone Number, and Role.</p>
                </div>

                {parsedData.length === 0 ? (
                    <div
                        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${dragActive ? 'border-bronze bg-bronze/5 scale-[1.02]' : 'border-stone-300 hover:border-stone-400 bg-stone-50'}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <Upload size={48} className={`mx-auto mb-4 ${dragActive ? 'text-bronze' : 'text-stone-400'}`} />
                        <h3 className="text-stone-700 font-medium mb-2">Drag and drop your spreadsheet here</h3>
                        <p className="text-stone-500 text-sm mb-6">Supports .xlsx and .csv files.</p>
                        <div className="relative inline-block">
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileInput}
                            />
                            <button className="px-6 py-2 border border-stone-300 bg-white shadow-sm rounded-lg text-sm text-stone-700 font-medium hover:bg-stone-50 transition-colors pointer-events-none">
                                Browse Files
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-stone-50 border border-stone-200 p-4 rounded-lg">
                            <div className="flex items-center gap-3">
                                {uploadSuccess ?
                                    <CheckCircle2 className="text-emerald-500" size={24} /> :
                                    <FileSpreadsheet className="text-bronze" size={24} />
                                }
                                <div>
                                    <p className="font-medium text-stone-800">
                                        {uploadSuccess ? 'Upload Complete!' : `${parsedData.length} records parsed`}
                                    </p>
                                    <p className="text-xs text-stone-500">
                                        {parsedData.filter(d => !d.isValid).length} invalid entries will be ignored.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={clearPreview} disabled={isUploading} className="text-xs font-semibold text-stone-500 hover:text-stone-800 uppercase tracking-widest disabled:opacity-50">Cancel</button>
                                <button
                                    onClick={handleBulkUpload}
                                    disabled={isUploading || uploadSuccess}
                                    className="px-6 py-2 bg-bronze text-white text-xs font-bold uppercase tracking-widest rounded shadow-md hover:bg-stone-900 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isUploading ? 'Uploading...' : uploadSuccess ? 'Done' : 'Push to Database'}
                                </button>
                            </div>
                        </div>

                        {/* Preview Table */}
                        <div className="border border-stone-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-stone-100 text-stone-600 text-xs uppercase tracking-wider sticky top-0 bg-white">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Name</th>
                                        <th className="px-6 py-4 font-semibold">Phone</th>
                                        <th className="px-6 py-4 font-semibold">Role</th>
                                        <th className="px-6 py-4 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {parsedData.map((row) => (
                                        <tr key={row._id} className={row.isValid ? 'bg-white' : 'bg-red-50/50'}>
                                            <td className="px-6 py-4 font-medium text-stone-800">{row.full_name || <span className="text-red-400 italic">Empty</span>}</td>
                                            <td className="px-6 py-4 font-mono text-stone-600">{row.phone_number || <span className="text-red-400 italic">Invalid</span>}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${row.role === 'builder' ? 'bg-stone-200 text-stone-700' : 'bg-bronze/10 text-bronze'}`}>
                                                    {row.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {row.isValid ? (
                                                    <span className="text-emerald-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={12} /> Valid</span>
                                                ) : (
                                                    <span className="text-red-500 text-xs font-bold flex items-center gap-1">Error</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>


            {/* DATABASE MANAGEMENT SECTION */}
            <section className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-serif text-stone-800 flex items-center gap-2">
                            <ShieldCheck className="text-bronze" size={24} /> // Assuming ShieldCheck isn't in scope, substitute it with UserPlus for icon variety, or import ShieldCheck
                            Whitelist Registry
                        </h2>
                        <p className="text-stone-500 text-sm mt-1">Manage approved access credentials.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search registry..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-stone-300 rounded-md text-sm focus:outline-none focus:border-bronze focus:ring-1 focus:ring-bronze w-64 bg-stone-50"
                            />
                        </div>
                        <button
                            onClick={() => openEditModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded text-[11px] font-bold uppercase tracking-widest hover:bg-bronze transition-colors"
                        >
                            <Plus size={14} /> Add Individual
                        </button>
                    </div>
                </div>

                <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-stone-50 text-stone-600 text-[10px] uppercase font-bold tracking-widest border-b border-stone-200">
                            <tr>
                                <th className="px-6 py-4">Professional</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Authorization</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-stone-500">Loading registry...</td>
                                </tr>
                            ) : filteredWhitelist.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-stone-500">No records found.</td>
                                </tr>
                            ) : (
                                filteredWhitelist.map((person) => (
                                    <tr key={person.phone_number} className="hover:bg-stone-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-stone-800">{person.full_name}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-mono text-stone-600 text-xs">{person.phone_number}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest ${person.role === 'builder' ? 'bg-stone-200 text-stone-700' : 'bg-bronze/10 text-bronze'}`}>
                                                {person.role || 'architect'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(person)}
                                                className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-200 rounded transition"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(person.phone_number)}
                                                className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                                title="Revoke Access"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* MODAL FOR ADD/EDIT */}
            <AnimatePresence>
                {editingPerson !== null && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm"
                            onClick={closeEditModal}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        >
                            <div className="flex justify-between items-center p-6 border-b border-stone-100">
                                <h3 className="text-xl font-serif text-stone-800">
                                    {editingPerson.phone_number ? 'Update Access' : 'Grant New Access'}
                                </h3>
                                <button onClick={closeEditModal} className="text-stone-400 hover:text-stone-800"><X size={20} /></button>
                            </div>

                            <form onSubmit={handleManualSave} className="p-6 space-y-5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full border border-stone-300 rounded-md py-2 px-3 text-sm text-stone-900 focus:outline-none focus:border-bronze focus:ring-1 focus:ring-bronze"
                                        value={formData.full_name}
                                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Phone Number (10 digits)</label>
                                    <input
                                        required
                                        type="tel"
                                        disabled={!!editingPerson.phone_number} // Can't edit primary key easily, they can delete and recreate
                                        className="w-full border border-stone-300 rounded-md py-2 px-3 text-sm text-stone-900 focus:outline-none focus:border-bronze focus:ring-1 focus:ring-bronze disabled:bg-stone-100 disabled:text-stone-500"
                                        value={formData.phone_number}
                                        onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Authorization Level</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                                            <input
                                                type="radio" name="role" value="architect"
                                                checked={formData.role === 'architect'}
                                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                                className="text-bronze focus:ring-bronze"
                                            />
                                            Architect / Designer
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                                            <input
                                                type="radio" name="role" value="builder"
                                                checked={formData.role === 'builder'}
                                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                                className="text-bronze focus:ring-bronze"
                                            />
                                            Builder / Contractor
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button type="button" onClick={closeEditModal} className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 uppercase tracking-widest">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-bronze text-white text-xs font-bold uppercase tracking-widest rounded shadow-md hover:bg-stone-900 transition-colors">
                                        Save Credentials
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminWhitelist;
