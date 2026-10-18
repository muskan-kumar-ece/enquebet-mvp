"use client";

import React from 'react';
import { Sparkles, TrendingUp, Tag, FolderCode, Compass } from 'lucide-react';

interface TrendingDiscoverySectionProps {
    onSelectSkill: (skill: string) => void;
    onSelectCategory: (category: string) => void;
    onSelectPreset: (preset: { query?: string; category?: string; location?: string }) => void;
}

const POPULAR_SKILLS = [
    'Rust', 'Next.js', 'React', 'Python', 'TypeScript', 'PyTorch', 'Distributed Systems', 'Solidity', 'Figma', 'FastAPI', 'GraphQL', 'TailwindCSS'
];

const POPULAR_CATEGORIES = [
    'AI / ML', 'Web Development', 'Mobile Apps', 'FinTech', 'EdTech', 'Hardware / IoT', 'Blockchain', 'Design'
];

const DISCOVERY_PRESETS = [
    { label: 'AI & Autonomous Agents', query: 'agent AI' },
    { label: 'Rust & Systems Builders', query: 'Rust distributed' },
    { label: 'Design System Architects', query: 'Figma UI design' },
    { label: 'Stanford & Ivy Builders', query: 'Stanford' },
    { label: 'San Francisco Teams', location: 'San Francisco' },
];

export function TrendingDiscoverySection({
    onSelectSkill,
    onSelectCategory,
    onSelectPreset,
}: TrendingDiscoverySectionProps) {
    return (
        <div className="space-y-6 pt-4">
            {/* Quick Discovery Presets */}
            <div className="p-5 rounded-xl bg-[#0f111a] border border-[#1e2335] shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <Compass className="w-4 h-4 text-brand" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Curated Builder Tracks
                    </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {DISCOVERY_PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => onSelectPreset(preset)}
                            className="px-3 py-1.5 rounded-lg bg-surface hover:bg-brand/10 text-zinc-300 hover:text-brand-light border border-border hover:border-brand/30 text-xs font-medium transition-all"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Popular Skills */}
                <div className="p-5 rounded-xl bg-[#0f111a] border border-[#1e2335] shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Tag className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                            Popular Builder Skills
                        </h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {POPULAR_SKILLS.map((skill) => (
                            <button
                                key={skill}
                                onClick={() => onSelectSkill(skill)}
                                className="px-2.5 py-1 rounded-lg bg-[#0b0d14] hover:bg-emerald-500/15 border border-[#1e2335] hover:border-emerald-500/40 text-zinc-300 hover:text-emerald-300 text-xs font-mono transition-colors"
                            >
                                #{skill}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Popular Categories */}
                <div className="p-5 rounded-xl bg-[#0f111a] border border-[#1e2335] shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <FolderCode className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                            Project Categories
                        </h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {POPULAR_CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => onSelectCategory(cat)}
                                className="px-2.5 py-1 rounded-lg bg-[#0b0d14] hover:bg-cyan-500/15 border border-[#1e2335] hover:border-cyan-500/40 text-zinc-300 hover:text-cyan-300 text-xs font-medium transition-colors"
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
