"use client";

import { useState } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { PULSE_DOMAINS } from './PulseNavigationTabs';
import toast from 'react-hot-toast';

interface PulsePreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
    followedCategories: string[];
    followedTechnologies: string[];
    onSavePreferences: (categories: string[], techs: string[]) => Promise<void>;
}

export function PulsePreferencesModal({
    isOpen,
    onClose,
    followedCategories,
    followedTechnologies,
    onSavePreferences,
}: PulsePreferencesModalProps) {
    const [selectedCats, setSelectedCats] = useState<string[]>(followedCategories);
    const [techs, setTechs] = useState<string[]>(followedTechnologies);
    const [newTech, setNewTech] = useState('');
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const toggleCat = (catValue: string) => {
        if (selectedCats.includes(catValue)) {
            setSelectedCats(selectedCats.filter((c) => c !== catValue));
        } else {
            setSelectedCats([...selectedCats, catValue]);
        }
    };

    const addTech = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newTech.trim();
        if (!trimmed) return;
        if (techs.includes(trimmed)) return;
        setTechs([...techs, trimmed]);
        setNewTech('');
    };

    const removeTech = (item: string) => {
        setTechs(techs.filter((t) => t !== item));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSavePreferences(selectedCats, techs);
            toast.success('Pulse preferences updated');
            onClose();
        } catch {
            toast.error('Could not save preferences');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-lg bg-[#0d1017] border border-[#1e2335] rounded-3xl p-6 sm:p-7 text-zinc-100 shadow-2xl space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#1e2335] pb-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#60a5fa]">
                        <SlidersHorizontal className="w-4 h-4 text-[#1864ff]" />
                        <span>CUSTOMIZE MY PULSE PREFERENCES</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#141824] transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Followed Domains */}
                <div className="space-y-2">
                    <label className="text-xs font-mono text-zinc-300 block">
                        Followed Engineering Domains
                    </label>
                    <p className="text-[11px] text-zinc-400">
                        Updates from these domains will be prioritized in your &quot;For You&quot; personalized feed.
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {PULSE_DOMAINS.filter((d) => d.value !== 'all').map((d) => {
                            const isSelected = selectedCats.includes(d.value);
                            return (
                                <button
                                    key={d.value}
                                    type="button"
                                    onClick={() => toggleCat(d.value)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-colors cursor-pointer border ${
                                        isSelected
                                            ? 'bg-[#1864ff]/20 text-[#60a5fa] border-[#1864ff]/40 font-semibold'
                                            : 'bg-[#090b11] text-zinc-400 hover:text-white border-[#1e2335]'
                                    }`}
                                >
                                    {d.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Followed Technologies */}
                <div className="space-y-2 border-t border-[#1e2335] pt-4">
                    <label className="text-xs font-mono text-zinc-300 block">
                        Followed Technologies & Stacks
                    </label>
                    <div className="flex flex-wrap gap-1.5 pb-2">
                        {techs.length === 0 ? (
                            <span className="text-xs text-zinc-500 font-mono italic">
                                No specific technologies tracked yet.
                            </span>
                        ) : (
                            techs.map((t) => (
                                <span
                                    key={t}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141824] text-xs font-mono text-zinc-200 border border-[#1e2335]"
                                >
                                    <span>{t}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeTech(t)}
                                        className="text-zinc-500 hover:text-rose-400"
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))
                        )}
                    </div>

                    <form onSubmit={addTech} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newTech}
                            onChange={(e) => setNewTech(e.target.value)}
                            placeholder="Add technology (e.g. Next.js, RISC-V)..."
                            className="flex-1 bg-[#090b11] border border-[#1e2335] rounded-xl px-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-[#1864ff]"
                        />
                        <button
                            type="submit"
                            className="px-3 py-1.5 rounded-xl bg-[#141824] hover:bg-[#1c2233] text-zinc-200 text-xs font-mono border border-[#1e2335] cursor-pointer"
                        >
                            Add
                        </button>
                    </form>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#1e2335]">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-xl bg-[#1864ff] hover:bg-[#1864ff]/90 text-white text-xs font-mono font-medium transition-colors"
                    >
                        Save Preferences
                    </button>
                </div>
            </div>
        </div>
    );
}
