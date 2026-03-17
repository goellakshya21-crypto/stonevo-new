import React from 'react';
import MultiSelect from './MultiSelect';
import { Trash2 } from 'lucide-react';

const FilterBar = ({ filters, setFilters, onSearch, onReset }) => {
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
        <div className="w-full animate-fade-in">
            <div className="glass-panel rounded-lg py-4 px-8 flex flex-wrap lg:flex-nowrap items-center justify-between gap-0 shadow-xl overflow-visible">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-x-4 gap-y-4 w-full lg:w-auto">
                    {/* Name Search */}
                    <div className="flex flex-col group">
                        <label className="text-[9px] uppercase font-semibold tracking-[0.15em] text-bronze mb-1 font-display transition-colors">
                            Name
                        </label>
                        <div className="flex items-center border-b border-luxury-cream/20 pb-1 h-8 transition-all focus-within:border-bronze w-full min-w-[80px]">
                            <span className="material-icons text-xs text-luxury-cream/50 mr-1 opacity-50">search</span>
                            <input
                                type="text"
                                placeholder="Find..."
                                value={filters.name}
                                onChange={handleNameChange}
                                className="bg-transparent border-none p-0 focus:ring-0 text-xs text-luxury-cream placeholder:text-stone-500 font-serif italic outline-none w-full"
                            />
                        </div>
                    </div>

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

                <div className="flex items-center gap-4 pl-4 border-l border-luxury-cream/10 ml-4">
                    <button
                        onClick={onSearch}
                        className="px-4 py-2 bg-bronze/90 hover:bg-bronze text-stone-900 text-[9px] font-bold uppercase tracking-[0.2em] rounded transition-all active:scale-95 shadow-lg shadow-bronze/10"
                    >
                        Search
                    </button>

                    <button
                        onClick={onReset}
                        className="group flex items-center justify-center p-2 text-luxury-cream/40 hover:text-bronze transition-all"
                        title="Reset Selection"
                    >
                        <Trash2 size={16} strokeWidth={1.5} className="group-hover:rotate-12 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FilterBar;
