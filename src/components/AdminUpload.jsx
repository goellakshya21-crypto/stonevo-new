import React, { useState, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BatchProcessor } from '../utils/batchProcessor';
import { exportToJSON, exportToCSV, exportRawData } from '../utils/exportHelpers';
import { supabase } from '../lib/supabaseClient';
import { compressImage } from '../utils/imageOptimizer';
import AdminLeads from './AdminLeads';
import { Users, Package, Shield } from 'lucide-react';

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
    const [globalType, setGlobalType] = useState('Auto-detect');

    const fileInputRef = useRef(null);

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

    const handleFieldChange = (field, value, isPhysical = false) => {
        setResult(prev => {
            if (isPhysical) {
                return {
                    ...prev,
                    physical_properties: {
                        ...prev.physical_properties,
                        [field]: value
                    }
                };
            }
            return {
                ...prev,
                [field]: value
            };
        });
    };

    const handleBatchFieldChange = (idx, field, value, isPhysical = false) => {
        setBatchResults(prev => {
            const newResults = [...prev];
            const item = { ...newResults[idx] };
            const data = { ...item.data };

            if (isPhysical) {
                data.physical_properties = {
                    ...data.physical_properties,
                    [field]: value
                };
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

        const genAI = new GoogleGenerativeAI(apiKey);
        const imagePart = await fileToGenerativePart(image);
        const extractedName = cleanFileName(image);

        const typeInstruction = globalType === 'Auto-detect'
            ? 'Geological type (Marble, Granite, Onyx, Quartzite, Travertine, Sandstone, or Limestone)'
            : `THIS IS A ${globalType.toUpperCase()}. Set "type" to "${globalType}".`;

        const prompt = `Analyze this stone image (Name: ${extractedName}) for an architectural database. 
        Return ONLY a raw JSON object (no markdown formatting) with the following structure:
        {
            "name": "${extractedName}",
            "lot_type": "premium",
            "lot_size_sqft": 0,
            "vendor_address": "",
            "physical_properties": {
            "color": "ONLY the single most dominant base color (e.g. White, Black, Blue, Beige, Green, Yellow, Grey, Pink). Do NOT include secondary colors or veining colors.",
            "priceRange": "Pending",
            "type": "${typeInstruction}",
            "pattern": "CRITICAL: Set to 'Yes' ONLY if there are repetitive, rhythmic lines running through the entire stone (like parallel veins or linear stripes). If there are only random spots, irregular clouds, or scattered veining, set to 'No'. Focus on linear repetition.",
            "brightness": "Overall brightness based on the dominant color (Light or Dark)"
            },
            "description": "A short, elegant architectural description of the stone's appearance, veining, and character (max 2 sentences). It should match the name ${extractedName}.",
            "tags": ["tag1", "tag2", "tag3", "etc"] // Include all secondary colors, veining colors, and architectural style keywords here.
        }`;

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonResult = JSON.parse(cleanedText);

            setResult(jsonResult);
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

    const handleSaveToSupabase = async (stoneData, imageFile) => {
        setSaveLoading(true);
        setSaveSuccess(false);
        setError(null);
        setIsCompressing(true);

        try {
            // 0. Compress Image
            const optimizedFile = await compressImage(imageFile);
            setIsCompressing(false);

            // 1. Upload image to Supabase Storage
            const fileExt = optimizedFile.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            console.log(`🚀 Uploading to Supabase: ${filePath} (${(optimizedFile.size / 1024).toFixed(2)} KB)`);

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('marble-images')
                .upload(filePath, optimizedFile, {
                    contentType: optimizedFile.type,
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // 2. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('marble-images')
                .getPublicUrl(filePath);

            // 3. Save metadata to Database
            const { error: dbError } = await supabase
                .from('stones')
                .insert([{
                    name: stoneData.name,
                    lot_type: stoneData.lot_type || 'premium',
                    lot_size_sqft: stoneData.lot_size_sqft || 0,
                    vendor_address: stoneData.vendor_address || '',
                    type: stoneData.physical_properties.type,
                    color: stoneData.physical_properties.color,
                    pattern: stoneData.physical_properties.pattern,
                    brightness: stoneData.physical_properties.brightness,
                    price_range: stoneData.physical_properties.priceRange,
                    description: stoneData.description,
                    tags: stoneData.tags,
                    image_url: publicUrl,
                    original_filename: imageFile.name
                }]);

            if (dbError) throw dbError;

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error("Save Error:", err);
            setError(`Save failed: ${err.message}`);
        } finally {
            setSaveLoading(false);
            setIsCompressing(false);
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
            (progress) => {
                setBatchProgress(progress);
                if (progress.result) {
                    setBatchResults(prev => [...prev, {
                        success: true,
                        data: progress.result.data,
                        image: progress.result.optimizedFile,
                        fileName: progress.currentFile
                    }]);
                }
            },
            (errorResult) => {
                setBatchResults(prev => [...prev, errorResult]);
            },
            globalType // Pass global type here
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

                    {/* Global Type Selector */}
                    <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Base Stone Type (Optional)</label>
                        <div className="flex flex-wrap gap-2">
                            {['Auto-detect', 'Granite', 'Limestone', 'Marble', 'Onyx', 'Quartzite', 'Sandstone', 'Travertine'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setGlobalType(type)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${globalType === type
                                        ? 'bg-stone-900 text-white shadow-sm'
                                        : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-400'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-stone-400 mt-2 italic">
                            {globalType === 'Auto-detect'
                                ? "AI will identify the stone type automatically."
                                : `AI will be instructed that all images in this batch are ${globalType}.`}
                        </p>
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
                                        <h3 className="text-lg font-serif font-bold text-stone-800">AI Detection Result</h3>
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
                                            <label className="text-[10px] text-stone-400 uppercase block font-bold mb-1">Type</label>
                                            <select
                                                value={result.physical_properties.type}
                                                onChange={(e) => handleFieldChange('type', e.target.value, true)}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0 font-medium text-stone-900 text-sm"
                                            >
                                                <option value="Granite">Granite</option>
                                                <option value="Limestone">Limestone</option>
                                                <option value="Marble">Marble</option>
                                                <option value="Onyx">Onyx</option>
                                                <option value="Quartzite">Quartzite</option>
                                                <option value="Sandstone">Sandstone</option>
                                                <option value="Travertine">Travertine</option>
                                            </select>
                                        </div>
                                        <div className="p-3 bg-stone-50 rounded-md border border-stone-100">
                                            <label className="text-[10px] text-stone-400 uppercase block font-bold mb-1">Color</label>
                                            <select
                                                value={result.physical_properties.color}
                                                onChange={(e) => handleFieldChange('color', e.target.value, true)}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0 font-medium text-stone-900 text-sm"
                                            >
                                                <option value="White">White</option>
                                                <option value="Black">Black</option>
                                                <option value="Blue">Blue</option>
                                                <option value="Green">Green</option>
                                                <option value="Yellow">Yellow</option>
                                                <option value="Beige">Beige</option>
                                                <option value="Grey">Grey</option>
                                                <option value="Pink">Pink</option>
                                            </select>
                                        </div>
                                        <div className="p-3 bg-stone-50 rounded-md border border-stone-100">
                                            <label className="text-[10px] text-stone-400 uppercase block font-bold mb-1">Brightness</label>
                                            <select
                                                value={result.physical_properties.brightness}
                                                onChange={(e) => handleFieldChange('brightness', e.target.value, true)}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0 font-medium text-stone-900 text-sm"
                                            >
                                                <option value="Light">Light</option>
                                                <option value="Dark">Dark</option>
                                            </select>
                                        </div>
                                        <div className="p-3 bg-stone-50 rounded-md border border-stone-100">
                                            <label className="text-[10px] text-stone-400 uppercase block font-bold mb-1">Pattern</label>
                                            <select
                                                value={result.physical_properties.pattern}
                                                onChange={(e) => handleFieldChange('pattern', e.target.value, true)}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0 font-medium text-stone-900 text-sm"
                                            >
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                        </div>
                                        <div className="p-3 bg-stone-50 rounded-md border border-stone-100">
                                            <label className="text-[10px] text-stone-400 uppercase block font-bold mb-1">Price Range</label>
                                            <select
                                                value={result.physical_properties.priceRange}
                                                onChange={(e) => handleFieldChange('priceRange', e.target.value, true)}
                                                className="w-full bg-transparent border-none p-0 focus:ring-0 font-medium text-stone-900 text-sm"
                                            >
                                                <option value="Pending">Pending (Excel Data)</option>
                                                <option value="250-500">250 - 500</option>
                                                <option value="500-750">500 - 750</option>
                                                <option value="750-1000">750 - 1000</option>
                                                <option value="1000-1250">1000 - 1250</option>
                                                <option value="1250-1500">1250 - 1500</option>
                                                <option value="1500-1750">1500 - 1750</option>
                                                <option value="1750-2000">1750 - 2000</option>
                                                <option value="2000-2250">2000 - 2250</option>
                                                <option value="2250-2500">2250 - 2500</option>
                                                <option value="2500-2750">2500 - 2750</option>
                                                <option value="2750-3000">2750 - 3000</option>
                                                <option value="3000-3250">3000 - 3250</option>
                                                <option value="3250-3500">3250 - 3500</option>
                                                <option value="3500-3750">3500 - 3750</option>
                                                <option value="3750-4000">3750 - 4000</option>
                                                <option value="4000+">4000+</option>
                                            </select>
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
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-serif font-bold text-stone-800">
                                            Results ({batchResults.length})
                                        </h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => exportToJSON(batchResults)}
                                                className="px-3 py-1 text-sm bg-stone-100 text-stone-700 rounded hover:bg-stone-200"
                                            >
                                                Export JSON
                                            </button>
                                            <button
                                                onClick={() => exportToCSV(batchResults)}
                                                className="px-3 py-1 text-sm bg-stone-100 text-stone-700 rounded hover:bg-stone-200"
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
                                                        <p className="font-medium text-sm text-stone-800">{result.fileName}</p>
                                                        {result.success ? (
                                                            <div className="flex-1 text-left">
                                                                <div className="mt-2 grid grid-cols-3 gap-3">
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[9px] text-stone-400 font-bold uppercase mb-0.5">Name</label>
                                                                        <input
                                                                            type="text"
                                                                            value={result.data.name}
                                                                            onChange={(e) => handleBatchFieldChange(idx, 'name', e.target.value)}
                                                                            className="bg-white border border-stone-200 rounded px-1.5 py-0.5 text-xs text-stone-800 focus:ring-1 focus:ring-stone-400 focus:outline-none"
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[9px] text-stone-400 font-bold uppercase mb-0.5">Color</label>
                                                                        <select
                                                                            value={result.data.physical_properties.color}
                                                                            onChange={(e) => handleBatchFieldChange(idx, 'color', e.target.value, true)}
                                                                            className="bg-white border border-stone-200 rounded px-1.5 py-0.5 text-xs text-stone-800 focus:ring-1 focus:ring-stone-400 focus:outline-none"
                                                                        >
                                                                            <option value="White">White</option>
                                                                            <option value="Black">Black</option>
                                                                            <option value="Blue">Blue</option>
                                                                            <option value="Beige">Beige</option>
                                                                            <option value="Grey">Grey</option>
                                                                            <option value="Pink">Pink</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[9px] text-stone-400 font-bold uppercase mb-0.5">Brightness</label>
                                                                        <select
                                                                            value={result.data.physical_properties.brightness}
                                                                            onChange={(e) => handleBatchFieldChange(idx, 'brightness', e.target.value, true)}
                                                                            className="bg-white border border-stone-200 rounded px-1.5 py-0.5 text-xs text-stone-800 focus:ring-1 focus:ring-stone-400 focus:outline-none"
                                                                        >
                                                                            <option value="Light">Light</option>
                                                                            <option value="Dark">Dark</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[9px] text-stone-400 font-bold uppercase mb-0.5">Type</label>
                                                                        <select
                                                                            value={result.data.physical_properties.type}
                                                                            onChange={(e) => handleBatchFieldChange(idx, 'type', e.target.value, true)}
                                                                            className="bg-white border border-stone-200 rounded px-1.5 py-0.5 text-xs text-stone-800 focus:ring-1 focus:ring-stone-400 focus:outline-none"
                                                                        >
                                                                            <option value="Granite">Granite</option>
                                                                            <option value="Limestone">Limestone</option>
                                                                            <option value="Marble">Marble</option>
                                                                            <option value="Onyx">Onyx</option>
                                                                            <option value="Quartzite">Quartzite</option>
                                                                            <option value="Sandstone">Sandstone</option>
                                                                            <option value="Travertine">Travertine</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[9px] text-stone-400 font-bold uppercase mb-0.5">Pattern</label>
                                                                        <select
                                                                            value={result.data.physical_properties.pattern || result.data.physical_properties.variation}
                                                                            onChange={(e) => handleBatchFieldChange(idx, 'pattern', e.target.value, true)}
                                                                            className="w-full bg-stone-50 border border-stone-200 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-stone-400"
                                                                        >
                                                                            <option value="Yes">Yes</option>
                                                                            <option value="No">No</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label className="text-[9px] text-stone-400 font-bold uppercase mb-0.5">Price</label>
                                                                        <select
                                                                            value={result.data.physical_properties.priceRange}
                                                                            onChange={(e) => handleBatchFieldChange(idx, 'priceRange', e.target.value, true)}
                                                                            className="bg-white border border-stone-200 rounded px-1.5 py-0.5 text-xs text-stone-800 focus:ring-1 focus:ring-stone-400 focus:outline-none"
                                                                        >
                                                                            <option value="Pending">Pending</option>
                                                                            <option value="250-500">250-500</option>
                                                                            <option value="500-750">500-750</option>
                                                                            <option value="750-1000">750-1000</option>
                                                                            <option value="1000-1250">1000-1250</option>
                                                                            <option value="1250-1500">1250-1500</option>
                                                                            <option value="1500-1750">1500-1750</option>
                                                                            <option value="1750-2000">1750-2000</option>
                                                                            <option value="2000-2250">2000-2250</option>
                                                                            <option value="2250-2500">2250-2500</option>
                                                                            <option value="2500-2750">2500-2750</option>
                                                                            <option value="2750-3000">2750-3000</option>
                                                                            <option value="3000-3250">3000-3250</option>
                                                                            <option value="3250-3500">3250-3500</option>
                                                                            <option value="3500-3750">3500-3750</option>
                                                                            <option value="3750-4000">3750-4000</option>
                                                                            <option value="4000+">4000+</option>
                                                                        </select>
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
                                                                </div>
                                                                <div className="mt-3 flex justify-end">
                                                                    <button
                                                                        onClick={() => handleSaveToSupabase(result.data, result.image)}
                                                                        className="px-3 py-1 bg-stone-900 text-white text-xs rounded hover:bg-stone-800 transition-colors"
                                                                    >
                                                                        Save to Database
                                                                    </button>
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
