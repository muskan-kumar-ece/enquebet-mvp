"use client";

import React from 'react';
import { Cpu, Plus } from 'lucide-react';

interface SkillItem {
    skill_name: string;
    level?: 'beginner' | 'intermediate' | 'advanced' | string;
}

interface SkillsSummaryWidgetProps {
    skills?: any[];
    skillsDetailed?: SkillItem[];
    isOwner?: boolean;
    onManageSkills?: () => void;
}

const LEVEL_INDICATOR: Record<string, { label: string; dot: string; text: string }> = {
    advanced: {
        label: 'Adv',
        dot: 'bg-emerald-400',
        text: 'text-emerald-300'
    },
    intermediate: {
        label: 'Mid',
        dot: 'bg-[#1864ff]',
        text: 'text-blue-300'
    },
    beginner: {
        label: 'Beg',
        dot: 'bg-zinc-400',
        text: 'text-zinc-400'
    }
};

export default function SkillsSummaryWidget({
    skills = [],
    skillsDetailed = [],
    isOwner,
    onManageSkills
}: SkillsSummaryWidgetProps) {
    // Normalize skills list
    const normalizedSkills: SkillItem[] = React.useMemo(() => {
        if (Array.isArray(skillsDetailed) && skillsDetailed.length > 0) {
            return skillsDetailed.map((s) => ({
                skill_name: s.skill_name || (s as any).name || '',
                level: s.level || 'intermediate'
            }));
        }
        if (Array.isArray(skills) && skills.length > 0) {
            return skills.map((s) => {
                if (typeof s === 'string') {
                    return { skill_name: s, level: 'intermediate' };
                }
                return {
                    skill_name: s.skill_name || s.name || '',
                    level: s.level || 'intermediate'
                };
            });
        }
        return [];
    }, [skills, skillsDetailed]);

    return (
        <div className="rounded-2xl border border-[#1e2230] bg-[#0d1017] p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#1864ff]" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                        Technical Stack
                    </h3>
                </div>
                <span className="text-[11px] font-mono text-zinc-500">
                    {normalizedSkills.length} skill{normalizedSkills.length === 1 ? '' : 's'}
                </span>
            </div>

            {/* Skills Pills */}
            {normalizedSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {normalizedSkills.map((skill, idx) => {
                        const levelKey = (skill.level || 'intermediate').toLowerCase();
                        const indicator = LEVEL_INDICATOR[levelKey] || LEVEL_INDICATOR.intermediate;

                        return (
                            <div
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141824] border border-[#23283a] text-xs text-zinc-200 transition-colors hover:border-[#30374e]"
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${indicator.dot}`} />
                                <span className="font-medium">{skill.skill_name}</span>
                                <span className={`text-[10px] font-mono ${indicator.text} opacity-80`}>
                                    {indicator.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-4 bg-[#141824]/50 rounded-xl border border-[#23283a] border-dashed">
                    <p className="text-xs text-zinc-400">No skills listed yet.</p>
                    {isOwner && onManageSkills && (
                        <button
                            onClick={onManageSkills}
                            className="mt-2 text-xs font-medium text-[#1864ff] hover:underline"
                        >
                            + Add core skills
                        </button>
                    )}
                </div>
            )}

            {/* Footer action */}
            {isOwner && onManageSkills && normalizedSkills.length > 0 && (
                <button
                    onClick={onManageSkills}
                    className="mt-4 w-full py-1.5 px-3 rounded-lg bg-transparent hover:bg-[#141824] text-zinc-400 hover:text-zinc-200 border border-[#23283a] text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
                >
                    <Plus className="w-3 h-3 text-[#1864ff]" />
                    <span>Manage Skills</span>
                </button>
            )}
        </div>
    );
}
