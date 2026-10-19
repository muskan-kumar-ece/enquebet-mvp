"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Download,
    Quote,
    ExternalLink,
    Github,
    Cpu,
    Check,
    Copy,
    Share2,
    ShieldCheck,
    FileText,
    Activity,
    FlaskConical,
    Layers,
    Columns,
    Maximize2,
    Calendar,
    Users,
    Eye,
    MessageSquare,
    BookOpen,
    AlertCircle,
    CheckCircle2,
    Sparkles,
    Send,
    Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { ResearchPaper, CANONICAL_RESEARCH_PAPERS } from '@/lib/researchData';
import { useAuth } from '@/lib/contexts/AuthContext';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import DeveloperErrorState from '@/components/ui/DeveloperErrorState';
import toast from 'react-hot-toast';

export default function IEEEResearchPaperPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isAdmin } = useAuth();
    const slug = (params?.slug as string) || '';

    const [paper, setPaper] = useState<ResearchPaper | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Layout Mode: 'standard' or 'ieee' (two-column)
    const [viewMode, setViewMode] = useState<'standard' | 'ieee'>('standard');

    // Citation Modal
    const [isCiteModalOpen, setIsCiteModalOpen] = useState(false);
    const [citeFormat, setCiteFormat] = useState<'ieee' | 'bibtex' | 'apa' | 'mla'>('ieee');
    const [copiedCite, setCopiedCite] = useState(false);

    // Audit Review Submission State
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [auditVerdict, setAuditVerdict] = useState<'VERIFIED_REPRODUCED' | 'PARTIALLY_REPRODUCED' | 'FAILED_TO_REPRODUCE' | 'METHODOLOGY_VALID'>('VERIFIED_REPRODUCED');
    const [auditRigor, setAuditRigor] = useState(5);
    const [auditClarity, setAuditClarity] = useState(5);
    const [auditScore, setAuditScore] = useState(5);
    const [auditNotes, setAuditNotes] = useState('');
    const [auditEnv, setAuditEnv] = useState('');
    const [auditEvidence, setAuditEvidence] = useState('');
    const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);

    // Fetch live paper
    useEffect(() => {
        let isMounted = true;
        async function fetchPaper() {
            setLoading(true);
            setError(null);
            try {
                // Try backend API first
                const data = await api.getResearchPaper(slug);
                if (isMounted) setPaper(data);
            } catch (err: any) {
                // Fallback to canonical mock if slug matches canonical mock data
                const fallback = CANONICAL_RESEARCH_PAPERS.find(
                    p => p.slug === slug || p.paper_code.toLowerCase() === slug.toLowerCase() || p.id === slug
                );
                if (fallback && isMounted) {
                    setPaper(fallback);
                } else if (isMounted) {
                    setError(err?.message || 'Paper could not be resolved in the repository.');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        if (slug) fetchPaper();
        return () => { isMounted = false; };
    }, [slug]);

    // Format Citation Text
    const formattedCitation = useMemo(() => {
        if (!paper) return '';
        const primaryName = paper.authors?.[0]?.full_name || paper.primary_author?.full_name || paper.primary_author?.username || 'Author';
        const year = paper.published_at ? new Date(paper.published_at).getFullYear() : new Date().getFullYear();
        const paperUrl = `https://enquebet.com/research/${paper.slug || paper.paper_code}`;
        const doiText = paper.doi || `enquebet/${paper.paper_code}`;

        switch (citeFormat) {
            case 'ieee':
                return `${primaryName}, "${paper.title}," ENQUEbet Living Research Repository, paper ${paper.paper_code}, ${year}. [Online]. Available: ${paperUrl}`;
            case 'apa':
                return `${primaryName}. (${year}). ${paper.title}. ENQUEbet Living Research Repository, ${paper.paper_code}. ${paperUrl}`;
            case 'mla':
                return `${primaryName}. "${paper.title}." ENQUEbet Living Research Repository, ${year}, ${paper.paper_code}, ${paperUrl}.`;
            case 'bibtex':
            default:
                if (paper.bibtex) return paper.bibtex;
                const authorKey = primaryName.split(' ').pop()?.toLowerCase() || 'paper';
                return `@article{${authorKey}${year}${paper.paper_code.replace(/[^a-zA-Z0-9]/g, '')},
  author = {${primaryName}},
  title = {${paper.title}},
  journal = {ENQUEbet Living Research Repository},
  year = {${year}},
  eprint = {${paper.paper_code}},
  doi = {${doiText}},
  url = {${paperUrl}}
}`;
        }
    }, [paper, citeFormat]);

    const handleCopyCitation = () => {
        if (!formattedCitation) return;
        navigator.clipboard.writeText(formattedCitation);
        setCopiedCite(true);
        toast.success(`Copied ${citeFormat.toUpperCase()} citation to clipboard!`);
        setTimeout(() => setCopiedCite(false), 2200);
    };

    const handleCopyDoi = () => {
        if (!paper) return;
        const doi = paper.doi || `https://doi.org/10.1109/ENQUEBET.${paper.paper_code}`;
        navigator.clipboard.writeText(doi);
        toast.success('DOI copied to clipboard');
    };

    const handleSubmitAudit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paper) return;
        if (!user) {
            toast.error('You must be authenticated to submit an empirical audit.');
            return;
        }
        if (auditNotes.trim().length < 20) {
            toast.error('Evaluation notes must be at least 20 characters long.');
            return;
        }

        setIsSubmittingAudit(true);
        try {
            await api.submitResearchReview(paper.slug || paper.paper_code, {
                verdict: auditVerdict,
                rigor_score: auditRigor,
                clarity_score: auditClarity,
                reproducibility_score: auditScore,
                evaluation_notes: auditNotes.trim(),
                environment_details: auditEnv.trim() || undefined,
                evidence_url: auditEvidence.trim() || undefined,
            });
            toast.success('Empirical reproducibility review published!');
            setIsAuditModalOpen(false);
            // Refresh paper
            const refreshed = await api.getResearchPaper(paper.slug || paper.paper_code);
            setPaper(refreshed);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to submit reproducibility review.');
        } finally {
            setIsSubmittingAudit(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3 font-mono text-xs text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin text-[#1864ff]" />
                    <span>Resolving IEEE Preprint Manuscript [{slug}]...</span>
                </div>
            </div>
        );
    }

    if (error || !paper) {
        return (
            <div className="min-h-screen bg-[#090a0f] text-zinc-100 p-8 max-w-4xl mx-auto py-16">
                <Link
                    href="/research"
                    className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white mb-6"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Research Hub</span>
                </Link>
                <DeveloperErrorState
                    title="Manuscript Resolution Fault"
                    message={error || `Paper '${slug}' does not exist or has been retracted.`}
                    errorCode="ERR_RESEARCH_NOT_FOUND"
                    onRetry={() => window.location.reload()}
                />
            </div>
        );
    }

    const authorsList = (paper.authors && paper.authors.length > 0)
        ? paper.authors
        : [{
            full_name: paper.primary_author?.full_name || paper.primary_author?.username || 'Primary Author',
            affiliation: paper.primary_author?.college || 'Independent Engineering Researcher',
            is_corresponding: true,
            order: 1,
            user_id: paper.primary_author?.id
        }];

    const publishedYear = paper.published_at ? new Date(paper.published_at).getFullYear() : 2026;
    const publishedDateFormatted = paper.published_at
        ? new Date(paper.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'October 2026';

    return (
        <div className="min-h-screen bg-[#090a0f] text-zinc-100 font-sans selection:bg-[#1864ff]/30 selection:text-white">
            {/* Top Navigation & Telemetry Bar */}
            <div className="sticky top-0 z-30 bg-[#090a0f]/90 backdrop-blur-md border-b border-[#1e2335]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
                    {/* Left Breadcrumbs */}
                    <div className="flex items-center gap-2 min-w-0 font-mono text-xs text-zinc-400">
                        <Link
                            href="/research"
                            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors shrink-0"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Research Hub</span>
                        </Link>
                        <span>/</span>
                        <span className="text-zinc-500 truncate hidden sm:inline">{paper.field_display || paper.field}</span>
                        <span className="hidden sm:inline">/</span>
                        <span className="text-[#4f8fff] font-semibold truncate">{paper.paper_code}</span>
                    </div>

                    {/* Right Toolbar Controls */}
                    <div className="flex items-center gap-2.5 shrink-0">
                        {/* View Mode Switcher */}
                        <div className="hidden md:flex items-center rounded-xl bg-[#0d1017] border border-[#1e2335] p-0.5 text-xs font-mono">
                            <button
                                onClick={() => setViewMode('standard')}
                                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                                    viewMode === 'standard' ? 'bg-[#1864ff] text-white' : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                                title="Linear responsive reading mode"
                            >
                                <Maximize2 className="w-3 h-3" />
                                <span>Standard</span>
                            </button>
                            <button
                                onClick={() => setViewMode('ieee')}
                                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                                    viewMode === 'ieee' ? 'bg-[#1864ff] text-white' : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                                title="IEEE Transactions Two-Column Layout"
                            >
                                <Columns className="w-3 h-3" />
                                <span>IEEE Two-Column</span>
                            </button>
                        </div>

                        {/* Cite Button */}
                        <button
                            onClick={() => setIsCiteModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d1017] hover:bg-[#141824] border border-[#1e2335] text-zinc-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                        >
                            <Quote className="w-3.5 h-3.5 text-[#4f8fff]" />
                            <span>Cite</span>
                        </button>

                        {/* PDF Download Button */}
                        {paper.pdf_url ? (
                            <a
                                href={paper.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1864ff] hover:bg-[#1864ff]/90 text-white text-xs font-medium transition-all shadow-sm active:scale-[0.98]"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>PDF (Full Text)</span>
                            </a>
                        ) : (
                            <button
                                onClick={() => toast('PDF manuscript is undergoing archival processing', { icon: '📄' })}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-medium cursor-not-allowed"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>PDF Pending</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Article Container */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {/* ── IEEE HEADER SECTION ────────────────────────────── */}
                <header className="mb-10 pb-8 border-b border-[#1e2335]">
                    {/* Telemetry pill row */}
                    <div className="flex items-center gap-2.5 flex-wrap text-[11px] font-mono mb-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#1864ff]/10 border border-[#1864ff]/25 text-[#4f8fff] font-bold tracking-wide">
                            <Activity className="w-3 h-3 text-[#1864ff]" />
                            {paper.paper_code}
                        </span>
                        <span className="text-zinc-500">·</span>
                        <span className="text-zinc-400">{paper.field_display || paper.field}</span>
                        <span className="text-zinc-500">·</span>
                        <span className="text-zinc-400">{publishedDateFormatted}</span>
                        <span className="text-zinc-500">·</span>
                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            paper.status === 'REPRODUCED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            paper.status === 'PEER_REVIEWED' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                            paper.status === 'PREPRINT' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            paper.status === 'REVISION_REQUIRED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                            <ShieldCheck className="w-3 h-3" />
                            {paper.status_display || paper.status.replace('_', ' ')}
                        </span>
                        {paper.reproducibility_score > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                                ★ {paper.reproducibility_score}/5.0 Reproducibility
                            </span>
                        )}
                    </div>

                    {/* IEEE Formal Title */}
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-snug sm:leading-tight mb-6 font-sans">
                        {paper.title}
                    </h1>

                    {/* Authors Byline with Affiliations and Super-scripts */}
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-200">
                            {authorsList.map((author, idx) => (
                                <div key={idx} className="inline-flex items-center gap-1.5 font-medium">
                                    {author.user_id ? (
                                        <Link
                                            href={`/profile/${author.user_id}`}
                                            className="text-white hover:text-[#4f8fff] transition-colors underline-offset-4 hover:underline"
                                        >
                                            {author.full_name}
                                        </Link>
                                    ) : (
                                        <span className="text-white">{author.full_name}</span>
                                    )}
                                    <sup className="text-[#4f8fff] font-mono text-xs font-bold">{idx + 1}</sup>
                                    {author.is_corresponding && <span className="text-amber-400 text-xs font-bold" title="Corresponding Author">*</span>}
                                    {author.orcid && (
                                        <a
                                            href={`https://orcid.org/${author.orcid}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center text-[10px] text-emerald-400 hover:text-emerald-300 font-mono ml-0.5"
                                            title={`ORCID: ${author.orcid}`}
                                        >
                                            (iD)
                                        </a>
                                    )}
                                    {idx < authorsList.length - 1 && <span className="text-zinc-600">,</span>}
                                </div>
                            ))}
                        </div>

                        {/* Institutional Affiliation Footnotes */}
                        <div className="text-xs text-zinc-400 space-y-1 font-mono pt-1">
                            {authorsList.map((author, idx) => (
                                <div key={idx} className="flex items-start gap-1.5">
                                    <span className="text-[#4f8fff] font-bold shrink-0">{idx + 1}</span>
                                    <span>
                                        {author.affiliation || 'Independent Engineering Researcher'}
                                        {author.email && <span className="text-zinc-500 ml-2">({author.email})</span>}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DOI & Telemetry bar */}
                    <div className="mt-6 pt-5 border-t border-[#1e2335]/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-zinc-400">
                        <div className="flex items-center gap-3 flex-wrap">
                            <button
                                onClick={handleCopyDoi}
                                className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white bg-[#0d1017] px-2.5 py-1 rounded-md border border-[#1e2335] hover:border-[#1864ff] transition-all cursor-pointer"
                                title="Click to copy DOI"
                            >
                                <span className="text-zinc-500">DOI:</span>
                                <span>{paper.doi || `10.1109/ENQUEBET.${paper.paper_code}`}</span>
                                <Copy className="w-3 h-3 text-zinc-500" />
                            </button>

                            <span className="text-zinc-600">|</span>
                            <span className="inline-flex items-center gap-1 text-zinc-400">
                                <Eye className="w-3.5 h-3.5" />
                                {paper.views_count.toLocaleString()} Views
                            </span>

                            <span className="text-zinc-600">|</span>
                            <span className="inline-flex items-center gap-1 text-zinc-400">
                                <Quote className="w-3.5 h-3.5" />
                                {paper.citations_count} Citations
                            </span>
                        </div>

                        {/* External Artifact Links */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {paper.code_repo_url && (
                                <a
                                    href={paper.code_repo_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-[#0d1017] px-2.5 py-1 rounded border border-[#1e2335] hover:border-zinc-500 transition-colors"
                                >
                                    <Github className="w-3 h-3 text-white" />
                                    <span>Code Repository</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                                </a>
                            )}
                            {paper.dataset_url && (
                                <a
                                    href={paper.dataset_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-[#0d1017] px-2.5 py-1 rounded border border-[#1e2335] hover:border-zinc-500 transition-colors"
                                >
                                    <Database className="w-3 h-3 text-cyan-400" />
                                    <span>Zenodo Dataset</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                                </a>
                            )}
                            {paper.live_demo_url && (
                                <a
                                    href={paper.live_demo_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-[#0d1017] px-2.5 py-1 rounded border border-[#1e2335] hover:border-zinc-500 transition-colors"
                                >
                                    <ExternalLink className="w-3 h-3 text-emerald-400" />
                                    <span>Live Benchmark Demo</span>
                                </a>
                            )}
                        </div>
                    </div>
                </header>

                {/* ── IEEE ABSTRACT & INDEX TERMS ────────────────────────── */}
                <section className="mb-10 p-6 sm:p-7 rounded-2xl bg-[#0c0e17] border border-[#1e2335] space-y-4 shadow-sm">
                    {/* IEEE Formal Abstract with drop-caps/bold */}
                    <div className="text-zinc-200 text-sm leading-relaxed text-justify ieee-abstract">
                        {paper.abstract}
                    </div>

                    {/* IEEE Index Terms / Keywords */}
                    {paper.keywords && paper.keywords.length > 0 && (
                        <div className="pt-3 border-t border-[#1e2335]/70 text-xs font-mono text-zinc-400 ieee-index-terms">
                            <strong>Index Terms—</strong>
                            {paper.keywords.map((kw, i) => (
                                <span key={i} className="text-zinc-300">
                                    {kw}{i < (paper.keywords?.length || 0) - 1 ? ', ' : '.'}
                                </span>
                            ))}
                        </div>
                    )}
                </section>

                {/* ── MAIN ARTICLE BODY ─────────────────────────────────── */}
                <div className={viewMode === 'ieee' ? 'ieee-two-column' : 'grid grid-cols-1 lg:grid-cols-12 gap-8'}>
                    {/* Content Column */}
                    <div className={viewMode === 'ieee' ? 'space-y-6' : 'lg:col-span-8 space-y-8'}>
                        {/* SECTION I: INTRODUCTION & METHODOLOGY */}
                        <section className="space-y-3">
                            <h2 className="ieee-section-numeral">
                                <span>I.</span>
                                <span>Methodology & Technical Architecture</span>
                            </h2>
                            <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
                                {paper.methodology_summary ? (
                                    <MarkdownRenderer content={paper.methodology_summary} />
                                ) : (
                                    <p className="text-zinc-400 italic">
                                        This peer-reviewed manuscript details algorithmic formulation, edge computational benchmarks, and hardware-verified implementations adhering to the ENQUEbet Living Research specification.
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* SECTION II: MATHEMATICAL & HARDWARE FORMULATION */}
                        <section className="space-y-3">
                            <h2 className="ieee-section-numeral">
                                <span>II.</span>
                                <span>Mathematical Model & Quantization Bounds</span>
                            </h2>
                            <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
                                <p>
                                    {"Let \\mathcal{W} \\in \\mathbb{R}^{d_{in} \\times d_{out}} represent the weight tensor of the projection manifold. The discrete quantized representation \\hat{\\mathcal{W}} over the dynamic INT4 integer domain is defined as:"}
                                </p>
                                <div className="ieee-equation-block">
                                    <span>{"\\hat{\\mathcal{W}} = \\text{clamp}\\left(\\left\\lfloor \\frac{\\mathcal{W}}{S} + Z \\right\\rceil, -8, 7\\right)"}</span>
                                    <span className="text-zinc-500 font-mono">(1)</span>
                                </div>
                                <p>
                                    {"where S = [max(\\mathcal{W}) - min(\\mathcal{W})] / (2^b - 1) represents the scalar scale factor and Z is the zero-point alignment offset. Vectorized execution is scheduled across asynchronous scratchpad buffers to eliminate bus arbitration latency."}
                                </p>
                            </div>
                        </section>

                        {/* SECTION III: VENOPAI HARDWARE BILL OF MATERIALS */}
                        {Array.isArray(paper.hardware_bom) && paper.hardware_bom.length > 0 && (
                            <section className="space-y-3 pt-4">
                                <h2 className="ieee-section-numeral">
                                    <span>III.</span>
                                    <span>VenopAI Hardware Bill of Materials (BOM)</span>
                                </h2>
                                <p className="text-xs text-zinc-400 font-mono">
                                    Physical electronic components required to independently assemble and replicate this testbench:
                                </p>

                                <div className="rounded-xl border border-[#1e2335] bg-[#0c0d16] overflow-hidden">
                                    <table className="w-full text-left text-xs font-mono">
                                        <thead className="bg-[#121624] text-zinc-400 border-b border-[#1e2335]">
                                            <tr>
                                                <th className="p-3">Component</th>
                                                <th className="p-3">Role in Architecture</th>
                                                <th className="p-3 text-center">Qty</th>
                                                <th className="p-3 text-right">Procure</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#1e2335] text-zinc-300">
                                            {paper.hardware_bom.map((comp, i) => (
                                                <tr key={i} className="hover:bg-white/[0.02]">
                                                    <td className="p-3 font-semibold text-white">
                                                        <div className="flex items-center gap-2">
                                                            <Cpu className="w-3.5 h-3.5 text-[#1864ff]" />
                                                            <span>{comp.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-zinc-400">{comp.role || 'Embedded Node'}</td>
                                                    <td className="p-3 text-center font-bold text-cyan-400">{comp.quantity}</td>
                                                    <td className="p-3 text-right">
                                                        <Link
                                                            href={`/shop?search=${encodeURIComponent(comp.name)}`}
                                                            className="inline-flex items-center gap-1 text-[11px] text-[#4f8fff] hover:underline"
                                                        >
                                                            <span>VenopAI Store</span>
                                                            <ExternalLink className="w-2.5 h-2.5" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {/* SECTION IV: DECENTRALIZED REPRODUCIBILITY AUDITS */}
                        <section className="space-y-4 pt-4">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <h2 className="ieee-section-numeral m-0">
                                    <span>IV.</span>
                                    <span>Empirical Reproducibility Audits ({paper.reproducibility_reviews?.length || 0})</span>
                                </h2>

                                <button
                                    onClick={() => {
                                        if (!user) {
                                            toast.error('Please log in to submit a peer audit.');
                                            return;
                                        }
                                        setIsAuditModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-xs font-mono transition-colors cursor-pointer"
                                >
                                    <FlaskConical className="w-3.5 h-3.5" />
                                    <span>Submit Empirical Audit</span>
                                </button>
                            </div>

                            {paper.reproducibility_reviews && paper.reproducibility_reviews.length > 0 ? (
                                <div className="space-y-3">
                                    {paper.reproducibility_reviews.map((rev) => (
                                        <div
                                            key={rev.id}
                                            className="p-4 rounded-xl bg-[#0c0d15] border border-[#1e2335] space-y-2.5 text-xs font-mono"
                                        >
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white text-[10px]">
                                                        {rev.reviewer?.username?.[0]?.toUpperCase() || 'R'}
                                                    </div>
                                                    <span className="font-semibold text-zinc-200">
                                                        @{rev.reviewer?.username}
                                                    </span>
                                                    {rev.reviewer?.college && (
                                                        <span className="text-zinc-500">· {rev.reviewer.college}</span>
                                                    )}
                                                </div>

                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                    rev.verdict === 'VERIFIED_REPRODUCED' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                                                    rev.verdict === 'PARTIALLY_REPRODUCED' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                                                    'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                                }`}>
                                                    {rev.verdict.replace(/_/g, ' ')}
                                                </span>
                                            </div>

                                            <p className="text-zinc-300 font-sans leading-relaxed">
                                                {rev.evaluation_notes}
                                            </p>

                                            {rev.environment_details && (
                                                <div className="p-2 rounded bg-[#07080e] border border-[#1b1f30] text-[11px] text-zinc-400">
                                                    <span className="text-zinc-500 font-semibold">Testbench Environment: </span>
                                                    {rev.environment_details}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-4 text-[10px] text-zinc-500 pt-1">
                                                <span>Rigor: {rev.rigor_score}/5</span>
                                                <span>Clarity: {rev.clarity_score}/5</span>
                                                <span>Reproducibility: {rev.reproducibility_score}/5</span>
                                                {rev.evidence_url && (
                                                    <a
                                                        href={rev.evidence_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[#4f8fff] hover:underline inline-flex items-center gap-1"
                                                    >
                                                        <span>Raw Benchmark Logs</span>
                                                        <ExternalLink className="w-2.5 h-2.5" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 rounded-xl border border-dashed border-[#1e2335] text-center space-y-2">
                                    <FlaskConical className="w-6 h-6 text-zinc-500 mx-auto" />
                                    <p className="text-xs text-zinc-400 font-mono">
                                        No independent peer audits recorded yet for this preprint.
                                    </p>
                                    <p className="text-[11px] text-zinc-500 font-sans">
                                        Be the first engineer to independently run the benchmark script and earn peer audit reputation.
                                    </p>
                                </div>
                            )}
                        </section>

                        {/* SECTION V: REFERENCES (IEEE STANDARD) */}
                        <section className="space-y-3 pt-6 border-t border-[#1e2335]">
                            <h2 className="ieee-section-numeral">
                                <span>V.</span>
                                <span>References & Document Provenance</span>
                            </h2>
                            <ol className="list-none space-y-2 text-xs font-mono text-zinc-400">
                                <li className="flex items-start gap-2">
                                    <span className="text-zinc-500 font-bold shrink-0">[1]</span>
                                    <span>
                                        IEEE Editorial Style Manual, "IEEE Transactions on Neural Networks and Learning Systems Standards," Piscataway, NJ: IEEE, 2024.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-zinc-500 font-bold shrink-0">[2]</span>
                                    <span>
                                        ENQUEbet Living Research Repository Specification, "Decentralized Empirical Verification & Verifiable Hardware BOM v2.1," 2026.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-zinc-500 font-bold shrink-0">[3]</span>
                                    <span>
                                        RISC-V International, "Vector Extension Manual v1.0.4," Dec. 2023. Available: <a href="https://riscv.org" className="text-[#4f8fff] hover:underline">https://riscv.org</a>.
                                    </span>
                                </li>
                            </ol>
                        </section>
                    </div>

                    {/* Standard Mode Companion Sidebar */}
                    {viewMode === 'standard' && (
                        <aside className="lg:col-span-4 space-y-6">
                            {/* Primary Author Dossier Card */}
                            <div className="p-5 rounded-2xl bg-[#0c0d16] border border-[#1e2335] space-y-4 shadow-sm">
                                <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                                    Primary Lead Researcher
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-[#141824] border border-[#1e2335] flex items-center justify-center font-bold text-white text-base">
                                        {paper.primary_author?.full_name?.[0] || paper.primary_author?.username?.[0] || 'A'}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-sm text-white truncate">
                                            {paper.primary_author?.full_name || paper.primary_author?.username}
                                        </h3>
                                        <p className="text-xs text-zinc-400 truncate">
                                            @{paper.primary_author?.username}
                                        </p>
                                        {paper.primary_author?.college && (
                                            <p className="text-[11px] text-zinc-500 font-mono truncate">
                                                {paper.primary_author.college}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <Link
                                    href={paper.primary_author?.id ? `/profile/${paper.primary_author.id}` : '/profile'}
                                    className="w-full py-2 px-3 rounded-xl bg-[#090b11] hover:bg-[#141824] border border-[#1e2335] text-xs font-mono text-zinc-300 hover:text-white transition-colors flex items-center justify-center gap-2"
                                >
                                    <span>View Builder Portfolio & Proofs</span>
                                    <ExternalLink className="w-3 h-3 text-zinc-500" />
                                </Link>
                            </div>

                            {/* Workspace Collaboration Bridge */}
                            {paper.associated_workspace && (
                                <div className="p-5 rounded-2xl bg-[#0c0d16] border border-[#1864ff]/25 space-y-3 shadow-sm">
                                    <div className="flex items-center gap-1.5 text-xs font-mono text-[#4f8fff] font-semibold">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Active Lab Workspace</span>
                                    </div>
                                    <p className="text-xs text-zinc-300">
                                        This research project is linked to an active collaborative builder team.
                                    </p>
                                    <Link
                                        href={`/posts/${paper.associated_workspace}`}
                                        className="w-full py-2 px-3 rounded-xl bg-[#1864ff] hover:bg-[#1864ff]/90 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2"
                                    >
                                        <span>Join Research Workspace</span>
                                    </Link>
                                </div>
                            )}

                            {/* Quick Citation Box */}
                            <div className="p-5 rounded-2xl bg-[#0c0d16] border border-[#1e2335] space-y-3 font-mono text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-zinc-400 font-semibold">IEEE Citation</span>
                                    <button
                                        onClick={handleCopyCitation}
                                        className="text-[#4f8fff] hover:underline inline-flex items-center gap-1"
                                    >
                                        {copiedCite ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                        <span>{copiedCite ? 'Copied' : 'Copy'}</span>
                                    </button>
                                </div>
                                <div className="p-3 rounded-xl bg-[#08090f] border border-[#1b1f30] text-[11px] text-zinc-300 leading-relaxed font-mono">
                                    {paper.authors?.[0]?.full_name || paper.primary_author?.full_name || 'Author'}, "{paper.title}," <em>ENQUEbet Living Research Repository</em>, paper {paper.paper_code}, {publishedYear}.
                                </div>
                            </div>
                        </aside>
                    )}
                </div>
            </main>

            {/* ── CITE MODAL ────────────────────────────────────────── */}
            {isCiteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="w-full max-w-xl bg-[#0d1017] border border-[#1e2335] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#1e2335] pb-3">
                            <div className="flex items-center gap-2">
                                <Quote className="w-4 h-4 text-[#1864ff]" />
                                <h3 className="text-sm font-bold text-white font-mono">Cite This Research Paper</h3>
                            </div>
                            <button
                                onClick={() => setIsCiteModalOpen(false)}
                                className="text-zinc-400 hover:text-white text-xs font-mono cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Format tabs */}
                        <div className="flex items-center gap-2 font-mono text-xs">
                            {(['ieee', 'bibtex', 'apa', 'mla'] as const).map((fmt) => (
                                <button
                                    key={fmt}
                                    onClick={() => setCiteFormat(fmt)}
                                    className={`px-3 py-1 rounded-lg cursor-pointer uppercase font-bold text-[11px] ${
                                        citeFormat === fmt ? 'bg-[#1864ff] text-white' : 'bg-[#121624] text-zinc-400 hover:text-white'
                                    }`}
                                >
                                    {fmt}
                                </button>
                            ))}
                        </div>

                        {/* Textarea */}
                        <div className="relative">
                            <textarea
                                readOnly
                                rows={6}
                                value={formattedCitation}
                                className="w-full bg-[#08090f] border border-[#1e2335] rounded-xl p-3 text-xs text-zinc-200 font-mono leading-relaxed"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <span className="text-[11px] font-mono text-zinc-500">
                                Paper Code: {paper.paper_code}
                            </span>
                            <button
                                onClick={handleCopyCitation}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1864ff] hover:bg-[#1864ff]/90 text-white text-xs font-semibold cursor-pointer transition-all"
                            >
                                {copiedCite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedCite ? 'Copied to Clipboard!' : `Copy ${citeFormat.toUpperCase()}`}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── AUDIT SUBMISSION MODAL ────────────────────────────── */}
            {isAuditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
                    <form
                        onSubmit={handleSubmitAudit}
                        className="w-full max-w-xl bg-[#0d1017] border border-[#1e2335] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between border-b border-[#1e2335] pb-3">
                            <div className="flex items-center gap-2">
                                <FlaskConical className="w-4 h-4 text-emerald-400" />
                                <h3 className="text-sm font-bold text-white font-mono">
                                    Submit Empirical Reproducibility Audit
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAuditModalOpen(false)}
                                className="text-zinc-400 hover:text-white text-xs font-mono cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-mono text-zinc-300">Empirical Verdict</label>
                            <select
                                value={auditVerdict}
                                onChange={(e) => setAuditVerdict(e.target.value as any)}
                                className="w-full bg-[#08090f] border border-[#1e2335] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#1864ff]"
                            >
                                <option value="VERIFIED_REPRODUCED">Fully Reproduced (Results match published margins)</option>
                                <option value="PARTIALLY_REPRODUCED">Partially Reproduced (Significant deviation in edge cases)</option>
                                <option value="FAILED_TO_REPRODUCE">Failed to Reproduce (Model/Hardware benchmark diverges)</option>
                                <option value="METHODOLOGY_VALID">Methodology Valid (Theoretical verification)</option>
                            </select>
                        </div>

                        {/* Scores */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-mono text-zinc-400">Rigor Score (1-5)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={auditRigor}
                                    onChange={(e) => setAuditRigor(Number(e.target.value))}
                                    className="w-full bg-[#08090f] border border-[#1e2335] rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-mono text-zinc-400">Clarity Score (1-5)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={auditClarity}
                                    onChange={(e) => setAuditClarity(Number(e.target.value))}
                                    className="w-full bg-[#08090f] border border-[#1e2335] rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-mono text-zinc-400">Reproducibility (1-5)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={auditScore}
                                    onChange={(e) => setAuditScore(Number(e.target.value))}
                                    className="w-full bg-[#08090f] border border-[#1e2335] rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                                />
                            </div>
                        </div>

                        {/* Evaluation Notes */}
                        <div className="space-y-1">
                            <label className="text-xs font-mono text-zinc-300">
                                Detailed Evaluation Findings (min 20 characters)
                            </label>
                            <textarea
                                required
                                rows={4}
                                value={auditNotes}
                                onChange={(e) => setAuditNotes(e.target.value)}
                                placeholder="Describe step-by-step benchmark execution, observed throughput/latency metrics, anomalies, and reproducibility confirmation..."
                                className="w-full bg-[#08090f] border border-[#1e2335] rounded-xl p-3 text-xs text-white font-mono"
                            />
                        </div>

                        {/* Environment details */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-mono text-zinc-400">
                                Testbench Environment Specifications
                            </label>
                            <input
                                type="text"
                                value={auditEnv}
                                onChange={(e) => setAuditEnv(e.target.value)}
                                placeholder="e.g. Ubuntu 24.04, PyTorch 2.5, ESP32-S3 custom dev board, CUDA 12.4"
                                className="w-full bg-[#08090f] border border-[#1e2335] rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                            />
                        </div>

                        {/* Evidence URL */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-mono text-zinc-400">
                                Supporting Log / Reproduction Repo Link (Optional)
                            </label>
                            <input
                                type="url"
                                value={auditEvidence}
                                onChange={(e) => setAuditEvidence(e.target.value)}
                                placeholder="https://github.com/username/paper-reproduction-benchmarks"
                                className="w-full bg-[#08090f] border border-[#1e2335] rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e2335]">
                            <button
                                type="button"
                                onClick={() => setIsAuditModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmittingAudit}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {isSubmittingAudit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                <span>Publish Audit</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

// Minimal Database icon fallback
function Database(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5V19A9 3 0 0 0 21 19V5" />
            <path d="M3 12A9 3 0 0 0 21 12" />
        </svg>
    );
}
