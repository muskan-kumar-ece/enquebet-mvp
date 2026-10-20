"use client";

import { useState } from 'react';
import { 
    Bookmark, 
    Share2, 
    ArrowRight, 
    Edit2, 
    Trash2, 
    Check, 
    Sparkles, 
    Clock, 
    Code2, 
    Cpu, 
    ShieldAlert, 
    Radio, 
    Layers, 
    GraduationCap, 
    RefreshCw, 
    Rocket, 
    Compass,
    AlertTriangle
} from 'lucide-react';

interface PulseCardProps {
    update: any;
    isAdmin: boolean;
    onOpenDetail: (update: any) => void;
    onEdit?: (update: any) => void;
    onDelete?: (update: any) => void;
    onToggleSave?: (updateId: string) => Promise<void>;
}

export function PulseCard({
    update,
    isAdmin,
    onOpenDetail,
    onEdit,
    onDelete,
    onToggleSave,
}: PulseCardProps) {
    const [copied, setCopied] = useState(false);
    const [saved, setSaved] = useState<boolean>(Boolean(update.is_saved));
    const [saving, setSaving] = useState(false);

    const getDomainBadge = (category: string) => {
        switch (category) {
            case 'AI_ML':
                return { label: 'AI & Machine Learning', color: 'text-purple-400 bg-purple-500/10 border-purple-500/25', icon: Sparkles };
            case 'SOFTWARE':
            case 'PRODUCT_RELEASE':
                return { label: 'Software Dev', color: 'text-blue-400 bg-blue-500/10 border-blue-500/25', icon: Code2 };
            case 'ELECTRONICS':
            case 'ENGINEERING_DISPATCH':
                return { label: 'Electronics & Hardware', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25', icon: Cpu };
            case 'CYBERSECURITY':
            case 'SECURITY_MAINTENANCE':
                return { label: 'Cybersecurity', color: 'text-rose-400 bg-rose-500/10 border-rose-500/25', icon: ShieldAlert };
            case 'CLOUD_DEVOPS':
            case 'PROTOCOL_NETWORK':
                return { label: 'Cloud & Infra', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', icon: Radio };
            case 'CAREERS':
                return { label: 'Careers & Opportunities', color: 'text-amber-400 bg-amber-500/10 border-amber-500/25', icon: GraduationCap };
            case 'LIFECYCLE':
                return { label: 'Tech Lifecycle', color: 'text-orange-400 bg-orange-500/10 border-orange-500/25', icon: RefreshCw };
            case 'STARTUPS':
                return { label: 'Startups & Industry', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25', icon: Rocket };
            case 'RESEARCH_SCIENCE':
                return { label: 'Research & Science', color: 'text-teal-400 bg-teal-500/10 border-teal-500/25', icon: Compass };
            default:
                return { label: update.category_display || 'Intelligence', color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/25', icon: Layers };
        }
    };

    const getImportanceBadge = (importance: string) => {
        switch (importance) {
            case 'CRITICAL':
                return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> Critical</span>;
            case 'HIGH':
                return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400">High Priority</span>;
            default:
                return null;
        }
    };

    const domain = getDomainBadge(update.category);
    const DomainIcon = domain.icon;

    const formattedDate = new Date(update.published_at || update.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}/updates?selected=${update.slug || update.id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (saving) return;
        setSaving(true);
        const nextState = !saved;
        setSaved(nextState);
        try {
            if (onToggleSave) {
                await onToggleSave(update.slug || update.id);
            }
        } catch {
            setSaved(!nextState);
        } finally {
            setSaving(false);
        }
    };

    return (
        <article
            onClick={() => onOpenDetail(update)}
            className="group relative bg-[#0d1017] hover:bg-[#10141f] border border-[#1e2335] hover:border-[#2a324b] rounded-2xl p-4 sm:p-5 transition-all duration-150 cursor-pointer flex flex-col justify-between"
        >
            <div className="space-y-3">
                {/* Header row: Domain + Importance + Reading Time */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-mono border ${domain.color}`}>
                            <DomainIcon className="w-3 h-3" />
                            {domain.label}
                        </span>
                        {getImportanceBadge(update.importance)}
                        {update.is_top_story && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#1864ff]/15 border border-[#1864ff]/30 text-[#60a5fa] font-semibold">
                                ★ Lead Story
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-mono">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {update.reading_time_minutes || 3}m read
                        </span>
                        <span>·</span>
                        <span>{formattedDate}</span>
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-[#60a5fa] transition-colors leading-snug">
                    {update.title}
                </h3>

                {/* Level 1: In 30 Seconds Summary */}
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed line-clamp-2">
                    {update.summary}
                </p>

                {/* Level 1: Why it matters highlight */}
                {update.why_it_matters && (
                    <div className="text-xs bg-[#090b11] border-l-2 border-[#1864ff] rounded-r-lg px-3 py-2 text-zinc-400">
                        <strong className="text-zinc-200 font-semibold font-mono">Why it matters: </strong>
                        <span className="line-clamp-2">{update.why_it_matters}</span>
                    </div>
                )}

                {/* Target Audience tag if present */}
                {update.who_should_care && (
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
                        <span className="text-zinc-500">Audience:</span>
                        <span className="text-zinc-300 truncate">{update.who_should_care}</span>
                    </div>
                )}

                {/* Opportunity or Lifecycle mini badge */}
                {update.opportunity_meta?.deadline && (
                    <div className="flex items-center gap-2 text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                        <span>Deadline: {update.opportunity_meta.deadline}</span>
                        {update.opportunity_meta.stipend && <span>· {update.opportunity_meta.stipend}</span>}
                    </div>
                )}

                {update.lifecycle_meta?.affected_version && (
                    <div className="flex items-center gap-2 text-xs font-mono text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-lg">
                        <span>EOL: {update.lifecycle_meta.affected_version}</span>
                        <span>→ Upgrade to {update.lifecycle_meta.recommended_version}</span>
                    </div>
                )}
            </div>

            {/* Card Footer: Source Attribution & Action Buttons */}
            <div className="mt-4 pt-3 border-t border-[#1e2335]/80 flex items-center justify-between gap-2 text-xs">
                {/* Source attribution */}
                <div className="text-zinc-500 truncate text-[11px] font-mono flex items-center gap-1">
                    {update.primary_source_name ? (
                        <>
                            <span>Source:</span>
                            <span className="text-zinc-400 hover:text-white underline underline-offset-2">
                                {update.primary_source_name}
                            </span>
                        </>
                    ) : (
                        <span>Verified Engineering Dispatch</span>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Bookmark / Save */}
                    <button
                        onClick={handleSave}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            saved
                                ? 'bg-[#1864ff]/20 text-[#60a5fa] border-[#1864ff]/30'
                                : 'text-zinc-400 hover:text-white border-transparent hover:border-[#1e2335] hover:bg-[#141824]'
                        }`}
                        title={saved ? 'Saved in My Pulse' : 'Save Update'}
                    >
                        <Bookmark className="w-3.5 h-3.5" fill={saved ? 'currentColor' : 'none'} />
                    </button>

                    {/* Share */}
                    <button
                        onClick={handleShare}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#141824] border border-transparent hover:border-[#1e2335] transition-colors cursor-pointer"
                        title="Copy Link"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                    </button>

                    {/* Admin Actions */}
                    {isAdmin && onEdit && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(update);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-[#141824] border border-transparent hover:border-[#1e2335] transition-colors cursor-pointer"
                            title="Edit Update"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {isAdmin && onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(update);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-[#141824] border border-transparent hover:border-[#1e2335] transition-colors cursor-pointer"
                            title="Delete Update"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Expand CTA */}
                    <button
                        onClick={() => onOpenDetail(update)}
                        className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#141824] hover:bg-[#1b2233] text-zinc-200 text-[11px] font-mono font-medium border border-[#222a40] transition-colors cursor-pointer"
                    >
                        <span>Brief</span>
                        <ArrowRight className="w-3 h-3 text-[#60a5fa] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </div>
        </article>
    );
}

// Backward-compatible alias
export const UpdateCard = PulseCard;
