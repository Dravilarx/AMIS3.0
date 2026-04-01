import React, { useState, useEffect, useRef } from 'react';
import { Search, History, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ComboboxOption {
    id: string;
    label: string;
    sublabel?: string;
}

interface SmartComboboxProps {
    options: ComboboxOption[];
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    storageKey: string;
    allowCustomText?: boolean;
    className?: string;
}

export const SmartCombobox: React.FC<SmartComboboxProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Buscar...',
    storageKey,
    allowCustomText = false,
    className
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [frequentIds, setFrequentIds] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load frequents from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                setFrequentIds(JSON.parse(saved));
            }
        } catch (e) {
            console.error('Error loading frequents from storage', e);
        }
    }, [storageKey]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync input with value if not open
    useEffect(() => {
        if (!isOpen) {
            const selectedOpt = options.find(o => o.id === value);
            setSearchTerm(selectedOpt ? selectedOpt.label : value);
        }
    }, [value, isOpen, options]);

    const handleSelect = (optionId: string, optionLabel: string) => {
        onChange(optionId);
        setSearchTerm(optionLabel);
        setIsOpen(false);

        // Update frequent list
        const updated = [optionId, ...frequentIds.filter(id => id !== optionId)].slice(0, 5);
        setFrequentIds(updated);
        localStorage.setItem(storageKey, JSON.stringify(updated));
    };

    const handleCustomSubmit = () => {
        if (allowCustomText && searchTerm.trim() !== '') {
            onChange(searchTerm);
            setIsOpen(false);

            // For custom text, we also save the actual text string as frequent
            const updated = [searchTerm, ...frequentIds.filter(id => id !== searchTerm)].slice(0, 5);
            setFrequentIds(updated);
            localStorage.setItem(storageKey, JSON.stringify(updated));
        }
    };

    // Derived lists
    const frequentOptions = frequentIds
        .map(id => options.find(o => o.id === id) || (allowCustomText ? { id, label: id } : null))
        .filter(Boolean) as ComboboxOption[];

    const filteredOptions = options.filter(o =>
        o.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.sublabel?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                className={cn(
                    "flex items-center w-full bg-brand-surface border-2 border-brand-border rounded-xl px-4 py-3 transition-all",
                    isOpen ? "border-brand-primary shadow-[0_0_20px_rgba(249,115,22,0.08)]" : "",
                    className
                )}
                onClick={() => setIsOpen(true)}
            >
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (filteredOptions.length === 1) {
                                handleSelect(filteredOptions[0].id, filteredOptions[0].label);
                            } else {
                                handleCustomSubmit();
                            }
                        }
                    }}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-none outline-none text-sm font-medium text-brand-text placeholder:text-brand-text/30"
                />
                <ChevronDown className={cn("w-4 h-4 text-brand-text/40 transition-transform", isOpen ? "rotate-180" : "")} />
            </div>

            {isOpen && (
                <div className="absolute top-[calc(100%+0.5rem)] left-0 w-full bg-brand-surface border border-brand-border rounded-2xl shadow-2xl overflow-hidden z-[100] max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2">

                    {/* Frecuentes */}
                    {frequentOptions.length > 0 && searchTerm === '' && (
                        <div className="p-2 border-b border-brand-border/50">
                            <div className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase font-black tracking-widest text-brand-primary">
                                <History className="w-3.5 h-3.5" />
                                Frecuentes
                            </div>
                            {frequentOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleSelect(opt.id, opt.label)}
                                    className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-brand-bg transition-colors flex flex-col group"
                                >
                                    <span className="text-sm font-bold text-brand-text group-hover:text-brand-primary">{opt.label}</span>
                                    {opt.sublabel && <span className="text-[10px] text-brand-text/40 uppercase font-black">{opt.sublabel}</span>}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Todos los resultados */}
                    <div className="p-2">
                        {searchTerm === '' && <div className="px-3 py-2 text-[10px] uppercase font-black tracking-widest text-brand-text/40">Catálogo Completo</div>}

                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-brand-text/40 font-bold flex flex-col gap-2 items-center">
                                <Search className="w-6 h-6 opacity-30" />
                                {allowCustomText
                                    ? <span>Presiona <kbd className="bg-brand-bg px-2 py-0.5 rounded text-[10px] uppercase">Enter</kbd> para agregar "{searchTerm}"</span>
                                    : "No se encontraron resultados"}
                            </div>
                        ) : (
                            filteredOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleSelect(opt.id, opt.label)}
                                    className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-brand-bg transition-colors flex flex-col group"
                                >
                                    <span className="text-sm font-bold text-brand-text group-hover:text-brand-primary">{opt.label}</span>
                                    {opt.sublabel && <span className="text-[10px] text-brand-text/40 uppercase font-black">{opt.sublabel}</span>}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
