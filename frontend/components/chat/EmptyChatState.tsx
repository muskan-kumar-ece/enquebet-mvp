"use client";

import React from 'react';
import { MessageSquare, ShieldCheck, Zap } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';

interface EmptyChatStateProps {
    type?: 'no_conversation' | 'no_messages';
    onNewSearch?: () => void;
}

export function EmptyChatState({ type = 'no_conversation', onNewSearch }: EmptyChatStateProps) {
    if (type === 'no_messages') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-blueprint-grid">
                <div className="w-14 h-14 rounded-2xl bg-[#0e111c] border border-[#1e2436] flex items-center justify-center mb-4 text-brand-light shadow-md">
                    <MessageSquare className="w-7 h-7 text-brand-light" />
                </div>
                <h3 className="text-base font-bold text-text-primary mb-1.5">No messages in this channel yet</h3>
                <p className="text-xs sm:text-sm text-text-secondary max-w-sm mb-5 leading-relaxed">
                    Kick off the collaboration! Discuss architecture, share milestones, or coordinate project tasks.
                </p>
                <div className="flex items-center gap-2 text-xs text-text-muted bg-[#0c0e17] border border-border-default px-3.5 py-1.5 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Real-time end-to-end builder channel</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-blueprint-grid relative">
            <div className="relative mb-6 z-10">
                <div className="p-3 rounded-2xl bg-[#0c0f1b] border border-[#1e263c] shadow-xl relative group">
                    <BrandLogo size="xl" mode="vector" withText={false} priority />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0a0d16] border border-[#1e263c] flex items-center justify-center text-brand-light shadow">
                        <Zap className="w-3 h-3 fill-current text-brand-light" />
                    </div>
                </div>
            </div>

            <div className="z-10 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">
                        ENQUE<span className="text-brand-primary font-black ml-0.5">bet</span> Messenger
                    </span>
                </div>
                <h3 className="text-xs font-semibold text-text-secondary mb-2 tracking-wider uppercase">Select a Conversation</h3>
                <p className="text-xs sm:text-sm text-text-secondary max-w-sm mb-6 leading-relaxed">
                    Connect with co-builders and project teams in real-time. Choose a direct message or project workspace channel from the sidebar.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {onNewSearch && (
                        <button
                            onClick={onNewSearch}
                            className="btn-primary !py-2 !px-4 text-xs font-semibold"
                        >
                            Find Builders to Message
                        </button>
                    )}
                    <div className="flex items-center gap-2 text-xs text-text-muted border border-border-default bg-[#0c0e17] px-3.5 py-2 rounded-lg">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>WebSocket Real-Time Sync</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
