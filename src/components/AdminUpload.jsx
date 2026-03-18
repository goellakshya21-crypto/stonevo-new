import React, { useState, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BatchProcessor } from '../utils/batchProcessor';
import { exportToJSON, exportToCSV, exportRawData } from '../utils/exportHelpers';
import { supabase } from '../lib/supabaseClient';
import { compressImage } from '../utils/imageOptimizer';
import AdminLeads from './AdminLeads';
import { Users, Package, Shield, FolderOpen } from 'lucide-react';

const AdminUpload = ({ onCancel }) => {
    const [apiKey, setApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '');
    const [backupLoading, setBackupLoading] = useState(false);
    const [batchMode, setBatchMode] = useState(false);
    const [adminTab, setAdminTab] = useState('inventory'); // 'inventory', 'leads'

    const handleMasterBackup = async () => {
        setBackupLoading(true);
        try {
            const { data, error } = await supabase.from('stones').select('*');
            if (error) throw error;
            exportRawData(data, 'stonevo-master-backup');
        } catch (err) {
            console.error("Backup failed:", err);
            alert("Backup failed: " + err.message);
        } finally {
            setBackupLoading(false);
        }
    };

    // Single image mode state
    const [image, setImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [isCompressing, setIsCompressing] = useState(false);

    // Batch mode state
    const [selectedImages, setSelectedImages] = useState([]);
    const [batchResults, setBatchResults] = useState([]);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, status: 'idle' });
    const [processor, setProcessor] = useState(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [mappingMode, setMappingMode] = useState(true);
    const [activeMapping, setActiveMapping] = useState({ category: 'application', value: 'Flooring' });

    const fileInputRef = useRef(null);

    const getOptionsForCategory = (category) => {
        const unspecified = { value: '', label: '— Unspecified —' };
        switch (category) {
            case 'marble': return [
                unspecified,
                { value: 'Dolomite', label: 'Dolomite' },
                { value: 'Marble', label: 'Marble' },
                { value: 'Sandstones & Limestone', label: 'Sandstones & Limestone' },
                { value: 'Semi-Precious', label: 'Semi-Precious' },
                { value: 'Granite & Quartzite', label: 'Granite & Quartzite' }
            ];
            case 'color': return [
                unspecified,
                { value: 'Beige', label: 'Beige' }, { value: 'Black', label: 'Black' }, { value: 'Blue', label: 'Blue' },
                { value: 'Brown', label: 'Brown' }, { value: 'Cream', label: 'Cream' }, { value: 'Golden', label: 'Golden' },
                { value: 'Green', label: 'Green' }, { value: 'Grey', label: 'Grey' }, { value: 'Multi tone', label: 'Multi tone' },
                { value: 'Peach', label: 'Peach' }, { value: 'Pink', label: 'Pink' }, { value: 'Purple', label: 'Purple' },
                { value: 'Red', label: 'Red' }, { value: 'White', label: 'White' }, { value: 'Yellow', label: 'Yellow' }
            ];
            case 'finish': return [
                unspecified,
                { value: 'Polished', label: 'Polished' }, { value: 'Leather', label: 'Leather' },
                { value: 'Honed', label: 'Honed' }, { value: 'Flamed', label: 'Flamed' }, { value: 'Backlit', label: 'Backlit' }
            ];
            case 'price_range':
            case 'priceRange': return [
                unspecified,
                { value: 'Value', label: 'Value' }, { value: 'Core', label: 'Core' },
                { value: 'Premium', label: 'Premium' }, { value: 'Elite', label: 'Elite' }
            ];
            case 'application': return [
                unspecified,
                { value: 'Flooring', label: 'Flooring' }, { value: 'Washroom', label: 'Washroom' },
                { value: 'Feature Wall', label: 'Feature Wall' }, { value: 'Counter Top', label: 'Counter Top' },
                { value: 'Outdoor', label: 'Outdoor' }, { value: 'Façade', label: 'Façade' }
            ];
            case 'pattern': return [
                unspecified,
                { value: 'Linear Vien', label: 'Linear Vien' }, { value: 'Cloudy', label: 'Cloudy' },
                { value: 'Fossil', label: 'Fossil' }, { value: 'Mosiac', label: 'Mosiac' },
                { value: 'Concentric', label: 'Concentric' }, { value: 'Dramatic', label: 'Dramatic' },
                { value: 'Minimal Vien', label: 'Minimal Vien' }, { value: 'Mettalic Vien', label: 'Mettalic Vien' }
            ];
            case 'temperature': return [
                unspecified,
                { value: 'Warm', label: 'Warm' }, { value: 'Cool', label: 'Cool' }, { value: 'Neutral', label: 'Neutral' }
            ];
            default: return [];
        }
    };

    const getFirstOption = (category) => {
        const options = getOptionsForCategory(category);
        return options.length > 0 ? options[0].value : '';
    };

    const cleanFileName = (file) => {
        if (!file) return "";
        // Remove extension
        let name = file.name.replace(/\.[^/.]+$/, "");
        // Replace underscores and hyphens with spaces
        name = name.replace(/[_-]/g, " ");
        // Title case
        return name.split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setResult(null);
            setError(null);
        }
    };

    const handleBatchImageChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedImages(files);
        setBatchResults([]);
        setError(null);
    };

    const fileToGenerativePart = async (file) => {
        const base64EncodedDataPromise = new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
        });
        return {
            inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
        };
    };

    // --- Array helpers for multi-value fields ---
    const toArr = (v) => Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []);
    const mergeArr = (a, b) => [...new Set([...toArr(a), ...toArr(b)])].filter(Boolean);

    // Pill-style multi-select for physical property fields
    const FieldPills = ({ category, values, onChange, compact = false }) => {
        const arr = toArr(values);
        return (
            <div className="flex flex-wrap gap-1 mt-0.5">
                {getOptionsForCategory(category).filter(o => o.value).map(opt => {
                    const active = arr.includes(opt.value);
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => onChange(opt.value)}
                            className={`px-2 py-0.5 rounded border transition-all ${
                                compact ? 'text-[9px]' : 'text-[10px]'
                            } font-medium ${
                                active
                                    ? 'bg-stone-900 text-white border-stone-900'
                                    : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'
                            }`}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>
        );
    };

    const handleFieldChange = (field, value, isPhysical = false) => {
        setResult(prev => {
            if (isPhysical) {
                const current = toArr(prev.physical_properties[field]);
                const updated = current.includes(value)
                    ? current.filter(v => v !== value)
                    : [...current, value];
                return {
                    ...prev,
                    physical_properties: { ...prev.physical_properties, [field]: updated }
                };
            }
            return { ...prev, [field]: value };
        });
    };

    const handleBatchFieldChange = (idx, field, value, isPhysical = false) => {
        setBatchResults(prev => {
            const newResults = [...prev];
            const item = { ...newResults[idx] };
            const data = { ...item.data };

            if (isPhysical) {
                const current = toArr(data.physical_properties?.[field]);
                const updated = current.includes(value)
                    ? current.filter(v => v !== value)
                    : [...current, value];
                data.physical_properties = { ...data.physical_properties, [field]: updated };
            } else {
                data[field] = value;
            }

            item.data = data;
            newResults[idx] = item;
            return newResults;
        });
    };

    const handleAnalyze = async () => {
        if (!apiKey) {
            setError("Please enter your Google Gemini API Key.");
            return;
        }
        if (!image) {
            setError("Please select an image.");
            return;
        }

        setLoading(true);
        setError(null);

        const extractedName = cleanFileName(image);

        try {
            // Check if stone exists first to save tokens
            const { data: existingStone } = await supabase
                .from('stones')
                .select('*')
                .eq('name', extractedName)
                .maybeSingle();

            if (existingStone) {
                setResult({
                    name: extractedName,
                    description: existingStone.description,
                    tags: existingStone.tags,
                    physical_properties: {
                        marble: toArr(existingStone.type),
                        finish: toArr(existingStone.finish),
                        color: toArr(existingStone.color),
                        temperature: toArr(existingStone.temperature),
                        application: toArr(existingStone.application),
                        pattern: toArr(existingStone.pattern),
                        priceRange: toArr(existingStone.price_range),
                        ...(mappingMode ? { [activeMapping.category]: mergeArr(existingStone[activeMapping.category === 'marble' ? 'type' : activeMapping.category === 'priceRange' ? 'price_range' : activeMapping.category], [activeMapping.value]) } : {})
                    },
                    isExisting: true
                });
                setLoading(false);
                return;
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const imagePart = await fileToGenerativePart(image);

            const appInstruction = mappingMode
                ? `THIS IS FOR ${activeMapping.value.toUpperCase()}.`
                : 'Intended Application (Flooring, Bathroom, Countertop, Wall Cladding, or Exterior)';

            const prompt = `Analyze this stone image (Name: ${extractedName}) for an architectural database. 
            ${appInstruction}
            Return ONLY a raw JSON object (no markdown formatting) with the following structure:
            {
                "description": "A short, elegant architectural description of the stone's appearance, veining, and character (max 2 sentences). It should match the character of a stone named ${extractedName}.",
                "tags": ["tag1", "tag2", "tag3", "etc"] 
            }`;

            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonResult = JSON.parse(cleanedText);

            // Merge with Mapping Mode context if enabled
            const finalResult = {
                name: extractedName,
                ...jsonResult,
                physical_properties: {
                    marble: [],
                    finish: [],
                    color: [],
                    temperature: [],
                    application: [],
                    pattern: [],
                    priceRange: [],
                    ...(mappingMode ? { [activeMapping.category]: [activeMapping.value] } : {})
                },
                isExisting: false
            };

            setResult(finalResult);
        } catch (err) {
            console.error("AI Error:", err);
            let errorMessage = err.message;

            if (errorMessage.includes("429")) {
                errorMessage = "⏱️ Rate Limit Hit! Please wait 60 seconds and try again. (Free tier has very low limits)";
            } else if (errorMessage.includes("404")) {
                errorMessage = "❌ Model Not Found. This shouldn't happen - please refresh and try again.";
            } else {
                errorMessage = `Error: ${errorMessage}`;
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const performStoneSave = async (stoneData, imageFile, skipStatusUpdate = false) => {
        if (!stoneData.name) throw new Error("Stone name is required.");
        
        if (!skipStatusUpdate) {
            setSaveLoading(true);
            setSaveSuccess(false);
            setError(null);
            setIsCompressing(false);
        }

        try {
            // 1. Check if stone already exists in database by name
            const { data: existingStone, error: checkError } = await supabase
                .from('stones')
                .select('*')
                .eq('name', stoneData.name)
                .maybeSingle();

            if (checkError) throw checkError;

            let publicUrl = existingStone?.image_url;

            // 2. If it's a new stone, upload image to Storage
            if (!existingStone) {
                if (!skipStatusUpdate) setIsCompressing(true);
                const optimizedFile = await compressImage(imageFile);
                if (!skipStatusUpdate) setIsCompressing(false);

                const fileExt = optimizedFile.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('marble-images')
                    .upload(filePath, optimizedFile, {
                        contentType: optimizedFile.type,
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl: url } } = supabase.storage
                    .from('marble-images')
                    .getPublicUrl(filePath);

                publicUrl = url;
            }

            // 3. Prepare payload for UPSERT — merge arrays, never overwrite
            const getMappingArr = (uiField) =>
                mappingMode && activeMapping.category === uiField ? [activeMapping.value] : [];

            const payload = {
                name: stoneData.name,
                lot_type: stoneData.lot_type || existingStone?.lot_type || 'premium',
                lot_size_sqft: stoneData.lot_size_sqft || existingStone?.lot_size_sqft || 0,
                vendor_address: stoneData.vendor_address || existingStone?.vendor_address || '',
                type: mergeArr(mergeArr(stoneData.physical_properties?.marble, existingStone?.type), getMappingArr('marble')),
                application: mergeArr(mergeArr(stoneData.physical_properties?.application, existingStone?.application), getMappingArr('application')),
                finish: mergeArr(mergeArr(stoneData.physical_properties?.finish, existingStone?.finish), getMappingArr('finish')),
                color: mergeArr(mergeArr(stoneData.physical_properties?.color, existingStone?.color), getMappingArr('color')),
                pattern: mergeArr(mergeArr(stoneData.physical_properties?.pattern, existingStone?.pattern), getMappingArr('pattern')),
                temperature: mergeArr(mergeArr(stoneData.physical_properties?.temperature, existingStone?.temperature), getMappingArr('temperature')),
                price_range: mergeArr(mergeArr(stoneData.physical_properties?.priceRange, existingStone?.price_range), getMappingArr('priceRange')),
                description: existingStone?.description || stoneData.description || '',
                tags: existingStone?.tags || stoneData.tags || [],
                image_url: publicUrl || '',
                original_filename: imageFile.name
            };

            let dbResponse;
            if (existingStone) {
                dbResponse = await supabase
                    .from('stones')
                    .update(payload)
                    .eq('id', existingStone.id);
            } else {
                dbResponse = await supabase
                    .from('stones')
                    .insert([payload]);
            }

            if (dbResponse.error) throw dbResponse.error;

            if (!skipStatusUpdate) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
            return { success: true };
        } catch (err) {
            console.error("Save Error:", err);
            if (!skipStatusUpdate) setError(`Save failed: ${err.message}`);
            throw err;
        } finally {
            if (!skipStatusUpdate) {
                setSaveLoading(false);
                setIsCompressing(false);
            }
        }
    };

    const handleSaveToSupabase = async (stoneData, imageFile) => {
        try {
            await performStoneSave(stoneData, imageFile);
        } catch (err) {
            // Error is handled in performStoneSave
        }
    };

    const handleSaveBatchItem = async (idx) => {
        const result = batchResults[idx];
        if (!result.success || result.isSorted) return;

        setBatchResults(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], isSaving: true, saveError: null };
            return next;
        });

        try {
            await performStoneSave(result.data, result.image, true);
            setBatchResults(prev => {
                const next = [...prev];
                next[idx] = { ...next[idx], isSaving: false, isSorted: true };
                return next;
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false),3000);
        } catch (err) {
            setBatchResults(prev => {
                const next = [...prev];
                next[idx] = { ...next[idx], isSaving: false, saveError: err.message };
                return next;
            });
        }
    };

    const handleSaveAllBatch = async () => {
        setSaveLoading(true);
        setError(null);
        let completed = 0;
        const total = batchResults.filter(r => r.success).length;

        try {
            for (let i = 0; i < batchResults.length; i++) {
                const result = batchResults[i];
                if (!result.success || result.isSorted) continue;

                // Update individual item status to 'saving'
                setBatchResults(prev => {
                    const next = [...prev];
                    next[i] = { ...next[i], isSaving: true };
                    return next;
                });

                try {
                    await performStoneSave(result.data, result.image, true);
                    
                    // Update individual item status to 'saved'
                    setBatchResults(prev => {
                        const next = [...prev];
                        next[i] = { ...next[i], isSaving: false, isSorted: true };
                        return next;
                    });
                    completed++;
                } catch (err) {
                    setBatchResults(prev => {
                        const next = [...prev];
                        next[i] = { ...next[i], isSaving: false, saveError: err.message };
                        return next;
                    });
                }
            }
            
            if (completed > 0) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch (err) {
            setError(`Bulk save failed: ${err.message}`);
        } finally {
            setSaveLoading(false);
        }
    };

    const handleBatchProcess = async () => {
        if (!apiKey) {
            setError("Please enter your Google Gemini API Key.");
            return;
        }
        if (selectedImages.length === 0) {
            setError("Please select at least one image.");
            return;
        }

        setBatchProgress({ current: 0, total: selectedImages.length, status: 'processing' });
        setBatchResults([]);
        setError(null);

        const batchProcessor = new BatchProcessor(
            apiKey,
            supabase, // Pass supabase client
            (progress) => {
                setBatchProgress(progress);
                if (progress.result) {
                    // Enrich result with current mapping context before showing to user
                    const existingProps = progress.result.data.physical_properties || {};
                    const enrichedResult = {
                        ...progress.result.data,
                        name: cleanFileName(progress.result.optimizedFile), // Force name from filename
                        physical_properties: {
                            marble: toArr(existingProps.marble),
                            finish: toArr(existingProps.finish),
                            color: toArr(existingProps.color),
                            temperature: toArr(existingProps.temperature),
                            application: toArr(existingProps.application),
                            pattern: toArr(existingProps.pattern),
                            priceRange: toArr(existingProps.priceRange),
                            [activeMapping.category]: mergeArr(existingProps[activeMapping.category], [activeMapping.value])
                        }
                    };
                    const newItem = {
                        success: true,
                        data: enrichedResult,
                        image: progress.result.optimizedFile,
                        fileName: progress.currentFile,
                        isExisting: progress.result.isExisting
                    };

                    setBatchResults(prev => [...prev, newItem]);

                    // AUTO-SAVE: Push to Supabase immediately after AI processing
                    performStoneSave(enrichedResult, progress.result.optimizedFile, true)
                        .then(() => {
                            setBatchResults(prev => prev.map(item => 
                                item.fileName === progress.currentFile ? { ...item, isSaving: false, isSorted: true } : item
                            ));
                            setSaveSuccess(true);
                        })
                        .catch(err => {
                            console.error(`Auto-save failed for ${progress.currentFile}:`, err);
                            setBatchResults(prev => prev.map(item => 
                                item.fileName === progress.currentFile ? { ...item, isSaving: false, saveError: err.message } : item
                            ));
                        });
                }
            },
            (errorResult) => {
                setBatchResults(prev => [...prev, errorResult]);
            },
            activeMapping.value // Use current mapping value as hint
        );

        setProcessor(batchProcessor);

        try {
            const results = await batchProcessor.processImages(selectedImages);
            setBatchProgress({ current: results.length, total: selectedImages.length, status: 'complete' });
        } catch (err) {
            setError(`Batch processing error: ${err.message}`);
            setBatchProgress(prev => ({ ...prev, status: 'error' }));
        }
    };

    const handlePause = () => {
        if (processor) processor.pause();
        setBatchProgress(prev => ({ ...prev, status: 'paused' }));
    };

    const handleResume = () => {
        if (processor) processor.resume();
        setBatchProgress(prev => ({ ...prev, status: 'processing' }));
    };

    const handleStop = () => {
        if (processor) processor.stop();
        setBatchProgress(prev => ({ ...prev, status: 'stopped' }));
    };

    const dismissFailure = (fileName) => {
        setBatchResults(prev => prev.filter(r => r.success || r.fileName !== fileName));
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg border border-stone-200 max-w-4xl mx-auto my-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Shield className="text-stone-900" size={24} />
                        <h2 className="text-2xl font-serif font-bold text-stone-800">Stonevo Intelligence</h2>
                    </div>

                    <div className="flex bg-stone-100 p-1 rounded-lg shadow-inner">
                        <button
                            onClick={() => setAdminTab('inventory')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${adminTab === 'inventory' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                        >
                            <Package size={14} /> Inventory
                        </button>
                        <button
                            onClick={() => setAdminTab('leads')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${adminTab === 'leads' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                        >
                            <Users size={14} /> Leads
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {adminTab === 'inventory' && (
                        <button
                            onClick={handleMasterBackup}
                            disabled={backupLoading}
                            className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-stone-200 transition-all disabled:opacity-50"
                        >
                            {backupLoading ? 'Exporting...' : '📥 Master Backup'}
                        </button>
                    )}
                    <button onClick={onCancel} className="text-stone-500 hover:text-stone-800 text-sm font-medium">Close</button>
                </div>
            </div>

            {adminTab === 'leads' ? (
                <AdminLeads />
            ) : (
                <div className="space-y-6">
                    {/* API Key Input */}
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Google Gemini API Key</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your API Key here"
                            className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500"
                        />
                        <p className="text-xs text-stone-500 mt-1">Key is not saved and only used for this session.</p>
                    </div>

                    {/* Mapping Mode / Folder Workspace */}
                    <div className="bg-stone-900 border border-stone-800 p-6 rounded-xl shadow-2xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                            <FolderOpen size={120} className="text-white" />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-white font-serif text-lg tracking-wide flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-bronze rounded-full animate-pulse" />
                                        Smart Folder Mapping
                                    </h3>
                                    <p className="text-stone-400 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">Pass-through Data Workplace</p>
                                </div>
                                <div className="flex bg-stone-800 p-1 rounded-md">
                                    <button 
                                        onClick={() => setMappingMode(true)}
                                        className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest transition-all ${mappingMode ? 'bg-bronze text-stone-900' : 'text-stone-400'}`}
                                    >Enabled</button>
                                    <button 
                                        onClick={() => setMappingMode(false)}
                                        className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest transition-all ${!mappingMode ? 'bg-stone-700 text-white' : 'text-stone-500'}`}
                                    >Manual</button>
                                </div>
                            </div>

                            {mappingMode && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block pl-1">Primary Category</label>
                                        <select 
                                            value={activeMapping.category}
                                            onChange={(e) => setActiveMapping({ ...activeMapping, category: e.target.value, value: getFirstOption(e.target.value) })}
                                            className="w-full bg-stone-800 border border-stone-700 text-white rounded-lg px-4 py-2.5 text-xs font-medium focus:ring-1 focus:ring-bronze outline-none cursor-pointer"
                                        >
                                            <option value="application">Application (Folder Category)</option>
                                            <option value="marble">Stone Type (e.g. Marble)</option>
                                            <option value="color">Base Color</option>
                                            <option value="finish">Surface Finish</option>
                                            <option value="temperature">Thermal Temperature</option>
                                            <option value="pattern">Veining Pattern</option>
                                            <option value="priceRange">Price Tier</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block pl-1">Target Value</label>
                                        <select 
                                            value={activeMapping.value}
                                            onChange={(e) => setActiveMapping({ ...activeMapping, value: e.target.value })}
                                            className="w-full bg-bronze/10 border border-bronze/20 text-bronze rounded-lg px-4 py-2.5 text-xs font-bold focus:ring-1 focus:ring-bronze outline-none cursor-pointer"
                                        >
                                            {getOptionsForCategory(activeMapping.category).map(opt => (
                                                <option key={opt.value} value={opt.value} className="bg-stone-900 text-white">{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className="md:col-span-2 pt-2 border-t border-stone-800 mt-2">
                                        <p className="text-[10px] text-stone-500 italic">
                                            <span className="text-bronze font-bold not-italic mr-1">NOTE:</span>
                                            Images will be mapped to <span className="text-stone-300">"{activeMapping.value}"</span>. If a stone already exists, it will only update this field. AI will only run once to save tokens.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex gap-2 border-b border-stone-200 pb-4">
                        <button
                            onClick={() => setBatchMode(false)}
                            className={`px-4 py-2 rounded-md font-medium transition-colors ${!batchMode ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                }`}
                        >
                            Single Image
                        </button>
                        <button
                            onClick={() => setBatchMode(true)}
                            className={`px-4 py-2 rounded-md font-medium transition-colors ${batchMode ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                }`}
                        >
                            Batch Upload 🚀
                        </button>
                    </div>

                    {/* Single Image Mode */}
                    {!batchMode && (
                        <>
                            <div className="border-2 border-dashed border-stone-300 rounded-lg p-6 text-center hover:bg-stone-50 transition-colors">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                    id="image-upload"
                                />
                                <label htmlFor="image-upload" className="cursor-pointer block">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-md shadow-sm" />
                                    ) : (
                                        <div className="text-stone-500">
                                            <span className="block text-4xl mb-2">📷</span>
                                            <span className="font-medium">Click to upload marble image</span>
                                        </div>
                                    )}
                                </label>
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={loading || !image}
                                className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${loading || !image ? 'bg-stone-400 cursor-not-allowed' : 'bg-stone-900 hover:bg-stone-800'
                                    }`}
                            >
                                {loading ? 'Analyzing with Gemini AI...' : 'Analyze Stone'}
                            </button>

                            {/* Single Image Result */}
                            {result && (
                                <div className="mt-6 border-t border-stone-200 pt-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-serif font-bold text-stone-800">AI Detection Result</h3>
                                            {result.isExisting && (
                                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-200">
                                                    Already in Database
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs bg-stone-100 text-stone-500 px-2 py-1 rounded font-medium uppercase tracking-wider">Manual Editing Enabled</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4 text-left border-b border-stone-100 pb-4">
                                        <div className="p-3 bg-bronze/5 rounded-md border border-bronze/10">
                                            <label className="text-[10px] text-bronze uppercase block font-bold mb-1 italic">Lot Classification</label>
                                            <select
                                                value={result.lot_type}
                                                onChange={(e) => handleFieldChange('lot_type', e.target.value)}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0 font-serif italic text-stone-900"
                                            >
                                                <option value="premium">💎 Premium Inventory</option>
                                                <option value="small_lot">🏗️ Builder Small Lot</option>
                                            </select>
                                        </div>
                                        <div className="p-3 bg-stone-50 rounded-md border border-stone-100">
                                            <label className="text-[10px] text-stone-400 uppercase block font-bold mb-1">Lot Size (SQ.FT)</label>
                                            <input
                                                type="number"
                                                value={result.lot_size_sqft}
                                                onChange={(e) => handleFieldChange('lot_size_sqft', e.target.value)}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0 font-medium text-stone-900"
                                            />
                                        </div>
                                        <div className="p-3 bg-stone-50 rounded-md border border-stone-100 col-span-2">
                                            <label className="text-[10px] text-stone-400 uppercase block font-bold mb-1">Vendor / Store Address</label>
                                            <input
                                                type="text"
                                                value={result.vendor_address}
                                                placeholder="e.g. Marble Market, Gurgaon, Shop 22"
                                                onChange={(e) => handleFieldChange('vendor_address', e.target.value)}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0 font-medium text-stone-900"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4 text-left">
                                        <div className="p-3 bg-stone-50 rounded-md border border-stone-100">
                                            <label className="text-[10px] text-stone-400 uppercase block font-bold mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={result.name}
                                                onChange={(e) => handleFieldChange('name', e.target.value)}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0 font-medium text-stone-900"
                                            />
                                        </div>
                                        <div className="p-3 bg-stone-50 rounded-md border border-stone-100">
                                            <label className="text-[10px] text-stone-400 uppercase block font-bold mb-1">Marble Type <span className="text-bronze normal-case font-normal">(multi)</span></label>
                                            <FieldPills category="marble" values={result.physical_properties.marble} onChange={v => handleFieldChange('marble', v, true)} />
                                        </div>
                                        <div className="p-3 bg-stone-50 rounded-md border border-stone-100">
                                            <label className="text-[10px] text-stone-400 uppercase block font-bold mb-1">Finish <span className="text-bronze normal-case font-normal">(multi)</span></label>
                                            <FieldPills category="finish" values={result.physical_properties.finish} onChange={v => handleFieldChange('finish', v, true)} />
                                        </div>
                                        <div className="p-3 bg-stone-50 rounded-md border border-stone-100">
                                            <label className="text-[10px] text-stone-400 uppercase block font-bold mb-1">Application <span className="text-bronze normal-case font-normal">(multi)</span></label>
                                            <FieldPills category="application" values={result.physical_properties.application} onChange={v => handleFieldChange('application', v, true)} />
                                        </div>
                                        <div className="p-3 bg-stone-50 rounded-md border border-stone-100">
                                            <label className="text-[10px] text-stone-400 uppercase block font-bold mb-1">Color <span className="text-bronze normal-case font-normal">(multi)</span></label>
                                            <FieldPills category="color" values={result.physical_properties.color} onChange={v => handleFieldChange('color', v, true)} />
                                        </div>
                                        <div className="p-3 bg-stone-50 rounded-md border border-stone-100">
                                            <label className="text-[10px] text-stone-400 uppercase block font-bold mb-1">Temperature <span className="text-bronze normal-case font-normal">(multi)</span></label>
                                            <FieldPills category="temperature" values={result.physical_properties.temperature} onChange={v => handleFieldChange('temperature', v, true)} />
                                        </div>
                                        <div className="p-3 bg-stone-50 rounded-md border border-stone-100">
                                            <label className="text-[10px] text-stone-400 uppercase block font-bold mb-1">Pattern <span className="text-bronze normal-case font-normal">(multi)</span></label>
                                            <FieldPills category="pattern" values={result.physical_properties.pattern} onChange={v => handleFieldChange('pattern', v, true)} />
                                        </div>
                                        <div className="p-3 bg-stone-50 rounded-md border border-stone-100">
                                            <label className="text-[10px] text-stone-400 uppercase block font-bold mb-1">Price Range <span className="text-bronze normal-case font-normal">(multi)</span></label>
                                            <FieldPills category="priceRange" values={result.physical_properties.priceRange} onChange={v => handleFieldChange('priceRange', v, true)} />
                                        </div>
                                    </div>
                                    <div className="mb-4 text-left">
                                        <label className="text-[10px] text-stone-400 uppercase block font-bold mb-1">Description</label>
                                        <textarea
                                            value={result.description}
                                            onChange={(e) => handleFieldChange('description', e.target.value)}
                                            rows="2"
                                            className="w-full bg-stone-50 border border-stone-100 rounded-md p-2 focus:ring-0 text-sm text-stone-700 italic"
                                        />
                                    </div>
                                    <div className="mb-6 text-left">
                                        <label className="text-[10px] text-stone-400 uppercase block font-bold mb-1">Tags (Comma separated)</label>
                                        <input
                                            type="text"
                                            value={result.tags.join(', ')}
                                            onChange={(e) => handleFieldChange('tags', e.target.value.split(',').map(t => t.trim()))}
                                            className="w-full bg-stone-50 border border-stone-100 rounded-md p-2 focus:ring-0 text-sm text-stone-600"
                                        />
                                    </div>

                                    <button
                                        onClick={() => handleSaveToSupabase(result, image)}
                                        disabled={saveLoading || saveSuccess}
                                        className={`w-full py-3 px-4 rounded-md font-medium text-white transition-all transform active:scale-95 ${saveSuccess
                                            ? 'bg-green-600'
                                            : saveLoading
                                                ? 'bg-stone-400 cursor-not-allowed'
                                                : 'bg-stone-900 hover:bg-stone-800 shadow-md hover:shadow-lg'
                                            }`}
                                    >
                                        {saveLoading ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                {isCompressing ? 'Optimizing Image...' : 'Saving to Database...'}
                                            </span>
                                        ) : saveSuccess ? (
                                            '✨ Saved Successfully!'
                                        ) : (
                                            '📤 Push to Live Database'
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* Batch Mode */}
                    {batchMode && (
                        <>
                            <div className="border-2 border-dashed border-stone-300 rounded-lg p-6">
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleBatchImageChange}
                                    className="hidden"
                                    id="batch-upload"
                                    ref={fileInputRef}
                                />
                                <label htmlFor="batch-upload" className="cursor-pointer block text-center">
                                    <div className="text-stone-500">
                                        <span className="block text-4xl mb-2">📁</span>
                                        <span className="font-medium">Click to select multiple images</span>
                                        <p className="text-xs mt-2">Selected: {selectedImages.length} images</p>
                                    </div>
                                </label>
                            </div>

                            {selectedImages.length > 0 && (
                                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm">
                                    <p className="font-medium text-blue-900">⏱️ Processing Time Estimate</p>
                                    <p className="text-blue-700 mt-1">
                                        {selectedImages.length} images × 4 seconds = ~{Math.ceil(selectedImages.length * 4 / 60)} minutes
                                    </p>
                                    <p className="text-xs text-blue-600 mt-2">
                                        (Rate limiting to stay within free tier limits)
                                    </p>
                                </div>
                            )}

                            {/* Batch Controls */}
                            <div className="flex gap-2">
                                {batchProgress.status === 'idle' && (
                                    <button
                                        onClick={handleBatchProcess}
                                        disabled={selectedImages.length === 0}
                                        className={`flex-1 py-3 px-4 rounded-md font-medium text-white transition-colors ${selectedImages.length === 0 ? 'bg-stone-400 cursor-not-allowed' : 'bg-stone-900 hover:bg-stone-800'
                                            }`}
                                    >
                                        Start Batch Processing
                                    </button>
                                )}

                                {batchProgress.status === 'processing' && (
                                    <>
                                        <button
                                            onClick={handlePause}
                                            className="flex-1 py-3 px-4 rounded-md font-medium bg-yellow-600 text-white hover:bg-yellow-700"
                                        >
                                            ⏸️ Pause
                                        </button>
                                        <button
                                            onClick={handleStop}
                                            className="flex-1 py-3 px-4 rounded-md font-medium bg-red-600 text-white hover:bg-red-700"
                                        >
                                            ⏹️ Stop
                                        </button>
                                    </>
                                )}

                                {batchProgress.status === 'paused' && (
                                    <>
                                        <button
                                            onClick={handleResume}
                                            className="flex-1 py-3 px-4 rounded-md font-medium bg-green-600 text-white hover:bg-green-700"
                                        >
                                            ▶️ Resume
                                        </button>
                                        <button
                                            onClick={handleStop}
                                            className="flex-1 py-3 px-4 rounded-md font-medium bg-red-600 text-white hover:bg-red-700"
                                        >
                                            ⏹️ Stop
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Progress Bar */}
                            {batchProgress.total > 0 && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm text-stone-600">
                                        <span>Progress: {batchProgress.current} / {batchProgress.total}</span>
                                        <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-stone-200 rounded-full h-2">
                                        <div
                                            className="bg-stone-900 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                                        ></div>
                                    </div>
                                    {batchProgress.currentFile && (
                                        <p className="text-xs text-stone-500">Processing: {batchProgress.currentFile}</p>
                                    )}
                                </div>
                            )}

                            {/* Batch Results */}
                            {batchResults.length > 0 && (
                                <div className="mt-6 border-t border-stone-200 pt-6">

                                    {/* ⚠️ FAILED IMAGES BANNER */}
                                    {batchResults.filter(r => !r.success).length > 0 && (
                                        <div className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 shadow-sm">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-xl">⚠️</span>
                                                <h4 className="font-bold text-red-800 text-sm uppercase tracking-widest">
                                                    {batchResults.filter(r => !r.success).length} Image{batchResults.filter(r => !r.success).length > 1 ? 's' : ''} Failed to Process
                                                </h4>
                                            </div>
                                            <ul className="space-y-2">
                                                {batchResults.filter(r => !r.success).map((r, i) => (
                                                    <li key={i} className="flex items-start justify-between gap-2 bg-white border border-red-200 rounded-lg px-3 py-2">
                                                        <div>
                                                            <p className="text-xs font-bold text-stone-800">{r.fileName}</p>
                                                            <p className="text-[10px] text-red-500 mt-0.5">{r.error || 'Unknown processing error'}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => dismissFailure(r.fileName)}
                                                            className="text-red-300 hover:text-red-600 transition-colors text-sm shrink-0 mt-0.5 font-bold leading-none"
                                                            title="Dismiss"
                                                        >✕</button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-serif font-bold text-stone-800 flex items-center gap-2">
                                            Results ({batchResults.length})
                                            {batchResults.filter(r => !r.success).length > 0 && (
                                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold border border-red-300">
                                                    🔴 {batchResults.filter(r => !r.success).length} Failed
                                                </span>
                                            )}
                                        </h3>
                                        <div className="flex gap-2">
                                            {batchResults.some(r => r.success && !r.isSorted) && (
                                                <button
                                                    onClick={handleSaveAllBatch}
                                                    disabled={saveLoading}
                                                    className={`px-4 py-1 text-sm font-bold rounded shadow-sm flex items-center gap-2 ${
                                                        saveLoading 
                                                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                                                        : 'bg-stone-900 text-white hover:bg-stone-800'
                                                    }`}
                                                >
                                                    {saveLoading ? (
                                                        <>
                                                            <div className="w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        <>🚀 Push All to Database</>
                                                    )}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => exportToJSON(batchResults)}
                                                className="px-3 py-1 text-sm bg-stone-100 text-stone-700 rounded hover:bg-stone-200 transition-colors"
                                            >
                                                Export JSON
                                            </button>
                                            <button
                                                onClick={() => exportToCSV(batchResults)}
                                                className="px-3 py-1 text-sm bg-stone-100 text-stone-700 rounded hover:bg-stone-200 transition-colors"
                                            >
                                                Export CSV
                                            </button>
                                        </div>
                                    </div>

                                    <div className="max-h-96 overflow-y-auto space-y-3">
                                        {batchResults.map((result, idx) => (
                                            <div key={idx} className={`p-4 rounded-md border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                                }`}>
                                                <div className="flex justify-between items-start">
                                                     <div className="flex-1">
                                                         <div className="flex items-center gap-2">
                                                             <p className="font-medium text-sm text-stone-800">{result.fileName}</p>
                                                             {result.isExisting && (
                                                                 <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold uppercase">
                                                                     In Database
                                                                 </span>
                                                             )}
                                                             {result.isSorted && (
                                                                 <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold uppercase">
                                                                     ✓ Saved
                                                                 </span>
                                                             )}
                                                             {result.isSaving && (
                                                                 <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 text-[10px] font-bold uppercase animate-pulse">
                                                                     ⏳ Saving...
                                                                 </span>
                                                             )}
                                                             {result.saveError && (
                                                                 <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold uppercase">
                                                                     ⚠ Error: {result.saveError}
                                                                 </span>
                                                             )}
                                                         </div>
                                                         {result.success ? (
                                                            <div className="flex-1 text-left">
                                                                <div className="mt-2 grid grid-cols-2 gap-2">
                                                                    <div className="flex flex-col col-span-2">
                                                                        <label className="text-[9px] text-stone-400 font-bold uppercase mb-0.5">Name</label>
                                                                        <input type="text" value={result.data.name} onChange={(e) => handleBatchFieldChange(idx, 'name', e.target.value)} className="bg-white border border-stone-200 rounded px-1.5 py-0.5 text-xs text-stone-800 focus:ring-1 focus:ring-stone-400 focus:outline-none" />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[9px] text-stone-400 font-bold uppercase mb-0.5">Marble Type</label>
                                                                        <FieldPills compact category="marble" values={result.data.physical_properties.marble} onChange={v => handleBatchFieldChange(idx, 'marble', v, true)} />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[9px] text-stone-400 font-bold uppercase mb-0.5">Finish</label>
                                                                        <FieldPills compact category="finish" values={result.data.physical_properties.finish} onChange={v => handleBatchFieldChange(idx, 'finish', v, true)} />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[9px] text-stone-400 font-bold uppercase mb-0.5">Color</label>
                                                                        <FieldPills compact category="color" values={result.data.physical_properties.color} onChange={v => handleBatchFieldChange(idx, 'color', v, true)} />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[9px] text-stone-400 font-bold uppercase mb-0.5">Temp</label>
                                                                        <FieldPills compact category="temperature" values={result.data.physical_properties.temperature} onChange={v => handleBatchFieldChange(idx, 'temperature', v, true)} />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[9px] text-stone-400 font-bold uppercase mb-0.5">Application</label>
                                                                        <FieldPills compact category="application" values={result.data.physical_properties.application} onChange={v => handleBatchFieldChange(idx, 'application', v, true)} />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[9px] text-stone-400 font-bold uppercase mb-0.5">Pattern</label>
                                                                        <FieldPills compact category="pattern" values={result.data.physical_properties.pattern} onChange={v => handleBatchFieldChange(idx, 'pattern', v, true)} />
                                                                    </div>
                                                                    <div className="flex flex-col col-span-2">
                                                                        <label className="text-[9px] text-stone-400 font-bold uppercase mb-0.5">Price Range</label>
                                                                        <FieldPills compact category="priceRange" values={result.data.physical_properties.priceRange} onChange={v => handleBatchFieldChange(idx, 'priceRange', v, true)} />
                                                                    </div>
                                                                </div>
                                                                <div className="mt-3 space-y-2">
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[9px] text-stone-400 font-bold uppercase mb-0.5">Description</label>
                                                                        <input
                                                                            type="text"
                                                                            value={result.data.description}
                                                                            onChange={(e) => handleBatchFieldChange(idx, 'description', e.target.value)}
                                                                            className="bg-white border border-stone-200 rounded px-1.5 py-1 text-xs text-stone-700 italic focus:ring-1 focus:ring-stone-400 focus:outline-none"
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[9px] text-stone-400 font-bold uppercase mb-0.5">Tags (Comma separated)</label>
                                                                        <input
                                                                            type="text"
                                                                            value={result.data.tags.join(', ')}
                                                                            onChange={(e) => handleBatchFieldChange(idx, 'tags', e.target.value.split(',').map(t => t.trim()))}
                                                                            className="bg-white border border-stone-200 rounded px-1.5 py-1 text-[10px] text-stone-500 focus:ring-1 focus:ring-stone-400 focus:outline-none"
                                                                        />
                                                                    </div>
                                                                      <div className="mt-3 flex justify-end">
                                                                     <button
                                                                         onClick={() => handleSaveBatchItem(idx)}
                                                                         disabled={result.isSaving || result.isSorted}
                                                                         className={`px-3 py-1 text-xs rounded transition-colors ${
                                                                            result.isSorted 
                                                                            ? 'bg-green-100 text-green-700 cursor-default'
                                                                            : 'bg-stone-900 text-white hover:bg-stone-800'
                                                                         }`}
                                                                     >
                                                                         {result.isSaving ? 'Saving...' : result.isSorted ? '✓ Saved' : 'Save to Database'}
                                                                     </button>
                                                                 </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-red-600 mt-1">Error: {result.error}</p>
                                                        )}
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded ${result.success ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                                                        }`}>
                                                        {result.success ? '✓ Success' : '✗ Failed'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm">
                            <p className="font-bold">Error:</p>
                            {error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminUpload;
