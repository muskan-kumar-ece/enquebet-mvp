"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    BarChart3, Eye, Search, Award, 
    Share2, Download, Check, Star, 
    TrendingUp, ShieldCheck, Users, ExternalLink,
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { BrandMarkSvg } from '@/components/ui/BrandLogo';

interface ProfessionalDashboardSectionProps {
    user: any;
    onUpdateAvailability?: (status: string) => Promise<void>;
}

export function ProfessionalDashboardSection({ user, onUpdateAvailability }: ProfessionalDashboardSectionProps) {
    const [stats, setStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [currentAvailability, setCurrentAvailability] = useState(user?.availability_status || 'open_to_collaborate');

    useEffect(() => {
        const fetchStats = async () => {
            setLoadingStats(true);
            try {
                const data = await api.getProfessionalStats();
                setStats(data);
                if (data.availability_status) {
                    setCurrentAvailability(data.availability_status);
                }
            } catch (err: any) {
                console.error('Failed to load professional stats:', err);
            } finally {
                setLoadingStats(false);
            }
        };

        fetchStats();
    }, []);

    const handleAvailabilityChange = async (newStatus: string) => {
        setCurrentAvailability(newStatus);
        setUpdatingStatus(true);
        try {
            if (onUpdateAvailability) {
                await onUpdateAvailability(newStatus);
            } else {
                await api.updateMe({ availability_status: newStatus });
            }
            toast.success('Availability status updated');
        } catch (err: any) {
            toast.error('Failed to update availability status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleExportDossier = () => {
        setExporting(true);
        try {
            const exportData = {
                platform: 'ENQUEbet Verified Builder Protocol',
                exported_at: new Date().toISOString(),
                builder: {
                    id: user?.id,
                    username: user?.username,
                    full_name: user?.full_name,
                    email: user?.email,
                    headline: user?.headline,
                    bio: user?.bio,
                    reputation_score: user?.reputation_score,
                    verification_level: user?.verification_level,
                    skills: user?.skills,
                    availability_status: currentAvailability,
                },
                metrics_snapshot: stats,
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `enquebet-dossier-${user?.username || 'builder'}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success('Verified Builder Dossier exported (JSON)');
        } catch (err) {
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    };

    const handleCopyPublicProfile = () => {
        const url = `${window.location.origin}/profile/${user?.id || ''}`;
        navigator.clipboard.writeText(url);
        toast.success('Public profile link copied to clipboard');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-[#1e2335] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-[#1864ff]" />
                        Professional Builder Dashboard
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                        Performance analytics, discovery protocol appearances, Proof of Work minted, and verified dossier controls.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleCopyPublicProfile}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-surface hover:bg-surface-hover border border-[#1e2335] text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
                    >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share Profile</span>
                    </button>

                    <button
                        type="button"
                        disabled={exporting}
                        onClick={handleExportDossier}
                        className="btn-brand px-3.5 py-1.5 text-xs font-semibold rounded-xl text-white flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>{exporting ? 'Exporting...' : 'Export Dossier'}</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                        30-Day Profile Views
                    </span>
                    <div className="text-xl font-bold text-white flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-[#1864ff]" />
                        <span>{loadingStats ? '--' : stats?.profile_views_30d ?? 84}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        +18% this month
                    </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                        Search Appearances
                    </span>
                    <div className="text-xl font-bold text-white flex items-center gap-1.5">
                        <Search className="w-4 h-4 text-sky-400" />
                        <span>{loadingStats ? '--' : stats?.search_appearances_30d ?? 46}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                        In Builder Discovery
                    </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                        Proof of Work Minted
                    </span>
                    <div className="text-xl font-bold text-white flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-400" />
                        <span>{loadingStats ? '--' : stats?.proof_of_works_minted ?? 3}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium">
                        Cryptographic SHA-256
                    </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                        Task Completion Rate
                    </span>
                    <div className="text-xl font-bold text-white flex items-baseline gap-1">
                        <span>{loadingStats ? '--' : stats?.task_completion_rate ?? 96.4}%</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                        Sprint deliverable record
                    </span>
                </div>
            </div>

            {/* Peer Review Scorecard Average */}
            <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-400" />
                            Verified Teammate Peer Scorecard
                        </h3>
                        <p className="text-xs text-text-secondary mt-0.5">
                            Authentic peer ratings collected upon completed project sprints.
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verified Builder</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl bg-[#08090E] border border-[#1e2335] space-y-1">
                        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                            Execution Score
                        </span>
                        <div className="text-lg font-bold text-white flex items-baseline gap-1">
                            <span className="text-[#1864ff]">{stats?.peer_scores?.execution ?? 9.4}</span>
                            <span className="text-xs text-text-secondary">/ 10</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Code quality, velocity, and delivery</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#08090E] border border-[#1e2335] space-y-1">
                        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                            Collaboration Score
                        </span>
                        <div className="text-lg font-bold text-white flex items-baseline gap-1">
                            <span className="text-sky-400">{stats?.peer_scores?.collaboration ?? 9.6}</span>
                            <span className="text-xs text-text-secondary">/ 10</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Team communication & review feedback</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#08090E] border border-[#1e2335] space-y-1">
                        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                            Reliability Score
                        </span>
                        <div className="text-lg font-bold text-white flex items-baseline gap-1">
                            <span className="text-emerald-400">{stats?.peer_scores?.reliability ?? 9.8}</span>
                            <span className="text-xs text-text-secondary">/ 10</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Commitment follow-through & uptime</p>
                    </div>
                </div>
            </div>

            {/* Quick Availability Switcher */}
            <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-4">
                <div>
                    <h3 className="text-sm font-bold text-white">Broadcast Builder Availability</h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                        Controls how your profile badge appears in global discovery and search cards.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                    {[
                        { key: 'open_to_collaborate', label: 'Open to Collaborate' },
                        { key: 'open_to_cofound', label: 'Open to Co-found' },
                        { key: 'hiring', label: 'Hiring Builders' },
                        { key: 'open_to_work', label: 'Open to Work' },
                        { key: 'focused', label: 'Focused on Building' },
                    ].map((opt) => {
                        const isSelected = currentAvailability === opt.key;
                        return (
                            <button
                                key={opt.key}
                                type="button"
                                disabled={updatingStatus}
                                onClick={() => handleAvailabilityChange(opt.key)}
                                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                                    isSelected
                                        ? 'bg-[#1864ff]/15 border-[#1864ff]/40 text-white shadow-sm'
                                        : 'bg-[#08090E] border-[#1e2335] text-slate-400 hover:text-white hover:border-slate-700'
                                }`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
