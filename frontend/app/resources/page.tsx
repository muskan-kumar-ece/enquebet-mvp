"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { api } from '@/lib/api';
import { ResourceItem, CURATED_SEED_RESOURCES } from '@/lib/resourcesData';
import { ResourceHeader } from '@/components/resources/ResourceHeader';
import { ResourceFilterTabs } from '@/components/resources/ResourceFilterTabs';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { UploadResourceModal } from '@/components/resources/UploadResourceModal';
import { AdminRejectModal } from '@/components/resources/AdminRejectModal';
import { ResourceDetailDrawer } from '@/components/resources/ResourceDetailDrawer';
import { Inbox, ShieldCheck, Plus, Sparkles, Filter } from 'lucide-react';

export default function ResourcesPage() {
    const { user, isAdmin, isStaff } = useAuth();
    const isAuthenticated = Boolean(user);

    // State
    const [activeTab, setActiveTab] = useState<'catalog' | 'my_submissions' | 'moderation'>('catalog');
    const [activeCategory, setActiveCategory] = useState<string>('ALL');
    const [activeFileType, setActiveFileType] = useState<string>('ALL');
    const [activeOrdering, setActiveOrdering] = useState<string>('-created_at');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const [resources, setResources] = useState<ResourceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total_resources: 6,
        total_downloads: 2378,
        pending_count: 0,
        my_submissions_count: 0,
    });

    // Modals & Drawer State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Reject Modal State
    const [rejectingItem, setRejectingItem] = useState<ResourceItem | null>(null);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

    // Notification toast
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    // Load Stats
    const fetchStats = useCallback(async () => {
        try {
            const data = await api.getResourceStats();
            setStats((prev) => ({
                total_resources: Math.max(data.total_resources, CURATED_SEED_RESOURCES.length),
                total_downloads: Math.max(data.total_downloads, 2378),
                pending_count: data.pending_count || 0,
                my_submissions_count: data.my_submissions_count || 0,
            }));
        } catch {
            // Keep fallback stats
        }
    }, []);

    // Load Resources
    const fetchResources = useCallback(async () => {
        try {
            setLoading(true);
            const params: Record<string, string> = {
                ordering: activeOrdering,
            };
            if (activeCategory !== 'ALL') params.category = activeCategory;
            if (activeFileType !== 'ALL') params.file_type = activeFileType;
            if (searchQuery.trim()) params.search = searchQuery.trim();

            if (activeTab === 'moderation') {
                params.tab = 'moderation';
            } else if (activeTab === 'my_submissions') {
                params.tab = 'my_submissions';
            }

            const res = await api.getResources(params);
            const fetchedList: ResourceItem[] = Array.isArray(res) ? res : res?.results || [];

            if (fetchedList.length > 0) {
                setResources(fetchedList);
            } else if (activeTab === 'catalog') {
                // If backend has 0 approved items yet, filter the curated seed fallback items
                let filtered = [...CURATED_SEED_RESOURCES];
                if (activeCategory !== 'ALL') {
                    filtered = filtered.filter((r) => r.category === activeCategory);
                }
                if (activeFileType !== 'ALL') {
                    filtered = filtered.filter((r) => r.file_type === activeFileType);
                }
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    filtered = filtered.filter(
                        (r) =>
                            r.title.toLowerCase().includes(q) ||
                            r.description.toLowerCase().includes(q) ||
                            r.tags.some((t) => t.toLowerCase().includes(q))
                    );
                }
                setResources(filtered);
            } else {
                setResources([]);
            }
        } catch (err: any) {
            console.error('Failed to load resources:', err);
            if (activeTab === 'catalog') {
                setResources(CURATED_SEED_RESOURCES);
            } else {
                setResources([]);
            }
        } finally {
            setLoading(false);
        }
    }, [activeTab, activeCategory, activeFileType, activeOrdering, searchQuery]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Download handler
    const handleDownload = async (resource: ResourceItem) => {
        try {
            const res = await api.downloadResource(resource.slug);
            const targetUrl = res.download_url || resource.file_url || resource.external_link;
            if (targetUrl) {
                window.open(targetUrl, '_blank', 'noopener,noreferrer');
            }
            // Update local download counter
            setResources((prev) =>
                prev.map((item) =>
                    item.id === resource.id ? { ...item, downloads_count: (item.downloads_count || 0) + 1 } : item
                )
            );
            if (selectedResource && selectedResource.id === resource.id) {
                setSelectedResource((prev) =>
                    prev ? { ...prev, downloads_count: (prev.downloads_count || 0) + 1 } : prev
                );
            }
            fetchStats();
        } catch {
            const fallbackUrl = resource.file_url || resource.external_link;
            if (fallbackUrl) {
                window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
            }
        }
    };

    // Approve handler
    const handleApprove = async (resource: ResourceItem) => {
        try {
            await api.approveResource(resource.slug);
            showToast(`Resource "${resource.title}" approved and published to catalog!`);
            fetchResources();
            fetchStats();
            if (isDrawerOpen && selectedResource?.id === resource.id) {
                setIsDrawerOpen(false);
            }
        } catch (err: any) {
            alert(err?.message || 'Failed to approve resource');
        }
    };

    // Reject handler trigger
    const handleOpenReject = (resource: ResourceItem) => {
        setRejectingItem(resource);
        setIsRejectModalOpen(true);
    };

    // Reject submission handler
    const handleConfirmReject = async (reason: string) => {
        if (!rejectingItem) return;
        await api.rejectResource(rejectingItem.slug, reason);
        showToast(`Resource "${rejectingItem.title}" rejected with feedback sent to uploader.`);
        fetchResources();
        fetchStats();
        if (isDrawerOpen && selectedResource?.id === rejectingItem.id) {
            setIsDrawerOpen(false);
        }
    };

    // Detail Drawer
    const handleViewDetail = (resource: ResourceItem) => {
        setSelectedResource(resource);
        setIsDrawerOpen(true);
    };

    // Upload Success
    const handleUploadSuccess = (created: any) => {
        showToast('Resource submitted successfully! It is now pending admin verification.');
        fetchStats();
        setActiveTab('my_submissions');
        fetchResources();
    };

    return (
        <div className="min-h-screen bg-[#07080c] text-zinc-100 flex flex-col font-sans selection:bg-blue-600/30">
            {/* Header with Search and Telemetry */}
            <ResourceHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onOpenUpload={() => setIsUploadModalOpen(true)}
                stats={stats}
                isAdmin={isAdmin}
                isAuthenticated={isAuthenticated}
            />

            {/* Filter & View Switcher */}
            <ResourceFilterTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
                activeFileType={activeFileType}
                onFileTypeChange={setActiveFileType}
                activeOrdering={activeOrdering}
                onOrderingChange={setActiveOrdering}
                isAdmin={isAdmin}
                isAuthenticated={isAuthenticated}
                pendingCount={stats.pending_count}
                mySubmissionsCount={stats.my_submissions_count}
            />

            {/* Notification Toast */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-blue-600 text-white font-medium text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <Sparkles className="w-4 h-4 text-blue-200" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
                {/* Moderation Queue Banner */}
                {activeTab === 'moderation' && (
                    <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 text-amber-300">
                            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>
                                <strong className="text-white">Admin Moderation Queue: </strong>
                                Review submitted technical assets before approving them for platform-wide availability.
                            </span>
                        </div>
                        <span className="font-mono text-amber-400 font-semibold shrink-0">
                            {resources.length} Pending
                        </span>
                    </div>
                )}

                {/* Loading Skeletons */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map((idx) => (
                            <div
                                key={idx}
                                className="h-64 rounded-xl border border-[#1b1e2c] bg-[#0c0d15] p-5 animate-pulse flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex gap-2 mb-3">
                                        <div className="w-14 h-5 rounded bg-zinc-800" />
                                        <div className="w-20 h-5 rounded bg-zinc-800" />
                                    </div>
                                    <div className="w-3/4 h-5 rounded bg-zinc-800 mb-2" />
                                    <div className="w-full h-3 rounded bg-zinc-800/60 mb-1" />
                                    <div className="w-2/3 h-3 rounded bg-zinc-800/60" />
                                </div>
                                <div className="pt-4 border-t border-[#1b1e2c] flex justify-between items-center">
                                    <div className="w-24 h-4 rounded bg-zinc-800" />
                                    <div className="w-16 h-7 rounded bg-zinc-800" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : resources.length > 0 ? (
                    /* Resource Cards Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {resources.map((item) => (
                            <ResourceCard
                                key={item.id}
                                resource={item}
                                onDownload={handleDownload}
                                onViewDetail={handleViewDetail}
                                onApprove={handleApprove}
                                onReject={handleOpenReject}
                                isAdmin={isAdmin}
                                isModerationQueue={activeTab === 'moderation'}
                            />
                        ))}
                    </div>
                ) : (
                    /* Empty States */
                    <div className="py-20 text-center max-w-md mx-auto">
                        <div className="w-14 h-14 rounded-2xl bg-[#0e1018] border border-[#1b1e2c] flex items-center justify-center mx-auto mb-4 text-zinc-500">
                            {activeTab === 'moderation' ? (
                                <ShieldCheck className="w-7 h-7 text-emerald-400" />
                            ) : (
                                <Inbox className="w-7 h-7" />
                            )}
                        </div>

                        {activeTab === 'moderation' ? (
                            <>
                                <h3 className="text-base font-semibold text-white">
                                    Moderation Queue Clear
                                </h3>
                                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                                    There are currently no community submissions waiting for review. All submitted engineering assets have been processed.
                                </p>
                            </>
                        ) : activeTab === 'my_submissions' ? (
                            <>
                                <h3 className="text-base font-semibold text-white">
                                    No Submissions Yet
                                </h3>
                                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                                    You have not submitted any technical resources yet. Upload books, system specs, or lecture notes to share with fellow engineers.
                                </p>
                                <button
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Upload Your First Resource
                                </button>
                            </>
                        ) : (
                            <>
                                <h3 className="text-base font-semibold text-white">
                                    No Resources Found
                                </h3>
                                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                                    No resources match your active search and filter settings. Try clearing filters or searching for broader terms.
                                </p>
                                <button
                                    onClick={() => {
                                        setActiveCategory('ALL');
                                        setActiveFileType('ALL');
                                        setSearchQuery('');
                                    }}
                                    className="mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#141622] hover:bg-[#1f2336] text-zinc-300 border border-[#262b42] transition-colors"
                                >
                                    <Filter className="w-3.5 h-3.5" />
                                    Reset Filters
                                </button>
                            </>
                        )}
                    </div>
                )}
            </main>

            {/* Modals & Drawer */}
            <UploadResourceModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSuccess={handleUploadSuccess}
            />

            <AdminRejectModal
                isOpen={isRejectModalOpen}
                onClose={() => {
                    setIsRejectModalOpen(false);
                    setRejectingItem(null);
                }}
                onSubmit={handleConfirmReject}
                itemTitle={rejectingItem?.title || ''}
                itemType="resource"
            />

            <ResourceDetailDrawer
                resource={selectedResource}
                isOpen={isDrawerOpen}
                onClose={() => {
                    setIsDrawerOpen(false);
                    setSelectedResource(null);
                }}
                onDownload={handleDownload}
                onApprove={handleApprove}
                onReject={handleOpenReject}
                isAdmin={isAdmin}
            />
        </div>
    );
}
