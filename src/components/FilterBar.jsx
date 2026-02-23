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

    return (
        <div className="w-full animate-fade-in">
            <div className="glass-panel rounded-lg py-4 px-8 flex flex-wrap lg:flex-nowrap items-center justify-between gap-0 shadow-xl overflow-visible">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-x-12 gap-y-10 w-full lg:w-auto">
                    {/* Name Search */}
                    <div className="flex flex-col group">
                        <label className="text-[10px] uppercase font-semibold tracking-[0.15em] text-bronze mb-1 font-display transition-colors">
                            Name
                        </label>
                        <div className="flex items-center border-b border-luxury-cream/20 pb-2 h-10 transition-all focus-within:border-bronze w-fit min-w-[110px]">
                            <span className="material-icons text-sm text-luxury-cream/50 mr-2 opacity-50">search</span>
                            <input
                                type="text"
                                placeholder="Find slabs..."
                                value={filters.name}
                                onChange={handleNameChange}
                                className="bg-transparent border-none p-0 focus:ring-0 text-sm text-luxury-cream placeholder:text-stone-500 font-serif italic outline-none w-24"
                            />
                        </div>
                    </div>

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
                        label="Brightness"
                        name="brightness"
                        options={brightnessOptions}
                        selectedValues={filters.brightness}
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
                        label="Type"
                        name="type"
                        options={typeOptions}
                        selectedValues={filters.type}
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
                </div>

                <div className="flex items-center gap-4 pl-6 border-l border-luxury-cream/10 ml-4">
                    <button
                        onClick={onSearch}
                        className="px-6 py-2 bg-bronze/90 hover:bg-bronze text-stone-900 text-[10px] font-bold uppercase tracking-[0.2em] rounded transition-all active:scale-95 shadow-lg shadow-bronze/10"
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
