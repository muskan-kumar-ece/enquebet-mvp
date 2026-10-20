"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
    Users, ShieldCheck, Crown, 
    UserMinus, ChevronDown, ChevronUp, History,
    Calendar
} from 'lucide-react';

interface TeamRosterProps {
    members: any[];
    isOwner: boolean;
    onUpdateRole: (memberId: string, role: string, roleTitle?: string) => void;
    onOpenRemoveModal: (member: any) => void;
    currentUserId?: string;
}

export function TeamRoster({
    members,
    isOwner,
    onUpdateRole,
    onOpenRemoveModal,
    currentUserId
}: TeamRosterProps) {
    const [showFormer, setShowFormer] = useState(false);

    const activeMembers = members.filter(m => m.status === 'active');
    const formerMembers = members.filter(m => m.status !== 'active');

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-brand" />
                        Active Team Roster ({activeMembers.length})
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                        Builders actively collaborating, reviewing, and contributing to this project.
                    </p>
                </div>
            </div>

            {/* Active Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {activeMembers.map((member: any) => {
                    const isTargetOwner = member.role === 'owner';
                    const isTargetLead = member.role === 'lead';
                    const isSelf = member.user?.id === currentUserId;

                    return (
                        <div 
                            key={member.id}
                            className="p-4 rounded-xl bg-[#0f111a] border border-[#1e2335] hover:border-zinc-700 transition-all flex flex-col justify-between shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#14192b] border border-brand/30 text-brand-light font-bold text-sm flex items-center justify-center">
                                        {member.user?.username?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Link 
                                                href={`/profile/${member.user?.username}`}
                                                className="text-xs font-bold text-white hover:text-brand-light transition-colors"
                                            >
                                                {member.user?.name || member.user?.username}
                                            </Link>
                                            <span className="text-[11px] text-text-secondary">
                                                @{member.user?.username}
                                            </span>
                                            {isSelf && (
                                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand/10 text-brand-light font-semibold">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-text-secondary mt-0.5">
                                            {member.role_title || (isTargetOwner ? 'Project Owner' : isTargetLead ? 'Team Lead' : 'Contributor')}
                                        </p>
                                    </div>
                                </div>

                                {/* Role Badge */}
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
                                    isTargetOwner 
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                        : isTargetLead
                                        ? 'bg-brand/10 text-brand-light border-brand/20'
                                        : 'bg-slate-500/10 text-slate-300 border-slate-500/20'
                                }`}>
                                    {isTargetOwner && <Crown className="w-2.5 h-2.5 text-amber-400" />}
                                    {isTargetLead && <ShieldCheck className="w-2.5 h-2.5 text-brand" />}
                                    {member.role.toUpperCase()}
                                </span>
                            </div>

                            {/* Meta & Actions */}
                            <div className="pt-3 border-t border-[#1e2335] flex items-center justify-between text-[11px] text-text-secondary">
                                <span className="flex items-center gap-1 text-[10px]">
                                    <Calendar className="w-3 h-3 text-text-secondary/70" />
                                    Joined {new Date(member.joined_at).toLocaleDateString()}
                                </span>

                                {/* Owner governance actions */}
                                {isOwner && !isTargetOwner && (
                                    <div className="flex items-center gap-1.5">
                                        <select
                                            value={member.role}
                                            onChange={(e) => onUpdateRole(member.id, e.target.value)}
                                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-surface border border-border text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                                        >
                                            <option value="lead">Promote to Lead</option>
                                            <option value="contributor">Contributor</option>
                                            <option value="owner">Transfer Ownership</option>
                                        </select>

                                        <button
                                            type="button"
                                            onClick={() => onOpenRemoveModal(member)}
                                            className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors"
                                            title="Remove team member"
                                        >
                                            <UserMinus className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Former Members Section */}
            {formerMembers.length > 0 && (
                <div className="pt-6">
                    <button
                        type="button"
                        onClick={() => setShowFormer(!showFormer)}
                        className="text-xs font-semibold text-text-secondary hover:text-white flex items-center gap-1.5 transition-colors mb-3"
                    >
                        <History className="w-3.5 h-3.5" />
                        <span>Former Team Members ({formerMembers.length})</span>
                        {showFormer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {showFormer && (
                        <div className="space-y-2">
                            {formerMembers.map((member: any) => (
                                <div 
                                    key={member.id}
                                    className="p-3 rounded-lg bg-[#0e0e17]/50 border border-border/40 flex items-center justify-between text-xs text-text-secondary"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-300">
                                            @{member.user?.username}
                                        </span>
                                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                            member.status === 'removed' ? 'bg-red-500/10 text-red-400' : 'bg-slate-500/10 text-slate-400'
                                        }`}>
                                            {member.status === 'removed' ? 'Removed' : 'Left Voluntarily'}
                                        </span>
                                    </div>

                                    <div className="text-[11px] text-right">
                                        {member.removal_reason && (
                                            <span className="text-text-secondary/80 italic block">
                                                Reason: {member.removal_reason}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-text-secondary/60">
                                            {member.left_at ? new Date(member.left_at).toLocaleDateString() : ''}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
