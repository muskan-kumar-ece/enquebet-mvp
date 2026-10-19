"use client";

import React, { useState } from 'react';
import {
    ShieldCheck,
    CheckCircle2,
    XCircle,
    AlertCircle,
    RotateCcw,
    Send,
    FileText,
    ExternalLink,
    Lock,
    Eye,
    BookOpen,
    Users,
    Activity,
    Loader2
} from 'lucide-react';
import { ResearchPaper } from '@/lib/researchData';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface AdminResearchStudioProps {
    papers: ResearchPaper[];
    onPaperUpdated: (updatedPaper: ResearchPaper) => void;
    onRefresh: () => void;
}

export function AdminResearchStudio({
    papers,
    onPaperUpdated,
    onRefresh,
}: AdminResearchStudioProps) {
    const [activeQueue, setActiveQueue] = useState<'screening' | 'review' | 'revisions' | 'publication'>('screening');
    const [selectedPaper, setSelectedPaper] = useState<ResearchPaper | null>(null);

    // Decision Form State
    const [feedback, setFeedback] = useState('');
    const [editorialNotes, setEditorialNotes] = useState('');
    const [checklist, setChecklist] = useState({
        scopeValid: true,
        methodologySound: true,
        referencesFormatted: true,
        codeOrBomProvided: true,
    });
    const [isProcessing, setIsProcessing] = useState(false);

    // Queue filtering
    const screeningPapers = papers.filter(p => p.status === 'PENDING_APPROVAL' || p.status === 'SUBMITTED');
    const underReviewPapers = papers.filter(p => p.status === 'UNDER_REVIEW');
    const revisionPapers = papers.filter(p => p.status === 'REVISION_REQUIRED');
    const publicationPapers = papers.filter(p => p.status === 'ACCEPTED');

    const activeList = activeQueue === 'screening' ? screeningPapers :
        activeQueue === 'review' ? underReviewPapers :
        activeQueue === 'revisions' ? revisionPapers : publicationPapers;

    const handleSelectPaper = (paper: ResearchPaper) => {
        setSelectedPaper(paper);
        setFeedback(paper.author_feedback || '');
        setEditorialNotes(paper.internal_editorial_notes || '');
    };

    const handleApprove = async () => {
        if (!selectedPaper) return;
        setIsProcessing(true);
        try {
            const updated = await api.approveResearchPaper(selectedPaper.slug || selectedPaper.paper_code);
            toast.success(`Paper '${selectedPaper.paper_code}' approved for publication.`);
            onPaperUpdated(updated);
            setSelectedPaper(null);
            onRefresh();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to approve paper.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRequestRevisions = async () => {
        if (!selectedPaper) return;
        if (!feedback.trim()) {
            toast.error('Constructive feedback is required when requesting revisions.');
            return;
        }

        setIsProcessing(true);
        try {
            const updated = await api.requestPaperRevisions(selectedPaper.slug || selectedPaper.paper_code, {
                feedback: feedback.trim(),
                editorial_notes: editorialNotes.trim() || undefined,
                checklist,
            });
            toast.success(`Revisions requested from author on '${selectedPaper.paper_code}'.`);
            onPaperUpdated(updated);
            setSelectedPaper(null);
            onRefresh();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to request revisions.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedPaper) return;
        const reason = feedback.trim() || 'Did not meet academic standards or formatting requirements.';
        setIsProcessing(true);
        try {
            const updated = await api.rejectResearchPaper(selectedPaper.slug || selectedPaper.paper_code, reason);
            toast.success(`Paper '${selectedPaper.paper_code}' has been rejected.`);
            onPaperUpdated(updated);
            setSelectedPaper(null);
            onRefresh();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to reject paper.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePublish = async (targetStatus: string = 'PREPRINT') => {
        if (!selectedPaper) return;
        setIsProcessing(true);
        try {
            const updated = await api.publishResearchPaper(selectedPaper.slug || selectedPaper.paper_code, targetStatus);
            toast.success(`Paper '${selectedPaper.paper_code}' published as an open ${targetStatus}!`);
            onPaperUpdated(updated);
            setSelectedPaper(null);
            onRefresh();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to publish paper.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header banner */}
            <div className="p-5 rounded-2xl bg-[#0d1017] border border-[#1e2335] flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#1864ff]/10 text-[#4f8fff] border border-[#1864ff]/20">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white font-mono">Admin Research Editorial Studio</h2>
                        <p className="text-xs text-zinc-400">
                            Screen preprints, evaluate academic checklists, request revisions, and verify publication metadata.
                        </p>
                    </div>
                </div>

                <button
                    onClick={onRefresh}
                    className="px-3 py-1.5 rounded-xl bg-[#121624] hover:bg-[#1a2034] text-xs font-mono text-zinc-300 hover:text-white border border-[#1e2335] transition"
                >
                    Refresh Queue
                </button>
            </div>

            {/* Queue Switcher */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                {[
                    { id: 'screening', label: 'Screening Queue', count: screeningPapers.length, color: 'text-amber-400' },
                    { id: 'review', label: 'Peer Review', count: underReviewPapers.length, color: 'text-cyan-400' },
                    { id: 'revisions', label: 'Revisions Pending', count: revisionPapers.length, color: 'text-rose-400' },
                    { id: 'publication', label: 'Publication Ready', count: publicationPapers.length, color: 'text-emerald-400' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveQueue(tab.id as any);
                            setSelectedPaper(null);
                        }}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                            activeQueue === tab.id
                                ? 'bg-[#121624] border-[#1864ff] text-white shadow-sm'
                                : 'bg-[#0d1017] border-[#1e2335] text-zinc-400 hover:border-zinc-700'
                        }`}
                    >
                        <span className="text-[11px] uppercase tracking-wider">{tab.label}</span>
                        <div className="flex items-baseline justify-between">
                            <span className={`text-xl font-bold font-sans ${tab.color}`}>{tab.count}</span>
                            <span className="text-[10px] text-zinc-500">manuscripts</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Queue Grid + Inspection Drawer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Papers list */}
                <div className="lg:col-span-6 space-y-3">
                    {activeList.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-[#0d1017] border border-[#1e2335] text-center space-y-2 font-mono text-xs text-zinc-500">
                            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                            <p>Queue is empty for this stage.</p>
                        </div>
                    ) : (
                        activeList.map((paper) => (
                            <div
                                key={paper.id}
                                onClick={() => handleSelectPaper(paper)}
                                className={`p-4 rounded-xl border cursor-pointer transition text-xs font-mono space-y-2 ${
                                    selectedPaper?.id === paper.id
                                        ? 'bg-[#141824] border-[#1864ff] text-white'
                                        : 'bg-[#0d1017] border-[#1e2335] text-zinc-300 hover:border-zinc-700'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-[#4f8fff]">{paper.paper_code}</span>
                                    <span className="text-[10px] text-zinc-500">{paper.field_display || paper.field}</span>
                                </div>
                                <h4 className="font-bold text-sm font-sans text-white line-clamp-2">
                                    {paper.title}
                                </h4>
                                <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                                    <span>By @{paper.primary_author?.username}</span>
                                    <span>{new Date(paper.published_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Detailed Review Workspace */}
                <div className="lg:col-span-6">
                    {selectedPaper ? (
                        <div className="p-5 rounded-2xl bg-[#0d1017] border border-[#1e2335] space-y-5 text-xs font-mono">
                            <div className="flex items-center justify-between border-b border-[#1e2335] pb-3">
                                <div className="min-w-0">
                                    <span className="text-[10px] text-[#4f8fff] uppercase font-bold">Manuscript Inspection</span>
                                    <h3 className="text-sm font-bold text-white font-sans truncate">{selectedPaper.title}</h3>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 shrink-0">
                                    {selectedPaper.status}
                                </span>
                            </div>

                            {/* Author & Artifacts */}
                            <div className="space-y-1.5 text-zinc-300">
                                <div><strong className="text-white">Lead Author:</strong> {selectedPaper.primary_author?.full_name || selectedPaper.primary_author?.username}</div>
                                <div><strong className="text-white">Affiliation:</strong> {selectedPaper.primary_author?.college || 'Independent'}</div>
                                {selectedPaper.pdf_url && (
                                    <div>
                                        <strong className="text-white">PDF: </strong>
                                        <a href={selectedPaper.pdf_url} target="_blank" rel="noopener noreferrer" className="text-[#4f8fff] underline inline-flex items-center gap-1">
                                            <span>Open Manuscript File</span>
                                            <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Abstract summary */}
                            <div className="p-3 rounded-xl bg-[#08090f] border border-[#1b1f30] text-zinc-400 text-[11px] leading-relaxed max-h-36 overflow-y-auto font-sans">
                                <strong className="text-white font-mono block mb-1">Abstract:</strong>
                                {selectedPaper.abstract}
                            </div>

                            {/* Screening Checklist */}
                            <div className="space-y-2 p-3 rounded-xl bg-[#08090f] border border-[#1b1f30]">
                                <span className="font-bold text-white block">Academic Screening Checklist</span>
                                {[
                                    { key: 'scopeValid', label: 'Scope conforms to ENQUEbet Engineering Disciplines' },
                                    { key: 'methodologySound', label: 'Methodology & mathematical bounds sufficiently explained' },
                                    { key: 'referencesFormatted', label: 'Citations and external provenance acknowledged' },
                                    { key: 'codeOrBomProvided', label: 'Executable repo or VenopAI hardware BOM supplied' },
                                ].map((item) => (
                                    <label key={item.key} className="flex items-center gap-2 text-[11px] text-zinc-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={(checklist as any)[item.key]}
                                            onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                                            className="rounded bg-[#0d1017] border-[#1e2335] text-[#1864ff]"
                                        />
                                        <span>{item.label}</span>
                                    </label>
                                ))}
                            </div>

                            {/* Author-facing Feedback */}
                            <div className="space-y-1">
                                <label className="text-zinc-300 font-bold block">
                                    Author-Facing Constructive Feedback / Revision Notes
                                </label>
                                <textarea
                                    rows={3}
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Provide actionable guidance for the researcher (visible on their profile and notifications)..."
                                    className="w-full bg-[#08090f] border border-[#1e2335] rounded-xl p-2.5 text-xs text-white"
                                />
                            </div>

                            {/* Internal editorial notes */}
                            <div className="space-y-1">
                                <label className="text-zinc-400 block flex items-center gap-1.5">
                                    <Lock className="w-3 h-3 text-amber-400" />
                                    <span>Internal Editorial Notes (Private to Admin Staff)</span>
                                </label>
                                <input
                                    type="text"
                                    value={editorialNotes}
                                    onChange={(e) => setEditorialNotes(e.target.value)}
                                    placeholder="Private review notes, second-opinion requests, integrity checks..."
                                    className="w-full bg-[#08090f] border border-[#1e2335] rounded-xl px-3 py-1.5 text-xs text-white"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1e2335] flex-wrap">
                                <button
                                    onClick={handleReject}
                                    disabled={isProcessing}
                                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold cursor-pointer disabled:opacity-50"
                                >
                                    Reject
                                </button>

                                <button
                                    onClick={handleRequestRevisions}
                                    disabled={isProcessing}
                                    className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-pointer disabled:opacity-50"
                                >
                                    Request Revisions
                                </button>

                                {activeQueue === 'publication' ? (
                                    <button
                                        onClick={() => handlePublish('PREPRINT')}
                                        disabled={isProcessing}
                                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50 shadow-sm"
                                    >
                                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                        <span>Publish Open Preprint</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleApprove}
                                        disabled={isProcessing}
                                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#1864ff] hover:bg-[#1864ff]/90 text-white text-xs font-bold cursor-pointer disabled:opacity-50 shadow-sm"
                                    >
                                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                        <span>Approve for Publication</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 rounded-2xl bg-[#0d1017] border border-[#1e2335] text-center space-y-2 text-xs font-mono text-zinc-500">
                            <FileText className="w-6 h-6 text-zinc-600 mx-auto" />
                            <p>Select a manuscript from the queue to inspect and evaluate.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
