"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { api } from '@/lib/api';
import { UpdateHeader } from '@/components/updates/UpdateHeader';
import { UpdateFilterBar, ViewMode } from '@/components/updates/UpdateFilterBar';
import { UpdateCard } from '@/components/updates/UpdateCard';
import { UpdateDetailDrawer } from '@/components/updates/UpdateDetailDrawer';
import { PostUpdateModal } from '@/components/updates/PostUpdateModal';
import { 
    RefreshCw, 
    AlertCircle, 
    Radio, 
    Sparkles, 
    Plus, 
    Trash2, 
    Loader2 
} from 'lucide-react';

function UpdatesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, isAdmin, isStaff } = useAuth();
    const canManageUpdates = Boolean(isAdmin || isStaff);

    // Filter & View states
    const [activeCategory, setActiveCategory] = useState<string>(searchParams.get('category') || 'all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [viewMode, setViewMode] = useState<ViewMode>('short');

    // Data states
    const [updates, setUpdates] = useState<any[]>([]);
    const [stats, setStats] = useState<{ total_count: number; pinned_count: number }>({ total_count: 0, pinned_count: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal & Drawer states
    const [selectedUpdate, setSelectedUpdate] = useState<any | null>(null);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [editingUpdate, setEditingUpdate] = useState<any | null>(null);
    const [deletingUpdate, setDeletingUpdate] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch stats
    const fetchStats = useCallback(async () => {
        try {
            const data = await api.getPlatformUpdateStats();
            setStats({
                total_count: data.total_count || 0,
                pinned_count: data.pinned_count || 0,
            });
        } catch (err) {
            console.error('Failed to load update stats:', err);
        }
    }, []);

    // Fetch updates
    const fetchUpdates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getPlatformUpdates({
                category: activeCategory,
                search: searchQuery,
            });
            const list = Array.isArray(data) ? data : (data as any)?.results || [];
            setUpdates(list);

            // If a specific update slug was provided in the URL query param, open it
            const selectedParam = searchParams.get('selected');
            if (selectedParam && !selectedUpdate) {
                const match = list.find((u: any) => u.slug === selectedParam || u.id === selectedParam);
                if (match) {
                    setSelectedUpdate(match);
                } else {
                    // Try direct fetch
                    api.getPlatformUpdate(selectedParam)
                        .then((res) => setSelectedUpdate(res))
                        .catch(() => {});
                }
            }
        } catch (err: any) {
            console.error('Failed to load updates:', err);
            setError(err.message || 'Failed to load updates. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [activeCategory, searchQuery, searchParams]);

    useEffect(() => {
        fetchUpdates();
    }, [fetchUpdates]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Delete handler
    const handleDeleteConfirm = async () => {
        if (!deletingUpdate) return;
        setIsDeleting(true);
        try {
            await api.deletePlatformUpdate(deletingUpdate.slug || deletingUpdate.id);
            setDeletingUpdate(null);
            if (selectedUpdate?.id === deletingUpdate.id) {
                setSelectedUpdate(null);
            }
            fetchUpdates();
            fetchStats();
        } catch (err: any) {
            alert(err.message || 'Failed to delete update');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-blueprint-grid text-text-primary px-4 py-8 md:px-8 max-w-7xl mx-auto">
            {/* Header */}
            <UpdateHeader
                isAdmin={canManageUpdates}
                totalUpdates={stats.total_count}
                pinnedCount={stats.pinned_count}
                onOpenPostModal={() => {
                    setEditingUpdate(null);
                    setIsPostModalOpen(true);
                }}
            />

            {/* Filter and View Toolbar */}
            <UpdateFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeCategory={activeCategory}
                onCategoryChange={(cat) => {
                    setActiveCategory(cat);
                    const params = new URLSearchParams(window.location.search);
                    if (cat !== 'all') {
                        params.set('category', cat);
                    } else {
                        params.delete('category');
                    }
                    router.replace(`/updates?${params.toString()}`);
                }}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                totalResults={updates.length}
            />

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-between text-sm text-red-400">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={fetchUpdates}
                        className="px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-xs text-white font-medium transition-colors"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Updates Feed */}
            {loading ? (
                <div className="grid grid-cols-1 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="rounded-xl bg-surface-elevation-1 border border-border-default/60 p-6 space-y-4 animate-pulse"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-5 w-24 bg-surface-elevation-2 rounded-full" />
                                <div className="h-4 w-28 bg-surface-elevation-2 rounded" />
                            </div>
                            <div className="h-6 w-3/4 bg-surface-elevation-2 rounded" />
                            <div className="h-4 w-full bg-surface-elevation-2 rounded" />
                            <div className="h-4 w-5/6 bg-surface-elevation-2 rounded" />
                            <div className="pt-2 flex items-center justify-between border-t border-border-default/40">
                                <div className="h-4 w-32 bg-surface-elevation-2 rounded" />
                                <div className="h-4 w-20 bg-surface-elevation-2 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : updates.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {updates.map((update) => (
                        <UpdateCard
                            key={update.id}
                            update={update}
                            viewMode={viewMode}
                            isAdmin={canManageUpdates}
                            onOpenDetail={(item) => setSelectedUpdate(item)}
                            onEdit={(item) => {
                                setEditingUpdate(item);
                                setIsPostModalOpen(true);
                            }}
                            onDelete={(item) => setDeletingUpdate(item)}
                        />
                    ))}
                </div>
            ) : (
                /* Empty State */
                <div className="rounded-2xl border border-border-default/80 bg-surface-elevation-1 py-16 px-6 text-center max-w-lg mx-auto shadow-xl">
                    <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/25 flex items-center justify-center mx-auto mb-4">
                        <Radio className="w-7 h-7 text-brand-light" />
                    </div>

                    <h3 className="text-lg font-bold text-text-primary mb-1">
                        {activeCategory !== 'all' || searchQuery ? 'No matching updates found' : 'No updates published yet'}
                    </h3>

                    <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                        {activeCategory !== 'all' || searchQuery
                            ? 'Try clearing your keyword search or category filter to view all platform dispatches.'
                            : 'Stay tuned for upcoming engineering releases, protocol announcements, and system changelogs.'}
                    </p>

                    {activeCategory !== 'all' || searchQuery ? (
                        <button
                            onClick={() => {
                                setActiveCategory('all');
                                setSearchQuery('');
                                router.replace('/updates');
                            }}
                            className="px-4 py-2 rounded-lg bg-surface-elevation-2 hover:bg-surface-elevation-3 text-xs font-medium text-text-primary border border-border-default transition-colors"
                        >
                            Reset all filters
                        </button>
                    ) : (
                        canManageUpdates && (
                            <button
                                onClick={() => {
                                    setEditingUpdate(null);
                                    setIsPostModalOpen(true);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-medium transition-colors shadow-md shadow-brand-primary/20"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Post First Update</span>
                            </button>
                        )
                    )}
                </div>
            )}

            {/* Slide-over Deep-Dive Detail Drawer */}
            <UpdateDetailDrawer
                update={selectedUpdate}
                isOpen={Boolean(selectedUpdate)}
                isAdmin={canManageUpdates}
                onClose={() => setSelectedUpdate(null)}
                onEdit={(item) => {
                    setSelectedUpdate(null);
                    setEditingUpdate(item);
                    setIsPostModalOpen(true);
                }}
                onDelete={(item) => {
                    setDeletingUpdate(item);
                }}
            />

            {/* Post / Edit Update Modal */}
            <PostUpdateModal
                isOpen={isPostModalOpen}
                onClose={() => {
                    setIsPostModalOpen(false);
                    setEditingUpdate(null);
                }}
                onSuccess={() => {
                    fetchUpdates();
                    fetchStats();
                }}
                initialData={editingUpdate}
            />

            {/* Delete Confirmation Modal */}
            {deletingUpdate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        onClick={() => setDeletingUpdate(null)}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
                    />

                    <div className="relative w-full max-w-md bg-surface-elevation-1 border border-border-default rounded-2xl shadow-2xl z-10 p-6 space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3 text-red-400">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-text-primary">Delete Platform Update</h3>
                                <p className="text-xs text-text-muted">This action is permanent and cannot be undone.</p>
                            </div>
                        </div>

                        <p className="text-xs text-text-secondary leading-relaxed bg-surface-elevation-2 p-3 rounded-lg border border-border-default">
                            Are you sure you want to permanently remove <span className="font-semibold text-text-primary">"{deletingUpdate.title}"</span>?
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setDeletingUpdate(null)}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary bg-surface-elevation-2 hover:bg-surface-elevation-3 border border-border-default transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleDeleteConfirm}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-500 transition-colors shadow-md shadow-red-600/20"
                            >
                                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>{isDeleting ? 'Deleting...' : 'Delete Update'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function UpdatesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-blueprint-grid flex items-center justify-center p-8">
                <div className="flex items-center gap-3 text-sm text-text-muted font-mono">
                    <RefreshCw className="w-4 h-4 animate-spin text-brand-light" />
                    <span>Loading platform updates...</span>
                </div>
            </div>
        }>
            <UpdatesContent />
        </Suspense>
    );
}
