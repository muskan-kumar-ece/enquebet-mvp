'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    FileText,
    Sparkles,
    AlertCircle,
    RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import {
    ResearchPaper,
    CANONICAL_RESEARCH_PAPERS
} from '@/lib/researchData';
import ResearchHeader from '@/components/research/ResearchHeader';
import ResearchFilterTabs from '@/components/research/ResearchFilterTabs';
import ResearchCard from '@/components/research/ResearchCard';
import { useAuth } from '@/lib/contexts/AuthContext';
import ResearchDetailDrawer from '@/components/research/ResearchDetailDrawer';
import PublishPaperModal from '@/components/research/PublishPaperModal';
import { AdminRejectModal } from '@/components/resources/AdminRejectModal';
import { AdminResearchStudio } from '@/components/research/AdminResearchStudio';
import { ShieldAlert, BookOpen, Clock } from 'lucide-react';

function ResearchContent() {
    const searchParams = useSearchParams();
    const { user, isAdmin } = useAuth();
    const isAuthenticated = Boolean(user);

    // Data state
    const [papers, setPapers] = useState<ResearchPaper[]>(CANONICAL_RESEARCH_PAPERS);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'catalog' | 'my_research' | 'moderation'>('catalog');
    const [pendingCount, setPendingCount] = useState(0);

    const [stats, setStats] = useState({
        totalPapers: CANONICAL_RESEARCH_PAPERS.length,
        totalReproduced: CANONICAL_RESEARCH_PAPERS.filter(p => p.status === 'REPRODUCED').length,
        hardwareBomPapers: CANONICAL_RESEARCH_PAPERS.filter(p => p.hardware_bom?.length > 0).length,
        openCallsCount: CANONICAL_RESEARCH_PAPERS.filter(p => p.open_collaborator_roles?.length > 0).length,
    });

    // Filter states
    const [activeField, setActiveField] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterHasCode, setFilterHasCode] = useState(false);
    const [filterHasBOM, setFilterHasBOM] = useState(false);
    const [filterReproduced, setFilterReproduced] = useState(false);
    const [filterOpenCalls, setFilterOpenCalls] = useState(false);

    // Modal & Drawer states
    const [selectedPaper, setSelectedPaper] = useState<ResearchPaper | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

    // Moderation reject modal
    const [rejectingPaper, setRejectingPaper] = useState<ResearchPaper | null>(null);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

    // Auto-open publish modal if ?action=publish is present
    useEffect(() => {
        if (searchParams.get('action') === 'publish') {
            setIsPublishModalOpen(true);
        }
    }, [searchParams]);

    // Fetch live papers and stats from backend on mount
    const fetchPapers = async () => {
        setLoading(true);
        try {
            const queryParams: any = {
                field: activeField !== 'ALL' ? activeField : undefined,
                search: searchQuery || undefined,
                has_code: filterHasCode || undefined,
                has_bom: filterHasBOM || undefined,
            };

            if (activeTab === 'moderation') {
                queryParams.tab = 'moderation';
            } else if (activeTab === 'my_research') {
                queryParams.tab = 'my_submissions';
            }

            const [papersRes, statsRes] = await Promise.allSettled([
                api.getResearchPapers(queryParams),
                api.getResearchStats(),
            ]);

            if (papersRes.status === 'fulfilled' && papersRes.value) {
                const results = papersRes.value.results || papersRes.value;
                if (Array.isArray(results) && results.length > 0) {
                    setPapers(results);
                } else if (activeTab === 'catalog') {
                    setPapers(CANONICAL_RESEARCH_PAPERS);
                } else {
                    setPapers([]);
                }
            } else if (activeTab === 'catalog') {
                setPapers(CANONICAL_RESEARCH_PAPERS);
            } else {
                setPapers([]);
            }

            if (statsRes.status === 'fulfilled' && statsRes.value) {
                const total = statsRes.value.total_papers || 0;
                setStats({
                    totalPapers: total > 0 ? total : CANONICAL_RESEARCH_PAPERS.length,
                    totalReproduced: statsRes.value.total_reproduced || CANONICAL_RESEARCH_PAPERS.filter(p => p.status === 'REPRODUCED').length,
                    hardwareBomPapers: statsRes.value.hardware_bom_papers || CANONICAL_RESEARCH_PAPERS.filter(p => (p.hardware_bom?.length || 0) > 0).length,
                    openCallsCount: CANONICAL_RESEARCH_PAPERS.filter(p => (p.open_collaborator_roles?.length || 0) > 0).length,
                });
                if (typeof statsRes.value.pending_count === 'number') {
                    setPendingCount(statsRes.value.pending_count);
                }
            }
        } catch (err) {
            console.warn('Using canonical research dataset fallback:', err);
            if (activeTab === 'catalog') {
                setPapers(CANONICAL_RESEARCH_PAPERS);
            } else {
                setPapers([]);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPapers();
    }, [activeField, filterHasCode, filterHasBOM, activeTab]);

    // Client-side search and tag filtering
    const filteredPapers = useMemo(() => {
        return papers.filter((paper) => {
            // Discipline filter
            if (activeField !== 'ALL' && paper.field !== activeField) {
                return false;
            }

            // Quick chips
            if (filterHasCode && !paper.code_repo_url) return false;
            if (filterHasBOM && (!paper.hardware_bom || paper.hardware_bom.length === 0)) return false;
            if (filterReproduced && paper.status !== 'REPRODUCED') return false;
            if (filterOpenCalls && (!paper.open_collaborator_roles || paper.open_collaborator_roles.length === 0)) return false;

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const titleMatch = paper.title.toLowerCase().includes(q);
                const abstractMatch = paper.abstract.toLowerCase().includes(q);
                const codeMatch = paper.paper_code.toLowerCase().includes(q);
                const authorMatch = paper.primary_author?.full_name?.toLowerCase().includes(q) ||
                                   paper.primary_author?.username?.toLowerCase().includes(q);
                const kwMatch = paper.keywords?.some(k => k.toLowerCase().includes(q));
                if (!titleMatch && !abstractMatch && !codeMatch && !authorMatch && !kwMatch) {
                    return false;
                }
            }

            return true;
        });
    }, [papers, activeField, searchQuery, filterHasCode, filterHasBOM, filterReproduced, filterOpenCalls]);

    const handleSelectPaper = (paper: ResearchPaper) => {
        setSelectedPaper(paper);
        setIsDrawerOpen(true);
    };

    const handleCite = (paper: ResearchPaper, e: React.MouseEvent) => {
        e.stopPropagation();
        const bibtex = paper.bibtex || `@article{${paper.slug}, title={${paper.title}}, eprint={${paper.paper_code}}}`;
        navigator.clipboard.writeText(bibtex);
        toast.success(`Copied BibTeX for ${paper.paper_code}`);
    };

    const handleJoinLab = (paper: ResearchPaper, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedPaper(paper);
        setIsDrawerOpen(true);
    };

    const handlePaperCreated = (newPaper: ResearchPaper) => {
        setPapers(prev => [newPaper, ...prev]);
        setStats(prev => ({
            ...prev,
            totalPapers: prev.totalPapers + 1,
            hardwareBomPapers: newPaper.hardware_bom?.length > 0 ? prev.hardwareBomPapers + 1 : prev.hardwareBomPapers,
            openCallsCount: newPaper.open_collaborator_roles?.length > 0 ? prev.openCallsCount + 1 : prev.openCallsCount,
        }));
    };

    const handleReviewSubmitted = (updatedPaper: ResearchPaper) => {
        setPapers(prev => prev.map(p => p.id === updatedPaper.id ? updatedPaper : p));
        setSelectedPaper(updatedPaper);
    };

    const handleApprovePaper = async (paper: ResearchPaper) => {
        try {
            await api.approveResearchPaper(paper.slug);
            toast.success(`Preprint "${paper.title}" approved and published!`);
            fetchPapers();
        } catch (err: any) {
            toast.error(err.message || 'Failed to approve paper');
        }
    };

    const handleOpenRejectPaper = (paper: ResearchPaper) => {
        setRejectingPaper(paper);
        setIsRejectModalOpen(true);
    };

    const handleConfirmRejectPaper = async (reason: string) => {
        if (!rejectingPaper) return;
        try {
            await api.rejectResearchPaper(rejectingPaper.slug, reason);
            toast.success(`Preprint "${rejectingPaper.title}" rejected with feedback sent to author.`);
            fetchPapers();
        } catch (err: any) {
            toast.error(err.message || 'Failed to reject paper');
        }
    };

    return (
        <div className="w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
            {/* Scientific Header & Metric Counters */}
            <ResearchHeader
                totalPapers={stats.totalPapers}
                totalReproduced={stats.totalReproduced}
                hardwareBomPapers={stats.hardwareBomPapers}
                openCallsCount={stats.openCallsCount}
                onOpenPublish={() => setIsPublishModalOpen(true)}
            />

            {/* Mode Switcher: Catalog vs My Research vs Moderation Queue */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1b1e2c]">
                <button
                    onClick={() => setActiveTab('catalog')}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                        activeTab === 'catalog'
                            ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                            : 'text-zinc-400 hover:text-white hover:bg-[#151722]'
                    }`}
                >
                    <BookOpen className="w-3.5 h-3.5" />
                    Public Preprints
                </button>

                {isAuthenticated && (
                    <button
                        onClick={() => setActiveTab('my_research')}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                            activeTab === 'my_research'
                                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                                : 'text-zinc-400 hover:text-white hover:bg-[#151722]'
                        }`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        My Papers
                    </button>
                )}

                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('moderation')}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                            activeTab === 'moderation'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40'
                                : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
                        }`}
                    >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        Moderation Queue
                        {pendingCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-black">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* If in Moderation Mode, render dedicated AdminResearchStudio */}
            {activeTab === 'moderation' ? (
                <AdminResearchStudio
                    papers={papers}
                    onPaperUpdated={(updated) => {
                        setPapers(prev => prev.map(p => p.id === updated.id ? updated : p));
                    }}
                    onRefresh={fetchPapers}
                />
            ) : (
                <>
                    {/* Discipline Tabs, Quick Feature Chips & Search Omnibox */}
                    <ResearchFilterTabs
                        activeField={activeField}
                        onSelectField={setActiveField}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        filterHasCode={filterHasCode}
                        onToggleHasCode={() => setFilterHasCode(!filterHasCode)}
                        filterHasBOM={filterHasBOM}
                        onToggleHasBOM={() => setFilterHasBOM(!filterHasBOM)}
                        filterReproduced={filterReproduced}
                        onToggleReproduced={() => setFilterReproduced(!filterReproduced)}
                        filterOpenCalls={filterOpenCalls}
                        onToggleOpenCalls={() => setFilterOpenCalls(!filterOpenCalls)}
                    />

                    {/* Results Count & Reset Controls */}
                    <div className="flex items-center justify-between text-xs text-zinc-400 mb-4 pb-2 border-b border-[#1b1e2c]">
                        <div>
                            Showing <span className="font-semibold text-white">{filteredPapers.length}</span> living preprints
                            {activeField !== 'ALL' && <span className="text-zinc-300"> in selected discipline</span>}
                        </div>

                        {(activeField !== 'ALL' || searchQuery || filterHasCode || filterHasBOM || filterReproduced || filterOpenCalls) && (
                            <button
                                onClick={() => {
                                    setActiveField('ALL');
                                    setSearchQuery('');
                                    setFilterHasCode(false);
                                    setFilterHasBOM(false);
                                    setFilterReproduced(false);
                                    setFilterOpenCalls(false);
                                }}
                                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
                            >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reset Filters</span>
                            </button>
                        )}
                    </div>

                    {/* Research Papers Grid */}
                    {filteredPapers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredPapers.map((paper) => (
                                <ResearchCard
                                    key={paper.id}
                                    paper={paper}
                                    onSelect={handleSelectPaper}
                                    onCite={handleCite}
                                    onJoinLab={handleJoinLab}
                                    onApprove={handleApprovePaper}
                                    onReject={handleOpenRejectPaper}
                                    isAdmin={isAdmin}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-[#1b1e2c] bg-[#0c0d15] p-12 text-center max-w-md mx-auto">
                            <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                            <h3 className="text-sm font-semibold text-white mb-1">
                                No Research Papers Found
                            </h3>
                            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
                                No preprints matched your current search filters. Clear filters or publish the first preprint in this discipline.
                            </p>
                            <button
                                onClick={() => setIsPublishModalOpen(true)}
                                className="btn-brand inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2"
                            >
                                <span>Publish Preprint</span>
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Living Paper Slide-Over Reader */}
            <ResearchDetailDrawer
                paper={selectedPaper}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onReviewSubmitted={handleReviewSubmitted}
                onJoinLab={(paper) => {
                    toast(`Collaboration request initiated for ${paper.paper_code}`, { icon: '🔬' });
                }}
            />

            {/* Dedicated Research Authoring Studio Modal */}
            <PublishPaperModal
                isOpen={isPublishModalOpen}
                onClose={() => setIsPublishModalOpen(false)}
                onPaperCreated={handlePaperCreated}
            />

            {/* Admin Reject Modal */}
            <AdminRejectModal
                isOpen={isRejectModalOpen}
                onClose={() => {
                    setIsRejectModalOpen(false);
                    setRejectingPaper(null);
                }}
                onSubmit={handleConfirmRejectPaper}
                itemTitle={rejectingPaper?.title || ''}
                itemType="paper"
            />
        </div>
    );
}

export default function ResearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center p-6 text-zinc-400 text-sm">
                Loading Living Research Hub...
            </div>
        }>
            <ResearchContent />
        </Suspense>
    );
}
