"use client";

import React from 'react';
import Link from 'next/link';
import {
    Briefcase,
    GraduationCap,
    Calendar,
    MapPin,
    ShieldCheck,
    Plus,
    Trash2,
    Edit2,
    ExternalLink
} from 'lucide-react';

interface Experience {
    id: string;
    company_name: string;
    role_title: string;
    location?: string;
    is_remote?: boolean;
    start_date: string;
    end_date?: string;
    is_current?: boolean;
    description?: string;
    skills_used?: string[];
    verified_pow?: string;
    verified_pow_code?: string;
}

interface Education {
    id: string;
    institution: string;
    degree: string;
    field_of_study?: string;
    start_year: number;
    end_year?: number;
    is_campus_verified?: boolean;
}

interface ExperienceTimelineProps {
    experiences: Experience[];
    educations: Education[];
    isOwner?: boolean;
    onAddExperience?: () => void;
    onAddEducation?: () => void;
    onDeleteExperience?: (id: string) => void;
    onDeleteEducation?: (id: string) => void;
}

function formatDateRange(startDate?: string, endDate?: string, isCurrent?: boolean) {
    if (!startDate) return '';
    const start = new Date(startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    if (isCurrent) return `${start} - Present`;
    if (!endDate) return start;
    const end = new Date(endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    return `${start} - ${end}`;
}

export default function ExperienceTimeline({
    experiences = [],
    educations = [],
    isOwner,
    onAddExperience,
    onAddEducation,
    onDeleteExperience,
    onDeleteEducation
}: ExperienceTimelineProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Experience & Ventures Column */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#0c0c14]/90 backdrop-blur-xl p-6 sm:p-7 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                        <Briefcase className="w-5 h-5 text-[#4f8fff]" />
                        <h2 className="text-lg font-bold text-white tracking-tight">Venture & Engineering Roles</h2>
                    </div>
                    {isOwner && onAddExperience && (
                        <button
                            onClick={onAddExperience}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] transition-all"
                        >
                            <Plus className="w-3.5 h-3.5 text-[#4f8fff]" />
                            <span>Add Role</span>
                        </button>
                    )}
                </div>

                {experiences.length === 0 ? (
                    <div className="text-center py-8">
                        <Briefcase className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="text-sm text-zinc-400">No professional roles recorded yet.</p>
                        {isOwner && onAddExperience && (
                            <button
                                onClick={onAddExperience}
                                className="mt-3 text-xs text-[#4f8fff] hover:text-[#3b82f6] font-semibold"
                            >
                                + Add your first experience
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/[0.08]">
                        {experiences.map((exp) => (
                            <div key={exp.id} className="relative group">
                                {/* Timeline Dot */}
                                <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-[#1864ff] border-2 border-[#0c0c14] shadow-[0_0_8px_rgba(24,100,255,0.4)]" />

                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-white">{exp.role_title}</h3>
                                        <div className="text-xs text-[#4f8fff] font-medium mt-0.5">
                                            {exp.company_name}
                                            {exp.is_remote && (
                                                <span className="text-zinc-500 font-normal"> · Remote</span>
                                            )}
                                        </div>
                                    </div>

                                    {isOwner && onDeleteExperience && (
                                        <button
                                            onClick={() => onDeleteExperience(exp.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-all"
                                            title="Delete Role"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1 mb-2">
                                    <Calendar className="w-3 h-3 text-zinc-500" />
                                    <span>{formatDateRange(exp.start_date, exp.end_date, exp.is_current)}</span>
                                    {exp.location && (
                                        <>
                                            <span>·</span>
                                            <span>{exp.location}</span>
                                        </>
                                    )}
                                </div>

                                {exp.description && (
                                    <p className="text-xs text-zinc-300 leading-relaxed mb-2.5 whitespace-pre-line">
                                        {exp.description}
                                    </p>
                                )}

                                {/* Verified Proof of Work Token Link */}
                                {exp.verified_pow_code && (
                                    <div className="mb-2.5">
                                        <Link
                                            href={`/proof/${exp.verified_pow_code}`}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[11px] hover:border-emerald-500/40 transition-colors"
                                        >
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Backed by PoW: {exp.verified_pow_code}</span>
                                        </Link>
                                    </div>
                                )}

                                {/* Skills Tagged */}
                                {exp.skills_used && exp.skills_used.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {exp.skills_used.map((skill, idx) => (
                                            <span
                                                key={idx}
                                                className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-300 border border-white/[0.06]"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Academic & Campus Credentials Column */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#0c0c14]/90 backdrop-blur-xl p-6 sm:p-7 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                        <GraduationCap className="w-5 h-5 text-[#4f8fff]" />
                        <h2 className="text-lg font-bold text-white tracking-tight">Academic & Campus Credentials</h2>
                    </div>
                    {isOwner && onAddEducation && (
                        <button
                            onClick={onAddEducation}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] transition-all"
                        >
                            <Plus className="w-3.5 h-3.5 text-[#4f8fff]" />
                            <span>Add Education</span>
                        </button>
                    )}
                </div>

                {educations.length === 0 ? (
                    <div className="text-center py-8">
                        <GraduationCap className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="text-sm text-zinc-400">No academic credentials recorded yet.</p>
                        {isOwner && onAddEducation && (
                            <button
                                onClick={onAddEducation}
                                className="mt-3 text-xs text-[#4f8fff] hover:text-[#3b82f6] font-semibold"
                            >
                                + Add your education
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/[0.08]">
                        {educations.map((edu) => (
                            <div key={edu.id} className="relative group">
                                {/* Timeline Dot */}
                                <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0c0c14] shadow-[0_0_8px_rgba(52,211,153,0.5)]" />

                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-bold text-white">{edu.institution}</h3>
                                            {edu.is_campus_verified && (
                                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                                                    <ShieldCheck className="w-3 h-3" />
                                                    <span>Verified Campus</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-[#4f8fff] font-medium mt-0.5">
                                            {edu.degree}
                                            {edu.field_of_study && <span> · {edu.field_of_study}</span>}
                                        </div>
                                    </div>

                                    {isOwner && onDeleteEducation && (
                                        <button
                                            onClick={() => onDeleteEducation(edu.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-all"
                                            title="Delete Education"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
                                    <Calendar className="w-3 h-3 text-zinc-500" />
                                    <span>
                                        {edu.start_year}
                                        {edu.end_year ? ` - ${edu.end_year}` : ' - Present'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
