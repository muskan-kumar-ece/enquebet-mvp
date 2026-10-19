'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    X,
    Cpu,
    Github,
    ExternalLink,
    FileText,
    ShieldCheck,
    Quote,
    Users,
    Check,
    Copy,
    ArrowUpRight,
    BookOpen
} from 'lucide-react';
import { ResearchPaper } from '@/lib/researchData';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

interface ResearchDetailDrawerProps {
    paper: ResearchPaper | null;
    isOpen: boolean;
    onClose: () => void;
    onReviewSubmitted?: (updatedPaper: ResearchPaper) => void;
    onJoinLab?: (paper: ResearchPaper) => void;
}

export default function ResearchDetailDrawer({
    paper,
    isOpen,
    onClose,
    onReviewSubmitted,
    onJoinLab,
}: ResearchDetailDrawerProps) {
    const [activeTab, setActiveTab] = useState<'abstract' | 'bom' | 'reproducibility' | 'citations'>('abstract');
    const [citationFormat, setCitationFormat] = useState<'bibtex' | 'apa' | 'ieee' | 'mla'>('bibtex');
    const [copiedCitation, setCopiedCitation] = useState(false);

    // Audit submission state
    const [showAuditForm, setShowAuditForm] = useState(false);
    const [auditVerdict, setAuditVerdict] = useState<'VERIFIED_REPRODUCED' | 'PARTIALLY_REPRODUCED' | 'FAILED_TO_REPRODUCE' | 'METHODOLOGY_VALID'>('VERIFIED_REPRODUCED');
    const [auditScore, setAuditScore] = useState(5);
    const [auditNotes, setAuditNotes] = useState('');
    const [auditEnv, setAuditEnv] = useState('');
    const [auditEvidence, setAuditEvidence] = useState('');
    const [submittingAudit, setSubmittingAudit] = useState(false);

    if (!isOpen || !paper) return null;

    const author = paper.primary_author;
    const authorProfileUrl = author?.id ? `/profile/${author.id}` : '#';
    const hasHardwareBOM = Array.isArray(paper.hardware_bom) && paper.hardware_bom.length > 0;
    const isReproduced = paper.status === 'REPRODUCED';
    const isPeerReviewed = paper.status === 'PEER_REVIEWED';

    const getCitationText = () => {
        const authorName = author?.full_name || author?.username || 'Author';
        const year = new Date(paper.published_at).getFullYear();

        switch (citationFormat) {
            case 'apa':
                return `${authorName}. (${year}). ${paper.title}. ENQUEbet Living Research Repository, ${paper.paper_code}. https://enquebet.com/research/${paper.slug}`;
            case 'ieee':
                return `${authorName}, "${paper.title}," ENQUEbet Living Research Repository, paper ${paper.paper_code}, ${year}. [Online]. Available: https://enquebet.com/research/${paper.slug}`;
            case 'mla':
                return `${authorName}. "${paper.title}." ENQUEbet Living Research Repository, ${year}, ${paper.paper_code}, https://enquebet.com/research/${paper.slug}.`;
            case 'bibtex':
            default:
                return paper.bibtex || `@article{${authorName.split(' ').pop()?.toLowerCase() || 'paper'}${year},
  author = {${authorName}},
  title = {${paper.title}},
  journal = {ENQUEbet Living Research Repository},
  year = {${year}},
  eprint = {${paper.paper_code}},
  url = {https://enquebet.com/research/${paper.slug}}
}`;
        }
    };

    const handleCopyCitation = () => {
        const text = getCitationText();
        navigator.clipboard.writeText(text);
        setCopiedCitation(true);
        toast.success(`Copied ${citationFormat.toUpperCase()} citation`);
        setTimeout(() => setCopiedCitation(false), 2000);
    };

    const handleSubmitAudit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (auditNotes.trim().length < 20) {
            toast.error('Evaluation notes must be at least 20 characters long.');
            return;
        }

        setSubmittingAudit(true);
        try {
            await api.submitResearchReview(paper.slug, {
                verdict: auditVerdict,
                rigor_score: auditScore,
                clarity_score: auditScore,
                reproducibility_score: auditScore,
                evaluation_notes: auditNotes,
                environment_details: auditEnv,
                evidence_url: auditEvidence || undefined,
            });
            toast.success('Reproducibility audit submitted');
            setShowAuditForm(false);

            // Refetch paper details
            const updated = await api.getResearchPaper(paper.slug);
            if (updated && onReviewSubmitted) {
                onReviewSubmitted(updated);
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to submit reproducibility audit.');
        } finally {
            setSubmittingAudit(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div
                className="w-full max-w-3xl h-full bg-[#0c0d15] border-l border-[#1b1e2c] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drawer Top Navigation Bar */}
                <div className="p-5 border-b border-[#1b1e2c] bg-[#0c0d15] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.06] whitespace-nowrap">
                            {paper.paper_code}
                        </span>
                        <span className="text-xs text-zinc-400 truncate">
                            {paper.field_display || paper.field}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs">
                            {isReproduced ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium text-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span>Reproduced</span>
                                </span>
                            ) : isPeerReviewed ? (
                                <span className="inline-flex items-center gap-1.5 text-blue-400 font-medium text-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                    <span>Peer Reviewed</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-zinc-400 font-medium text-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                    <span>Preprint</span>
                                </span>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg border border-[#1b1e2c] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
                            aria-label="Close drawer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Sub-header: Title, Author & Artifact Shortcuts */}
                <div className="p-6 border-b border-[#1b1e2c] bg-[#0c0d15]">
                    <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-4">
                        {paper.title}
                    </h2>

                    {/* Author Dossier Snippet */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-[#1b1e2c]">
                        <div className="flex items-center gap-3">
                            <Link href={authorProfileUrl}>
                                <img
                                    src={author?.profile_image || `https://api.dicebear.com/7.x/identicon/svg?seed=${author?.username || 'researcher'}`}
                                    alt={author?.full_name || author?.username}
                                    className="w-9 h-9 rounded-full border border-white/10 object-cover hover:border-blue-400 transition"
                                />
                            </Link>
                            <div>
                                <Link
                                    href={authorProfileUrl}
                                    className="text-xs sm:text-sm font-semibold text-white hover:text-blue-400 transition block"
                                >
                                    {author?.full_name || author?.username}
                                </Link>
                                <p className="text-[11px] text-zinc-400 truncate max-w-xs sm:max-w-md">
                                    {author?.headline || author?.college || 'Author & Researcher'}
                                </p>
                            </div>
                        </div>

                        <Link
                            href={authorProfileUrl}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1b1e2c] bg-white/[0.03] text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition"
                        >
                            <span>Profile</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
                        </Link>
                    </div>

                    {/* Quick Artifacts Action Row */}
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                        {paper.code_repo_url && (
                            <a
                                href={paper.code_repo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1b1e2c] bg-white/[0.03] hover:bg-white/[0.07] text-zinc-300 text-xs font-medium transition"
                            >
                                <Github className="w-3.5 h-3.5 text-zinc-400" />
                                <span>Code Repository</span>
                                <ExternalLink className="w-3 h-3 text-zinc-500" />
                            </a>
                        )}

                        {paper.live_demo_url && (
                            <a
                                href={paper.live_demo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1b1e2c] bg-white/[0.03] hover:bg-white/[0.07] text-zinc-300 text-xs font-medium transition"
                            >
                                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                                <span>Live Demo</span>
                            </a>
                        )}

                        {paper.pdf_url && (
                            <a
                                href={paper.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1b1e2c] bg-white/[0.03] hover:bg-white/[0.07] text-zinc-300 text-xs font-medium transition"
                            >
                                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                                <span>PDF</span>
                            </a>
                        )}

                        {Array.isArray(paper.open_collaborator_roles) && paper.open_collaborator_roles.length > 0 && (
                            <button
                                onClick={() => onJoinLab && onJoinLab(paper)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1864ff] hover:bg-[#1554d6] text-white text-xs font-semibold transition ml-auto"
                            >
                                <Users className="w-3.5 h-3.5" />
                                <span>Join Lab</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Section Navigation Tabs Inside Drawer */}
                <div className="flex items-center gap-4 px-6 border-b border-[#1b1e2c] bg-[#0c0d15] text-xs font-medium overflow-x-auto scrollbar-none">
                    <button
                        onClick={() => setActiveTab('abstract')}
                        className={`py-3 border-b-2 transition ${
                            activeTab === 'abstract'
                                ? 'border-[#1864ff] text-white font-semibold'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        Abstract & Methodology
                    </button>

                    <button
                        onClick={() => setActiveTab('bom')}
                        className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
                            activeTab === 'bom'
                                ? 'border-[#1864ff] text-white font-semibold'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <Cpu className="w-3.5 h-3.5" />
                        <span>VenopAI BOM</span>
                        {hasHardwareBOM && (
                            <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-white/[0.06] text-zinc-300">
                                {paper.hardware_bom.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('reproducibility')}
                        className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
                            activeTab === 'reproducibility'
                                ? 'border-[#1864ff] text-white font-semibold'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Reproducibility</span>
                        {paper.reproducibility_score > 0 && (
                            <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-white/[0.06] text-zinc-300">
                                {paper.reproducibility_score.toFixed(1)}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('citations')}
                        className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
                            activeTab === 'citations'
                                ? 'border-[#1864ff] text-white font-semibold'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <Quote className="w-3.5 h-3.5" />
                        <span>Citations & BibTeX</span>
                    </button>
                </div>

                {/* Tab Body Container */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* TAB 1: Abstract & Methodology */}
                    {activeTab === 'abstract' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                                    Abstract
                                </h3>
                                <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-[#0f111a] p-4 rounded-xl border border-[#1b1e2c]">
                                    {paper.abstract}
                                </div>
                            </div>

                            {paper.methodology_summary && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                                        Experimental Methodology & Benchmarks
                                    </h3>
                                    <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-[#0f111a] p-4 rounded-xl border border-[#1b1e2c]">
                                        {paper.methodology_summary}
                                    </div>
                                </div>
                            )}

                            {/* Keywords / Classifiers */}
                            {Array.isArray(paper.keywords) && paper.keywords.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                                        Keywords
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {paper.keywords.map((kw, i) => (
                                            <span
                                                key={i}
                                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/[0.03] text-zinc-300 border border-[#1b1e2c]"
                                            >
                                                #{kw}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Open Lab Roles */}
                            {Array.isArray(paper.open_collaborator_roles) && paper.open_collaborator_roles.length > 0 && (
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-[#1b1e2c]">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1.5">
                                        <Users className="w-4 h-4 text-blue-400" />
                                        <span>Collaborative Lab Opportunities</span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mb-3">
                                        The author has published this study with open research opportunities.
                                        Join the research workspace to collaborate on verification or extensions.
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {paper.open_collaborator_roles.map((role, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] text-zinc-300 border border-white/[0.06]"
                                            >
                                                {role}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: VenopAI Hardware BOM */}
                    {activeTab === 'bom' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white/[0.02] border border-[#1b1e2c]">
                                <div>
                                    <div className="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm">
                                        <Cpu className="w-4 h-4 text-blue-400" />
                                        <span>Verified Hardware Ecosystem</span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-1 max-w-md">
                                        Microcontrollers, sensors, and passive components specified below are
                                        supplied by <strong>VenopAI</strong> with verified pinouts and documentation.
                                    </p>
                                </div>
                                <a
                                    href="https://venopai.in?ref=enquebet_research"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-brand inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2 self-start sm:self-center"
                                >
                                    <span>Procure Parts</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </a>
                            </div>

                            {hasHardwareBOM ? (
                                <div className="space-y-2.5">
                                    {paper.hardware_bom.map((comp, idx) => (
                                        <div
                                            key={idx}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[#1b1e2c] bg-[#0f111a] hover:border-[#2a2f45] transition"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-white text-xs sm:text-sm">
                                                        {comp.name}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.05] text-zinc-300 border border-white/[0.08]">
                                                        Qty: {comp.quantity}
                                                    </span>
                                                </div>
                                                {comp.role && (
                                                    <p className="text-xs text-zinc-400">
                                                        Role: <span className="text-zinc-300">{comp.role}</span>
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {comp.estimated_price_paise && (
                                                    <span className="text-xs font-semibold text-white">
                                                        ₹{(comp.estimated_price_paise / 100).toFixed(0)}
                                                    </span>
                                                )}
                                                {comp.datasheet_url ? (
                                                    <a
                                                        href={comp.datasheet_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                                                    >
                                                        <span>Datasheet</span>
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                ) : (
                                                    <a
                                                        href={`https://venopai.in/shop?q=${encodeURIComponent(comp.name)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
                                                    >
                                                        <span>Catalog</span>
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 border border-[#1b1e2c] rounded-xl bg-white/[0.01]">
                                    <Cpu className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                                    <p className="text-xs text-zinc-400">
                                        This preprint focuses on algorithmic models or theory without dedicated hardware parts.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: Reproducibility & Peer Audits */}
                    {activeTab === 'reproducibility' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-[#1b1e2c]">
                                <div>
                                    <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                                        Reproducibility Metric
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-bold text-white">
                                            {paper.reproducibility_score > 0 ? paper.reproducibility_score.toFixed(1) : 'Not audited'}
                                        </span>
                                        {paper.reproducibility_score > 0 && (
                                            <span className="text-xs text-zinc-400">/ 5.0 Empirical Rigor</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Calculated from peer validation trials and execution audits.
                                    </p>
                                </div>

                                <button
                                    onClick={() => setShowAuditForm(!showAuditForm)}
                                    className="btn-outline inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3.5 py-2 self-start sm:self-center"
                                >
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                    <span>{showAuditForm ? 'Cancel Audit' : 'Submit Audit'}</span>
                                </button>
                            </div>

                            {/* Audit Submission Form */}
                            {showAuditForm && (
                                <form onSubmit={handleSubmitAudit} className="p-4 rounded-xl bg-[#0f111a] border border-[#1b1e2c] space-y-3.5">
                                    <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                        <span>Submit Structured Peer Audit</span>
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-400 mb-1">
                                                Replication Verdict
                                            </label>
                                            <select
                                                value={auditVerdict}
                                                onChange={(e: any) => setAuditVerdict(e.target.value)}
                                                className="w-full px-3 py-1.5 rounded-lg bg-[#0c0d15] border border-[#1b1e2c] text-white text-xs focus:outline-none focus:border-[#1864ff]"
                                            >
                                                <option value="VERIFIED_REPRODUCED">Fully Reproduced</option>
                                                <option value="PARTIALLY_REPRODUCED">Partially Reproduced</option>
                                                <option value="FAILED_TO_REPRODUCE">Failed to Reproduce</option>
                                                <option value="METHODOLOGY_VALID">Methodology Verified (Theoretical)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-zinc-400 mb-1">
                                                Reproducibility Score (1 to 5)
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={5}
                                                value={auditScore}
                                                onChange={(e) => setAuditScore(parseInt(e.target.value) || 5)}
                                                className="w-full px-3 py-1.5 rounded-lg bg-[#0c0d15] border border-[#1b1e2c] text-white text-xs focus:outline-none focus:border-[#1864ff]"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-1">
                                            Bench & Environment Details (OS, GPU, Microcontrollers)
                                        </label>
                                        <input
                                            type="text"
                                            value={auditEnv}
                                            onChange={(e) => setAuditEnv(e.target.value)}
                                            placeholder="e.g. Ubuntu 24.04, RTX 4090, ESP32-S3 via ESP-IDF v5.2"
                                            className="w-full px-3 py-1.5 rounded-lg bg-[#0c0d15] border border-[#1b1e2c] text-white text-xs focus:outline-none focus:border-[#1864ff]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-1">
                                            Evidence or Reproduction Repository Link (Optional)
                                        </label>
                                        <input
                                            type="url"
                                            value={auditEvidence}
                                            onChange={(e) => setAuditEvidence(e.target.value)}
                                            placeholder="https://github.com/my-user/repro-bench"
                                            className="w-full px-3 py-1.5 rounded-lg bg-[#0c0d15] border border-[#1b1e2c] text-white text-xs focus:outline-none focus:border-[#1864ff]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-1">
                                            Evaluation Notes & Discrepancies
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={auditNotes}
                                            onChange={(e) => setAuditNotes(e.target.value)}
                                            placeholder="Document execution times, setup friction, accuracy delta, or hardware anomalies..."
                                            className="w-full px-3 py-1.5 rounded-lg bg-[#0c0d15] border border-[#1b1e2c] text-white text-xs focus:outline-none focus:border-[#1864ff]"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submittingAudit}
                                        className="btn-brand text-xs font-semibold px-4 py-2 disabled:opacity-50"
                                    >
                                        {submittingAudit ? 'Submitting...' : 'Publish Audit'}
                                    </button>
                                </form>
                            )}

                            {/* Existing Reviews List */}
                            {Array.isArray(paper.reproducibility_reviews) && paper.reproducibility_reviews.length > 0 ? (
                                <div className="space-y-2.5">
                                    {paper.reproducibility_reviews.map((rev) => (
                                        <div
                                            key={rev.id}
                                            className="p-3.5 rounded-xl border border-[#1b1e2c] bg-[#0f111a] space-y-2"
                                        >
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-white">
                                                        {rev.reviewer?.full_name || rev.reviewer?.username}
                                                    </span>
                                                    {rev.reviewer?.college && (
                                                        <span className="text-zinc-500">
                                                            ({rev.reviewer.college})
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-white/[0.04] text-zinc-300 border border-white/[0.06]">
                                                    {rev.verdict.replace(/_/g, ' ')}
                                                </span>
                                            </div>

                                            <p className="text-xs text-zinc-300 leading-relaxed">
                                                {rev.evaluation_notes}
                                            </p>

                                            {rev.environment_details && (
                                                <div className="text-[11px] text-zinc-500 font-mono bg-white/[0.02] p-2 rounded border border-white/[0.04]">
                                                    Bench: {rev.environment_details}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 border border-[#1b1e2c] rounded-xl bg-white/[0.01]">
                                    <ShieldCheck className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                                    <p className="text-xs text-zinc-400">
                                        No independent reproducibility audits have been logged for this preprint yet.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 4: Citations & BibTeX */}
                    {activeTab === 'citations' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#1b1e2c]">
                                <div className="flex items-center gap-1">
                                    {(['bibtex', 'apa', 'ieee', 'mla'] as const).map((fmt) => (
                                        <button
                                            key={fmt}
                                            onClick={() => setCitationFormat(fmt)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase transition ${
                                                citationFormat === fmt
                                                    ? 'bg-white/[0.08] text-white border border-white/[0.12]'
                                                    : 'text-zinc-400 hover:text-white border border-transparent'
                                            }`}
                                        >
                                            {fmt}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={handleCopyCitation}
                                    className="btn-outline inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5"
                                >
                                    {copiedCitation ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
                                            <span>Copy</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <pre className="p-4 rounded-xl bg-[#090a0f] border border-[#1b1e2c] text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                {getCitationText()}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
