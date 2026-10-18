"use client";

import React from 'react';
import Link from 'next/link';
import {
    MapPin,
    GraduationCap,
    Users,
    Briefcase,
    ArrowRight,
    Tag,
    Globe,
} from 'lucide-react';
import { VerificationBadge } from '@/components/ui/BuilderBadge';

interface ProjectSearchResultCardProps {
    project: any;
    searchHighlight?: string;
}

export function ProjectSearchResultCard({
    project,
    searchHighlight = '',
}: ProjectSearchResultCardProps) {
    const author = project.user || {};
    const authorInitial = (author.full_name || author.username || 'P')[0].toUpperCase();

    return (
        <div className="p-4 sm:p-5 rounded-xl bg-[#0f111a] border border-[#1e2335] hover:border-zinc-700 transition-all duration-200 flex flex-col justify-between group shadow-sm">
            <div className="space-y-3">
                {/* Header: Author + Category */}
                <div className="flex items-center justify-between gap-2">
                    <Link
                        href={`/profile/${author.username}`}
                        className="flex items-center gap-2 group/author min-w-0"
                    >
                        {author.profile_image ? (
                            <img
                                src={author.profile_image}
                                alt={author.full_name}
                                className="w-6 h-6 rounded-md object-cover border border-zinc-700/60"
                            />
                        ) : (
                            <div className="w-6 h-6 rounded-md bg-[#14192b] text-brand-light font-bold text-[10px] flex items-center justify-center border border-brand/20">
                                {authorInitial}
                            </div>
                        )}
                        <span className="text-xs font-medium text-zinc-300 group-hover/author:text-white transition-colors truncate">
                            {author.full_name || author.username}
                        </span>
                        <VerificationBadge level={author.verification_level} />
                    </Link>

                    {project.category && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shrink-0">
                            {project.category}
                        </span>
                    )}
                </div>

                {/* Title */}
                <Link href={`/post/${project.id}`}>
                    <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-brand-light transition-colors line-clamp-1">
                        {project.title}
                    </h3>
                </Link>

                {/* Description */}
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {project.description}
                </p>

                {/* Location / Remote meta */}
                <div className="flex items-center gap-3 text-[11px] text-zinc-400 flex-wrap">
                    {project.is_remote ? (
                        <div className="flex items-center gap-1 text-emerald-400">
                            <Globe className="w-3.5 h-3.5" />
                            <span>Remote Friendly</span>
                        </div>
                    ) : project.location ? (
                        <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="truncate max-w-[140px]">{project.location}</span>
                        </div>
                    ) : null}

                    {project.college && (
                        <div className="flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="truncate max-w-[140px]">{project.college}</span>
                        </div>
                    )}
                </div>

                {/* Required Roles Chips */}
                {project.requirements && project.requirements.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400 block">
                            Open Roles:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {project.requirements.map((req: any, i: number) => {
                                const roleName = typeof req === 'string' ? req : req.role_name;
                                const isMatch =
                                    searchHighlight &&
                                    roleName.toLowerCase().includes(searchHighlight.toLowerCase());
                                return (
                                    <span
                                        key={i}
                                        className={`px-2 py-0.5 text-[11px] rounded-md border font-medium ${
                                            isMatch
                                                ? 'bg-brand/20 border-brand/50 text-brand-light font-semibold'
                                                : 'bg-brand/10 border-brand/20 text-brand-light'
                                        }`}
                                    >
                                        {roleName}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom: Collaborators & CTA */}
            <div className="flex items-center justify-between pt-4 mt-3 border-t border-border">
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>{project.collaborators?.length ?? 1} members</span>
                </div>

                <Link
                    href={`/post/${project.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-light hover:text-brand transition-colors"
                >
                    <span>View Project</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
            </div>
        </div>
    );
}
