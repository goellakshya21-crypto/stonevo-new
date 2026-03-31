import React from 'react';
import MultiSelect from './MultiSelect';
import { Trash2 } from 'lucide-react';

const FilterBar = ({ filters, setFilters, onReset }) => {
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
        { value: 'Beige', label: 'Beige' },
        { value: 'Black', label: 'Black' },
        { value: 'Blue', label: 'Blue' },
        { value: 'Brown', label: 'Brown' },
        { value: 'Cream', label: 'Cream' },
        { value: 'Golden', label: 'Golden' },
        { value: 'Green', label: 'Green' },
        { value: 'Grey', label: 'Grey' },
        { value: 'Multi tone', label: 'Multi tone' },
        { value: 'Peach', label: 'Peach' },
        { value: 'Pink', label: 'Pink' },
        { value: 'Purple', label: 'Purple' },
        { value: 'Red', label: 'Red' },
        { value: 'White', label: 'White' },
        { value: 'Yellow', label: 'Yellow' }
    ];

    const marbleOptions = [
        { value: 'Dolomite', label: 'Dolomite' },
        { value: 'Marble', label: 'Marble' },
        { value: 'Sandstones & Limestone', label: 'Sandstones & Limestone' },
        { value: 'Semi-Precious', label: 'Semi-Precious' },
        { value: 'Granite & Quartzite', label: 'Granite & Quartzite' }
    ];

    const finishOptions = [
        { value: 'Polished', label: 'Polished' },
        { value: 'Leather', label: 'Leather' },
        { value: 'Honed', label: 'Honed' },
        { value: 'Flamed', label: 'Flamed' },
        { value: 'Backlit', label: 'Backlit' }
    ];

    const priceOptions = [
        { value: 'Value', label: 'Value' },
        { value: 'Core', label: 'Core' },
        { value: 'Premium', label: 'Premium' },
        { value: 'Elite', label: 'Elite' }
    ];

    const applicationOptions = [
        { value: 'Flooring', label: 'Flooring' },
        { value: 'Washroom', label: 'Washroom' },
        { value: 'Feature Wall', label: 'Feature Wall' },
        { value: 'Counter Top', label: 'Counter Top' },
        { value: 'Outdoor', label: 'Outdoor' },
        { value: 'Façade', label: 'Façade' }
    ];

    const patternOptions = [
        { value: 'Linear Vien', label: 'Linear Vien' },
        { value: 'Cloudy', label: 'Cloudy' },
        { value: 'Fossil', label: 'Fossil' },
        { value: 'Mosiac', label: 'Mosiac' },
        { value: 'Concentric', label: 'Concentric' },
        { value: 'Dramatic', label: 'Dramatic' },
        { value: 'Minimal Vien', label: 'Minimal Vien' },
        { value: 'Mettalic Vien', label: 'Mettalic Vien' }
    ];

    const temperatureOptions = [
        { value: 'Warm', label: 'Warm' },
        { value: 'Cool', label: 'Cool' },
        { value: 'Neutral', label: 'Neutral' }
    ];

    return (
        <div className="w-full animate-fade-in group/filters">
            {/* Mobile/Tablet: Horizontal Scroll Container | Desktop: Grid */}
            <div className="glass-panel rounded-2xl py-3 md:py-4 px-4 md:px-8 flex items-center justify-between gap-4 shadow-2xl overflow-visible border border-white/5">
                
                <div className="flex-1 flex overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-hide gap-4 lg:grid lg:grid-cols-8 lg:gap-x-4 lg:gap-y-4 items-end">
                    {/* Name Search */}
                    <div className="flex flex-col group min-w-[140px] lg:min-w-0">
                        <label className="text-[8px] md:text-[9px] uppercase font-bold tracking-[0.2em] text-bronze/60 mb-1.5 font-display transition-colors">
                            Specimen Name
                        </label>
                        <div className="flex items-center border-b border-white/10 pb-1 h-9 transition-all focus-within:border-bronze w-full">
                            <span className="material-icons text-[10px] text-bronze/40 mr-1.5">search</span>
                            <input
                                type="text"
                                placeholder="Find..."
                                value={filters.name}
                                onChange={handleNameChange}
                                className="bg-transparent border-none p-0 focus:ring-0 text-xs text-luxury-cream placeholder:text-stone-600 font-serif italic outline-none w-full"
                            />
                        </div>
                    </div>

                    <div className="flex shrink-0 lg:contents gap-4">
                        <MultiSelect
                            label="Marble"
                            name="marble"
                            options={marbleOptions}
                            selectedValues={filters.marble}
                            onChange={handleMultiChange}
                            variant="premium"
                        />

                        <MultiSelect
                            label="Color"
                            name="color"
                            options={colorOptions}
                            selectedValues={filters.color}
                            onChange={handleMultiChange}
                            variant="premium"
                            displayType="swatch"
                        />

                        <MultiSelect
                            label="Finish"
                            name="finish"
                            options={finishOptions}
                            selectedValues={filters.finish}
                            onChange={handleMultiChange}
                            variant="premium"
                        />

                        <MultiSelect
                            label="Price"
                            name="priceRange"
                            options={priceOptions}
                            selectedValues={filters.priceRange}
                            onChange={handleMultiChange}
                            variant="premium"
                        />

                        <MultiSelect
                            label="Application"
                            name="application"
                            options={applicationOptions}
                            selectedValues={filters.application}
                            onChange={handleMultiChange}
                            variant="premium"
                        />

                        <MultiSelect
                            label="Pattern"
                            name="pattern"
                            options={patternOptions}
                            selectedValues={filters.pattern}
                            onChange={handleMultiChange}
                            variant="premium"
                        />

                        <MultiSelect
                            label="Temp"
                            name="temperature"
                            options={temperatureOptions}
                            selectedValues={filters.temperature}
                            onChange={handleMultiChange}
                            variant="premium"
                        />
                    </div>
                </div>

                <div className="flex items-center pl-4 border-l border-white/10 h-10">
                    <button
                        onClick={onReset}
                        className="group flex items-center justify-center p-2.5 text-white/20 hover:text-bronze transition-all bg-white/5 hover:bg-white/10 rounded-xl border border-white/5"
                        title="Reset Selection"
                    >
                        <Trash2 size={16} strokeWidth={1.5} className="group-hover:rotate-12 transition-transform" />
                    </button>
                </div>
            </div>
            
            {/* Scroll Hint (Mobile only) */}
            <div className="lg:hidden flex items-center justify-center gap-1 mt-2 opacity-30">
                <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                <p className="text-[7px] uppercase font-bold tracking-widest text-white">Slide for more filters</p>
                <div className="w-1 h-1 bg-white rounded-full animate-pulse delay-75"></div>
            </div>
        </div>
    );
};

export default FilterBar;
