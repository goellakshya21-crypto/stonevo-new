import React, { useState, useRef, useEffect } from 'react';

const MultiSelect = ({ label, name, options, selectedValues, onChange, variant = 'base', displayType = 'list', multiple = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Color Swatch Mapping for "God-tier" implementation
    const colorSwatches = {
        'White': { bg: 'bg-[#FDFDFD]', border: 'border-stone-100', label: 'Carrara White' },
        'Black': { bg: 'bg-[#121212]', border: 'border-white/10', label: 'Nero Marquina' },
        'Blue': { bg: 'bg-[#4A7BB0]', border: 'border-white/10', label: 'Azul Macaubas' },
        'Green': { bg: 'bg-[#2D4F44]', border: 'border-white/10', label: 'Verde Alpi' },
        'Yellow': { bg: 'bg-[#E6C35C]', border: 'border-white/10', label: 'Giallo Siena' },
        'Beige': { bg: 'bg-[#D2C1A8]', border: 'border-white/10', label: 'Travertine' },
        'Grey': { bg: 'bg-[#7D7D7D]', border: 'border-white/10', label: 'Silver Fox' },
        'Pink': { bg: 'bg-[#EBC4BB]', border: 'border-white/10', label: 'Rosa Aurora' },
        'Peach': { bg: 'bg-[#F4C2C2]', border: 'border-white/10', label: 'Peach Pearl' },
        'Purple': { bg: 'bg-[#4B3D60]', border: 'border-white/10', label: 'Royal Purple' },
        'Red': { bg: 'bg-[#8B0000]', border: 'border-white/10', label: 'Rosso Levant' },
        'Golden': { bg: 'bg-[#D4AF37]', border: 'border-white/10', label: 'Imperial Gold' },
        'Multi Tone': { bg: 'bg-gradient-to-tr from-[#D1D1D1] via-[#8E8E8E] to-[#4A4A4A]', border: 'border-white/10', label: 'Multi-tonal' },
        'Brown': { bg: 'bg-[#5D4037]', border: 'border-white/10', label: 'Emperador Brown' },
        'Cream': { bg: 'bg-[#FFF5E1]', border: 'border-white/10', label: 'Crema Marfil' }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (optionValue) => {
        let newValues;
        if (multiple) {
            newValues = selectedValues.includes(optionValue)
                ? selectedValues.filter(val => val !== optionValue)
                : [...selectedValues, optionValue];
        } else {
            // For single select: selections are mutually exclusive
            newValues = selectedValues.includes(optionValue) ? [] : [optionValue];
            if (newValues.length > 0) setIsOpen(false); // Close dropdown on selection
        }

        onChange(name, newValues);
    };

    const clearSelection = (e) => {
        if (e) e.stopPropagation();
        onChange(name, []);
    };

    const isPremium = variant === 'premium';
    const isSwatch = displayType === 'swatch';

    return (
        <div className="flex flex-col relative" ref={dropdownRef}>
            <label className={`${isPremium ? 'text-[10px] uppercase font-semibold tracking-[0.15em] text-bronze mb-1 font-display' : 'text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1 px-1'}`}>
                {label}
            </label>

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between transition-all cursor-pointer ${isPremium
                    ? `bg-transparent border-b ${isOpen ? 'border-luxury-bronze' : 'border-white/10'} pb-2 h-10 group w-fit min-w-[100px]`
                    : `px-3 py-2 bg-stone-50 border rounded-md text-sm min-h-[42px] ${isOpen ? 'border-stone-900 ring-2 ring-stone-900/5' : 'border-stone-200 hover:border-stone-400'}`
                    }`}
            >
                <div className="flex flex-wrap gap-1 items-center overflow-visible">
                    {selectedValues.length === 0 ? (
                        <span className={`${isPremium ? 'text-stone-400 font-serif italic text-sm whitespace-nowrap' : 'text-stone-400 text-sm'}`}>
                            {label === 'Brightness' ? 'Any Brightness' : `Any ${label}`}
                        </span>
                    ) : (
                        <div className="flex items-center gap-2">
                            {isPremium ? (
                                <span className="text-luxury-cream font-display text-sm leading-tight transition-all duration-500 italic">
                                    {isSwatch
                                        ? (selectedValues.length === 1 ? colorSwatches[selectedValues[0]]?.label || selectedValues[0] : (multiple ? `${selectedValues.length} Selected` : (colorSwatches[selectedValues[0]]?.label || selectedValues[0])))
                                        : (multiple ? selectedValues.join(', ') : selectedValues[0])
                                    }
                                </span>
                            ) : (
                                <>
                                    <span className="bg-stone-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm">
                                        {selectedValues.length}
                                    </span>
                                    <span className="text-stone-700 font-medium truncate max-w-[80px] text-sm">
                                        {selectedValues.join(', ')}
                                    </span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5 ml-2">
                    {selectedValues.length > 0 && (
                        <button
                            onClick={clearSelection}
                            className={`${isPremium ? 'text-luxury-bronze/40 hover:text-stone-900 mr-1' : 'text-stone-400 hover:text-stone-600 p-0.5 rounded-full hover:bg-stone-200'} transition-colors`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isPremium ? 1.5 : 2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    <svg
                        className={`w-3.5 h-3.5 text-stone-300 transition-transform duration-500 ${isOpen ? 'rotate-180 text-luxury-bronze' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isPremium ? 1.2 : 2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {isOpen && (
                <div className={`${isPremium
                    ? isSwatch
                        ? 'absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[90vw] max-w-[480px] md:w-[480px] glass-dropdown rounded-2xl p-6 md:p-8 z-50 animate-in fade-in zoom-in-95 duration-500 shadow-2xl'
                        : 'absolute top-full left-0 mt-2 w-[200px] md:w-[240px] glass-dropdown rounded-xl shadow-2xl z-50 py-4 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 custom-scrollbar'
                    : 'absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-stone-200 rounded-lg shadow-xl z-50 py-2 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2'
                    }`}>

                    {isSwatch && isPremium && (
                        <div className="flex items-center justify-between mb-12 border-b border-white/5 pb-6">
                            <h4 className="text-white font-serif text-2xl italic tracking-wide">Color Selection</h4>
                            <button
                                onClick={clearSelection}
                                className="text-[10px] font-bold text-luxury-bronze hover:text-white uppercase tracking-[0.3em] transition-colors"
                            >
                                Clear Selection
                            </button>
                        </div>
                    )}

                    <div className={`${isSwatch ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-10' : ''}`}>
                        {options.map((option) => {
                            const isSelected = selectedValues.includes(option.value);
                            const swatch = colorSwatches[option.value];

                            if (isSwatch && isPremium) {
                                return (
                                    <div
                                        key={option.value}
                                        onClick={() => toggleOption(option.value)}
                                        className="flex flex-col items-center space-y-3 group/swatch cursor-pointer"
                                    >
                                        <div className={`w-12 h-12 rounded-full swatch-glow transition-all ring-offset-4 ring-offset-background-dark/50 ${swatch?.bg || 'bg-stone-500'} border ${isSelected ? 'border-bronze ring-1 ring-bronze' : 'border-white/20 group-hover/swatch:ring-1 group-hover/swatch:ring-bronze'}`}></div>
                                        <span className={`text-[10px] uppercase tracking-widest font-display transition-colors ${isSelected ? 'text-bronze' : 'text-luxury-cream/70'}`}>
                                            {option.label}
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={option.value}
                                    onClick={() => toggleOption(option.value)}
                                    className={`flex items-center px-6 py-3 hover:bg-stone-50/80 cursor-pointer group transition-all duration-300 ${isSelected ? 'bg-luxury-bronze/5' : ''}`}
                                >
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-4 transition-all duration-500 ${isSelected
                                        ? 'bg-luxury-emerald border-luxury-emerald scale-110 shadow-lg shadow-luxury-emerald/20'
                                        : 'border-stone-200 group-hover:border-luxury-bronze/50'
                                        }`}>
                                        {isSelected && (
                                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-scale-up" />
                                        )}
                                    </div>
                                    <span className={`text-sm tracking-wide transition-colors duration-300 ${isSelected ? 'text-stone-900 font-semibold' : 'text-stone-500 group-hover:text-stone-800'}`}>
                                        {option.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
