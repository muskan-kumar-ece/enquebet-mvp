"use client";

import { useState, useEffect } from 'react';
import { X, Wrench, Layers, ArrowRight, Check, AlertCircle, PlusCircle, ExternalLink, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface BuildProjectModalProps {
    update: any | null;
    isOpen: boolean;
    onClose: () => void;
}

export function BuildProjectModal({
    update,
    isOpen,
    onClose,
}: BuildProjectModalProps) {
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
    const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [successTask, setSuccessTask] = useState<any | null>(null);

    useEffect(() => {
        if (isOpen && update) {
            setSuccessTask(null);
            setLoadingWorkspaces(true);
            api.getMyWorkspaces()
                .then((list) => {
                    setWorkspaces(list);
                    if (list.length > 0) {
                        setSelectedWorkspaceId(list[0].id);
                    }
                })
                .catch(() => {
                    setWorkspaces([]);
                })
                .finally(() => {
                    setLoadingWorkspaces(false);
                });
        }
    }, [isOpen, update]);

    if (!isOpen || !update) return null;

    const buildIdea = update.build_this_idea || {};

    const handleCreateTask = async () => {
        if (!selectedWorkspaceId) {
            toast.error('Please select an active workspace');
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.createPulseWorkspaceTask(update.slug || update.id, selectedWorkspaceId);
            setSuccessTask(res);
            toast.success('Project task seeded into your workspace!');
        } catch (err: any) {
            toast.error(err.message || 'Failed to seed workspace task');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-lg bg-[#0d1017] border border-[#1e2335] rounded-3xl p-6 sm:p-7 text-zinc-100 shadow-2xl space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#1e2335] pb-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#60a5fa]">
                        <Wrench className="w-4 h-4 text-[#1864ff]" />
                        <span>BUILD THIS IDEA · WORKSPACE INTEGRATION</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#141824] transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Project Idea Preview */}
                <div className="p-4 rounded-2xl bg-[#090b11] border border-[#1e2335] space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-400">Inspired by:</span>
                        <span className="text-[#60a5fa] truncate max-w-[200px]">{update.title}</span>
                    </div>
                    <h4 className="text-base font-bold text-white">
                        {buildIdea.title || 'Micro-Project Prototype'}
                    </h4>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                        {buildIdea.description}
                    </p>
                    <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-400 pt-1">
                        {buildIdea.stack && (
                            <div>
                                <span className="text-zinc-500">Stack: </span>
                                <span className="text-zinc-200">{buildIdea.stack}</span>
                            </div>
                        )}
                        {buildIdea.difficulty && (
                            <div>
                                <span className="text-zinc-500">Difficulty: </span>
                                <span className="text-emerald-400">{buildIdea.difficulty}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Success State */}
                {successTask ? (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-3 text-center">
                        <div className="inline-flex p-2 rounded-full bg-emerald-500/20 text-emerald-400">
                            <Check className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold text-white">
                            Task Successfully Created in Workspace!
                        </h4>
                        <p className="text-xs text-zinc-300">
                            Your team can now assign builders, track milestones, and submit verifiable deliverables toward Proof of Work.
                        </p>
                        <div className="pt-2 flex items-center justify-center gap-2">
                            <Link
                                href={`/workspace/${successTask.workspace_id}`}
                                className="px-4 py-2 rounded-xl bg-[#1864ff] hover:bg-[#1864ff]/90 text-white text-xs font-mono transition-colors"
                            >
                                Open Workspace
                            </Link>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl bg-[#141824] hover:bg-[#1a2030] text-zinc-300 text-xs font-mono border border-[#1e2335] transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Workspace Selection Form */
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-zinc-300 block">
                                Select Destination Workspace
                            </label>
                            {loadingWorkspaces ? (
                                <div className="p-3 text-center text-xs font-mono text-zinc-500 animate-pulse bg-[#090b11] rounded-xl border border-[#1e2335]">
                                    Loading your active workspaces...
                                </div>
                            ) : workspaces.length === 0 ? (
                                <div className="p-3 bg-[#090b11] border border-[#1e2335] rounded-xl space-y-2 text-center">
                                    <p className="text-xs text-zinc-400">
                                        You are not an active member of any workspace yet.
                                    </p>
                                    <Link
                                        href={`/create?title=${encodeURIComponent(buildIdea.title || '')}&category=tech`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1864ff] text-white text-xs font-mono"
                                    >
                                        <PlusCircle className="w-3.5 h-3.5" />
                                        <span>Create Project Collaboration</span>
                                    </Link>
                                </div>
                            ) : (
                                <select
                                    value={selectedWorkspaceId}
                                    onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                                    className="w-full bg-[#090b11] border border-[#1e2335] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#1864ff] font-mono cursor-pointer"
                                >
                                    {workspaces.map((ws) => (
                                        <option key={ws.id} value={ws.id} className="bg-[#0d1017]">
                                            {ws.post?.title || ws.title || 'Untitled Workspace'} ({ws.status})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Or start a collaboration */}
                        <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                            <span>Want to form a new team for this?</span>
                            <Link
                                href={`/create?title=${encodeURIComponent(buildIdea.title || '')}&category=tech`}
                                className="text-[#60a5fa] hover:underline font-mono flex items-center gap-1"
                            >
                                <span>Start Project Post</span>
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e2335]">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white hover:bg-[#141824] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTask}
                                disabled={submitting || !selectedWorkspaceId}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1864ff] hover:bg-[#1864ff]/90 text-white text-xs font-mono font-medium transition-colors disabled:opacity-40 cursor-pointer"
                            >
                                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
                                <span>Seed Task in Workspace</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
