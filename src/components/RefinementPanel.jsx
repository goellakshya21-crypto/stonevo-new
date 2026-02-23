import React, { useState, useEffect } from 'react';
import MultiSelect from './MultiSelect';

const RefinementPanel = ({ isOpen, onClose, filters, setFilters }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleMultiChange = (name, values) => {
        setFilters(prev => ({
            ...prev,
            [name]: values
        }));
    };

    const handleNameChange = (e) => {
        setFilters(prev => ({
            ...prev,
            name: e.target.value
        }));
    };

    const colorOptions = [
        { value: 'White', label: 'White' },
        { value: 'Black', label: 'Black' },
        { value: 'Blue', label: 'Blue' },
        { value: 'Green', label: 'Green' },
        { value: 'Yellow', label: 'Yellow' },
        { value: 'Beige', label: 'Beige' },
        { value: 'Grey', label: 'Grey' },
        { value: 'Pink', label: 'Pink' }
    ];

    const brightnessOptions = [
        { value: 'Light', label: 'Light' },
        { value: 'Dark', label: 'Dark' }
    ];

    const priceOptions = [
        { value: '250-500', label: '250 - 500' },
        { value: '500-750', label: '500 - 750' },
        { value: '750-1000', label: '750 - 1000' },
        { value: '1000-1250', label: '1000 - 1250' },
        { value: '1250-1500', label: '1250 - 1500' },
        { value: '1500-1750', label: '1500 - 1750' },
        { value: '1750-2000', label: '1750 - 2000' },
        { value: '2000-2250', label: '2000 - 2250' },
        { value: '2250-2500', label: '2250 - 2500' },
        { value: '2500-2750', label: '2500 - 2750' },
        { value: '2750-3000', label: '2750 - 3000' },
        { value: '3000-3250', label: '3000 - 3250' },
        { value: '3250-3500', label: '3250 - 3500' },
        { value: '3500-3750', label: '3500 - 3750' },
        { value: '3750-4000', label: '3750 - 4000' },
        { value: '4000+', label: '4000+' }
    ];

    const typeOptions = [
        { value: 'Granite', label: 'Granite' },
        { value: 'Limestone', label: 'Limestone' },
        { value: 'Marble', label: 'Marble' },
        { value: 'Onyx', label: 'Onyx' },
        { value: 'Quartzite', label: 'Quartzite' },
        { value: 'Sandstone', label: 'Sandstone' },
        { value: 'Travertine', label: 'Travertine' }
    ];

    const patternOptions = [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' },
        { value: 'Both', label: 'Both' }
    ];

    if (!isVisible && !isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div className={`fixed right-0 top-0 h-full w-full max-w-md bg-luxury-cream border-l border-luxury-bronze/20 shadow-2xl z-[70] transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Header */}
                <div className="p-8 border-b border-stone-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-serif text-stone-900 tracking-tight">Refine Selection</h2>
                        <p className="text-stone-500 text-sm mt-1 font-sans">Curate your perfect project palette</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400 hover:text-stone-900"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                    {/* Search Section */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-luxury-bronze uppercase tracking-[0.2em]">Nomenclature</label>
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Stone name or variety..."
                                value={filters.name}
                                onChange={handleNameChange}
                                className="w-full bg-transparent border-b border-stone-200 py-3 text-lg font-serif placeholder:text-stone-300 focus:outline-none focus:border-luxury-bronze transition-colors"
                            />
                            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-luxury-bronze group-focus-within:w-full transition-all duration-500" />
                        </div>
                    </div>

                    {/* Filters Grid */}
                    <div className="grid grid-cols-1 gap-10">
                        <div className="premium-filter-section">
                            <MultiSelect
                                label="Color"
                                name="color"
                                options={colorOptions}
                                selectedValues={filters.color}
                                onChange={handleMultiChange}
                                variant="premium"
                            />
                        </div>

                        <div className="premium-filter-section">
                            <MultiSelect
                                label="Brightness"
                                name="brightness"
                                options={brightnessOptions}
                                selectedValues={filters.brightness}
                                onChange={handleMultiChange}
                                variant="premium"
                            />
                        </div>

                        <div className="premium-filter-section">
                            <MultiSelect
                                label="Type"
                                name="type"
                                options={typeOptions}
                                selectedValues={filters.type}
                                onChange={handleMultiChange}
                                variant="premium"
                            />
                        </div>

                        <div className="premium-filter-section">
                            <MultiSelect
                                label="Price"
                                name="priceRange"
                                options={priceOptions}
                                selectedValues={filters.priceRange}
                                onChange={handleMultiChange}
                                variant="premium"
                            />
                        </div>

                        <div className="premium-filter-section">
                            <MultiSelect
                                label="Pattern"
                                name="pattern"
                                options={patternOptions}
                                selectedValues={filters.pattern}
                                onChange={handleMultiChange}
                                variant="premium"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-8 bg-stone-50/50 border-t border-stone-100 flex items-center justify-between">
                    <button
                        onClick={() => setFilters({
                            name: '',
                            color: [],
                            priceRange: [],
                            type: [],
                            pattern: [],
                            brightness: []
                        })}
                        className="text-xs font-bold text-stone-400 hover:text-stone-900 uppercase tracking-widest transition-colors"
                    >
                        Reset All
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-luxury-emerald text-white px-8 py-4 rounded-sm font-serif text-sm tracking-widest hover:bg-stone-900 transition-all shadow-xl shadow-luxury-emerald/10"
                    >
                        Apply Curation
                    </button>
                </div>
            </div>
        </>
    );
};

export default RefinementPanel;
